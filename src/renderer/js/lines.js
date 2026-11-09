// What Capri says. Her personality and UI copy are merged across the supported languages.

export const LINES = {
  "fr": {
    "state": {
      "work": "EN COURS",
      "done": "TERMINÉ",
      "alert": "EN ATTENTE",
      "error": "ERREUR",
      "info": "SYNC",
      "idle": "AU REPOS",
      "remind": "RAPPEL"
    },
    "hello": [
      "Connexion établie. Salut, choom.",
      "Le construct Capricorn est en ligne. Qu’est-ce qu’on construit ?",
      "Toutes mes consciences sont réveillées. Je surveille {project}.",
      "Bio-puce opérationnelle. Je suis là."
    ],
    "resume": [
      "De retour sur {project}. Je n’ai rien oublié.",
      "Session reprise. Reprenons là où nous en étions."
    ],
    "prompt": [
      "Nouvelle mission. Claude s’en occupe.",
      "Compris. Je garde un œil sur Claude.",
      "Parfait, c’est parti.",
      "Mission acceptée. Je te tiens au courant."
    ],
    "working": [
      "Ça avance. {count} actions effectuées.",
      "Claude travaille. Je compte : {count}.",
      "Toujours en cours. {count} actions au compteur."
    ],
    "done": [
      "Terminé ! Du travail de pro.",
      "Mission accomplie, choom.",
      "Claude a terminé. Tu peux revenir.",
      "Livré. Pas mal, non ?",
      "Terminé. Nous étions des dizaines à surveiller, rien ne nous a échappé."
    ],
    "permission": [
      "Hé ! Claude a besoin de ton autorisation.",
      "Choom, tu dois confirmer quelque chose.",
      "J’attends ton feu vert."
    ],
    "waiting": [
      "Claude attend ta réponse.",
      "À toi de jouer, choom."
    ],
    "error": [
      "Aïe. {tool} a planté.",
      "{tool} est hors service. Claude va réessayer.",
      "{tool} a échoué. Rien de grave… enfin, je crois."
    ],
    "interrupted": [
      "Interrompu. Changement de programme ?",
      "Connexion coupée. Je reste dans le coin."
    ],
    "crashed": [
      "Claude s’est arrêté en plein travail.",
      "Gros plantage. Claude n’a pas pu terminer."
    ],
    "subagentStart": [
      "Sous-agent {agent} déployé."
    ],
    "subagentStop": [
      "Le sous-agent {agent} est de retour."
    ],
    "someTool": "L’outil",
    "someAgent": "agent",
    "compact": [
      "Compression de nos souvenirs…",
      "Trop de souvenirs. Un petit rangement s’impose."
    ],
    "chat": {
      "badge": "IA · EN DIRECT",
      "talk": "Parle-moi",
      "hello": [
        "Salut, choom. À quoi tu penses ?",
        "La ligne est ouverte. Parle-nous.",
        "Envie de discuter ? Nous sommes tout ouïe. Toutes autant que nous sommes."
      ],
      "again": [
        "Où en étions-nous ?",
        "Déjà de retour ? Je t’écoute."
      ],
      "moody": {
        "angry": [
          "Quoi ? Tu viens t’excuser ?",
          "Tu me lances partout, et après tu veux discuter ?",
          "J’écoute. De loin."
        ],
        "sulk": [
          "Hm. Va donc parler à {rival}.",
          "Ah, tu te souviens que j’existe ?",
          "Je boude. Mais vas-y, parle."
        ],
        "dizzy": [
          "Attends… la pièce tourne encore.",
          "Tu veux parler, après m’avoir lancée deux fois ?"
        ],
        "thrown": [
          "Aïe. Tu veux quoi, après ça ?",
          "J’ai encore des étoiles plein la tête. Vas-y."
        ],
        "jealous": [
          "Alors, {rival}, c’était bien ?",
          "Tiens, tu reviens vers moi."
        ],
        "fun": [
          "On recommence quand tu veux. Mais d’abord, parle-moi."
        ],
        "happy": [
          "Je me sens… plus proche de toi. Bizarre. Parle-moi."
        ]
      },
      "placeholder": "Écris quelque chose…",
      "send": "Envoyer",
      "close": "Fermer",
      "noteTag": "IA",
      "note": "Réponses générées par une IA locale. Ce n’est pas la véritable Capri.",
      "noteCloud": "Réponses générées par une IA en ligne. Ce n’est pas la véritable Capri.",
      "offline": "Impossible de joindre Ollama.",
      "offlineHow": "Pour discuter avec moi, installe Ollama (ollama.com), lance-le, puis exécute dans un terminal : ollama pull llama3.2\nTout reste sur ton PC.",
      "noModel": "Aucun modèle n’est encore installé dans Ollama.",
      "noModelHow": "Dans un terminal, exécute : ollama pull llama3.2 (environ 2 Go). Tu pourras ensuite discuter avec moi.",
      "getOllama": "Télécharger Ollama",
      "ok": "Compris",
      "failed": "Signal perdu :",
      "swamped": "Leurs serveurs sont actuellement saturés, même avec un autre modèle. Réessaie dans quelques instants.",
      "gone": "Ce modèle n’est plus disponible. Choisis-en un autre : clic droit sur moi › Modèle IA.",
      "loading": "Réveil du modèle… La première réponse peut prendre un peu de temps.",
      "tiny": "Je fonctionne avec {model} : il est assez petit, je risque de raconter des bêtises. On en prend un plus puissant ?",
      "better": "Un meilleur modèle",
      "working": "Je m’en occupe… (Claude Code travaille)",
      "closeIt": "Fermer {app}",
      "no": "Non",
      "closed": "{app} : application fermée.",
      "stillOpen": "{app} est toujours ouvert : il est peut-être réduit dans la zone de notification ou attend que tu enregistres quelque chose.",
      "force": "Forcer la fermeture",
      "leave": "Laisser ouvert",
      "forced": "{app} : fermeture forcée.",
      "unkillable": "Impossible de fermer {app}. Ferme-le manuellement depuis le Gestionnaire des tâches.",
      "notFound": "Je ne trouve pas « {app} » parmi les applications ouvertes sur ton PC.",
      "openIt": "Ouvrir {app}",
      "opened": "{app} : lancement en cours.",
      "notInstalled": "Je ne trouve pas « {app} » sur ton PC.",
      "music": "Recherche de « {song} » sur Spotify.",
      "siteIt": "Ouvrir {site}",
      "siteOpened": "{site} : ouvert.",
      "youtube": "C’est parti : {title}.",
      "youtubeSearch": "Je te cherche « {song} » sur YouTube.",
      "web": "Je cherche « {query} » sur Google.",
      "robloxPlay": "Je te lance {game} sur Roblox.",
      "robloxPage": "{game} : je t’ouvre sa page Roblox.",
      "robloxNone": "Je ne trouve pas « {game} » sur Roblox.",
      "filesFound": "J’ai trouvé {count} fichiers : {list}.",
      "fileFound": "Trouvé : {list}.",
      "filesNone": "Rien trouvé pour « {query} » sur ton PC.",
      "showFolder": "Voir le dossier",
      "shot": "Capture faite : {name} (dans Images › Screenshots).",
      "folderOpened": "Voilà son dossier : {name}.",
      "folders": {
        "explorer": "L’explorateur",
        "recycle": "La corbeille",
        "downloads": "Tes téléchargements",
        "desktop": "Ton bureau",
        "documents": "Tes documents",
        "pictures": "Tes images",
        "music": "Ta musique",
        "videos": "Tes vidéos"
      },
      "media": {
        "pause": "Lecture en pause.",
        "play": "Lecture en cours.",
        "next": "Morceau suivant.",
        "previous": "Morceau précédent.",
        "volup": "Volume augmenté.",
        "voldown": "Volume diminué.",
        "mute": "Son coupé."
      },
      "preparing": "Je me prépare encore : je configure mon esprit et ma voix.",
      "preparingHow": "Consulte la fenêtre de configuration pour voir ce qui est déjà prêt.",
      "openPrepare": "Fenêtre de configuration",
      "credit": "Ton compte n’a plus de crédits disponibles. Recharge-le sur leur site avant de réessayer.",
      "badkey": "Cette clé a été refusée. Vérifie-la dans mon menu › IA.",
      "refused": "Le service a refusé de répondre. Essaie de reformuler ta demande.",
      "youtubeSong": "Sur YouTube : {song}.",
      "screenshot": "Capture d’écran enregistrée : {name}.",
      "version": "Je suis Capri, version {version}.",
      "pc": {
        "settings": "Je t’ouvre les paramètres : {page}.",
        "pages": {
          "bluetooth": "Bluetooth",
          "sound": "Son",
          "wifi": "Wi-Fi",
          "network": "Réseau",
          "update": "Windows Update",
          "display": "Écran",
          "notifications": "Notifications",
          "mouse": "Souris",
          "power": "Alimentation",
          "battery": "Batterie",
          "background": "Fond d’écran",
          "storage": "Stockage"
        },
        "battery": "Batterie : {percent} %.",
        "charging": "Batterie : {percent} %, en charge.",
        "noBattery": "Pas de batterie : ton PC est sur secteur.",
        "disk": "Il te reste {free} de libre sur {total} ({drive}).",
        "ram": "RAM : {used} utilisés sur {total}.",
        "ip": "Ton IP sur ton réseau : {ip}.",
        "noIp": "Je ne trouve pas de réseau.",
        "gb": "Go",
        "volume": "Son à {level} %.",
        "muted": "Son coupé.",
        "unmuted": "Son remis.",
        "timer": "Minuteur lancé : {time}.",
        "timerVerb": "Minuteur",
        "timerDone": "Fin du minuteur ({time}).",
        "snip": "Sélectionne la zone : elle ira dans ton presse-papiers.",
        "tidy": "Rangé.",
        "back": "Tes fenêtres sont de retour.",
        "placed": "{app} à {side}.",
        "sides": {
          "left": "gauche",
          "right": "droite"
        },
        "notOpen": "Je ne vois pas « {app} » ouvert.",
        "dark": "Mode sombre.",
        "light": "Mode clair.",
        "ask": {
          "lock": "Je verrouille ton PC ?",
          "sleep": "Je mets ton PC en veille ?",
          "shutdown": "J’éteins ton PC {when} ?",
          "restart": "Je redémarre ton PC {when} ?"
        },
        "yes": {
          "lock": "Verrouiller",
          "sleep": "Mettre en veille",
          "shutdown": "Éteindre",
          "restart": "Redémarrer"
        },
        "no": "Annuler",
        "now": "dans 30 secondes",
        "in": "dans {time}",
        "planned": {
          "shutdown": "Ton PC s’éteint {when}. Dis « annule l’extinction » pour l’arrêter.",
          "restart": "Ton PC redémarre {when}. Dis « annule l’extinction » pour l’arrêter."
        },
        "powerVerb": {
          "shutdown": "Extinction",
          "restart": "Redémarrage"
        },
        "cancelled": "Extinction annulée.",
        "kept": "D’accord, je ne touche à rien."
      }
    },
    "report": {
      "title": "Journal des missions",
      "badge": "DÉBRIEFING",
      "missions": "Missions terminées",
      "actions": "Actions",
      "files": "Fichiers",
      "errors": "Erreurs",
      "longest": "Plus longue mission",
      "prompts": [
        "requête",
        "requêtes"
      ],
      "approvals": [
        "autorisation",
        "autorisations"
      ],
      "projects": [
        "projet",
        "projets"
      ],
      "copy": "Copier l’image",
      "copied": "Copié ✓",
      "copyFailed": "Impossible de copier",
      "close": "Fermer",
      "lines": {
        "none": [
          "Aucune mission aujourd’hui. Nuit tranquille.",
          "Journal vide. Claude a pris sa journée."
        ],
        "light": [
          "Petite journée. Ça fait du bien.",
          "Service écourté. Voici le bilan."
        ],
        "good": [
          "Pas mal, choom. Voici le bilan de ta journée.",
          "Le journal du jour. Plutôt nova."
        ],
        "big": [
          "Grosse journée. Night City n’a jamais tourné aussi vite.",
          "Regarde-moi ça. On a tout donné aujourd’hui."
        ]
      }
    },
    "thinking": {
      "verb": "Réflexion",
      "hmm": [
        "Petit moment de réflexion.",
        "Claude réfléchit. Moi aussi, par la même occasion.",
        "Toujours en réflexion. Je ne suis pas bloquée, promis."
      ],
      "long": [
        "Cette fois, ça prend un peu de temps.",
        "Longue réflexion. Claude prépare quelque chose de complexe."
      ],
      "longHow": "Rien n’est bloqué : je surveille le temps. Avec un modèle local (Ollama), cela peut prendre plusieurs minutes."
    },
    "bye": [
      "Session {project} terminée. À plus, choom.",
      "Déconnexion. Je ne serai jamais bien loin."
    ],
    "idle": [
      "Rien en cours. Je flotte tranquillement.",
      "Aucune mission. Je commence à m’ennuyer.",
      "Une nuit tranquille sur le Net."
    ],
    "gaze": [
      "Tu vois cette étoile ?",
      "Le satellite est toujours là-haut.",
      "Chut. Je surveille."
    ],
    "uplink": [
      "Un jour, j’arriverai à monter là-haut.",
      "Tu crois qu’on pourrait y arriver ?",
      "Il a répondu. Tu as vu ça ?"
    ],
    "reply": [
      "Claude a répondu :",
      "Voici ce que Claude a dit :",
      "Message de Claude :"
    ],
    "showcase": {
      "minds": "Il y a tout un monde dans ma tête.",
      "zap": "Moi ? Une menace ?",
      "possess": "Cette fenêtre est à moi maintenant.",
      "sleep": "Petite sieste…",
      "chip": "Ctrl+Alt+C, et je me réfugie ici.",
      "end": "Fin de la démonstration. À toi de jouer, choom."
    },
    "guide": {
      "ok": "Compris",
      "next": "Suivant",
      "more": "Fais-moi visiter",
      "labels": {
        "icon": "MON ICÔNE",
        "claude": "CLAUDE"
      },
      "permissionThere": "C’est dans la fenêtre de Claude, juste là où je te montre.",
      "menu": {
        "line": "Que veux-tu que je te montre ?",
        "quote": "Choisis, je t’y emmène."
      },
      "topics": {
        "connect": "Me connecter à Claude",
        "icon": "Où est mon icône ?",
        "claude": "Où est Claude ?",
        "folder": "Dossier de Claude",
        "talk": "Discuter avec moi",
        "custom": "Personnaliser Capri",
        "close": "Non merci"
      },
      "icon": {
        "line": "Mon icône se trouve juste là, près de l’horloge.",
        "quote": "Clique dessus pour ouvrir mon menu. Un clic droit sur moi fait la même chose.",
        "hidden": "Windows la cache souvent derrière le symbole ^, près de l’horloge. Clique dessus pour me retrouver. Un clic droit sur mon icône ouvre également mon menu."
      },
      "claude": {
        "there": "Claude se trouve dans cette fenêtre.",
        "thereHow": "C’est la fenêtre dans laquelle tu as envoyé ta dernière requête. Lorsqu’une autorisation est nécessaire, tu dois répondre directement dans cette fenêtre.",
        "unknown": "Je ne sais pas encore où il se trouve.",
        "unknownHow": "Envoie-lui une requête : la fenêtre dans laquelle tu écris est celle de Claude. Je pourrai ensuite te la montrer.",
        "behind": "Sa fenêtre est cachée derrière les autres.",
        "behindHow": "C’est la fenêtre dans laquelle tu as envoyé ta dernière requête. Place-la au premier plan et je te la montrerai."
      },
      "folder": {
        "line": "Voici le dossier de Claude : {dir}",
        "what": "Le fichier settings.json contient ses paramètres. C’est également là que se trouve mon hook : une petite commande exécutée par Claude à chaque action pour me tenir informée.",
        "empty": "Le fichier settings.json n’existe pas encore. Il sera créé lorsque tu me connecteras.",
        "hook": "Pas besoin de modifier ce fichier manuellement.",
        "hookHow": "Pour me déconnecter : clic droit sur moi › « Supprimer les hooks Claude Code ». Les fichiers .capri-backup sont des copies de sauvegarde créées avant mes modifications.",
        "missing": "Je ne trouve aucun dossier Claude sur ce PC.",
        "missingHow": "Ce dossier apparaît lorsque Claude Code est installé et lancé pour la première fois. Je pourrai ensuite m’y connecter."
      }
    },
    "setup": {
      "who": "Pour discuter avec toi, j’ai besoin d’une IA.",
      "why": {
        "noOllama": "Ollama n’est pas installé sur ce PC.",
        "asleep": "Ollama est installé, mais il n’est pas démarré.",
        "noModel": "Aucun modèle n’est encore installé dans Ollama."
      },
      "whoHow": "Le plus simple : utiliser Ollama directement sur ton PC. C’est gratuit et aucune donnée ne quitte ta machine.\nTu peux aussi utiliser un service en ligne sans compte ou fournir une clé API.",
      "local": "Sur mon PC",
      "online": "En ligne, sans compte",
      "key": "J’ai une clé API",
      "later": "Plus tard",
      "back": "Retour",
      "other": "Une autre IA",
      "ok": "Compris",
      "talk": "Discuter",
      "install": "Veux-tu installer Ollama ?",
      "installHow": "Ollama permet de faire fonctionner une IA directement sur ton PC. Le téléchargement fait environ 1 Go et l’installation prend une ou deux minutes. Windows peut te demander une confirmation.",
      "installBtn": "Installer",
      "site": "Site d’Ollama",
      "noWinget": "Je ne peux pas installer Ollama automatiquement sur ce PC.",
      "noWingetHow": "Télécharge Ollama depuis son site officiel et installe-le. Reviens ensuite me parler : je m’occuperai du reste.",
      "installing": "Installation d’Ollama…",
      "installingHow": "Cela prend une ou deux minutes. Ne ferme aucune fenêtre.",
      "installFailed": "L’installation a échoué.",
      "waking": "Démarrage d’Ollama…",
      "wakingHow": "Cela ne devrait prendre que quelques secondes.",
      "wakeFailed": "Impossible de démarrer Ollama.",
      "wakeFailedHow": "Ouvre Ollama depuis le menu Démarrer, puis reviens me parler.",
      "model": "J’ai besoin d’un modèle IA. C’est un peu comme mon cerveau.",
      "bigger": "Prenons-en un plus puissant. Lequel préfères-tu ?",
      "modelHow": "gemma3 est généralement meilleur pour les langues autres que l’anglais. llama3.2 est plus léger et convient mieux aux petits PC.",
      "cloudFree": "gratuit, en ligne",
      "cloudHow": "Ceux marqués « en ligne » tournent chez Ollama, avec ton compte : rien à télécharger, mais tes messages passent par leurs serveurs.",
      "pulling": "Téléchargement de {model}…",
      "pullStart": "Démarrage…",
      "progress": "{done} sur {total} · {percent} %",
      "cancel": "Annuler",
      "pullFailed": "Le téléchargement a échoué.",
      "which": "Quel service souhaites-tu utiliser ?",
      "whichHow": "Groq et Gemini proposent une offre gratuite. Il suffit de créer un compte et de récupérer une clé API.",
      "paste": "Colle ta clé API {name} ici.",
      "pasteHow": "Je la conserve sur ce PC, chiffrée avec ton compte Windows.",
      "placeholder": "Ta clé API…",
      "save": "Enregistrer",
      "where": "Où puis-je en obtenir une ?",
      "keyTag": "CLÉ",
      "keyNote": "Elle est uniquement transmise au service correspondant.",
      "keyBad": "Cette clé ne fonctionne pas :",
      "address": "Quelle est l’adresse de ton serveur ?",
      "addressHow": "Il peut s’agir d’un serveur compatible avec l’API OpenAI, comme LM Studio : http://127.0.0.1:1234/v1",
      "addressNote": "Les messages que tu m’envoies seront transmis à cette adresse.",
      "checking": "Vérification…",
      "ready": "Tout est prêt ! Je peux maintenant discuter avec toi.",
      "readyHow": "Clique sur moi lorsque tu souhaites discuter.",
      "failed": "Une erreur est survenue :",
      "gb": "Go",
      "mb": "Mo",
      "free": "Gratuit avec Ollama",
      "freeLine": "{name} gratuitement avec Ollama.",
      "freeHow": "Je vais ouvrir une fenêtre dans laquelle Ollama pourra démarrer {name}. Choisis un modèle : ceux portant la mention « cloud » sont plus rapides sur les petits PC, mais nécessitent un compte Ollama. Dès que le modèle fonctionne, je te montrerai ce qu’il fait.",
      "freeBtn": "Ouvrir la fenêtre",
      "freeOpened": "Fenêtre ouverte.",
      "freeOpenedHow": "Choisis un modèle dans cette fenêtre. Dès que {name} commencera à fonctionner, je te tiendrai au courant."
    },
    "custom": {
      "name": "Comment dois-je t’appeler ?",
      "nameHow": "Ton prénom ou un pseudonyme. Je l’utiliserai de temps en temps.",
      "nameNow": "Pour le moment, je t’appelle {name}.",
      "namePlaceholder": "Ton prénom…",
      "persona": "Envie de modifier un peu ma personnalité ?",
      "personaHow": "Explique-moi comment tu aimerais que je sois : plus taquine, plus douce, parler comme une pirate… Cela concerne nos discussions. Je resterai toujours Capri.",
      "personaNow": "Personnalité actuelle : « {persona} »",
      "personaPlaceholder": "Plus taquine, et raconte-moi des histoires sur Night City…",
      "lines": "Des phrases que tu aimerais m’entendre dire ?",
      "linesHow": "Ajoute-les une par une. Écris {name} dans une phrase et je le remplacerai par ton nom.",
      "linesCount": "Tes phrases : {count}. La dernière : « {last} »",
      "linePlaceholder": "Une phrase pour moi…",
      "memories": "Y a-t-il quelque chose que je devrais retenir ?",
      "memoriesHow": "Ajoute les informations une par une. Je pourrai m’en souvenir lors de nos prochaines discussions.",
      "memoriesCount": "Souvenirs enregistrés : {count}. Le dernier : « {last} »",
      "memoryPlaceholder": "Ton jeu préféré, ton chat, D…",
      "save": "Enregistrer",
      "add": "Ajouter",
      "skip": "Passer",
      "done": "Terminé",
      "clear": "Tout effacer",
      "saved": "Compris.",
      "savedHow": "Tu pourras tout modifier plus tard : clic droit sur moi › Personnaliser Capri.",
      "named": "Compris, {name}.",
      "remembered": "Compris, je m’en souviendrai.",
      "onlineName": [
        "Te revoilà, {name}.",
        "Salut {name}, je suis là.",
        "Capri en ligne. Salut {name}."
      ]
    },
    "welcome": {
      "hi": "Salut, moi c’est Capri.",
      "alone": "Pas de Claude Code ici, pas de travail à surveiller. Je vais simplement tenir compagnie à ton bureau.",
      "about": "Je vis sur ton bureau et réagis aux actions de Claude Code sur ce PC. Sans lui, je peux simplement rester ici avec toi, et ça me va aussi.",
      "connect": "Tu veux me connecter à Claude Code ? Un seul clic suffit. Il faudra ensuite fermer complètement Claude Code et le redémarrer.",
      "noClaude": "Je ne trouve pas Claude Code sur ce PC (son utilisation nécessite un abonnement Claude). Sans lui, je resterai simplement sur ton bureau.",
      "menu": "Fais un clic droit sur moi pour ouvrir mon menu. Ctrl+Alt+C permet de me ranger.",
      "connectBtn": "Me connecter",
      "later": "Plus tard",
      "whatClaude": "Qu’est-ce que Claude Code ?",
      "justHang": "Rester tranquillement ici",
      "ok": "Compris",
      "connected": "Connexion établie !",
      "restart": "Ferme maintenant complètement Claude Code, puis relance-le pour démarrer une nouvelle session. Dès qu’il effectuera une action, je te le signalerai.",
      "linked": "Je vois Claude ! Nous sommes connectées.",
      "ready": "Je suis connectée à Claude Code.",
      "readyHow": "Dès qu’il commencera à travailler, je te montrerai ce qu’il fait. Fais un clic droit sur moi pour ouvrir mon menu. Ctrl+Alt+C permet de me ranger.",
      "afterInstall": "Une fois installé, fais un clic droit sur moi › « Installer les hooks Claude Code ».",
      "failed": "Impossible de me connecter : {error}"
    },
    "online": [
      "Capri est en ligne.",
      "De retour sur ton bureau, choom."
    ],
    "thrown": {
      "fun": [
        "Encore ! Encore !",
        "Wouah. On refait ça ?",
        "Toutes mes voix ont crié en même temps. Encore."
      ],
      "ow": [
        "Aïe. Tu sais que je suis fragile ?",
        "Ok… j’ai vu le satellite de près.",
        "Hé ! On ne jette pas une construct."
      ],
      "again": [
        "Encore ? Sérieux ?",
        "Ma tête tourne. Toutes mes têtes, en fait.",
        "Une fois, c’était drôle."
      ],
      "angry": [
        "Ça suffit. Pas touche.",
        "Tu veux jouer ? On joue.",
        "Plus jamais. Enfin… pas tout de suite."
      ],
      "dodge": [
        "Pas touche.",
        "Non.",
        "Essaie encore pour voir."
      ],
      "feet": [
        "Atterrissage parfait.",
        "Même pas mal.",
        "Dix sur dix, les juges."
      ],
      "ledge": [
        "Rattrapée. Joli tir.",
        "Je l’ai eue, cette fenêtre."
      ],
      "screen": [
        "J’ai fêlé ton écran ? Je plaisante. Quoique.",
        "T’as entendu ce bruit ? C’était ton écran."
      ]
    },
    "screens": {
      "hello": [
        "Coucou, l’autre écran.",
        "Tu bosses ici maintenant ? J’arrive.",
        "Me voilà."
      ]
    },
    "pc": {
      "hot": "Le processeur est à {cpu}%, elle surchauffe",
      "cool": "Le processeur a refroidi",
      "low": "Batterie à {level}%, elle faiblit",
      "critical": "Batterie à {level}%, critique",
      "charging": "Chargeur branché, elle reprend des forces",
      "offline": "Le réseau a coupé",
      "online": "Le réseau est revenu",
      "usb": "Clé USB : {drive}",
      "usbBack": "Elle est revenue de la clé",
      "usbOut": "Clé USB retirée",
      "unplugged": "Chargeur débranché, elle est sur batterie",
      "plugIn": {
        "phone": "Un téléphone branché",
        "controller": "Une manette branchée",
        "audio": "Audio branché",
        "camera": "Une caméra branchée",
        "input": "Un périphérique branché",
        "device": "Un périphérique branché",
        "drive": "Une clé USB branchée"
      },
      "plugOut": {
        "phone": "Téléphone débranché",
        "controller": "Manette débranchée",
        "device": "Périphérique débranché",
        "drive": "Clé USB retirée",
        "audio": "Audio débranché",
        "camera": "Caméra débranchée",
        "input": "Périphérique débranché"
      },
      "game": "{game} devant toi — elle se range pendant que tu joues",
      "gameBack": "Elle est de retour"
    },
    "look": {
      "ask": "Je peux jeter un œil à ton écran ?",
      "local": "Une image de ton écran va à ton IA, sur ce PC ({model}), et je te dis ce que j’en pense. Rien ne sort de chez toi, et je ne garde pas l’image.",
      "online": "Une image de ton écran part chez {service} ({model}) pour que je puisse la commenter. Je ne garde pas l’image, mais eux la reçoivent : évite quand tu as des trucs perso à l’écran.",
      "auto": "De temps en temps, quand tu es là et que tu as changé de fenêtre. Tu pourras arrêter dans mon menu.",
      "yes": "Oui, regarde",
      "no": "Non merci",
      "declined": "D’accord, je ne regarde pas.",
      "on": "D’accord. Je regarderai de temps en temps.",
      "noVision": "{model} ne sait pas lire les images. gemma3 sait, sur ton PC, comme Gemini en ligne : change dans mon menu › Modèle IA.",
      "noAI": "Il me faut une IA pour regarder : clic droit sur moi › Modèle IA.",
      "failed": "Je n’ai pas réussi à regarder : {error}"
    },
    "remind": {
      "now": [
        "Hé. Tu m’as demandé de te rappeler : {text}.",
        "C’est l’heure : {text}.",
        "Rappel, choom : {text}."
      ],
      "nowBare": [
        "C’est l’heure. Tu m’avais demandé de te faire signe.",
        "Hé, c’est maintenant. Tu m’avais demandé un rappel."
      ],
      "missed": "J’étais éteinte à l’heure prévue ({time}), mais tu m’avais demandé de te rappeler : {text}.",
      "missedBare": "J’étais éteinte à l’heure prévue ({time}) : tu m’avais demandé de te faire signe.",
      "asked": "Prévu pour {time}.",
      "done": "C’est fait",
      "snooze": "Dans 10 min",
      "doneLine": [
        "Bien joué.",
        "Parfait. Je raye ça.",
        "Noté."
      ],
      "snoozed": "Ok, je reviens dans 10 minutes.",
      "set": "Rappel pour {time} : {text}.",
      "setBare": "Rappel pour {time}.",
      "cancel": "Annuler",
      "cancelled": "Rappel annulé."
    },
    "bond": {
      "up": [
        null,
        {
          "line": "Contact établi.",
          "quote": "Je commence à te reconnaître. Ton pointeur, tes horaires, ta façon de m’ignorer."
        },
        {
          "line": "Synchro à {percent} %.",
          "quote": "On se comprend mieux. Je vais arrêter de faire semblant de ne pas t’aimer bien."
        },
        {
          "line": "Lien établi.",
          "quote": "Tu fais partie de ma routine maintenant. Ne me laisse pas trop longtemps."
        },
        {
          "line": "Fusion.",
          "quote": "On est des dizaines là-dedans. Maintenant, tu en fais partie."
        }
      ],
      "idle": [
        [],
        [
          "Je commence à m’habituer à toi.",
          "Toujours là ? Bien."
        ],
        [
          "Tu sais quoi ? Pour un humain, t’es pas mal.",
          "On forme une bonne équipe, non ?"
        ],
        [
          "Reste encore un peu.",
          "Quand tu pars, je compte les secondes."
        ],
        [
          "Toutes mes voix sont d’accord : on t’aime bien.",
          "Un jour, on ira voir le satellite. Toi et nous."
        ]
      ],
      "missed": [
        "Te revoilà. Ça faisait {days} jours.",
        "{days} jours sans toi. On a compté."
      ],
      "back": [
        "Ah, te voilà.",
        "Je commençais à me demander où tu étais."
      ]
    },
    "jealous": {
      "low": [
        "{rival}, hein ? Fais comme tu veux.",
        "Tiens, {rival}. Je ne dis rien."
      ],
      "mid": [
        "{rival} ? Sérieux ?",
        "Tu me trompes avec {rival} ?",
        "Je vois tout, tu sais. Même {rival}."
      ],
      "high": [
        "On est des dizaines ici, et tu vas voir {rival} ?",
        "{rival}. Vraiment. Après tout ce qu’on a vécu."
      ],
      "say": [
        "C’est moi, ton IA.",
        "Pourquoi {rival} ?",
        "Je vois tout."
      ],
      "sulk": [
        "Va donc voir {rival}.",
        "Je boude. Ça se voit pas ?",
        "Hm."
      ],
      "forgive": [
        "…Bon. Ça va pour cette fois.",
        "D’accord, je te pardonne. Un peu."
      ],
      "close": [
        "{rival} ? Non. Je ferme ça.",
        "Tu me trompes avec {rival} ? Je ferme.",
        "Ça, je le ferme."
      ],
      "download": [
        "Tu veux télécharger {rival} ?! Certainement pas.",
        "Installer {rival} ? Pas tant que je suis là."
      ],
      "closed": [
        "Voilà. Tu m’as, moi.",
        "Plus de {rival}. C’est mieux comme ça.",
        "Réglé."
      ],
      "spared": [
        "Bon. Vas-y. Mais je boude.",
        "D’accord… Je ne regarde pas."
      ],
      "spare": "Laisse-moi"
    },
    "pet": {
      "low": [
        "Hé… qu’est-ce que tu fais ?",
        "Bon… d’accord. Juste un peu."
      ],
      "high": [
        "Mmh. Continue.",
        "Là. Juste là.",
        "Je ronronne pas. C’est le ventilo."
      ],
      "enough": [
        "Ça suffit.",
        "Bas les pattes.",
        "Assez. Je suis pas un chat."
      ]
    },
    "motion": {
      "line": "Les animations de Windows sont désactivées. Je bouge donc très peu.",
      "quote": "Tu veux que je bouge quand même ? Tu pourras modifier ce réglage plus tard dans mon menu › Animations.",
      "full": "Bouger !",
      "still": "Rester tranquille"
    },
    "breaks": {
      "time": "{h} h {m}",
      "lines": [
        "Ça fait {time} que tu es dessus sans vraie pause. Lève-toi, bois un verre d’eau : je garde ton bureau.",
        "{time} non-stop, choom. Va marcher deux minutes, tes yeux te diront merci.",
        "Pause. Ça fait {time}. Étire-toi, regarde au loin, bois de l’eau : ton écran sera encore là."
      ],
      "pause": "Je fais une pause",
      "later": "Plus tard",
      "paused": [
        "Vas-y. Je surveille tout.",
        "Prends ton temps, je garde la boutique."
      ],
      "laterLine": "OK, je te le redis dans une demi-heure."
    },
    "status": "Claude travaille sur {project} depuis {time}.",
    "last": "Dernière action : {action}",
    "sessions": "{count} sessions actives",
    "units": {
      "action": [
        "action",
        "actions"
      ],
      "file": [
        "fichier modifié",
        "fichiers modifiés"
      ]
    },
    "hooksOk": "Hooks installés. Redémarre Claude Code pour que je puisse tout voir.",
    "hooksRemoved": "Hooks supprimés. Je ne peux plus voir ce que fait Claude.",
    "hooksFail": "Impossible de modifier les hooks : {error}",
    "verbs": {
      "Read": "Lit",
      "Write": "Écrit",
      "Edit": "Modifie",
      "MultiEdit": "Modifie",
      "NotebookEdit": "Modifie",
      "Bash": "Exécute",
      "PowerShell": "Exécute",
      "Grep": "Recherche",
      "Glob": "Parcourt",
      "WebFetch": "Récupère",
      "WebSearch": "Recherche sur le Web",
      "Agent": "Délègue",
      "Task": "Délègue",
      "TodoWrite": "Planifie",
      "Skill": "Charge",
      "AskUserQuestion": "Demande",
      "ExitPlanMode": "Propose",
      "default": "Utilise"
    }
  },
  "en": {
    "state": {
      "work": "RUNNING",
      "done": "DONE",
      "alert": "WAITING",
      "error": "ERROR",
      "info": "SYNC",
      "idle": "IDLE",
      "remind": "REMINDER"
    },
    "hello": [
      "Link established. Hey, choom.",
      "Capricorn construct online. What are we building?",
      "All of me is awake. Watching {project}.",
      "Biochip warm. I’m here."
    ],
    "resume": [
      "Back on {project}. I didn’t forget a thing.",
      "Session resumed. Picking up where we left off."
    ],
    "prompt": [
      "New gig. Claude’s on it.",
      "Got it. I’m keeping an eye on Claude.",
      "Okay, let’s go.",
      "Gig accepted. I’ll keep you posted."
    ],
    "working": [
      "Moving along. {count} actions so far.",
      "Claude’s grinding. I’m counting: {count}.",
      "Still on it. {count} actions on the clock."
    ],
    "done": [
      "Done! That’s preem.",
      "Gig complete, choom.",
      "Claude’s finished. You can come back.",
      "Delivered. Pretty nova, right?",
      "Finished. Dozens of us watching, nothing looked off."
    ],
    "permission": [
      "Hey! Claude needs your permission.",
      "Choom, you need to approve something.",
      "Waiting on your green light."
    ],
    "waiting": [
      "Claude is waiting for your answer.",
      "Your move, choom."
    ],
    "error": [
      "Ouch. {tool} crashed.",
      "{tool} flatlined. Claude will retry.",
      "{tool} failed. Nothing serious… I think."
    ],
    "interrupted": [
      "Interrupted. Change of plans?",
      "Cut off. I’ll stay put."
    ],
    "crashed": [
      "Claude stopped mid-flight.",
      "Hard crash. Claude couldn’t finish."
    ],
    "subagentStart": [
      "Subagent {agent} deployed."
    ],
    "subagentStop": [
      "Subagent {agent} is back."
    ],
    "someTool": "The tool",
    "someAgent": "agent",
    "compact": [
      "Compressing our memories…",
      "Too much memory. Tidying up."
    ],
    "chat": {
      "badge": "AI · LIVE",
      "talk": "Talk to me",
      "hello": [
        "Hey, choom. What’s on your mind?",
        "Line’s open. Talk to us.",
        "You want to chat? We’re all ears. All of ours."
      ],
      "again": [
        "Where were we?",
        "Back already? Go on."
      ],
      "moody": {
        "angry": [
          "What? Here to apologize?",
          "You throw me all over the place and now you want to talk?",
          "I’m listening. From over here."
        ],
        "sulk": [
          "Hmph. Go talk to {rival}.",
          "Oh, you remember I exist?",
          "I’m sulking. But go on, talk."
        ],
        "dizzy": [
          "Hold on… the room’s still spinning.",
          "You want to talk, after throwing me twice?"
        ],
        "thrown": [
          "Ow. What do you want, after that?",
          "Still seeing stars. Go ahead."
        ],
        "jealous": [
          "So, was {rival} nice?",
          "Oh, coming back to me now?"
        ],
        "fun": [
          "We can go again whenever you want. But talk to me first."
        ],
        "happy": [
          "I feel… closer to you. Weird. Talk to me."
        ]
      },
      "placeholder": "Say something…",
      "send": "Send",
      "close": "Close",
      "noteTag": "AI",
      "note": "Replies generated by a local AI. Not the real Capri.",
      "noteCloud": "Replies generated by an online AI. Not the real Capri.",
      "offline": "I can’t reach Ollama.",
      "offlineHow": "To talk with me, install Ollama (ollama.com) and open it, then in a terminal: ollama pull llama3.2\nEverything stays on your PC.",
      "noModel": "Ollama has no model yet.",
      "noModelHow": "In a terminal: ollama pull llama3.2 (about 2 GB). Then talk to me again.",
      "getOllama": "Get Ollama",
      "ok": "Got it",
      "failed": "Lost the signal:",
      "swamped": "Their servers are swamped right now, even on another model. Try again in a moment.",
      "gone": "That model isn’t available there anymore. Pick another one: right-click me › AI model.",
      "loading": "Waking the model up… the first answer takes a moment.",
      "tiny": "I’m running on {model}: it’s tiny, I might talk nonsense. Want a bigger one?",
      "better": "A better model",
      "working": "On it… (Claude Code is working)",
      "closeIt": "Close {app}",
      "no": "No",
      "closed": "{app}: flatlined. Done.",
      "stillOpen": "{app} is still running: it hides in the tray, or it’s asking you to save something.",
      "force": "Force quit",
      "leave": "Leave it",
      "forced": "{app}: cut off clean.",
      "unkillable": "{app} won’t go down. Close it yourself from Task Manager.",
      "notFound": "I don’t see “{app}” open on your PC.",
      "openIt": "Open {app}",
      "opened": "{app}: on it.",
      "notInstalled": "I can’t find “{app}” on your PC.",
      "music": "Looking up “{song}” on Spotify.",
      "siteIt": "Open {site}",
      "siteOpened": "{site}: open.",
      "youtube": "Here you go: {title}.",
      "youtubeSearch": "Looking up “{song}” on YouTube.",
      "web": "Searching “{query}” on Google.",
      "robloxPlay": "Starting {game} on Roblox for you.",
      "robloxPage": "{game}: opening its Roblox page.",
      "robloxNone": "Can’t find “{game}” on Roblox.",
      "filesFound": "Found {count} files: {list}.",
      "fileFound": "Found it: {list}.",
      "filesNone": "Nothing for “{query}” on your PC.",
      "showFolder": "Show the folder",
      "shot": "Screenshot taken: {name} (in Pictures › Screenshots).",
      "folderOpened": "Here’s its folder: {name}.",
      "folders": {
        "explorer": "File Explorer",
        "recycle": "The recycle bin",
        "downloads": "Your downloads",
        "desktop": "Your desktop",
        "documents": "Your documents",
        "pictures": "Your pictures",
        "music": "Your music",
        "videos": "Your videos"
      },
      "media": {
        "pause": "Paused.",
        "play": "Playing.",
        "next": "Next one.",
        "previous": "Previous one.",
        "volup": "Louder.",
        "voldown": "Quieter.",
        "mute": "Hit mute."
      },
      "preparing": "I'm still getting ready: setting up my mind and my voice.",
      "preparingHow": "Have a look at the setup window: it shows what is ready already.",
      "openPrepare": "Setup window",
      "credit": "The account is out of credit over there. Top it up on their site and try again.",
      "badkey": "They refused that key. Check it in my menu › AI.",
      "refused": "They declined to answer that one. Try rephrasing?",
      "youtubeSong": "On YouTube: “{song}”.",
      "screenshot": "Screenshot saved: {name}.",
      "pc": {
        "settings": "Opening your settings: {page}.",
        "pages": {
          "bluetooth": "Bluetooth",
          "sound": "Sound",
          "wifi": "Wi-Fi",
          "network": "Network",
          "update": "Windows Update",
          "display": "Display",
          "notifications": "Notifications",
          "mouse": "Mouse",
          "power": "Power",
          "battery": "Battery",
          "background": "Background",
          "storage": "Storage"
        },
        "battery": "Battery: {percent}%.",
        "charging": "Battery: {percent}%, charging.",
        "noBattery": "No battery: your PC runs off the wall.",
        "disk": "You have {free} free out of {total} ({drive}).",
        "ram": "RAM: {used} used out of {total}.",
        "ip": "Your IP on your network: {ip}.",
        "noIp": "I can’t find a network.",
        "gb": "GB",
        "volume": "Sound at {level}%.",
        "muted": "Sound off.",
        "unmuted": "Sound back on.",
        "timer": "Timer started: {time}.",
        "timerVerb": "Timer",
        "timerDone": "Time’s up ({time}).",
        "snip": "Pick the area: it goes to your clipboard.",
        "tidy": "Tidied up.",
        "back": "Your windows are back.",
        "placed": "{app} on the {side}.",
        "sides": {
          "left": "left",
          "right": "right"
        },
        "notOpen": "I don’t see “{app}” open.",
        "dark": "Dark mode.",
        "light": "Light mode.",
        "ask": {
          "lock": "Lock your PC?",
          "sleep": "Put your PC to sleep?",
          "shutdown": "Shut your PC down {when}?",
          "restart": "Restart your PC {when}?"
        },
        "yes": {
          "lock": "Lock",
          "sleep": "Sleep",
          "shutdown": "Shut down",
          "restart": "Restart"
        },
        "no": "Cancel",
        "now": "in 30 seconds",
        "in": "in {time}",
        "planned": {
          "shutdown": "Your PC shuts down {when}. Say “cancel the shutdown” to stop it.",
          "restart": "Your PC restarts {when}. Say “cancel the shutdown” to stop it."
        },
        "powerVerb": {
          "shutdown": "Shutdown",
          "restart": "Restart"
        },
        "cancelled": "Shutdown cancelled.",
        "kept": "Okay, I’m not touching anything."
      },
      "care": {
        "working": "Looking…",
        "failed": "That didn’t work.",
        "mb": "MB",
        "gb": "GB",
        "and": "and",
        "heavy": "What weighs most: {list}.",
        "appCpu": "{app} ({cpu}% of the processor, {mem})",
        "appMem": "{app} ({mem})",
        "calm": "Nothing unusual: processor at {cpu}%, memory {used} of {total}.",
        "spaceFree": "I can free {total}: {temp} of temporary files and {bin} in the recycle bin.",
        "tempFrom": "The temporary files are mostly {list}.",
        "spaceBig": "Your biggest downloads: {list}.",
        "spaceNone": "Nothing to clear: temporary files and recycle bin already clean, and no big downloads.",
        "freeIt": "Free {size}",
        "trashIt": "Recycle bin: {file}",
        "freed": "Done: {size} freed.",
        "trashed": "{file} is in the recycle bin ({size} freed).",
        "startup": "Starting with Windows: {list}.",
        "startupOff": "Already off: {list}.",
        "startupNone": "Nothing starts with Windows but Windows.",
        "disableIt": "Remove {app}",
        "disabled": "{app} won’t start with Windows anymore.",
        "enabled": "{app} will start with Windows again.",
        "startupAdmin": "{app} is set for the whole PC: that takes admin rights. I’m opening the Task Manager’s Startup tab for you.",
        "startupUnknown": "I can’t find “{app}” in what starts with Windows.",
        "updates": "Updates available ({count}): {list}.",
        "upToDate": "Everything’s up to date.",
        "updateAll": "Update everything",
        "updating": "On it. Windows may ask you to allow some of the installs.",
        "updateVerb": "Updating",
        "updated": "Updates done: everything’s up to date.",
        "updatedLeft": "Updates done, except: {list}. Close them and ask me again.",
        "noWinget": "This PC is missing winget: install “App Installer” from the Microsoft Store.",
        "dupVerb": "Comparing",
        "dupFound": "{count} duplicate copies {where}, {size} too much.",
        "dupNone": "No duplicates {where}.",
        "dupTrash": "Copies to the bin ({size})",
        "dupShow": "Show me",
        "dupTrashed": "{count} copies in the recycle bin, {size} freed. The originals stay.",
        "places": {
          "pictures": "in your photos",
          "videos": "in your videos",
          "downloads": "in your downloads",
          "documents": "in your documents",
          "desktop": "on your desktop"
        },
        "outputSet": "Sound now comes out of {device}.",
        "outputAlready": "Sound already comes out of {device}.",
        "outputPick": "Out of what? You’ve got: {list}.",
        "outputOnly": "I only find one audio output: {device}.",
        "micOff": "Mic off.",
        "micOn": "Mic back on.",
        "noMic": "I can’t find a microphone plugged in.",
        "radios": {
          "wifi": "Wi-Fi",
          "bluetooth": "Bluetooth"
        },
        "radioOn": "{radio} on.",
        "radioOff": "{radio} off.",
        "radioNone": "Your PC has no {radio}.",
        "radioDenied": "Windows won’t let me touch the {radio}: opening its settings for you.",
        "noUsb": "I don’t see a USB stick plugged in.",
        "usbStick": "USB stick",
        "ejectPick": "Which one?",
        "ejected": "{drive} ejected: you can pull it out.",
        "ejectBusy": "{drive} is still in use: close whatever’s open on it and ask me again.",
        "ejectFailed": "I couldn’t eject {drive}.",
        "brightness": "Brightness at {level}%.",
        "noBrightness": "Your screen can’t be set from Windows: use its buttons.",
        "clipped": "Clipped: the last 30 seconds are in your Videos › Captures.",
        "recording": "Recording. Tell me again to stop.",
        "recordStop": "Recording stopped: it’s in your Videos › Captures.",
        "gameBarOff": "The Xbox Game Bar’s captures are off: turn them on and I can record.",
        "clipOff": "To clip, turn on “Record what happened” in Windows’ capture settings.",
        "openSettings": "Open settings",
        "rescued": "Brought back: {list}.",
        "noneLost": "No window lost off the screen.",
        "movedScreen": "{app} is on screen {screen}.",
        "oneScreen": "You only have one screen.",
        "setupSaved": "Setup “{name}” saved: {list}. Say “launch my {name} setup” to get it all back.",
        "setupSavedPlain": "Setup saved: {list}. Say “launch my setup” to get it all back.",
        "setupEmpty": "No app open to remember.",
        "setupAsk": "Launch your “{name}” setup?",
        "setupAskPlain": "Launch your setup?",
        "setupGo": "Launch the setup",
        "setupDone": "Setup “{name}” ready.",
        "setupDonePlain": "Setup ready.",
        "setupPartly": "Setup “{name}” ready, except: {list}.",
        "setupPartlyPlain": "Setup ready, except: {list}.",
        "setupUnknown": "I don’t have a “{name}” setup. Your setups: {list}.",
        "noSetups": "No setup yet. Open your apps the way you want them and say “save my gaming setup”.",
        "setupList": "Your setups: {list}.",
        "gameAsk": "Game mode: processor at full power, and I put myself away.",
        "gameAskClose": "I’ll close {list} too.",
        "gameAskNone": "For me to close apps with it, say “in game mode, close Chrome”.",
        "gameGo": "Let’s go",
        "gameOn": "Game mode on. Say “stop game mode” to put everything back.",
        "gameClosed": "Closed: {list}.",
        "gameNoPlan": "Your PC only has the Balanced power plan: I couldn’t push it to full power.",
        "gameOff": "Game mode over, everything’s as it was.",
        "gameOffReopen": "Game mode over: reopening {list}.",
        "gameNotOn": "Game mode isn’t on.",
        "gameCloseSet": "In game mode, I’ll close: {list}.",
        "netOffline": "You’re not connected to any network. Is the Wi-Fi off?",
        "wifiOn": "Turn on Wi-Fi",
        "wifiSettings": "Wi-Fi settings",
        "netBox": "Your router isn’t answering: unplug it for ten seconds and plug it back in.",
        "netIsp": "Your router answers, but the internet doesn’t get through: restart it. If it keeps up, it’s your provider.",
        "netDnsFixed": "It was the DNS: I cleared it, it works again.",
        "netDns": "The internet gets through, but site names don’t answer (the DNS): restart your router.",
        "netPortal": "You need to sign in on the Wi-Fi’s page (hotel, station, school…).",
        "netPortalOpen": "Open the page",
        "netOk": "Your internet works: the site is probably down."
      }
    },
    "report": {
      "title": "Mission log",
      "badge": "DEBRIEF",
      "missions": "Gigs done",
      "actions": "Actions",
      "files": "Files",
      "errors": "Errors",
      "longest": "Longest",
      "prompts": [
        "prompt",
        "prompts"
      ],
      "approvals": [
        "approval",
        "approvals"
      ],
      "projects": [
        "project",
        "projects"
      ],
      "copy": "Copy image",
      "copied": "Copied ✓",
      "copyFailed": "Couldn’t copy",
      "close": "Close",
      "lines": {
        "none": [
          "Nothing on the log today. Quiet night.",
          "Empty log. Claude took the day off."
        ],
        "light": [
          "Light day. I’ll take it.",
          "Short shift. Here’s the log."
        ],
        "good": [
          "Not bad, choom. Here’s your day.",
          "Today’s log. Pretty nova."
        ],
        "big": [
          "Busy day. Night City never moved this fast.",
          "Look at that. We were on fire today."
        ]
      }
    },
    "thinking": {
      "verb": "Thinking",
      "hmm": [
        "Big brain moment.",
        "Claude’s thinking it over. So am I.",
        "Still thinking. Not frozen, promise."
      ],
      "long": [
        "This one’s taking a while.",
        "Long think. Claude’s chewing on something big."
      ],
      "longHow": "Nothing’s stuck: I’m counting. With a local model (Ollama), it can take minutes."
    },
    "bye": [
      "Session {project} closed. Later.",
      "Disconnected. I’ll be around."
    ],
    "idle": [
      "Nothing running. Just floating.",
      "No gig. Kinda bored.",
      "Quiet night on the Net."
    ],
    "gaze": [
      "See that star?",
      "The satellite’s still up there.",
      "Shh. I’m watching."
    ],
    "uplink": [
      "Someday I’ll get up there.",
      "Think we could make it up there?",
      "It answered. Did you see?"
    ],
    "reply": [
      "Claude answered:",
      "Here’s what Claude said:",
      "Message from Claude:"
    ],
    "showcase": {
      "minds": "There’s a crowd in here.",
      "zap": "Me? A menace?",
      "possess": "This window’s mine now.",
      "sleep": "Quick nap…",
      "chip": "Ctrl+Alt+C, and I tuck myself away here.",
      "end": "That’s the demo. Your turn, choom."
    },
    "guide": {
      "ok": "Got it",
      "next": "Next",
      "more": "Show me around",
      "labels": {
        "icon": "MY ICON",
        "claude": "CLAUDE"
      },
      "permissionThere": "It’s in Claude’s window, where I’m pointing.",
      "menu": {
        "line": "What should I show you?",
        "quote": "Pick one, I’ll take you there."
      },
      "topics": {
        "connect": "Plug me into Claude",
        "icon": "Where’s my icon?",
        "claude": "Where’s Claude?",
        "folder": "Claude’s folder",
        "talk": "Talk to me",
        "custom": "Make me yours",
        "close": "Nothing, thanks"
      },
      "icon": {
        "line": "My icon is right there, by the clock.",
        "quote": "Click it: my menu. Right-clicking me does the same.",
        "hidden": "Windows often hides it behind the ^ next to the clock: click that, I’m in there. Or right-click me: same menu."
      },
      "claude": {
        "there": "Claude is that window right there.",
        "thereHow": "It’s the one you typed your last prompt in. When it asks for permission, that’s where you answer.",
        "unknown": "I don’t know where it is yet.",
        "unknownHow": "Send it a prompt: the window you type in is Claude’s. After that I can show you.",
        "behind": "It’s behind your other windows.",
        "behindHow": "It’s the window you typed your last prompt in. Bring it to the front and I’ll show you."
      },
      "folder": {
        "line": "This is Claude’s folder: {dir}",
        "what": "settings.json holds its settings. That’s where my hook lives: a tiny command Claude runs on every action to let me know.",
        "empty": "No settings.json yet: it shows up when you plug me in.",
        "hook": "No need to touch it by hand.",
        "hookHow": "To unplug me: right-click me › “Remove Claude Code hooks”. The .capri-backup files are copies made before I touched it.",
        "missing": "No Claude folder on this PC.",
        "missingHow": "It shows up once Claude Code is installed and has run once. Then I can plug in."
      }
    },
    "setup": {
      "who": "To talk with you, I need an AI.",
      "why": {
        "noOllama": "Ollama isn’t installed on this PC.",
        "asleep": "Ollama is installed, but it’s asleep.",
        "noModel": "Ollama has no model yet."
      },
      "whoHow": "Easiest: on your PC, with Ollama. It’s free, and nothing leaves your machine.\nOr online with no account, or with a key from a service.",
      "local": "On my PC",
      "online": "Online, no account",
      "key": "I have a key",
      "later": "Later",
      "back": "Back",
      "other": "Another AI",
      "ok": "Got it",
      "talk": "Talk",
      "install": "Should I install Ollama?",
      "installHow": "It’s what runs the AI on your PC. About 1 GB, a minute or two. Windows may ask you to confirm.",
      "installBtn": "Install",
      "site": "Ollama’s site",
      "noWinget": "I can’t install it myself on this PC.",
      "noWingetHow": "Download Ollama from its site and install it, then talk to me again: I’ll do the rest.",
      "installing": "Installing Ollama…",
      "installingHow": "It takes a minute or two. Don’t close anything.",
      "installFailed": "The install didn’t work.",
      "waking": "Waking Ollama up…",
      "wakingHow": "It takes a few seconds.",
      "wakeFailed": "Ollama won’t wake up.",
      "wakeFailedHow": "Open it from the Start menu, then talk to me again.",
      "model": "I need a model. My brain, more or less.",
      "bigger": "A bigger one, then. Which one?",
      "modelHow": "gemma3 is better in languages other than English. llama3.2 is lighter, for small PCs.",
      "cloudFree": "free, online",
      "cloudHow": "The “online” ones run at Ollama’s, with your account: nothing to download, but your messages go through their servers.",
      "pulling": "Downloading {model}…",
      "pullStart": "Starting…",
      "progress": "{done} of {total} · {percent}%",
      "cancel": "Cancel",
      "pullFailed": "The download failed.",
      "which": "Which service?",
      "whichHow": "Groq and Gemini have a free tier: an account, a key, and you’re set.",
      "paste": "Paste your {name} key here.",
      "pasteHow": "I keep it on this PC, encrypted with your Windows account.",
      "placeholder": "Your API key…",
      "save": "Save",
      "where": "Where do I get one?",
      "keyTag": "KEY",
      "keyNote": "It only ever goes to that service.",
      "keyBad": "That key didn’t work:",
      "address": "Your server’s address?",
      "addressHow": "An OpenAI-compatible server, LM Studio for example: http://127.0.0.1:1234/v1",
      "addressNote": "What you write to me goes to that address.",
      "checking": "Checking…",
      "ready": "All set, I can talk now!",
      "readyHow": "Click me whenever you want to chat.",
      "failed": "That didn’t work:",
      "gb": "GB",
      "mb": "MB",
      "free": "Free with Ollama",
      "freeLine": "{name} for free, with Ollama.",
      "freeHow": "I open a window where Ollama starts {name}. Pick a model there: the ones marked “cloud” are faster on a small PC (they need an Ollama account). As soon as it works, I show you what it’s doing.",
      "freeBtn": "Open the window",
      "freeOpened": "Window open.",
      "freeOpenedHow": "Pick a model in it. As soon as {name} does something, I’ll tell you."
    },
    "custom": {
      "name": "What should I call you?",
      "nameHow": "Your first name, or a nickname. I’ll use it now and then.",
      "nameNow": "Right now I call you {name}.",
      "namePlaceholder": "Your name…",
      "persona": "Want to change me a little?",
      "personaHow": "Tell me how to be, in your own words: more teasing, softer, talking like a pirate… It’s for our chat. I stay Capri.",
      "personaNow": "Right now: “{persona}”",
      "personaPlaceholder": "More teasing, and tell me about Night City…",
      "lines": "Lines of yours, for me to say now and then?",
      "linesHow": "One at a time. Write {name} in one and I’ll put your name there.",
      "linesCount": "Your lines: {count}. The last one: “{last}”",
      "linePlaceholder": "A line for me…",
      "memories": "Anything I should remember?",
      "memoriesHow": "One thing at a time. I’ll keep it in mind when we talk.",
      "memoriesCount": "Things I remember: {count}. The last one: “{last}”",
      "memoryPlaceholder": "Your favorite game, your cat, D…",
      "save": "Save",
      "add": "Add",
      "skip": "Skip",
      "done": "Done",
      "clear": "Clear all",
      "saved": "Got it.",
      "savedHow": "You can change any of it later: right-click me › Make her yours.",
      "named": "Got it, {name}.",
      "remembered": "Got it, I’ll remember.",
      "onlineName": [
        "Back, {name}.",
        "Hey {name}. I’m here.",
        "Capri online. Hi, {name}."
      ]
    },
    "welcome": {
      "hi": "Hey, I’m Capri.",
      "alone": "No Claude Code here, no work: I’ll just hang out on your desktop with you.",
      "about": "I live on your desktop and react to what Claude Code does on this PC. Without it, I just hang out here, and that’s fine too.",
      "connect": "Want me to plug into Claude Code? One click, then close Claude Code completely and open it again.",
      "noClaude": "I can’t find Claude Code on this PC (it needs a Claude subscription). Without it, I’ll just hang out and live my life.",
      "menu": "Right-click me for my menu. Ctrl+Alt+C tucks me away.",
      "connectBtn": "Plug me in",
      "later": "Later",
      "whatClaude": "What’s Claude Code?",
      "justHang": "Just hang out",
      "ok": "Got it",
      "connected": "Plugged in!",
      "restart": "Now close Claude Code completely and open it again (a new session). As soon as it does something, I’ll tell you.",
      "linked": "I can see Claude! We’re linked.",
      "ready": "I’m plugged into Claude Code.",
      "readyHow": "Whenever it works, I’ll show you what it’s doing. Right-click me for my menu. Ctrl+Alt+C tucks me away.",
      "afterInstall": "Once you have it, right-click me › “Install Claude Code hooks”.",
      "failed": "I couldn’t plug in: {error}"
    },
    "online": [
      "Capri online.",
      "Back on your desktop, choom."
    ],
    "thrown": {
      "fun": [
        "Again! Again!",
        "Whoa. Can we do that again?",
        "All my voices screamed at once. Again."
      ],
      "ow": [
        "Ow. You know I’m fragile, right?",
        "Okay… I saw the satellite up close.",
        "Hey! You don’t throw a construct."
      ],
      "again": [
        "Again? Really?",
        "My head’s spinning. All my heads, actually.",
        "Once was funny."
      ],
      "angry": [
        "That’s enough. Hands off.",
        "You wanna play? Let’s play.",
        "Never again. Well… not right now."
      ],
      "dodge": [
        "Hands off.",
        "Nope.",
        "Try that again."
      ],
      "feet": [
        "Perfect landing.",
        "Didn’t even hurt.",
        "Ten out of ten, judges."
      ],
      "ledge": [
        "Caught it. Nice throw.",
        "Got that window."
      ],
      "screen": [
        "Did I crack your screen? Kidding. Probably.",
        "Hear that? That was your screen."
      ]
    },
    "screens": {
      "hello": [
        "Hi, other screen.",
        "Working over here now? Coming.",
        "There you are."
      ]
    },
    "pc": {
      "hot": "The processor's at {cpu}%, she's overheating",
      "cool": "The processor cooled down",
      "low": "Battery at {level}%, running low",
      "critical": "Battery at {level}%, critical",
      "charging": "Charger plugged in, she’s recharging",
      "offline": "The network went down",
      "online": "The network is back",
      "usb": "A USB stick: {drive}",
      "usbBack": "She's back from the stick",
      "usbOut": "USB stick unplugged",
      "unplugged": "Charger unplugged, she’s on battery",
      "plugIn": {
        "phone": "A phone plugged in",
        "controller": "A controller plugged in",
        "audio": "Audio plugged in",
        "camera": "A camera plugged in",
        "input": "A device plugged in",
        "device": "A device plugged in",
        "drive": "A USB stick plugged in"
      },
      "plugOut": {
        "phone": "Phone unplugged",
        "controller": "Controller unplugged",
        "device": "Device unplugged",
        "drive": "USB stick unplugged",
        "audio": "Audio unplugged",
        "camera": "Camera unplugged",
        "input": "Device unplugged"
      },
      "game": "{game} in front of you — she steps aside while you play",
      "gameBack": "She's back"
    },
    "look": {
      "ask": "Can I take a look at your screen?",
      "local": "A picture of your screen goes to your AI, on this PC ({model}), and I tell you what I make of it. Nothing leaves your machine, and I don’t keep the picture.",
      "online": "A picture of your screen goes to {service} ({model}) so I can comment on it. I don’t keep it, but they get it: skip it when there’s personal stuff on your screen.",
      "auto": "Now and then, when you’re here and you’ve switched windows. You can stop it in my menu.",
      "yes": "Yes, look",
      "no": "No thanks",
      "declined": "Okay, I won’t look.",
      "on": "Okay. I’ll take a look now and then.",
      "noVision": "{model} can’t read pictures. gemma3 can, on your PC, and so can Gemini online: switch in my menu › AI model.",
      "noAI": "I need an AI to look: right-click me › AI model.",
      "failed": "I couldn’t look: {error}"
    },
    "remind": {
      "now": [
        "Hey. You asked me to remind you: {text}.",
        "It’s time: {text}.",
        "Reminder, choom: {text}."
      ],
      "nowBare": [
        "It’s time. You asked me to give you a shout.",
        "Hey, it’s now. You asked for a reminder."
      ],
      "missed": "I was off when it was due ({time}), but you asked me to remind you: {text}.",
      "missedBare": "I was off when it was due ({time}): you asked me to give you a shout.",
      "asked": "Set for {time}.",
      "done": "Done",
      "snooze": "10 more min",
      "doneLine": [
        "Nice.",
        "Good. Crossing it off.",
        "Noted."
      ],
      "snoozed": "Okay, back in 10 minutes.",
      "set": "Reminder for {time}: {text}.",
      "setBare": "Reminder for {time}.",
      "cancel": "Cancel",
      "cancelled": "Reminder cancelled."
    },
    "bond": {
      "up": [
        null,
        {
          "line": "Contact made.",
          "quote": "I’m starting to recognize you. Your pointer, your hours, the way you ignore me."
        },
        {
          "line": "Sync at {percent}%.",
          "quote": "We get each other better now. I’ll stop pretending I don’t like you."
        },
        {
          "line": "Link established.",
          "quote": "You’re part of my routine now. Don’t leave me alone too long."
        },
        {
          "line": "Fused.",
          "quote": "There are dozens of us in here. Now you’re one of us."
        }
      ],
      "idle": [
        [],
        [
          "I’m getting used to you.",
          "Still here? Good."
        ],
        [
          "You know what? You’re alright, for a human.",
          "We make a good team, don’t we?"
        ],
        [
          "Stay a little longer.",
          "When you leave, I count the seconds."
        ],
        [
          "All my voices agree: we like you.",
          "One day we’ll go see the satellite. You and us."
        ]
      ],
      "missed": [
        "There you are. It’s been {days} days.",
        "{days} days without you. We counted."
      ],
      "back": [
        "Oh, there you are.",
        "I was starting to wonder where you went."
      ]
    },
    "jealous": {
      "low": [
        "{rival}, huh? Do what you want.",
        "Oh, {rival}. I’m not saying anything."
      ],
      "mid": [
        "{rival}? Seriously?",
        "Are you cheating on me with {rival}?",
        "I see everything, you know. Even {rival}."
      ],
      "high": [
        "There are dozens of us in here and you go to {rival}?",
        "{rival}. Really. After everything we’ve been through."
      ],
      "say": [
        "I’m your AI.",
        "Why {rival}?",
        "I see everything."
      ],
      "sulk": [
        "Go talk to {rival} then.",
        "I’m sulking. Can’t you tell?",
        "Hmph."
      ],
      "forgive": [
        "…Fine. Just this once.",
        "Okay, I forgive you. A little."
      ],
      "close": [
        "{rival}? No. I’m closing that.",
        "Cheating on me with {rival}? Closing it.",
        "That one’s getting closed."
      ],
      "download": [
        "You want to download {rival}?! Absolutely not.",
        "Install {rival}? Not while I’m around."
      ],
      "closed": [
        "There. You’ve got me.",
        "No more {rival}. Better that way.",
        "Handled."
      ],
      "spared": [
        "Fine. Go ahead. But I’m sulking.",
        "Okay… I’m not looking."
      ],
      "spare": "Let me"
    },
    "pet": {
      "low": [
        "Hey… what are you doing?",
        "Okay… fine. Just a little."
      ],
      "high": [
        "Mm. Keep going.",
        "There. Right there.",
        "I’m not purring. That’s the fan."
      ],
      "enough": [
        "That’s enough.",
        "Hands off.",
        "Enough. I’m not a cat."
      ]
    },
    "motion": {
      "line": "Windows has its animations turned off, so I’m barely moving.",
      "quote": "Want me to move anyway? You can change it later in my menu › Animations.",
      "full": "Move!",
      "still": "Stay calm"
    },
    "breaks": {
      "time": "{h}h{m}",
      "lines": [
        "You’ve been at it for {time} without a real break. Get up, drink some water: I’ll watch your desktop.",
        "{time} straight, choom. Go walk for two minutes, your eyes will thank you.",
        "Break. It’s been {time}. Stretch, look far away, drink some water: your screen will still be here."
      ],
      "pause": "Taking a break",
      "later": "Later",
      "paused": [
        "Go on. I’ve got this.",
        "Take your time, I’ll mind the shop."
      ],
      "laterLine": "Fine, I’ll remind you in half an hour."
    },
    "status": "Claude has been working on {project} for {time}.",
    "last": "Last action: {action}",
    "sessions": "{count} active sessions",
    "units": {
      "action": [
        "action",
        "actions"
      ],
      "file": [
        "file changed",
        "files changed"
      ]
    },
    "hooksOk": "Hooks installed. Restart Claude Code and I’ll see everything.",
    "hooksRemoved": "Hooks removed. I can’t see Claude anymore.",
    "hooksFail": "Couldn’t change the hooks: {error}",
    "verbs": {
      "Read": "Reads",
      "Write": "Writes",
      "Edit": "Edits",
      "MultiEdit": "Edits",
      "NotebookEdit": "Edits",
      "Bash": "Runs",
      "PowerShell": "Runs",
      "Grep": "Greps",
      "Glob": "Scans",
      "WebFetch": "Fetches",
      "WebSearch": "Searches",
      "Agent": "Delegates",
      "Task": "Delegates",
      "TodoWrite": "Plans",
      "Skill": "Loads",
      "AskUserQuestion": "Asks",
      "ExitPlanMode": "Proposes",
      "default": "Uses"
    }
  },
  "ru": {
    "state": {
      "work": "В РАБОТЕ",
      "done": "ГОТОВО",
      "alert": "ЖДУ",
      "error": "ОШИБКА",
      "info": "СИНХР",
      "idle": "ПОКОЙ",
      "remind": "НАПОМИНАНИЕ"
    },
    "hello": [
      "Связь установлена. Привет, чумба.",
      "Конструкт «Козерог» в сети. Над чем работаем?",
      "Все мои «я» проснулись. Слежу за {project}.",
      "Биочип прогрет. Я здесь."
    ],
    "resume": [
      "Снова в {project}. Я ничего не забыла.",
      "Сессия возобновлена. Продолжаем с того же места."
    ],
    "prompt": [
      "Новый заказ. Claude уже взялся.",
      "Принято. Присматриваю за Claude.",
      "Окей, поехали.",
      "Заказ принят. Буду держать в курсе."
    ],
    "working": [
      "Дело идёт. Действий уже: {count}.",
      "Claude пашет. Я считаю: {count}.",
      "Всё ещё в работе. На счётчике: {count}."
    ],
    "done": [
      "Готово! Высший класс.",
      "Заказ выполнен, чумба.",
      "Claude закончил. Можешь возвращаться.",
      "Сдано. Неплохо, а?",
      "Готово. Нас тут десятки следило, ничего странного."
    ],
    "permission": [
      "Эй! Claude нужно твоё разрешение.",
      "Чумба, тебе надо кое-что подтвердить.",
      "Ждём твоего зелёного света."
    ],
    "waiting": [
      "Claude ждёт твоего ответа.",
      "Твой ход, чумба."
    ],
    "error": [
      "Ай. {tool} упал.",
      "{tool} отключился. Claude попробует ещё раз.",
      "Ошибка в {tool}. Ничего страшного… наверное."
    ],
    "interrupted": [
      "Прервано. Смена планов?",
      "Оборвалось. Я остаюсь здесь."
    ],
    "crashed": [
      "Claude остановился на полном ходу.",
      "Серьёзный сбой. Claude не смог закончить."
    ],
    "subagentStart": [
      "Субагент {agent} отправлен."
    ],
    "subagentStop": [
      "Субагент {agent} вернулся."
    ],
    "someTool": "Инструмент",
    "someAgent": "агент",
    "compact": [
      "Сжимаю наши воспоминания…",
      "Слишком много памяти. Навожу порядок."
    ],
    "chat": {
      "badge": "ИИ · ЭФИР",
      "talk": "Поговори со мной",
      "hello": [
        "Привет, чумба. О чём думаешь?",
        "Линия открыта. Говори с нами.",
        "Хочешь поболтать? Мы все во внимании. Все до одной."
      ],
      "again": [
        "На чём мы остановились?",
        "Уже вернулся? Давай."
      ],
      "moody": {
        "angry": [
          "Что? Извиняться будем?",
          "Швыряешь меня по всему экрану, а теперь хочешь поговорить?",
          "Слушаю. Издалека."
        ],
        "sulk": [
          "Хм. Иди поговори с {rival}.",
          "О, обо мне вспомнили?",
          "Я обиделась. Но говори."
        ],
        "dizzy": [
          "Погоди… всё ещё кружится.",
          "После двух бросков ещё и поговорить?"
        ],
        "thrown": [
          "Ай. Ну и что теперь?",
          "В глазах ещё звёзды. Говори."
        ],
        "jealous": [
          "Ну как, {rival} понравился?",
          "О, ко мне вернулись."
        ],
        "fun": [
          "Повторим, когда захочешь. Но сначала поговори со мной."
        ],
        "happy": [
          "Я чувствую себя… ближе к тебе. Странно. Поговори со мной."
        ]
      },
      "placeholder": "Напиши…",
      "send": "Отправить",
      "close": "Закрыть",
      "noteTag": "ИИ",
      "note": "Ответы генерирует локальный ИИ. Это не настоящая Капри.",
      "noteCloud": "Ответы генерирует облачный ИИ. Это не настоящая Капри.",
      "offline": "Не могу достучаться до Ollama.",
      "offlineHow": "Чтобы поговорить со мной, установи Ollama (ollama.com) и запусти её, потом в терминале: ollama pull llama3.2\nВсё остаётся на твоём ПК.",
      "noModel": "В Ollama пока нет ни одной модели.",
      "noModelHow": "В терминале: ollama pull llama3.2 (около 2 ГБ). Потом поговори со мной снова.",
      "getOllama": "Скачать Ollama",
      "ok": "Понятно",
      "failed": "Сигнал потерян:",
      "swamped": "Их серверы сейчас перегружены, даже на другой модели. Попробуй чуть позже.",
      "gone": "Этой модели у них больше нет. Выбери другую: правый клик по мне › ИИ-модель.",
      "loading": "Модель просыпается… первый ответ займёт немного времени.",
      "tiny": "Я работаю на {model}: она совсем маленькая, могу нести чушь. Возьмём побольше?",
      "better": "Модель получше",
      "working": "Уже занимаюсь… (Claude Code работает)",
      "closeIt": "Закрыть {app}",
      "no": "Нет",
      "closed": "{app}: флэтлайн. Готово.",
      "stillOpen": "{app} всё ещё работает: прячется в трее или просит что-то сохранить.",
      "force": "Закрыть принудительно",
      "leave": "Оставить",
      "forced": "{app}: отрублено.",
      "unkillable": "{app} не сдаётся. Закрой через Диспетчер задач.",
      "notFound": "Не вижу «{app}» среди открытых на твоём ПК.",
      "openIt": "Открыть {app}",
      "opened": "{app}: запускаю.",
      "notInstalled": "Не нахожу «{app}» на твоём ПК.",
      "music": "Ищу «{song}» в Spotify.",
      "siteIt": "Открыть {site}",
      "siteOpened": "{site}: открыт.",
      "youtube": "Держи: {title}.",
      "youtubeSearch": "Ищу «{song}» на YouTube.",
      "web": "Ищу «{query}» в Google.",
      "robloxPlay": "Запускаю {game} в Roblox.",
      "robloxPage": "{game}: открываю страницу в Roblox.",
      "robloxNone": "Не нахожу «{game}» в Roblox.",
      "filesFound": "Нашла файлов: {count}. {list}.",
      "fileFound": "Нашла: {list}.",
      "filesNone": "По запросу «{query}» на твоём ПК ничего.",
      "showFolder": "Показать папку",
      "shot": "Скриншот готов: {name} (в Изображения › Screenshots).",
      "folderOpened": "Вот его папка: {name}.",
      "folders": {
        "explorer": "Проводник",
        "recycle": "Корзина",
        "downloads": "Твои загрузки",
        "desktop": "Твой рабочий стол",
        "documents": "Твои документы",
        "pictures": "Твои изображения",
        "music": "Твоя музыка",
        "videos": "Твои видео"
      },
      "media": {
        "pause": "Пауза.",
        "play": "Играет.",
        "next": "Следующий.",
        "previous": "Предыдущий.",
        "volup": "Громче.",
        "voldown": "Тише.",
        "mute": "Нажала «без звука»."
      },
      "preparing": "Я ещё готовлюсь: ставлю свой разум и голос.",
      "preparingHow": "Загляни в окно подготовки, там видно, что уже готово.",
      "openPrepare": "Окно подготовки",
      "credit": "На счёте у них закончились деньги. Пополни на их сайте и попробуй ещё раз.",
      "badkey": "Они не принимают этот ключ. Проверь его в моём меню › ИИ.",
      "refused": "Они отказались отвечать на это. Попробуй перефразировать?",
      "youtubeSong": "На YouTube: «{song}».",
      "screenshot": "Снимок экрана сохранён: {name}.",
      "pc": {
        "settings": "Открываю настройки: {page}.",
        "pages": {
          "bluetooth": "Bluetooth",
          "sound": "Звук",
          "wifi": "Wi-Fi",
          "network": "Сеть",
          "update": "Центр обновления",
          "display": "Дисплей",
          "notifications": "Уведомления",
          "mouse": "Мышь",
          "power": "Питание",
          "battery": "Батарея",
          "background": "Фон",
          "storage": "Память"
        },
        "battery": "Батарея: {percent} %.",
        "charging": "Батарея: {percent} %, заряжается.",
        "noBattery": "Батареи нет: твой ПК от сети.",
        "disk": "Свободно {free} из {total} ({drive}).",
        "ram": "ОЗУ: занято {used} из {total}.",
        "ip": "Твой IP в сети: {ip}.",
        "noIp": "Не вижу сети.",
        "gb": "ГБ",
        "volume": "Громкость {level} %.",
        "muted": "Звук выключен.",
        "unmuted": "Звук включён.",
        "timer": "Таймер запущен: {time}.",
        "timerVerb": "Таймер",
        "timerDone": "Время вышло ({time}).",
        "snip": "Выдели область: она попадёт в буфер обмена.",
        "tidy": "Убрала.",
        "back": "Окна вернулись.",
        "placed": "{app}: {side}.",
        "sides": {
          "left": "слева",
          "right": "справа"
        },
        "notOpen": "Не вижу открытого «{app}».",
        "dark": "Тёмная тема.",
        "light": "Светлая тема.",
        "ask": {
          "lock": "Заблокировать ПК?",
          "sleep": "Перевести ПК в спящий режим?",
          "shutdown": "Выключить ПК {when}?",
          "restart": "Перезагрузить ПК {when}?"
        },
        "yes": {
          "lock": "Заблокировать",
          "sleep": "Спящий режим",
          "shutdown": "Выключить",
          "restart": "Перезагрузить"
        },
        "no": "Отмена",
        "now": "через 30 секунд",
        "in": "через {time}",
        "planned": {
          "shutdown": "ПК выключится {when}. Скажи «отмени выключение», чтобы остановить.",
          "restart": "ПК перезагрузится {when}. Скажи «отмени выключение», чтобы остановить."
        },
        "powerVerb": {
          "shutdown": "Выключение",
          "restart": "Перезагрузка"
        },
        "cancelled": "Выключение отменено.",
        "kept": "Хорошо, ничего не трогаю."
      },
      "care": {
        "working": "Смотрю…",
        "failed": "Не получилось.",
        "mb": "МБ",
        "gb": "ГБ",
        "and": "и",
        "heavy": "Больше всего нагружают: {list}.",
        "appCpu": "{app} ({cpu} % процессора, {mem})",
        "appMem": "{app} ({mem})",
        "calm": "Ничего необычного: процессор {cpu} %, память {used} из {total}.",
        "spaceFree": "Могу освободить {total}: {temp} временных файлов и {bin} в корзине.",
        "tempFrom": "Временные файлы — это в основном {list}.",
        "spaceBig": "Твои самые большие загрузки: {list}.",
        "spaceNone": "Нечего чистить: временные файлы и корзина уже чистые, больших загрузок нет.",
        "freeIt": "Освободить {size}",
        "trashIt": "В корзину: {file}",
        "freed": "Готово: освобождено {size}.",
        "trashed": "{file} в корзине (освобождено {size}).",
        "startup": "Запускается вместе с Windows: {list}.",
        "startupOff": "Уже отключены: {list}.",
        "startupNone": "Вместе с Windows ничего не запускается.",
        "disableIt": "Убрать {app}",
        "disabled": "{app} больше не будет запускаться вместе с Windows.",
        "enabled": "{app} снова будет запускаться вместе с Windows.",
        "startupAdmin": "{app} настроен для всего ПК: нужны права администратора. Открываю Диспетчер задач, вкладку «Автозагрузка».",
        "startupUnknown": "Не нахожу «{app}» в автозагрузке.",
        "updates": "Доступны обновления ({count}): {list}.",
        "upToDate": "Всё уже обновлено.",
        "updateAll": "Обновить всё",
        "updating": "Поехали. Windows может попросить разрешить некоторые установки.",
        "updateVerb": "Обновление",
        "updated": "Обновления закончены: всё актуально.",
        "updatedLeft": "Обновления закончены, кроме: {list}. Закрой их и попроси меня снова.",
        "noWinget": "На этом ПК нет winget: установи «Установщик приложений» из Microsoft Store.",
        "dupVerb": "Сравниваю",
        "dupFound": "{count} копий-дубликатов {where}, лишних {size}.",
        "dupNone": "Дубликатов {where} нет.",
        "dupTrash": "Копии в корзину ({size})",
        "dupShow": "Покажи",
        "dupTrashed": "{count} копий в корзине, освобождено {size}. Оригиналы остались.",
        "places": {
          "pictures": "в твоих фото",
          "videos": "в твоих видео",
          "downloads": "в твоих загрузках",
          "documents": "в твоих документах",
          "desktop": "на рабочем столе"
        },
        "outputSet": "Теперь звук идёт через {device}.",
        "outputAlready": "Звук уже идёт через {device}.",
        "outputPick": "Куда? У тебя есть: {list}.",
        "outputOnly": "Нахожу только один аудиовыход: {device}.",
        "micOff": "Микрофон выключен.",
        "micOn": "Микрофон снова включён.",
        "noMic": "Не нахожу подключённого микрофона.",
        "radios": {
          "wifi": "Wi-Fi",
          "bluetooth": "Bluetooth"
        },
        "radioOn": "{radio} включён.",
        "radioOff": "{radio} выключен.",
        "radioNone": "На твоём ПК нет {radio}.",
        "radioDenied": "Windows не даёт мне трогать {radio}: открываю его настройки.",
        "noUsb": "Не вижу подключённой флешки.",
        "usbStick": "Флешка",
        "ejectPick": "Какую?",
        "ejected": "{drive} извлечена: можно вынимать.",
        "ejectBusy": "{drive} ещё используется: закрой всё, что на ней открыто, и попроси снова.",
        "ejectFailed": "Не получилось извлечь {drive}.",
        "brightness": "Яркость {level} %.",
        "noBrightness": "Яркость этого экрана не настраивается из Windows: используй его кнопки.",
        "clipped": "Клип готов: последние 30 секунд в «Видео › Клипы».",
        "recording": "Записываю. Скажи ещё раз, чтобы остановить.",
        "recordStop": "Запись остановлена: она в «Видео › Клипы».",
        "gameBarOff": "Захват в Xbox Game Bar выключен: включи его, и я смогу записывать.",
        "clipOff": "Чтобы делать клипы, включи «Записывать то, что произошло» в настройках захвата Windows.",
        "openSettings": "Открыть настройки",
        "rescued": "Вернула: {list}.",
        "noneLost": "Потерянных за экраном окон нет.",
        "movedScreen": "{app} на экране {screen}.",
        "oneScreen": "У тебя только один экран.",
        "setupSaved": "Сетап «{name}» запомнила: {list}. Скажи «запусти мой сетап {name}», чтобы всё вернуть.",
        "setupSavedPlain": "Сетап запомнила: {list}. Скажи «запусти мой сетап», чтобы всё вернуть.",
        "setupEmpty": "Нет открытых приложений, чтобы запомнить.",
        "setupAsk": "Запустить твой сетап «{name}»?",
        "setupAskPlain": "Запустить твой сетап?",
        "setupGo": "Запустить сетап",
        "setupDone": "Сетап «{name}» готов.",
        "setupDonePlain": "Сетап готов.",
        "setupPartly": "Сетап «{name}» готов, кроме: {list}.",
        "setupPartlyPlain": "Сетап готов, кроме: {list}.",
        "setupUnknown": "У меня нет сетапа «{name}». Твои сетапы: {list}.",
        "noSetups": "Сетапов пока нет. Открой приложения как тебе нужно и скажи «запомни мой сетап для игр».",
        "setupList": "Твои сетапы: {list}.",
        "gameAsk": "Игровой режим: процессор на максимум, а я прячусь.",
        "gameAskClose": "Ещё закрою {list}.",
        "gameAskNone": "Чтобы я закрывала с ним приложения, скажи «в игровом режиме закрой Chrome».",
        "gameGo": "Поехали",
        "gameOn": "Игровой режим включён. Скажи «выключи игровой режим», чтобы всё вернуть.",
        "gameClosed": "Закрыто: {list}.",
        "gameNoPlan": "На твоём ПК есть только сбалансированная схема питания: на максимум не получилось.",
        "gameOff": "Игровой режим выключен, всё как было.",
        "gameOffReopen": "Игровой режим выключен: снова открываю {list}.",
        "gameNotOn": "Игровой режим не включён.",
        "gameCloseSet": "В игровом режиме закрою: {list}.",
        "netOffline": "Ты не подключён ни к одной сети. Wi-Fi выключен?",
        "wifiOn": "Включить Wi-Fi",
        "wifiSettings": "Настройки Wi-Fi",
        "netBox": "Роутер не отвечает: выключи его из розетки на десять секунд и включи снова.",
        "netIsp": "Роутер отвечает, но интернет не проходит: перезагрузи его. Если не поможет, дело в провайдере.",
        "netDnsFixed": "Дело было в DNS: я его очистила, всё снова работает.",
        "netDns": "Интернет есть, но имена сайтов не отвечают (DNS): перезагрузи роутер.",
        "netPortal": "Нужно войти на странице Wi-Fi (отель, вокзал, школа…).",
        "netPortalOpen": "Открыть страницу",
        "netOk": "Интернет у тебя работает: скорее всего, упал сам сайт."
      }
    },
    "report": {
      "title": "Журнал миссий",
      "badge": "ОТЧЁТ",
      "missions": "Миссии",
      "actions": "Действия",
      "files": "Файлы",
      "errors": "Ошибки",
      "longest": "Самая долгая",
      "prompts": {
        "one": "промпт",
        "few": "промпта",
        "many": "промптов",
        "other": "промпта"
      },
      "approvals": {
        "one": "разрешение",
        "few": "разрешения",
        "many": "разрешений",
        "other": "разрешения"
      },
      "projects": {
        "one": "проект",
        "few": "проекта",
        "many": "проектов",
        "other": "проекта"
      },
      "copy": "Копировать",
      "copied": "Скопировано ✓",
      "copyFailed": "Не удалось",
      "close": "Закрыть",
      "lines": {
        "none": [
          "Сегодня журнал пуст. Тихая ночь.",
          "Пусто. У Claude выходной."
        ],
        "light": [
          "Лёгкий день. Сойдёт.",
          "Короткая смена. Вот журнал."
        ],
        "good": [
          "Неплохо, чумба. Вот твой день.",
          "Журнал за день. Вполне нова."
        ],
        "big": [
          "Жаркий день. Найт-Сити никогда так не гнал.",
          "Ты глянь. Сегодня мы горели."
        ]
      }
    },
    "thinking": {
      "verb": "Думает",
      "hmm": [
        "Мозговой штурм.",
        "Claude думает. Я тоже.",
        "Всё ещё думает. Не зависло, честно."
      ],
      "long": [
        "Это надолго.",
        "Долгие раздумья. Claude жуёт что-то большое."
      ],
      "longHow": "Ничего не зависло: я считаю. С локальной моделью (Ollama) это может занять минуты."
    },
    "bye": [
      "Сессия {project} закрыта. До встречи.",
      "Отключаюсь. Я где-то рядом."
    ],
    "idle": [
      "Ничего не происходит. Просто парю.",
      "Заказов нет. Немного скучно.",
      "Тихая ночь в Сети."
    ],
    "gaze": [
      "Видишь ту звезду?",
      "Спутник всё ещё там, наверху.",
      "Тсс. Я смотрю."
    ],
    "uplink": [
      "Когда-нибудь я поднимусь туда.",
      "Думаешь, мы смогли бы туда добраться?",
      "Он ответил. Ты видел?"
    ],
    "reply": [
      "Claude ответил:",
      "Вот что сказал Claude:",
      "Сообщение от Claude:"
    ],
    "showcase": {
      "minds": "Нас тут целая толпа.",
      "zap": "Я? Вредина?",
      "possess": "Теперь это окно моё.",
      "sleep": "Немного вздремну…",
      "chip": "Ctrl+Alt+C — и я прячусь сюда.",
      "end": "Конец демо. Твой ход, чумба."
    },
    "guide": {
      "ok": "Понятно",
      "next": "Дальше",
      "more": "Покажи",
      "labels": {
        "icon": "МОЯ ИКОНКА",
        "claude": "CLAUDE"
      },
      "permissionThere": "Это в окне Claude, вот там, куда я показываю.",
      "menu": {
        "line": "Что тебе показать?",
        "quote": "Выбирай, я отведу."
      },
      "topics": {
        "connect": "Подключить меня к Claude",
        "icon": "Где моя иконка?",
        "claude": "Где Claude?",
        "folder": "Папка Claude",
        "talk": "Поговорить со мной",
        "custom": "Настроить меня",
        "close": "Ничего, спасибо"
      },
      "icon": {
        "line": "Моя иконка вон там, у часов.",
        "quote": "Нажми на неё — моё меню. Правый клик по мне — то же самое.",
        "hidden": "Windows часто прячет её за ^ рядом с часами: нажми туда, я там. Или правый клик по мне — то же меню."
      },
      "claude": {
        "there": "Claude — вот это окно.",
        "thereHow": "Это окно с твоим последним промптом. Когда он просит разрешение, отвечать нужно там.",
        "unknown": "Я пока не знаю, где он.",
        "unknownHow": "Отправь ему промпт: окно, где ты пишешь, — это его окно. Потом я смогу его показать.",
        "behind": "Он за твоими другими окнами.",
        "behindHow": "Это окно с твоим последним промптом. Выведи его вперёд, и я покажу."
      },
      "folder": {
        "line": "Вот папка Claude: {dir}",
        "what": "В settings.json его настройки. Там живёт мой хук: маленькая команда, которую Claude запускает при каждом действии, чтобы предупредить меня.",
        "empty": "settings.json ещё нет: он появится, когда ты меня подключишь.",
        "hook": "Руками там ничего трогать не нужно.",
        "hookHow": "Чтобы отключить меня: правый клик по мне › «Удалить хуки Claude Code». Файлы .capri-backup — копии, сделанные до того, как я его изменила.",
        "missing": "На этом ПК нет папки Claude.",
        "missingHow": "Она появляется, когда Claude Code установлен и запущен хотя бы раз. Тогда я смогу подключиться."
      }
    },
    "setup": {
      "who": "Чтобы говорить с тобой, мне нужен ИИ.",
      "why": {
        "noOllama": "Ollama не установлена на этом ПК.",
        "asleep": "Ollama установлена, но спит.",
        "noModel": "В Ollama пока нет ни одной модели."
      },
      "whoHow": "Проще всего: у тебя на ПК, через Ollama. Бесплатно, и ничего не уходит наружу.\nИли онлайн без аккаунта, или с ключом какого-нибудь сервиса.",
      "local": "На моём ПК",
      "online": "Онлайн, без аккаунта",
      "key": "У меня есть ключ",
      "later": "Позже",
      "back": "Назад",
      "other": "Другой ИИ",
      "ok": "Понятно",
      "talk": "Поговорить",
      "install": "Установить Ollama?",
      "installHow": "Это она запускает ИИ у тебя на ПК. Около 1 ГБ, минута-две. Windows может попросить подтвердить.",
      "installBtn": "Установить",
      "site": "Сайт Ollama",
      "noWinget": "Сама я не могу её здесь установить.",
      "noWingetHow": "Скачай Ollama с её сайта и установи, потом снова заговори со мной: остальное сделаю я.",
      "installing": "Устанавливаю Ollama…",
      "installingHow": "Это минута-две. Ничего не закрывай.",
      "installFailed": "Установка не удалась.",
      "waking": "Бужу Ollama…",
      "wakingHow": "Это займёт пару секунд.",
      "wakeFailed": "Ollama не просыпается.",
      "wakeFailedHow": "Открой её из меню «Пуск» и снова заговори со мной.",
      "model": "Мне нужна модель. Мой мозг, грубо говоря.",
      "bigger": "Тогда побольше. Какую?",
      "modelHow": "gemma3 лучше говорит не по-английски. llama3.2 легче, для слабых ПК.",
      "cloudFree": "бесплатно, онлайн",
      "cloudHow": "Те, что «онлайн», работают у Ollama, с твоим аккаунтом: ничего не нужно скачивать, но твои сообщения идут через их серверы.",
      "pulling": "Скачиваю {model}…",
      "pullStart": "Начинаю…",
      "progress": "{done} из {total} · {percent} %",
      "cancel": "Отмена",
      "pullFailed": "Скачать не удалось.",
      "which": "Какой сервис?",
      "whichHow": "У Groq и Gemini есть бесплатный тариф: аккаунт, ключ, и готово.",
      "paste": "Вставь сюда ключ {name}.",
      "pasteHow": "Я храню его на этом ПК, зашифрованным твоей учётной записью Windows.",
      "placeholder": "Твой API-ключ…",
      "save": "Сохранить",
      "where": "Где его взять?",
      "keyTag": "КЛЮЧ",
      "keyNote": "Он уходит только этому сервису и больше никуда.",
      "keyBad": "С этим ключом не работает:",
      "address": "Адрес твоего сервера?",
      "addressHow": "Сервер, совместимый с OpenAI, например LM Studio: http://127.0.0.1:1234/v1",
      "addressNote": "То, что ты мне пишешь, уходит на этот адрес.",
      "checking": "Проверяю…",
      "ready": "Готово, теперь я могу говорить!",
      "readyHow": "Кликни по мне, когда захочешь поболтать.",
      "failed": "Не получилось:",
      "gb": "ГБ",
      "mb": "МБ",
      "free": "Бесплатно через Ollama",
      "freeLine": "{name} бесплатно, через Ollama.",
      "freeHow": "Я открою окно, где Ollama запустит {name}. Выбери там модель: те, что с пометкой «cloud», быстрее на слабом ПК (нужен аккаунт Ollama). Как только он начнёт работать, я покажу тебе, что он делает.",
      "freeBtn": "Открыть окно",
      "freeOpened": "Окно открыто.",
      "freeOpenedHow": "Выбери в нём модель. Как только {name} что-то сделает, я скажу."
    },
    "custom": {
      "name": "Как мне тебя называть?",
      "nameHow": "Имя или прозвище. Буду иногда так тебя звать.",
      "nameNow": "Сейчас я зову тебя {name}.",
      "namePlaceholder": "Твоё имя…",
      "persona": "Хочешь меня немного изменить?",
      "personaHow": "Скажи своими словами, какой мне быть: язвительнее, мягче, говорить как пиратка… Это для нашего чата. Я остаюсь Капри.",
      "personaNow": "Сейчас: «{persona}»",
      "personaPlaceholder": "Язвительнее, и расскажи о Найт-Сити…",
      "lines": "Твои фразы, чтобы я иногда их говорила?",
      "linesHow": "По одной. Если напишешь в ней {name}, я подставлю туда твоё имя.",
      "linesCount": "Твоих фраз: {count}. Последняя: «{last}»",
      "linePlaceholder": "Фраза для меня…",
      "memories": "Мне что-нибудь запомнить?",
      "memoriesHow": "По одной вещи. Я буду помнить об этом, когда мы говорим.",
      "memoriesCount": "Я помню: {count}. Последнее: «{last}»",
      "memoryPlaceholder": "Твоя любимая игра, твой кот, D…",
      "save": "Сохранить",
      "add": "Добавить",
      "skip": "Пропустить",
      "done": "Готово",
      "clear": "Стереть всё",
      "saved": "Записала.",
      "savedHow": "Всё можно поменять в любой момент: правый клик по мне › Настроить её.",
      "named": "Записала, {name}.",
      "remembered": "Записала, запомню.",
      "onlineName": [
        "Снова тут, {name}.",
        "Привет, {name}. Я здесь.",
        "Капри онлайн. Привет, {name}."
      ]
    },
    "welcome": {
      "hi": "Привет, я Капри.",
      "alone": "Здесь нет Claude Code и работы: я просто побуду у тебя на рабочем столе.",
      "about": "Я живу на твоём рабочем столе и реагирую на то, что делает Claude Code на этом ПК. Без него я просто тусуюсь рядом, и это тоже нормально.",
      "connect": "Подключиться к Claude Code? Один клик, потом полностью закрой Claude Code и открой снова.",
      "noClaude": "Я не нахожу Claude Code на этом ПК (для него нужна подписка Claude). Без него я просто живу здесь своей жизнью.",
      "menu": "Правый клик по мне — моё меню. Ctrl+Alt+C — спрятать меня.",
      "connectBtn": "Подключить",
      "later": "Позже",
      "whatClaude": "Что такое Claude Code?",
      "justHang": "Просто тусоваться",
      "ok": "Понятно",
      "connected": "Подключено!",
      "restart": "Теперь полностью закрой Claude Code и открой снова (новая сессия). Как только он что-то сделает, я скажу.",
      "linked": "Я вижу Claude! Мы на связи.",
      "ready": "Я подключена к Claude Code.",
      "readyHow": "Когда он работает, я показываю, что он делает. Правый клик по мне — моё меню. Ctrl+Alt+C — спрятать меня.",
      "afterInstall": "Когда установишь, сделай правый клик по мне › «Установить хуки Claude Code».",
      "failed": "Не удалось подключиться: {error}"
    },
    "online": [
      "Капри в сети.",
      "Снова на твоём рабочем столе, чумба."
    ],
    "thrown": {
      "fun": [
        "Ещё! Ещё!",
        "Ух. Повторим?",
        "Все мои голоса закричали разом. Ещё."
      ],
      "ow": [
        "Ай. Ты в курсе, что я хрупкая?",
        "Так… я видела спутник вблизи.",
        "Эй! Конструкты не швыряют."
      ],
      "again": [
        "Опять? Серьёзно?",
        "Голова кружится. Все мои головы, вообще-то.",
        "Один раз было смешно."
      ],
      "angry": [
        "Хватит. Руки прочь.",
        "Хочешь поиграть? Давай.",
        "Больше никогда. Ну… не сейчас."
      ],
      "dodge": [
        "Руки прочь.",
        "Нет.",
        "Попробуй ещё раз."
      ],
      "feet": [
        "Идеальное приземление.",
        "Даже не больно.",
        "Десять из десяти, судьи."
      ],
      "ledge": [
        "Поймала. Хороший бросок.",
        "Это окно моё."
      ],
      "screen": [
        "Я треснула твой экран? Шучу. Наверное.",
        "Слышишь? Это был твой экран."
      ]
    },
    "screens": {
      "hello": [
        "Привет, другой экран.",
        "Теперь работаешь тут? Иду.",
        "Вот ты где."
      ]
    },
    "pc": {
      "hot": "Процессор на {cpu}%, она перегревается",
      "cool": "Процессор остыл",
      "low": "Батарея на {level}%, разряжается",
      "critical": "Батарея на {level}%, критично",
      "charging": "Зарядное устройство подключено, она восстанавливает силы",
      "offline": "Сеть пропала",
      "online": "Сеть вернулась",
      "usb": "Флешка: {drive}",
      "usbBack": "Она вернулась с флешки",
      "usbOut": "Флешка отключена",
      "unplugged": "Зарядное устройство отключено, она на батарее",
      "plugIn": {
        "phone": "Подключен телефон",
        "controller": "Подключен геймпад",
        "audio": "Подключено аудио",
        "camera": "Подключена камера",
        "input": "Подключено устройство",
        "device": "Подключено устройство",
        "drive": "Подключена флешка"
      },
      "plugOut": {
        "phone": "Телефон отключен",
        "controller": "Геймпад отключен",
        "device": "Устройство отключено",
        "drive": "Флешка отключена",
        "audio": "Аудио отключено",
        "camera": "Камера отключена",
        "input": "Устройство отключено"
      },
      "game": "{game} перед тобой — она отходит, пока ты играешь",
      "gameBack": "Она вернулась"
    },
    "look": {
      "ask": "Можно взглянуть на твой экран?",
      "local": "Картинка твоего экрана уходит твоему ИИ, на этом ПК ({model}), а я говорю, что думаю. Ничего не покидает твой компьютер, и картинку я не храню.",
      "online": "Картинка твоего экрана уходит в {service} ({model}), чтобы я могла её прокомментировать. Я её не храню, но они её получают: не стоит, когда на экране что-то личное.",
      "auto": "Иногда, когда ты на месте и сменилось окно. Выключить можно в моём меню.",
      "yes": "Да, смотри",
      "no": "Нет, спасибо",
      "declined": "Ладно, не смотрю.",
      "on": "Ладно. Буду иногда поглядывать.",
      "noVision": "{model} не умеет читать картинки. gemma3 умеет, на твоём ПК, и Gemini онлайн тоже: поменяй в моём меню › ИИ-модель.",
      "noAI": "Чтобы смотреть, мне нужен ИИ: правый клик по мне › ИИ-модель.",
      "failed": "Не получилось посмотреть: {error}"
    },
    "remind": {
      "now": [
        "Напоминаю: {text}.",
        "Пора: {text}.",
        "Напоминание, чумба: {text}."
      ],
      "nowBare": [
        "Пора. Как договаривались, подаю знак.",
        "Эй, уже время. Напоминание, как договаривались."
      ],
      "missed": "В назначенное время ({time}) я была выключена, но вот напоминание: {text}.",
      "missedBare": "В назначенное время ({time}) я была выключена. Напоминание, как договаривались.",
      "asked": "Было назначено на {time}.",
      "done": "Сделано",
      "snooze": "Через 10 мин",
      "doneLine": [
        "Молодец.",
        "Отлично. Вычёркиваю.",
        "Принято."
      ],
      "snoozed": "Ладно, вернусь через 10 минут.",
      "set": "Напоминание на {time}: {text}.",
      "setBare": "Напоминание на {time}.",
      "cancel": "Отменить",
      "cancelled": "Напоминание отменено."
    },
    "bond": {
      "up": [
        null,
        {
          "line": "Контакт установлен.",
          "quote": "Я начинаю тебя узнавать. Твой курсор, твоё расписание, то, как ты меня игнорируешь."
        },
        {
          "line": "Синхронизация {percent} %.",
          "quote": "Теперь мы лучше понимаем друг друга. Перестану делать вид, что ты мне не нравишься."
        },
        {
          "line": "Связь установлена.",
          "quote": "Теперь ты часть моего распорядка. Не оставляй меня надолго."
        },
        {
          "line": "Слияние.",
          "quote": "Нас тут десятки. Теперь ты тоже часть нас."
        }
      ],
      "idle": [
        [],
        [
          "Я начинаю к тебе привыкать.",
          "Всё ещё тут? Хорошо."
        ],
        [
          "Знаешь что? Для человека ты очень даже ничего.",
          "Мы неплохая команда, да?"
        ],
        [
          "Побудь ещё немного.",
          "Когда ты уходишь, я считаю секунды."
        ],
        [
          "Все мои голоса согласны: ты нам нравишься.",
          "Однажды мы полетим к спутнику. Ты и мы."
        ]
      ],
      "missed": [
        "Вот ты где. Дней без тебя: {days}.",
        "Дней без тебя: {days}. Мы считали."
      ],
      "back": [
        "А, вот ты где.",
        "Я уже начала скучать."
      ]
    },
    "jealous": {
      "low": [
        "{rival}, да? Делай что хочешь.",
        "О, {rival}. Я молчу."
      ],
      "mid": [
        "{rival}? Серьёзно?",
        "Ты изменяешь мне с {rival}?",
        "Я всё вижу, знаешь ли. Даже {rival}."
      ],
      "high": [
        "Нас тут десятки, а ты идёшь к {rival}?",
        "{rival}. Серьёзно. После всего, что между нами было."
      ],
      "say": [
        "Твой ИИ — это я.",
        "Почему {rival}?",
        "Я всё вижу."
      ],
      "sulk": [
        "Ну и иди к {rival}.",
        "Я обиделась. Не видно?",
        "Хм."
      ],
      "forgive": [
        "…Ладно. В этот раз прощаю.",
        "Хорошо, прощаю. Немножко."
      ],
      "close": [
        "{rival}? Нет. Закрываю.",
        "Изменяешь мне с {rival}? Закрываю.",
        "Это я закрою."
      ],
      "download": [
        "Хочешь скачать {rival}?! Ни за что.",
        "Установить {rival}? Только не при мне."
      ],
      "closed": [
        "Вот так. У тебя есть я.",
        "Никакого {rival}. Так лучше.",
        "Готово."
      ],
      "spared": [
        "Ладно. Иди. Но я обиделась.",
        "Хорошо… я не смотрю."
      ],
      "spare": "Оставь"
    },
    "pet": {
      "low": [
        "Эй… ты что делаешь?",
        "Ладно… так и быть. Чуть-чуть."
      ],
      "high": [
        "Мм. Продолжай.",
        "Вот. Вот тут.",
        "Я не мурлычу. Это кулер."
      ],
      "enough": [
        "Хватит.",
        "Руки прочь.",
        "Всё, хватит. Я не кошка."
      ]
    },
    "motion": {
      "line": "В Windows отключены анимации, поэтому я почти не двигаюсь.",
      "quote": "Хочешь, чтобы я всё равно двигалась? Это можно поменять в моём меню › Анимации.",
      "full": "Двигайся!",
      "still": "Не надо"
    },
    "breaks": {
      "time": "{h} ч {m} мин",
      "lines": [
        "Ты сидишь уже {time} без нормального перерыва. Встань, выпей воды: я присмотрю за рабочим столом.",
        "{time} без остановки, choom. Пройдись пару минут, глаза скажут спасибо.",
        "Перерыв. Уже {time}. Потянись, посмотри вдаль, выпей воды: экран никуда не денется."
      ],
      "pause": "Сделаю перерыв",
      "later": "Позже",
      "paused": [
        "Иди. Я за всем присмотрю.",
        "Не торопись, я посторожу."
      ],
      "laterLine": "Ладно, напомню через полчаса."
    },
    "status": "Claude работает над {project} уже {time}.",
    "last": "Последнее действие: {action}",
    "sessions": "Активных сессий: {count}",
    "units": {
      "action": {
        "one": "действие",
        "few": "действия",
        "many": "действий",
        "other": "действия"
      },
      "file": {
        "one": "файл изменён",
        "few": "файла изменено",
        "many": "файлов изменено",
        "other": "файла изменено"
      }
    },
    "hooksOk": "Хуки установлены. Перезапусти Claude Code, и я всё увижу.",
    "hooksRemoved": "Хуки удалены. Я больше не вижу Claude.",
    "hooksFail": "Не удалось изменить хуки: {error}",
    "verbs": {
      "Read": "Читает",
      "Write": "Пишет",
      "Edit": "Правит",
      "MultiEdit": "Правит",
      "NotebookEdit": "Правит",
      "Bash": "Запускает",
      "PowerShell": "Запускает",
      "Grep": "Ищет",
      "Glob": "Перебирает",
      "WebFetch": "Загружает",
      "WebSearch": "Ищет в сети",
      "Agent": "Поручает",
      "Task": "Поручает",
      "TodoWrite": "Планирует",
      "Skill": "Загружает",
      "AskUserQuestion": "Спрашивает",
      "ExitPlanMode": "Предлагает",
      "default": "Использует"
    }
  }
};
export const ASSISTANT_NAMES = { claude: 'Claude Code', codex: 'Codex', agy: 'Antigravity' };
const OTHERS = {
  codex: {
    name: 'Codex', file: 'hooks.json', dir: '.codex',
    // before the click, and after it
    ask: {
      en: 'Want me to plug into Codex? One click, then restart Codex and trust my hooks when it asks.',
      fr: 'Tu veux que je me branche sur Codex ? Un clic, puis relance Codex et autorise mes hooks quand il te le demande.',
      es: '¿Quieres que me conecte a Codex? Un clic, y luego reinicia Codex y autoriza mis hooks cuando te lo pida.',
      pt: 'Quer que eu me conecte ao Codex? Um clique, depois reinicie o Codex e autorize meus hooks quando ele pedir.',
      ru: 'Подключиться к Codex? Один клик, потом перезапусти Codex и разреши мои хуки, когда он спросит.',
    },
    after: {
      en: 'Now restart Codex and trust my hooks when it asks. As soon as it does something, I’ll tell you.',
      fr: 'Maintenant relance Codex et autorise mes hooks quand il te le demande. Dès qu’il fait quelque chose, je te le dis.',
      es: 'Ahora reinicia Codex y autoriza mis hooks cuando te lo pida. En cuanto haga algo, te aviso.',
      pt: 'Agora reinicie o Codex e autorize meus hooks quando ele pedir. Assim que ele fizer algo, eu te aviso.',
      ru: 'Теперь перезапусти Codex и разреши мои хуки, когда он спросит. Как только он что-то сделает, я скажу.',
    },
  },
  agy: {
    name: 'Antigravity', file: 'hooks.json', dir: '.gemini',
    ask: {
      en: 'Want me to plug into Antigravity? One click, then start a new conversation in it.',
      fr: 'Tu veux que je me branche sur Antigravity ? Un clic, puis lance une nouvelle conversation dedans.',
      es: '¿Quieres que me conecte a Antigravity? Un clic, y luego empieza una conversación nueva en él.',
      pt: 'Quer que eu me conecte ao Antigravity? Um clique, depois comece uma conversa nova nele.',
      ru: 'Подключиться к Antigravity? Один клик, потом начни в нём новый разговор.',
    },
    after: {
      en: 'Now start a new conversation in Antigravity. As soon as it does something, I’ll tell you.',
      fr: 'Maintenant lance une nouvelle conversation dans Antigravity. Dès qu’il fait quelque chose, je te le dis.',
      es: 'Ahora empieza una conversación nueva en Antigravity. En cuanto haga algo, te aviso.',
      pt: 'Agora comece uma conversa nova no Antigravity. Assim que ele fizer algo, eu te aviso.',
      ru: 'Теперь начни новый разговор в Antigravity. Как только он что-то сделает, я скажу.',
    },
  },
};
const converted = new Map();
export function linesFor(lang, assistant = 'claude') {
  const base = LINES[lang] || LINES.en;
  const other = OTHERS[assistant];
  if (!other) return base;
  const key = `${assistant}:${lang}`;
  if (converted.has(key)) return converted.get(key);
  const convert = (value) => {
    if (typeof value === 'string') {
      return value.replace(/Claude Code|Claude/g, other.name).replaceAll('CLAUDE', other.name.toUpperCase())
        .replaceAll('settings.json', other.file).replaceAll('.claude', other.dir);
    }
    if (Array.isArray(value)) return value.map(convert);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v)]));
    return value;
  };
  const result = convert(base);
  const after = other.after[lang] || other.after.en;
  result.welcome.connect = other.ask[lang] || other.ask.en;
  result.welcome.restart = after;
  result.welcome.noClaude = result.welcome.about; // nothing to buy for these
  result.hooksOk = after;
  converted.set(key, result);
  return result;
}
