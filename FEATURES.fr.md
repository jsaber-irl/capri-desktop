# État d'implémentation

Les cases cochées correspondent aux fonctionnalités présentes dans le code actuel. Les fonctionnalités
dépendant d'une API native non disponible dans Electron restent décochées plutôt que simulées. La possession des fenêtres reste principalement Windows ; le suivi des fenêtres fonctionne sous Windows et
macOS avec les permissions nécessaires ; l'overlay, les animations, le chat, les
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
- [x] Positionnement sur les fenêtres et le bas de l'écran.
- [x] Déplacement entre les fenêtres ouvertes.
- [x] Accrochage à une position précise ou à la souris.
- [x] Menu « MacOS Permissions » pour autoriser l'accès nécessaire aux interactions avec les fenêtres sur macOS.

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
- [x] Demande d'autorisation du microphone depuis le menu « MacOS Permissions » sur macOS.

5. Positionnement et interactions avec les fenêtres
- [x] Mascotte flottante au premier plan.
- [x] Déplacement par glisser-déposer.
- [x] Possibilité de s'asseoir sur le bord supérieur d'une fenêtre.
- [x] Déplacement avec la fenêtre lorsque celle-ci est déplacée.
- [x] Chute lorsque la fenêtre disparaît, est minimisée ou recouverte.
- [x] Possibilité de tomber sur le rebord d'une autre fenêtre.
- [x] Apparition partielle sur les bords de l'écran.
- [x] Déplacement lorsqu'on approche la souris d'elle.
- [x] Effet de possession d'une fenêtre avec des yeux et un sourire animés.
- [x] Désactivation de la possession des fenêtres depuis le menu.
- [x] Suivi des fenêtres ouvertes sous Windows et macOS (avec l'autorisation Accessibilité sur macOS).
- [x] Accès aux réglages macOS d'accessibilité et d'enregistrement de l'écran pour les interactions avec les fenêtres.
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
- [x] Ouvrir un panneau de discussion depuis le menu.
- [x] Envoyer des messages en appuyant sur Entrée.
- [x] Fermer le panneau avec Échap.
- [x] Recevoir des réponses formulées dans le personnage de Capri.
- [x] Utiliser les informations sur l'activité de Claude et les tâches réalisées pendant la journée.
- [x] Personnaliser la façon dont Capri s'exprime.
- [x] Définir des phrases personnalisées qu'elle peut prononcer.
- [x] Lui faire mémoriser certaines informations personnelles.
- [x] Choisir le nom qu'elle utilise pour s'adresser à toi.
- [x] Effacer les conversations mémorisées.
- [x] Choisir la langue de l'interface et des dialogues.
Modèles et fournisseurs d'IA compatibles avec le chat
- [x] Ollama avec un modèle local.
- [x] Pollinations pour une utilisation en ligne sans compte.
- [x] Groq.
- [x] Google Gemini.
- [x] OpenRouter.
- [x] OpenAI.
- [x] Mistral.
- [x] DeepSeek.
- [x] LM Studio.
- [x] llama.cpp.
- [x] vLLM.
- [x] Tout serveur compatible avec l'API OpenAI.
- [x] Claude Code en mode ligne de commande, dans un dossier choisi.

8. Actions sur l'ordinateur
- [x] Ouvrir des applications.
- [x] Reconnaître des noms traduits d'applications système, comme « météo » pour l'application Weather.
- [x] Fermer des applications.
- [x] Rechercher une musique et ouvrir sa recherche dans l'application Spotify ou Deezer, ou dans leur version web.
- [x] Lire et mettre en pause la musique dans Spotify, Deezer ou un onglet de navigateur actif.
- [x] Demander quelle musique est en cours de lecture (macOS, Windows et Linux avec un lecteur compatible).
- [x] Fermer un onglet après confirmation.
- [ ] Observer l'écran pendant les jeux.
- [ ] Commenter ce qui se passe pendant une partie.
- [Windows] Ouvrir les applications du menu Démarrer.
- [Windows] Lancer des applications du Microsoft Store, comme Spotify.
- [x] Lancer des jeux installés via Steam et Epic Games.
- [x] Contrôler la lecture multimédia : lecture, pause, piste suivante, volume et silence, dans une application ou un onglet compatible.
- [x] Rechercher un artiste ou un morceau sur Spotify et Deezer.
- [x] Ouvrir un site web après confirmation via un bouton.
- [x] Fermer une application après confirmation.
- [x] Proposer une fermeture forcée si l'application reste dans la zone de notification.
- [x] Conserver la possibilité pour l'application de demander d'enregistrer les modifications avant de se fermer.
- [x] Menu macOS pour autoriser les fonctions système nécessaires à l'ouverture et à la fermeture des applications.

9. Guide interactif
- [x] Expliquer le fonctionnement de Capri directement depuis son menu.
- [x] Indiquer où se trouve son icône dans la zone de notification.
- [x] Montrer où se trouve la fenêtre de Claude Code.
- [x] Ouvrir le dossier ~/.claude.
- [x] Sélectionner settings.json pour expliquer la configuration des hooks.
- [x] Installer les hooks de Claude Code en un clic.
- [x] Proposer le lancement de Claude Code ou Codex avec Ollama.
- [x] Pointer visuellement les éléments de l'interface.
- [x] Afficher un réticule, des éclairs et un effet de zoom pendant les explications.

10. Rapport quotidien de mission
- [x] Générer une carte récapitulative du travail de la journée.
- [x] Afficher le nombre de tâches terminées.
- [x] Afficher le nombre d'actions réalisées.
- [x] Afficher les fichiers modifiés.
- [x] Afficher les erreurs rencontrées.
- [x] Indiquer la mission la plus longue et le projet concerné.
- [x] Récapituler les prompts, autorisations et projets.
- [x] Animer les compteurs du rapport.
- [x] Copier l'image du rapport dans le presse-papiers.
- [x] Afficher automatiquement le rapport le soir après au moins trois tâches réalisées.
- [x] Conserver le journal des missions localement, avec un historique journalier.

11. Sons et personnalisation
- [x] Génération des effets sonores en temps réel.
- [x] Son de téléportation.
- [x] Son de fin de tâche.
- [x] Son d'alerte lorsqu'une autorisation est nécessaire.
- [x] Son d'erreur.
- [x] Son de démarrage de session.
- [x] Son de chute et de montée.
- [x] Son des éclairs et de la possession des fenêtres.
- [x] Sons de parole et rappels discrets.
- [x] Remplacement des sons par des fichiers personnels .mp3, .wav, .ogg ou .m4a.
- [x] Réglage du son, de la taille et des animations.
- [x] Démarrage automatique avec le système.
- [x] Choix de la langue : français, anglais, espagnol, portugais brésilien ou russe.
- [x] Personnalisation du comportement et des phrases de Capri.

12. Sécurité et fonctionnement technique
- [x] Fonctionnement de la mascotte sans Claude Code.
- [x] Communication locale avec Claude Code via 127.0.0.1.
- [x] Hooks asynchrones qui ne bloquent pas les opérations de Claude.
- [x] Sauvegarde de la configuration avant modification des hooks.
- [x] Désinstallation des hooks sans supprimer les autres hooks existants.
- [x] Stockage local du journal des missions et des paramètres.
- [x] Chiffrement de la clé API avec le stockage sécurisé du système.
- [Windows] Possibilité de désinstaller l'application depuis les paramètres Windows (entrée générée par l'installateur NSIS).
- [x] Mode développement avec outils de débogage et fenêtres de test.

13. Fonctionnalités supplémentaires
- [x] Ajouter un terminal Capri au style cyberpunk, déplaçable et redimensionnable librement lorsqu'il est développé, réductible à sa ligne de commande puis extensible, permettant de commander Capri avec des commandes (`/chat`, `/call`, `/report`, `/guide`, `/setup`, `/customize`, `/version`, `/open`, `/download`, `/help`, `/network status`, `/get arasaka data`, etc.), avec l'historique des commandes et des résultats.
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
- [x] Ajouter un mode espiègle avec des glitches et des effets de faux piratage.
- [x] Étendre les commandes d'applications et le mode vocal navigateur à macOS et Linux.
- [x] Ajouter le menu « MacOS Permissions », disponible uniquement sur macOS, pour le microphone, l'accessibilité et l'enregistrement de l'écran.

14. Informations sur l'application
- [x] Afficher la version actuelle de Capri depuis le menu et le chat.