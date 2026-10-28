# Fonctionnalités de Capri

Ce fichier reprend la documentation des fonctionnalités de Capri. Une case **[x]** indique une
fonctionnalité implémentée et disponible sur Windows, macOS et Linux ; les fonctions limitées à une plateforme
ou non implémentées restent décochées.

## Terminal Capri — Interface Cyberpunk

Le terminal cyberpunk interactif est accessible depuis le menu de la zone de notification (icône de la barre des tâches / barre de menus) et le menu contextuel de Capri sous l'entrée **« Terminal Capri »**.

### 1. Interface et design cyberpunk

- **Esthétique Cyberpunk immersive :** Fenêtre rectangulaire sur fond sombre (`#07090e`), bordures néon lumineuses aux reflets cyan (`#00f0ff`) et magenta (`#ff2a85`), scanlines CRT subtiles et typographie monospace (`JetBrains Mono`, `Consolas`).
- **Indicateurs visuels de terminal actif :** Badge de statut lumineux `SYS:ONLINE`, LED verte pulsante animée indiquant un terminal prêt à recevoir des instructions.
- **Zone de saisie de commandes :** Champ de saisie placé au sommet de la zone de contenu avec invite `capri@night-city:~$`, indicateur visuel actif et mise en surbrillance néon lors de la prise de focus.
- **Historique défilant (en dessous de la saisie) :** Conteneur d'historique placé sous la barre de saisie, avec défilement vertical fluide, barre de défilement stylisée et coloration différentielle pour chaque type de message :
  - **Commandes saisies (`line--command`) :** texte cyan néon précédé d'une bordure cyan lumineuse.
  - **Réponses de Capri (`line--response`) :** texte vert matrice avec lueur douce pour les messages de Capri et les retours narratifs.
  - **Résultats système (`line--result`) :** bloc cyan clair formaté en grille / données structurées.
  - **Messages d'information (`line--info`) :** texte violet/ardoise discret pour les messages de statut et d'aide.
  - **Erreurs (`line--error`) :** texte rouge néon avec fond d'avertissement et message explicite.

### 2. Interactions de fenêtre : Déplacement, Réduction et Redimensionnement

- **Déplacement libre :**
  - En mode développé : déplacement par glisser-déposer de la barre de titre supérieure (`#dragbar`).
  - En mode réduit : poignée de déplacement dédiée (`::`) sur la gauche de la barre compacte (`-webkit-app-region: drag`), permettant de repositionner le terminal sur le bureau sans aucun conflit avec la saisie de texte dans l'entrée (`-webkit-app-region: no-drag`).
- **Mode réduit (barre compacte) :**
  - Réduit la fenêtre à une barre ultra-compacte d'une hauteur de 48 px ne conservant que la ligne de commande active, la poignée de déplacement et les boutons de contrôle.
  - L'historique et la barre de titre sont masqués temporairement sans aucune perte de données.
  - Déclenchable via le bouton `_` du terminal, un double-clic sur la barre de titre, ou le raccourci `Ctrl+M` / `Cmd+M`.
- **Mode développé (restauration) :**
  - Restaure le terminal à ses dimensions précédentes (par exemple 720x460 px ou toute taille personnalisée choisie par l'utilisateur).
  - L'intégralité de l'historique et le texte en cours de saisie sont conservés à l'identique, sans réinitialisation de l'interface.
  - Déclenchable via le bouton `▲` de la barre compacte, un double-clic sur la poignée compacte, ou `Ctrl+M` / `Cmd+M`.
- **Redimensionnement libre :**
  - Lorsque le terminal est développé, sa largeur et sa hauteur peuvent être modifiées librement et indépendamment en étirant les bords ou les coins de la fenêtre.
  - Limites de dimensions sécurisées : largeur minimale de 420 px, hauteur minimale de 180 px en mode développé (48 px en mode compact), largeur maximale de 1400 px, hauteur maximale de 1000 px.
  - Ajustement automatique aux limites de l'écran pour empêcher la fenêtre de sortir de la zone de travail visible du moniteur lors d'une restauration.

### 3. Interactions clavier

- **`Entrée` :** valide et exécute la commande courante, vide le champ de saisie et fait défiler automatiquement l'historique jusqu'au résultat.
- **`Flèche Haut` / `Flèche Bas` :** navigation chronologique dans l'historique des commandes exécutées. Sauvegarde automatiquement le texte en cours de saisie sous forme de brouillon pour le restaurer lors du retour au bas de l'historique.
- **`Tab` :** complétion automatique des noms de commandes connues.
- **`Ctrl+M` / `Cmd+M` :** raccourci clavier pour basculer rapidement entre le mode compact et le mode développé.
- **`Échap` :** efface le contenu du champ de saisie.

### 4. Répertoire complet des commandes

#### Commandes générales

| Commande | Description | Type de retour |
|---|---|---|
| `/help` | Affiche la liste des commandes disponibles et leur description en français ou en anglais selon la langue active. | Réponse / Information |
| `/clear` | Efface l'historique visible dans la fenêtre du terminal. | Réinitialisation de l'affichage |
| `/history` | Affiche l'historique numéroté de toutes les commandes exécutées au cours de la session. | Réponse |
| `/version` | Affiche la version actuelle de Capri (`Capri 0.5.1`). | Réponse |
| `/status` | Affiche l'état général de Capri au format JSON (visibilité, surveillance, assistant actif, plateforme). | Réponse |

#### Commandes système et fichiers (actions réelles sécurisées)

| Commande | Description | Type de retour |
|---|---|---|
| `/open app/<nom>` | Recherche et lance une application reconnue sur le système via le gestionnaire de lancement sécurisé de Capri. | Réponse / Erreur |
| `/open file/<chemin>` | Ouvre un fichier local existant avec l'application par défaut via l'API sécurisée `shell.openPath` d'Electron. | Réponse / Erreur |
| `/download <url>` | Télécharge un fichier depuis une URL HTTP ou HTTPS valide dans le dossier Téléchargements de l'utilisateur (taille maximale : 50 MiB). | Réponse / Erreur |
| `/system info` | Affiche les caractéristiques matérielles et logicielles réelles de la machine (plateforme, architecture, processeur, mémoire vive, version de Node.js). | Résultat |
| `/network status` | Affiche l'état des interfaces réseau actives ou le statut de simulation locale sécurisée. | Résultat |

#### Commandes fictives inspirées de Cyberpunk 2077

Toutes les commandes ci-dessous sont purement narratives et locales. Elles utilisent des algorithmes de simulation, des journaux fictifs et des animations de progression :

| Commande | Description narrative | Comportement immersif |
|---|---|---|
| `/get arasaka data` | Simule l'accès à une base de données confidentielle d'Arasaka Corporation. | Sélectionne des fragments de données chiffrés variés (télémétrie de la biopuce Relic 2.0, mémo de transport orbital, archives Mikoshi) avec niveau d'accès et avertissement de sécurité. |
| `/hack arasaka` | Déclenche une séquence de piratage netrunner contre les serveurs Arasaka. | Affiche 5 étapes de progression animées en temps réel (scan du périmètre ICE, injection de daemons, contournement du Black ICE, extraction de fragment), assorties d'une réaction visuelle de Capri. |
| `/network scan` | Simule l'analyse des nœuds réseau de Night City. | Génère une grille complète de nœuds fictifs (Passerelle NC, sous-réseau Arasaka, Trauma Team, Night Corp) avec latences, démons actifs et niveaux d'ICE. |
| `/netrunner status` | Affiche le tableau de bord cyberdeck de l'opérateur netrunner. | Présente les jauges de RAM virtuelle, la synchronisation du lien neural, l'intégrité de la mémoire tampon et le statut de clearance. |
| `/ice status` | Affiche l'état des défenses contre-intrusives ICE (Intrusion Countermeasure Electronics). | Rapporte l'intégrité des 4 couches de défense, le protocole Blackwall simulé et confirme l'isolation totale du bac à sable local. |
| `/trace origin` | Lance une tentative de traçage de paquets en cascade. | Déroule une animation de géolocalisation à travers plusieurs relais fictifs de Night City (Kabuki, Heywood, Pacifica) avec masquage par proxy neural. |
| `/decrypt <data>` | Simule le décryptage d'une chaîne de données passée en argument. | Valide la présence de l'argument, puis simule une phase de déchiffrement quantique matriciel (algorithme Neural-7) avant de restituer le fragment décodé. |
| `/connect <node>` | Établit une liaison simulée avec un nœud réseau spécifié. | Vérifie l'argument et active une session virtuelle connectée au nœud cible. |
| `/disconnect` | Rompt la liaison avec le nœud connecté ou signale l'absence de session active. | Déconnecte proprement le cyberdeck et bascule en mode console locale. |
| `/inventory` | Affiche l'inventaire cybernétique fictif de Capri. | Énumère les outils virtuels, éclats de données (shards), daemons disponibles et matériel neural virtuel. |

#### Commandes de contrôle de la mascotte Capri

| Commande | Description | Action exécutée |
|---|---|---|
| `/capri teleport` (ou `/teleport`) | Déclenche l'animation de téléportation de la mascotte à l'écran. | Déplace Capri vers un autre coin du bureau. |
| `/capri satellite` (ou `/satellite`) | Fait regarder le satellite par Capri. | Joue l'animation spéciale du satellite. |
| `/capri chat` (ou `/chat`) | Ouvre le panneau de discussion textuelle de Capri. | Déploie l'interface de conversation avec l'IA. |
| `/capri demo` (ou `/demo`) | Lance la séquence de démonstration complète des animations de Capri. | Joue le scénario animé de démonstration. |
| `/capri stow` (ou `/stow`) | Replie la mascotte dans son biochip ou la fait réapparaître sur le bureau. | Bascule la visibilité de Capri. |

### 5. Sécurité et distinction stricte des opérations

- **Opérations système réelles sécurisées :**
  - `/open app/<nom>` utilise exclusivement le catalogue d'applications configuré et vérifié de Capri (`launch.find`), sans appel à un shell de commandes système.
  - `/open file/<chemin>` utilise `safeOpenFile` pour vérifier la présence du fichier, rejeter les caractères nuls (`\0`), vérifier qu'il s'agit bien d'un fichier réel (et non d'un répertoire ou périphérique) et l'ouvrir via l'API Electron `shell.openPath`.
  - `/download <url>` vérifie rigoureusement le protocole (`http:` ou `https:` uniquement, blocage strict de `file:`, `javascript:`, etc.), restreint l'écriture au dossier `Downloads` officiel de l'utilisateur, et plafonne strictement les téléchargements à 50 MiB.
  - Aucun shell arbitraire (`cmd.exe`, `powershell`, `bash`, `sh`) n'est invoqué directement par le terminal.
- **Opérations fictives étanches :**
  - Les commandes inspirées de Cyberpunk 2077 ne tentent aucune connexion réseau extérieure non sollicitée, ne réalisent aucune intrusion et n'accèdent à aucune donnée privée.
  - Chaque réponse issue d'une simulation porte une mention explicite (`[SIMULATION]`) rappelant le caractère fictionnel de l'opération dans le respect de l'univers du jeu.

## MacOS Permissions — Configuration et diagnostic système

L'option **« Autorisations macOS… »** (ou *« MacOS Permissions »*) est accessible **exclusivement sous macOS** (`process.platform === 'darwin'`) depuis le menu contextuel de la mascotte Capri (clic droit), l'icône de la barre des menus / zone de notification, et le menu circulaire.

Sur Windows et Linux, cette entrée est automatiquement masquée et les appels d'API système associés renvoient un état non pris en charge (`unsupported`) sans bloquer l'application.

### 1. Interface et tableau de bord des permissions

La fenêtre dédiée arbore l'esthétique cyberpunk de Capri (fond sombre, bordures lumineuses cyan/magenta, typographie `JetBrains Mono`) et propose :
- **Résumé global :** compteur d'autorisations actives (ex. `3 / 4 autorisations accordées`), indicateur LED dynamique et statut général (`TOUTES LES PERMISSIONS SONT ACTIVES` ou `INTERVENTION MANUELLE REQUISE`).
- **Bouton d'actualisation globale :** « Vérifier toutes les permissions » pour re-sonder l'ensemble des API du système en un clic.
- **Rappel de redémarrage :** notification indiquant à l'utilisateur que certaines permissions (Accessibilité, Enregistrement de l'écran) nécessitent de relancer Capri pour être effectives après modification dans macOS.
- **Indicateurs visuels d'état :**
  - `AUTORISÉ` (vert néon) : permission accordée et fonctionnelle.
  - `REFUSÉ` (rouge néon) : permission refusée dans macOS TCC.
  - `ACTION REQUISE` (ambre/jaune néon) : autorisation non encore demandée ou nécessitant une intervention dans les Réglages Système.
  - `INCONNU` (gris/ardoise) : état indéterminé par l'API système.

### 2. Les 4 sections d'autorisations gérées

#### Section 1 — Accessibilité (Accessibility)
- **Rôle :** Permet à Capri d’interagir avec l’interface macOS, d’inspecter les coordonnées des fenêtres ouvertes, et d’effectuer les actions de manipulation nécessaires.
- **Fonctionnalités Capri concernées :** « Posséder mes fenêtres » (`possess`), déplacement des fenêtres saisies (`possessMove`), suivi et accrochage aux fenêtres de code, évitement pour ne pas recouvrir le travail de l'utilisateur.
- **Détection et actions :** Détectée via `systemPreferences.isTrustedAccessibilityClient(false)`. Propose un bouton « Demander l'autorisation » (déclenche le dialogue macOS natif) et un bouton ouvrant directement `x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility`.

#### Section 5 — Microphone (Microphone)
- **Rôle :** Permet aux fonctionnalités vocales d'écouter les instructions de l'utilisateur.
- **Fonctionnalités Capri concernées :** Mode conversation vocale interactive, reconnaissance vocale Speech-to-Text (`ears`), vu-mètre audio dans le menu circulaire, raccourci Push-to-Talk (`Ctrl+Alt+Espace`).
- **Détection et actions :** Vérifiée via `systemPreferences.getMediaAccessStatus('microphone')`. Propose un bouton « Demander l'autorisation » (dialogue natif via `askForMediaAccess('microphone')` si non déterminé) ou l'ouverture directe de `Privacy_Microphone`.

#### Section 8 — Enregistrement de l'écran (Screen Recording)
- **Rôle :** Permet la capture visuelle de l'écran ou des fenêtres pour l'analyse par le modèle d'IA multimodal.
- **Fonctionnalités Capri concernées :** Sens visuels (« Voir mon écran » / `vision`), contextualisation des tâches en cours de développement.
- **Détection et actions :** Vérifiée via `systemPreferences.getMediaAccessStatus('screen')`. Étant donné que macOS impose une activation manuelle stricte pour cette permission, l'interface affiche les instructions claires et un bouton ouvrant directement `Privacy_ScreenCapture`.

#### Section 13 — Automatisation & Apple Events (Automation & Control)
- **Rôle :** Permet à Capri d'envoyer des événements Apple Events aux applications cibles (notamment `System Events` et les lecteurs multimédias) pour fermer des programmes à la demande ou piloter l'interface.
- **Fonctionnalités Capri concernées :** Fermeture d'applications confirmée, contrôle des fenêtres système, passage d'une application à l'autre.
- **Détection et actions :** Sondée en temps réel via une commande de test AppleScript / `osascript`. Bouton pour tester l'accès ou ouvrir `Privacy_Automation`.

### 3. Gestion des fenêtres et navigation entre applications (macOS)

L'interface intègre un panneau interactif de diagnostic : **« Gestion des fenêtres & Navigation macOS »** :
- **Lister les fenêtres ouvertes :** Interroge `System Events` et extrait la liste de toutes les fenêtres visibles (application propriétaire, titre, position X/Y et dimensions).
- **Activer / Focus :** Active et place au premier plan l'application sélectionnée sans perte de contexte.
- **Déplacer (+20px) :** Déplace la fenêtre cible lorsque l'accessibilité est accordée.
- **Gestion explicite des erreurs :** Si l'autorisation d'accessibilité fait défaut, un message d'erreur clair informe l'utilisateur que l'action a été bloquée par les protections macOS, sans faire planter l'application.

### 4. Sécurité et architecture technique

- Isolation complète du processus de rendu (`contextIsolation: true`, `sandbox: true`, aucune exposition directe de `ipcRenderer` ou de `child_process`).
- Exposition ciblée et typée via `mac-permissions-preload.js` et `contextBridge.exposeInMainWorld('macPermissions', ...)`.
- Aucun contournement des mécanismes TCC de macOS : les permissions réelles du système sont strictement respectées et vérifiées.
