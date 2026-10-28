# Capri — vivante

Capri, le construct **Project Capricorn** de *Cyberpunk: Edgerunners* (saison 2), vit sur votre bureau. Elle surveille
votre assistant de code — **Claude Code**, **Codex** ou **Antigravity** — se téléporte, provoque des glitches, commente
chaque action, accourt lorsqu’une autorisation est nécessaire et explose de joie quand le travail est terminé.

Elle peut aussi **discuter avec vous** via n’importe quelle IA — **Claude**, Ollama sur votre PC, Gemini, GPT, Groq et
d’autres —, se mettre en colère, rire, bouder, parler, changer de couleur, voir votre écran, vous écouter, danser avec
votre musique, se souvenir de qui vous êtes et vivre sa vie pendant que vous travaillez.

> Projet réalisé par des fans. Les réponses sont générées par une IA, pas par les scénaristes de la série.
> Canal du créateur : https://t.me/pivoInsider  
> Soutenir le projet : https://www.donationalerts.com/r/pivoinsider

![Capri annonce que Claude a terminé](docs/done.png)

![Téléportation image par image](docs/teleport.png)

## Fonctionnalités principales

- **Surveillance de votre IA de code** (Claude Code, Codex, Antigravity) : Capri commente les actions, demande votre
  autorisation lorsque nécessaire et réagit à la fin de la tâche.
- **Conversation avec une IA** : Ollama local, Claude, Gemini, GPT, Groq et autres fournisseurs. Capri peut parler avec
  Piper, Chatterbox, la voix système ou un service cloud.
- **Vie sur le bureau** : elle s’assoit sur les fenêtres ou la barre des tâches, balance les jambes, flotte, tombe,
  dort, se téléporte, regarde le satellite et réagit au curseur.
- **Possession des fenêtres** : elle peut déplacer vos fenêtres de huit façons, puis les remettre à leur place.
  Elle relâche immédiatement une fenêtre que vous saisissez vous-même.
- **Préparation automatique** : elle analyse le processeur, la mémoire, la carte graphique et le disque, puis recommande
  et installe Ollama, un modèle, Piper, Chatterbox ou Node.js selon les besoins.
- **Réglage des modèles** : les paramètres sont adaptés à la conversation, aux notes et à l’analyse d’écran, en fonction
  de la taille du modèle, de la langue et des performances mesurées sur votre ordinateur.
- **Voix personnalisée** : Chatterbox peut utiliser un échantillon de voix de 5 à 30 secondes.
- **Nettoyage** : le menu indique l’espace occupé par les composants téléchargés et permet de supprimer ce qui appartient
  à Capri.

## Sommaire

1. [Démarrage rapide](#démarrage-rapide)
2. [Installation et lancement](#installation-et-lancement)
3. [Connexion à une IA](#connexion-à-une-ia)
4. [Surveillance de Claude Code, Codex et Antigravity](#surveillance-de-claude-code-codex-et-antigravity)
5. [Utilisation](#utilisation)
6. [Configuration](#configuration)
7. [Fonctionnalités détaillées](#fonctionnalités-détaillées)
8. [Démo sans Claude](#démo-sans-claude)
9. [Sécurité](#sécurité)
10. [Données envoyées hors de l’ordinateur](#données-envoyées-hors-de-lordinateur)
11. [Dépannage](#dépannage)
12. [Questions fréquentes](#questions-fréquentes)
13. [Rendu et animation](#rendu-et-animation)
14. [Développeurs](#développeurs)
15. [Auteurs et droits](#auteurs-et-droits)

---

## Démarrage rapide

1. Téléchargez et installez Capri depuis la page des versions du projet.
2. Au premier lancement, choisissez une IA dans le menu **IA**.
3. Pour surveiller votre assistant de code, installez les hooks proposés dans le menu.
4. Pour parler à Capri, ouvrez le menu circulaire et choisissez **Parler avec moi**.

Capri détecte automatiquement le français, l’anglais ou le russe selon la langue du système. La langue peut être changée
à tout moment dans **Plus › Langue** ou dans le menu de la zone de notification.

## Installation et lancement

### Option 1 : installateur Windows

Téléchargez l’installateur `.exe`, lancez-le et suivez les étapes. Capri peut démarrer automatiquement avec Windows.
L’installateur crée aussi un raccourci dans le menu Démarrer et, si vous le choisissez, sur le bureau.

Windows peut afficher un avertissement SmartScreen, car l’installateur n’est pas signé. Cela ne signifie pas que Capri
effectue une opération cachée : le code de l’application est disponible dans ce dépôt.

### Option 2 : depuis les sources

Prérequis :

- Node.js 20 ou une version ultérieure ;
- npm ;
- Windows, macOS ou Linux.

```bash
git clone https://github.com/mochiiwuff/capri-desktop.git
cd capri-desktop
npm install
npm start
```

Pour le mode développement :

```bash
npm run dev
```

Pour construire l’installateur Windows :

```bash
npm run dist
```

### Problèmes d’installation

| Symptôme | Solution |
|---|---|
| `node` ou `npm` est introuvable | Installez Node.js depuis [nodejs.org](https://nodejs.org), ajoutez-le au `PATH` puis ouvrez un nouveau terminal. |
| `npm install` reste bloqué sur Electron | Vérifiez votre connexion, votre VPN et votre antivirus, puis relancez `npm install`. |
| Capri ne démarre pas | Lancez `npm run dev` depuis un terminal et consultez le message d’erreur. |
| Le fond de Capri est noir | Choisissez **Affichage › OpenGL**, puis **Affichage › Sans carte graphique** si nécessaire. |

## Connexion à une IA

Capri peut fonctionner avec une IA locale, un fournisseur cloud ou Claude Code.

### Claude avec une clé API

1. Créez une clé dans [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Dans Capri, ouvrez **IA › Claude · Clé API**.
3. Collez la clé puis sélectionnez **Connecter**.
4. Choisissez le modèle dans le même menu.

La clé peut aussi provenir de `ANTHROPIC_API_KEY` ou d’une session `ant auth login`. Elle est stockée chiffrée par le
système d’exploitation et n’est envoyée qu’aux serveurs Anthropic.

### Claude Code avec un abonnement

Installez Claude Code puis connectez-vous :

```bash
npm install -g @anthropic-ai/claude-code
claude
```

Dans Capri, choisissez **IA › Claude Code · abonnement**. Sélectionnez le dossier de travail et le niveau d’autorisation
dans **IA › Modèle IA**. Le mode `default` est utilisé par défaut ; `acceptEdits` autorise les modifications sans demande
intermédiaire.

### Ollama sur votre ordinateur

Ollama ne nécessite aucune clé et conserve les données sur votre PC.

1. Ouvrez **IA › Assistant de connexion › Sur mon PC**.
2. Capri installe Ollama si nécessaire et propose un modèle.
3. Elle utilise par défaut `127.0.0.1:11434`, ou la valeur de `OLLAMA_HOST`.

Modèles courants :

- `gemma3:4b` ou une version supérieure : meilleur résultat multilingue ;
- `llama3.2` : plus léger pour les petites configurations.

Vous pouvez aussi installer et sélectionner un modèle manuellement :

```bash
ollama pull gemma3:4b
ollama pull llama3.2
```

### Fournisseurs cloud

Vous pouvez utiliser un fournisseur gratuit ou payant avec sa clé :

- [Groq](https://console.groq.com/keys) ;
- [Gemini](https://aistudio.google.com/apikey) ;
- [OpenRouter](https://openrouter.ai/keys) ;
- OpenAI, Mistral, DeepSeek et Anthropic.

Pollinations peut être utilisé sans clé ni compte. Capri vérifie la clé au moment de la connexion et signale clairement
les erreurs.

### Serveur compatible OpenAI

LM Studio, llama.cpp, vLLM et les autres serveurs compatibles OpenAI peuvent être utilisés avec une adresse personnalisée,
par exemple :

```text
http://127.0.0.1:1234/v1
```

## Surveillance de Claude Code, Codex et Antigravity

### Claude Code

Dans le menu de Capri, choisissez **Installer les hooks Claude Code**. Capri ajoute ses hooks dans
`~/.claude/settings.json` et crée une copie avant toute modification.

### Codex

Installez Node.js si nécessaire, puis choisissez l’installation des hooks Codex. Les événements sont lus depuis le fichier
de hooks de Codex et affichés dans le panneau de Capri.

### Antigravity

Choisissez **Installer les hooks Antigravity** dans le menu. Démarrez ensuite une nouvelle conversation dans Antigravity.

Les hooks peuvent être retirés depuis le même menu. L’assistant de code continue à fonctionner même lorsque Capri est
fermée.

## Utilisation

### Menu circulaire

Cliquez avec le bouton droit sur Capri pour ouvrir le menu. Les sections principales sont :

- **Caractère** : émotions, activités autonomes, apprentissage et mode DJ ;
- **Sens** : vision de l’écran, microphone et danse ;
- **Mains** : contrôle des fenêtres et saisie de messages ;
- **Voix** : moteur, vitesse, volume et voix personnalisée ;
- **IA** : fournisseur, modèle, clé et serveur ;
- **Plus** : langue, taille, affichage, position et hooks.

Le raccourci `Ctrl+Alt+C` cache Capri dans sa puce. Le même raccourci la fait revenir.

### Suivi d’une tâche

La ligne au-dessus de Capri affiche l’action en cours : lecture, écriture, recherche, exécution ou délégation. Les états
principaux sont **EN COURS**, **EN ATTENTE**, **TERMINÉ**, **ERREUR** et **INACTIF**.

Lorsque Claude attend une autorisation, Capri se rapproche de la fenêtre concernée et affiche un indicateur. Lorsque la
tâche se termine, elle joue une séquence de victoire et affiche un résumé des actions et des fichiers.

### Conversation

Le chat affiche clairement si la réponse vient d’une IA locale ou d’un service en ligne. Les réponses peuvent déclencher
des actions comme ouvrir un site ou une application, mais les opérations sensibles demandent toujours une confirmation.

## Configuration

Les paramètres sont stockés dans `config.json` dans le dossier de données de Capri. Les paramètres importants sont :

| Paramètre | Description |
|---|---|
| `lang` | `auto`, `ru`, `en` ou `fr` |
| `theme`, `scale`, `rest` | Couleur, taille et emplacement au repos |
| `motion`, `render` | Animations et mode de rendu |
| `voiceMode`, `ttsEngine`, `ttsRate`, `audioOut` | Voix, moteur, vitesse et sortie audio |
| `ears`, `converse`, `micDevice`, `micSensitivity` | Microphone et conversation continue |
| `vision`, `visionEvery` | Vision de l’écran et intervalle entre deux captures |
| `rhythm`, `hands`, `handsType` | Danse et contrôle des fenêtres |
| `learn`, `memories`, `myLines` | Apprentissage et personnalisation |
| `emotions`, `life`, `dj`, `musicAware`, `wander` | Activités autonomes |
| `possess`, `possessMove` | Possession et déplacement des fenêtres |
| `mindTune` | Résultats de l’ajustement du modèle local |
| `muted`, `volume`, `visible`, `welcomed`, `linked` | État de l’interface et de la session |

## Fonctionnalités détaillées

### Apparition

Au premier lancement, Capri s’accroche aux bords de l’écran, frappe la vitre, se présente puis s’installe sur le bureau.
Cette séquence est disponible dans [docs/intro.png](docs/intro.png).

### Animations

Capri utilise une animation dessinée image par image, avec environ 12 dessins par seconde au repos et davantage pendant les
téléportations. Les effets comprennent les glitches, les traînées, les copies colorées, les éclairs rouges, les chutes,
les poses de victoire et le sommeil.

### Sommeil et consommation

Après plusieurs minutes d’inactivité, Capri s’endort et réduit fortement son activité. Les assistants qui observent les
fenêtres et la musique sont mis en pause. Un clic, un événement de l’assistant de code, le menu ou un raccourci la réveille.

### Voix

Les moteurs disponibles sont :

- **Piper** : léger, local et adapté aux petites configurations ;
- **Chatterbox** : plus expressif, mais plus lourd ;
- **Système** : voix intégrée à Windows ou macOS ;
- **OpenAI** et **ElevenLabs** : voix cloud avec clé ;
- **Serveur personnalisé** : serveur compatible OpenAI.

Piper recherche une voix russe, anglaise ou française. La voix système utilise respectivement `ru-RU`, `en-US` ou `fr-FR`.

### Voix personnalisée

Dans le menu **Voix**, sélectionnez **Utiliser un échantillon** puis choisissez un fichier contenant 5 à 30 secondes de
parole claire. Chatterbox pourra utiliser cet échantillon. L’audio reste dans le dossier de données de Capri, sauf si
vous utilisez explicitement un moteur cloud.

### Vision, écoute et danse

Ces fonctions sont désactivées par défaut, car elles donnent accès à l’écran, au son ou au microphone.

- **Vision** : Capri capture une petite image de l’écran à la demande ou selon `visionEvery`. La capture n’est pas stockée.
- **Danse** : elle analyse uniquement le volume et le rythme du son système, sans enregistrer la musique.
- **Microphone** : `Ctrl+Alt+Space` lance une capture, une transcription et une réponse. Le mode conversation maintient
  le microphone ouvert entre les tours.

Les moteurs de transcription disponibles comprennent Groq, OpenAI et les serveurs Whisper compatibles.

### Contrôle des fenêtres et messages

La fonction **Mains** est désactivée par défaut. Lorsqu’elle est activée, Capri peut réduire, agrandir ou sélectionner
des fenêtres. Elle peut aussi préparer un message dans Telegram, Discord, WhatsApp ou Slack, mais elle ne l’envoie jamais
sans confirmation explicite.

Si une autre fenêtre passe au premier plan pendant la saisie, Capri s’arrête pour éviter d’écrire au mauvais endroit.

### Apprentissage

L’apprentissage est conservé localement dans `bond.json`. Capri mémorise uniquement des informations générales que vous
avez volontairement données : préférences, projets, habitudes de conversation et nom.

Les mots de passe, adresses exactes, numéros de téléphone, e-mails, données bancaires, informations de santé et documents
ne sont pas conservés.

### Nettoyage et désinstallation

Le menu **Ce qui est installé** indique la taille des modèles et outils. Capri ne supprime que les éléments qu’elle a
installés ou enregistrés dans `installed.json`. Elle ne touche pas aux modèles ou dossiers installés manuellement par vous.

La désinstallation peut supprimer les composants téléchargés par Capri. Une désinstallation silencieuse ou une mise à jour
ne supprime pas ces données, sauf si vous utilisez explicitement `--remove-everything`.

## Démo sans Claude

```bash
npm run demo
```

Pour lancer la démo en russe :

```bash
npm run demo -- ru
```

La démo joue une session fictive complète, puis montre les comportements autonomes de Capri. La séquence accepte aussi
`en` et `fr`.

## Sécurité

- Le code de l’application est présent dans ce dépôt.
- La communication avec Claude Code utilise `127.0.0.1`.
- Les hooks sont sauvegardés avant modification et peuvent être supprimés depuis le menu.
- La vision et le microphone sont désactivés par défaut et signalés lorsqu’ils sont actifs.
- Les actions irréversibles demandent une confirmation : envoi de message, fermeture d’application, ouverture d’un site,
  lancement d’une application et suppressions.
- Capri ne supprime que ses propres installations et vérifie que chaque chemin se trouve dans son dossier de données.
- Les fenêtres sont déplacées temporairement puis restaurées. Une action manuelle de l’utilisateur interrompt le contrôle.

## Données envoyées hors de l’ordinateur

Les données dépendent des fonctions que vous activez :

- Ollama local, Piper et Chatterbox local restent sur votre ordinateur ;
- Claude, OpenAI, Gemini, Groq, OpenRouter, Mistral, DeepSeek et ElevenLabs reçoivent les données nécessaires à leur
  fonctionnement ;
- la vision envoie la capture d’écran au modèle choisi ;
- la transcription envoie l’audio au moteur de reconnaissance sélectionné ;
- le microphone et la vision ne fonctionnent que lorsqu’ils sont activés.

Consultez la politique de confidentialité de chaque fournisseur cloud avant de l’utiliser.

## Dépannage

### Capri ne parle pas

Vérifiez que le moteur choisi dispose d’une voix pour la langue sélectionnée. Pour Piper, ouvrez le menu de préparation et
réinstallez la voix. Pour une voix système, installez le module de langue correspondant dans les paramètres du système.

### Ollama ne répond pas

Vérifiez qu’Ollama fonctionne :

```bash
ollama list
curl http://127.0.0.1:11434/api/tags
```

Téléchargez au moins un modèle avec `ollama pull`.

### Claude Code n’apparaît pas

Réinstallez les hooks depuis le menu, redémarrez Claude Code et lancez une nouvelle tâche. Vérifiez que le fichier
`~/.claude/settings.json` contient bien les hooks Capri.

### Le microphone ou la vision ne fonctionnent pas

Vérifiez les autorisations du système, le périphérique sélectionné et le moteur choisi. Ces fonctions nécessitent une
autorisation explicite dans Capri et dans le système d’exploitation.

## Questions fréquentes

**Capri fonctionne-t-elle sans IA ?**  
Oui. Les animations, les réactions, les menus et le suivi peuvent fonctionner sans fournisseur d’IA. Le chat nécessite
une IA locale ou distante.

**Mes clés sont-elles stockées en clair ?**  
Non. Elles sont conservées dans la configuration protégée de Capri et ne sont pas transmises au moteur de rendu.

**Capri utilise-t-elle mes modèles Ollama ?**  
Elle peut utiliser les modèles que vous sélectionnez. Elle ne supprime pas les modèles installés manuellement par vous.

**Pourquoi Node.js est-il proposé ?**  
Capri n’en a pas besoin pour fonctionner. Node.js sert aux hooks Codex et au lancement depuis les sources.

**Puis-je la désactiver ?**  
Oui. `Ctrl+Alt+C` la cache et **Quitter** ferme l’application. Les assistants de code continuent à fonctionner.

**Puis-je changer de langue ?**  
Oui. Les langues disponibles sont le russe, l’anglais et le français. Choisissez **Plus › Langue** ou la langue dans le
menu de la zone de notification.

## Rendu et animation

Le rendu cherche à donner l’impression que Capri sort directement d’un anime :

- animation image par image, avec des poses conservées plusieurs images ;
- déformations d’anticipation, d’écrasement et d’étirement ;
- cheveux, yeux et copies colorées animés séparément ;
- glitches horizontaux et séparation RGB ;
- téléportation composée de charge, fragments, ligne rouge, éclairs et retour des particules ;
- effets et interfaces dessinés avec Canvas et Web Audio.

Les ressources graphiques sont disponibles dans [assets/](assets/) et les images de démonstration dans [docs/](docs/).

## Développeurs

Installation :

```bash
npm install
```

Lancement :

```bash
npm start
npm run dev
```

Tests ciblés :

```bash
npm run test:character
npm run test:chat
npm run test:labels
npm run test:piper
npm run test:provision
```

Suite complète :

```bash
npm test
```

Scripts utiles :

```bash
npm run demo
npm run voices:demo
npm run check:llm
npm run hooks:install
npm run hooks:uninstall
npm run hooks:codex:install
npm run hooks:codex:uninstall
```

Les textes de l’interface sont centralisés dans :

- `src/main/labels.js` pour le menu système ;
- `src/main/hub-lines.js` pour le menu principal ;
- `src/main/prepare-lines.js` pour la préparation ;
- `src/renderer/js/lines.js` pour les messages de Capri ;
- `src/renderer/js/lines-life.js` pour les comportements autonomes.

Pour ajouter une langue, ajoutez-la à ces dictionnaires, à `LANGS`, aux locales vocales et aux voix Piper, puis mettez à
jour les tests correspondants.

## Auteurs et droits

Capri est un projet de fans inspiré de l’univers de *Cyberpunk: Edgerunners*. Il n’est pas affilié à CD PROJEKT RED,
Netflix ou aux détenteurs des droits de la série.

Le code du projet est distribué sous licence MIT, conformément au fichier [LICENSE](LICENSE). Les polices et les autres
ressources fournies dans `assets/` conservent leurs licences respectives.
