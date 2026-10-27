# État d'implémentation

Les cases cochées correspondent aux fonctionnalités présentes dans le code actuel. Les fonctionnalités
dépendant d'une API native non disponible dans Electron restent décochées plutôt que simulées. Le suivi
et la possession des fenêtres restent Windows uniquement ; l'overlay, les animations, le chat, les
assistants, les sons et les actions d'applications sont disponibles sur Windows, macOS et Linux.

1. Mascotte et animations
- [x] Apparition animée au démarrage avec présentation de Capri.
- [x] Personnage flottant qui se déplace entre les coins de l'écran.
- [x] Clignements des yeux, mouvements de tête et expressions faciales.
- [x] Huit expressions faciales différentes dans les messages.
- [x] Téléportation animée d'un endroit à un autre.
- [x] Effets de glitch, décalage RGB et distorsions visuelles.
- [x] Éclairs rouges, fragments et particules lumineuses.
- [x] Animations de rotation, de saut et de chute.
- [x] Réactions amusantes à la proximité du curseur.
- [x] Possibilité de faire apparaître des copies rouge et verte du personnage.
- [x] Animation spéciale avec un satellite.
- [x] Animation de victoire lorsque l'assistant termine son travail.
- [x] Animation d'erreur lorsqu'une commande échoue.
- [x] Animation de sommeil après 10 minutes d'inactivité.
- [x] Réveil automatique lorsque la souris s'approche ou que Claude reprend son activité.
- [x] Réduction de la mascotte à son masque dans le coin inférieur gauche.
- [x] Mode démonstration pour tester les animations sans assistant de programmation.
- [x] Mascotte virtuelle toujours présente sur le bureau.
- [x] Animation d'attente et clignement des yeux.
- [x] Animation lorsqu'elle parle.
- [x] Animation lorsqu'on la déplace ou la secoue.
- [x] Effets visuels de glitch.
- [x] Animation de sommeil et de redémarrage.
- [x] Déplacement de la mascotte à la souris.
- [ ] Positionnement sur les fenêtres, les icônes ou le bas de l'écran.
- [ ] Déplacement entre les fenêtres ouvertes (Windows uniquement).
- [x] Accrochage à une position précise ou à la souris.

2. Intégration avec les assistants de programmation
- [x] Intégration avec Claude Code.
- [x] Intégration avec OpenAI Codex.
- [x] Intégration avec Google Antigravity.
- [x] Installation des hooks depuis le menu de Capri.
- [x] Installation et désinstallation des hooks en ligne de commande.
- [x] Détection des actions réalisées par l'assistant.
- [x] Affichage de l'outil utilisé, du fichier concerné et de la commande exécutée.
- [x] Affichage des recherches de code et des opérations de lecture ou d'écriture.
- [x] Affichage des commandes lancées et des tests exécutés.
- [x] Indicateur de progression au-dessus de la mascotte.
- [x] Affichage du temps passé en réflexion après 15 secondes d'attente.
- [x] Commentaires sur les longues périodes de réflexion.
- [x] Alerte lorsque l'assistant attend une autorisation ou une réponse.
- [x] Téléportation vers le curseur ou la fenêtre de l'assistant lorsqu'une intervention est nécessaire.
- [x] Affichage des erreurs importantes en cas d'échec.
- [x] Séquence de victoire lorsque la tâche est terminée.
- [x] Affichage du résumé de la tâche : nombre d'actions, fichiers modifiés et durée.
- [x] Affichage de la dernière réponse de l'assistant.
- [x] Panneau permettant de lire la réponse complète lorsque tu travailles dans une autre fenêtre.
- [x] Possibilité de désactiver la surveillance des assistants pour utiliser Capri uniquement comme mascotte.

3. Intelligence artificielle et conversations
- [x] Discussion par messages écrits.
- [x] Réponses générées par une IA.
- [x] Configuration du modèle d'IA depuis le Mainframe.
- [x] Utilisation d'une IA locale sur l'ordinateur.
- [x] Utilisation d'une IA distante via une clé API.
- [x] Possibilité d'utiliser une clé NVIDIA gratuite, selon les quotas disponibles.
- [x] Ajout la possibilité d’”appel” avec Capri dans le style Cyberpunk 2077 avec la sonnerie, la transcription et la réponse directement (API vocale du navigateur).

4. Fonctionnalités vocales
- [ ] Synthèse vocale pour faire parler la mascotte (les sons synthétisés sont disponibles, pas la parole).
- [ ] Conversation vocale interactive.
- [ ] Reconnaissance vocale via NVIDIA Parakeet.
- [ ] Voix locale gratuite avec Kokoro.
- [ ] Voix ElevenLabs avec une clé API.
- [ ] Activation et arrêt de la conversation vocale par raccourci clavier.
- [ ] Coupure et réactivation du microphone.

5. Positionnement et interactions avec les fenêtres
- [x] Mascotte flottante au premier plan.
- [x] Déplacement par glisser-déposer.
- [x] Possibilité de s'asseoir sur le bord supérieur d'une fenêtre (Windows).
- [x] Déplacement avec la fenêtre lorsque celle-ci est déplacée (Windows).
- [x] Chute lorsque la fenêtre disparaît, est minimisée ou recouverte (Windows).
- [x] Possibilité de tomber sur le rebord d'une autre fenêtre (Windows).
- [x] Apparition partielle sur les bords de l'écran.
- [x] Déplacement lorsqu'on approche la souris d'elle.
- [x] Effet de possession d'une fenêtre avec des yeux et un sourire animés (Windows).
- [x] Désactivation de la possession des fenêtres depuis le menu.
- [x] Suivi des fenêtres ouvertes sous Windows.
- [x] Mise en retrait dans le biochip avec Ctrl + Alt + C.
- [x] Réapparition par clic sur le masque ou avec le même raccourci.

6. Interface et paramètres
- [x] Mainframe central de configuration.
- [x] Configuration du modèle d'IA.
- [x] Configuration de la voix.
- [x] Activation de l'observation de l'écran.
- [x] Accès à l'aide.
- [x] Menu contextuel par clic droit sur la mascotte.
- [x] Accès aux paramètres depuis l'icône de la zone de notification.
- [x] Personnalisation des raccourcis clavier depuis le menu Capri (profils afficher/masquer, chat ou désactivation).

7. Conversation avec Capri
- [ ] Ouvrir un panneau de discussion depuis le menu.
- [ ] Envoyer des messages en appuyant sur Entrée.
- [ ] Fermer le panneau avec Échap.
- [ ] Recevoir des réponses formulées dans le personnage de Capri.
- [ ] Utiliser les informations sur l'activité de Claude et les tâches réalisées pendant la journée.
- [ ] Personnaliser la façon dont Capri s'exprime.
- [ ] Définir des phrases personnalisées qu'elle peut prononcer.
- [ ] Lui faire mémoriser certaines informations personnelles.
- [ ] Choisir le nom qu'elle utilise pour s'adresser à toi.
- [ ] Effacer les conversations mémorisées.
- [ ] Choisir la langue de l'interface et des dialogues.
Modèles et fournisseurs d'IA compatibles avec le chat
- [ ] Ollama avec un modèle local.
- [ ] Pollinations pour une utilisation en ligne sans compte.
- [ ] Groq.
- [ ] Google Gemini.
- [ ] OpenRouter.
- [ ] OpenAI.
- [ ] Mistral.
- [ ] DeepSeek.
- [ ] LM Studio.
- [ ] llama.cpp.
- [ ] vLLM.
- [ ] Tout serveur compatible avec l'API OpenAI.
- [ ] Claude Code en mode ligne de commande, dans un dossier choisi..

8. Actions sur l'ordinateur
- [ ] Ouvrir des applications.
- [ ] Fermer des applications.
- [ ] Lire de la musique.
- [ ] Mettre la musique en pause.
- [ ] Demander quelle musique est en cours de lecture.
- [ ] Fermer un onglet.
- [ ] Observer l'écran pendant les jeux.
- [ ] Commenter ce qui se passe pendant une partie.
- [ ] Ouvrir les applications du menu Démarrer.
- [ ] Lancer des applications du Microsoft Store, comme Spotify.
- [ ] Lancer des jeux installés via Steam et Epic Games.
- [ ] Contrôler la lecture multimédia : pause, piste suivante, volume et silence.
- [ ] Rechercher un artiste ou un morceau sur Spotify.
- [ ] Ouvrir un site web après confirmation via un bouton.
- [ ] Fermer une application après confirmation.
- [ ] Proposer une fermeture forcée si l'application reste dans la zone de notification.
- [ ] Conserver la possibilité pour l'application de demander d'enregistrer les modifications avant de se fermer.

9. Guide interactif
- [ ] Expliquer le fonctionnement de Capri directement depuis son menu.
- [ ] Indiquer où se trouve son icône dans la barre des tâches.
- [ ] Montrer où se trouve la fenêtre de Claude Code.
- [ ] Ouvrir le dossier ~/.claude.
- [ ] Sélectionner settings.json pour expliquer la configuration des hooks.
- [ ] Installer les hooks de Claude Code en un clic.
- [ ] Proposer le lancement de Claude Code ou Codex avec Ollama.
- [ ] Pointer visuellement les éléments de l'interface.
- [ ] Afficher un réticule, des éclairs et un effet de zoom pendant les explications.

10. Rapport quotidien de mission
- [ ] Générer une carte récapitulative du travail de la journée.
- [ ] Afficher le nombre de tâches terminées.
- [ ] Afficher le nombre d'actions réalisées.
- [ ] Afficher les fichiers modifiés.
- [ ] Afficher les erreurs rencontrées.
- [ ] Indiquer la mission la plus longue et le projet concerné.
- [ ] Récapituler les prompts, autorisations et projets.
- [ ] Animer les compteurs du rapport.
- [ ] Copier l'image du rapport dans le presse-papiers.
- [ ] Afficher automatiquement le rapport le soir après au moins trois tâches réalisées.
- [ ] Conserver le journal des missions localement, avec un historique journalier.

11. Sons et personnalisation
- [ ] Génération des effets sonores en temps réel.
- [ ] Son de téléportation.
- [ ] Son de fin de tâche.
- [ ] Son d'alerte lorsqu'une autorisation est nécessaire.
- [ ] Son d'erreur.
- [ ] Son de démarrage de session.
- [ ] Son de chute et de montée.
- [ ] Son des éclairs et de la possession des fenêtres.
- [ ] Sons de parole et rappels discrets.
- [ ] Remplacement des sons par des fichiers personnels .mp3, .wav, .ogg ou .m4a.
- [ ] Réglage du son, de la taille et des animations.
- [ ] Démarrage automatique avec Windows.
- [ ] Choix de la langue : français, anglais, espagnol, portugais brésilien ou russe.
- [ ] Personnalisation du comportement et des phrases de Capri.

12. Sécurité et fonctionnement technique
- [ ] Fonctionnement de la mascotte sans Claude Code.
- [ ] Communication locale avec Claude Code via 127.0.0.1.
- [ ] Hooks asynchrones qui ne bloquent pas les opérations de Claude.
- [ ] Sauvegarde de la configuration avant modification des hooks.
- [ ] Désinstallation des hooks sans supprimer les autres hooks existants.
- [ ] Stockage local du journal des missions et des paramètres.
- [ ] Chiffrement de la clé API avec le compte Windows pour les fournisseurs concernés.
- [ ] Possibilité de désinstaller l'application depuis les paramètres Windows.
- [ ] Mode développement avec outils de débogage et fenêtres de test.

13. Fonctionnalités supplémentaires
- [ ] Ouvrir les fichiers sélectionnés.
- [ ] Lire et modifier des fichiers.
- [ ] Contrôler YouTube.
- [ ] Passer à la vidéo suivante.
- [ ] Activer le plein écran.
- [ ] Cliquer sur des éléments de l'interface.
- [ ] Saisir du texte et faire défiler des pages.
- [ ] Développer une voix locale gratuite.
- [ ] Mémoriser des informations sur l'utilisateur.
- [ ] Effectuer des recherches sur Internet.
- [ ] Disposer d'un curseur autonome.
- [ ] Ajouter des interactions comme les caresses sur la tête.
- [ ] Ajouter un mode espiègle avec des glitches et des effets de faux piratage.
- [ ] Étendre les fonctionnalités vocales et les commandes d'applications à macOS et Linux.