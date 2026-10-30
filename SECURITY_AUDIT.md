# Audit de sécurité Capri

## Synthèse

La revue statique porte sur les 244 chemins suivis par Git au début de l’audit, notamment Electron, les preloads, les appels IPC, les processus, les téléchargements, les intégrations réseau, les permissions et la configuration. Aucun comportement malveillant avéré n’a été établi dans le code versionné examiné. Cela ne prouve pas l’absence de menace.

Un défaut de stockage en clair des nouvelles clés API et une absence de garde générale de navigation ont été corrigés. La validation des émetteurs IPC reste inégale; les anciennes clés enregistrées en clair sont encore lues par compatibilité.

## Méthode

- Inventaire Git récursif et examen des configurations de démarrage, compilation et installation.
- Recherches statiques des processus, téléchargements, domaines réseau, accès fichiers, permissions, secrets, obfuscation et exécution dynamique.
- Lecture des fonctions clés concernant les clés API, le protocole local, les hooks, les contrôles d’applications/fenêtres, les captures et les téléchargements.
- Tests unitaires des modifications de sécurité et tests existants des permissions.
- Tentative de npm audit avec le lockfile présent; le registre n’a pas pu être résolu par DNS.

La revue n’exécute pas d’antivirus, n’analyse pas le contenu des dépendances installées ni les binaires distants, et ne remplace pas un audit dynamique.

## Electron, Renderer et IPC

Les fenêtres observées activent contextIsolation et sandbox, désactivent nodeIntegration. Les preloads exposent une API contextBridge ciblée, pas Node.js ni ipcRenderer directement. Le protocole local résout les chemins sous une racine et vérifie les traversées lexicales.

**Correction — navigation externe (faible à moyen).** Une page détournée ne doit pas conserver le preload privilégié lors d’une navigation. Le nouveau module src/main/electron-security.js refuse les fenêtres enfants et les navigations hors de capri://app/. Les liens externes doivent emprunter les fonctions Main prévues à cet effet.

**Risque restant — IPC (moyen).** Plusieurs handlers de src/main/main.js ne vérifient pas systématiquement que l’appel provient d’une fenêtre Capri attendue et de son frame principal. La navigation externe est bloquée, mais une injection de script dans une page locale pourrait appeler certaines fonctions de configuration, lancement d’applications, fichiers ou automatisation exposées au preload.

Recommandation : appliquer une validation commune de fenêtre, frame principal et origine à chaque handler sensible, puis borner strictement types, tailles et valeurs des paramètres. Les handlers existants n’ont pas été refactorés en masse afin de ne pas modifier leurs interfaces.

## Clés et données locales

rendererConfig() retire apiKeys avant d’envoyer la configuration au Renderer. Les clés entrées via les interfaces utilisent Electron safeStorage.

**Correction — repli en clair (moyen).** setup.sealKey() retournait auparavant la clé brute lorsque le stockage sécurisé était indisponible. Il lève maintenant une erreur explicite; les connexions IA et synthèse refusent alors la sauvegarde.

**Limite restante.** openKey() accepte les anciennes entrées sans préfixe enc: pour compatibilité. Elles peuvent donc être lues depuis une ancienne configuration et ne sont pas migrées automatiquement. Après disponibilité du stockage chiffré, l’utilisateur devrait supprimer puis enregistrer de nouveau ces clés.

La copie locale contient un fichier .env ignoré par Git. Seuls les noms de variables ont été vérifiés; les valeurs n’ont pas été lues ou copiées dans ce rapport. git ls-files confirme qu’il n’est pas versionné.

## Processus, scripts et téléchargements

La plupart des appels execFile et spawn utilisent des exécutables et tableaux d’arguments, plutôt qu’une ligne shell construite à partir du texte utilisateur. Les scripts PowerShell sont des aides aux opérations Windows. Les commandes Apple Events observées sont des opérations prévues, les noms dynamiques étant limités ou échappés par les fonctions concernées.

Capri télécharge intentionnellement Node, Piper, dépendances Python/Chatterbox, modèles et voix, puis les lance avec les droits de l’utilisateur. Le programme Node vérifie une empreinte SHA-256; les autres téléchargements ne disposent pas tous d’une signature ou empreinte comparable. C’est un risque d’approvisionnement, pas une preuve de code malveillant.

src/main/bridge.js écoute sur 127.0.0.1, limite le corps HTTP et refuse les requêtes avec Origin. Il n’authentifie pas les processus locaux qui omettent Origin; ceux-ci peuvent injecter un événement de hook. Les routes debug existent en développement. Recommandation : jeton aléatoire de session pour les hooks et limitation des routes debug si le modèle de menace inclut des processus locaux non fiables.

## Réseau et vie privée

Les connexions vers Anthropic, Ollama, les fournisseurs configurés, moteurs vocaux, YouTube et sources de téléchargement correspondent aux fonctions documentées. Aucune destination cachée d’exfiltration ni analytique tierce n’a été repérée dans les recherches statiques.

Les captures, prompts et transcriptions peuvent être envoyés au fournisseur choisi quand l’utilisateur active une fonction distante. Ollama, Piper et Chatterbox peuvent fonctionner localement, mais nécessitent des téléchargements initiaux. Les fonctions microphone, vision et Apple Events sont associées à des commandes et permissions système.

## Permissions macOS

Les états inconnus restent inconnus quand Electron ne permet pas de distinguer un refus d’un état non déterminé. Apple Events sont testés par cible par une opération réelle non destructive et seulement après action explicite. Les permissions d’accessibilité, d’écran, de microphone et d’automatisation sont distinctes. Les tests utilisent des mocks; aucune boîte TCC réelle n’a été vérifiée durant cette revue.

## Résultats classés

| Gravité | Fichier(s) | Constat | Action |
|---|---|---|---|
| Faible à moyen — corrigé | src/main/electron-security.js, src/main/main.js | Navigation et fenêtres enfants sans garde commune. | Blocage des popups et navigations hors de capri://app/; test unitaire ajouté. |
| Moyen — corrigé pour les nouvelles clés | src/main/setup.js, src/main/main.js | Enregistrement de clé API en clair si safeStorage était indisponible. | Sauvegarde refusée avec message explicite. |
| Moyen — à corriger | src/main/main.js, src/preload.js | Tous les handlers IPC ne vérifient pas l’identité du WebContents/frame. | Validation commune et bornes de paramètres recommandées. |
| Faible à moyen — à vérifier selon le modèle de menace | src/main/bridge.js, scripts/demo.js | Le pont local n’authentifie pas les autres processus locaux; routes debug en développement. | Jeton aléatoire et restriction debug recommandés. |
| Faible — approvisionnement | src/main/fetch-files.js, src/main/piper.js, src/main/chatterbox-setup.js, scripts d’installation | Des binaires, modèles et paquets tiers sont téléchargés; toutes les sources ne sont pas vérifiées par signature/empreinte. | Épingler versions et empreintes/signatures, fermer la liste d’hôtes lorsque possible. |
| Aucun problème confirmé | Sources suivies examinées | Aucune utilisation d’eval/Function, obfuscation volontaire ou exfiltration cachée n’a été établie. | Maintenir la revue de code et des dépendances. |

## Dépendances

Les dépendances directes sont Electron et @anthropic-ai/sdk; package-lock.json fige l’arbre npm. Aucun scanner de dépendances n’est configuré. npm audit n’a pas pu récupérer les avis à cause d’une erreur DNS vers registry.npmjs.org; aucun résultat « sans vulnérabilité » n’est affirmé. Aucun outil tiers n’a été installé.

## Vérifications et limites

Le test de garde de navigation est tests/electron-security.test.js. La suite automatisée doit être exécutée dans un environnement Node complet. Cette revue ne valide pas les permissions macOS réelles, les services cloud, les binaires téléchargés, les versions futures de dépendances ni les attaques nécessitant une interaction graphique.

Aucun fichier n’a été supprimé. FEATURES.md et FEATURES.fr.md ne sont pas suivis dans cette copie; des copies locales sont dans .private/, ignoré par Git.
