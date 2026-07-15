# 📺 My Watch

**My Watch** est une application mobile (Android + iOS) pour suivre les séries et
les films que tu regardes : ta liste « à voir », les épisodes vus, un calendrier
des prochaines diffusions, la découverte de nouveautés, et l'import de ton
historique existant.

Le projet est une alternative libre, inspirée du concept de **TV Time** (dont le
service ferme le **15 juillet 2026**). Le code est **entièrement original** et
**commenté en français**.

---

## ✨ Fonctionnalités

- ▶️ **Prochain épisode à regarder** : l'accueil dit exactement où tu en es (« À REGARDER · S2 E5 ») et te laisse le marquer vu d'un seul appui, sans ouvrir la série.
- 🔎 **Découverte & recherche** : tendances, séries/films populaires, recherche par titre (via TMDb).
- 📚 **Ma liste** : toute ta bibliothèque, filtrable par statut (_À voir / En cours / Terminé / Abandonné_), avec recherche locale et tri.
- ✅ **Suivi des épisodes** : coche les épisodes un par un, ou **marque une saison entière** vue (appui long sur un épisode : tout marquer jusqu'à lui).
- 📈 **Progression** : barre d'avancement par série (épisodes vus / total diffusé).
- ⭐ **Notes** : note personnelle (5 étoiles) par titre **et** par épisode.
- 🗓️ **À venir** : prochains épisodes de tes séries suivies, groupés par jour.
- 🔔 **Notifications** : rappel local le jour de diffusion d'un nouvel épisode.
- 📥 **Import CSV** : récupère ton historique depuis un export **Netflix** ou **TV Time**.
- 🔗 **Synchro Trakt.tv** : import automatique de l'historique et des notes via l'API officielle (optionnel).
- ☁️ **Synchro cloud** : compte utilisateur + synchronisation multi-appareils (Firebase).
- 📊 **Statistiques** : séries, films, épisodes vus, titres terminés et **temps passé à regarder**.
- 🎨 **Trois apparences** : turquoise (classic), bleu (grid), rose (social).
- 🖥️ **Web, iOS et Android** : navigation adaptative (barre latérale au-delà de 1024 px, onglets en bas sur mobile).

> ℹ️ **Le temps de visionnage est une estimation.** TMDb ne fournit pas la durée
> réelle de chaque épisode vu, seulement une durée type par série. Le total est
> donc calculé à partir de cette moyenne — l'app l'affiche explicitement comme
> une estimation plutôt que de laisser croire à une mesure exacte.

> ℹ️ **Pas d'onglet Communauté.** Le fil social suppose un back-end de relations
> et de publications que My Watch n'a pas. Plutôt que d'occuper un cinquième de
> la navigation avec un écran « bientôt disponible », la place revient à
> **Ma liste**. La communauté reviendra quand elle aura quelque chose à montrer.

> ℹ️ **À propos de la « connexion Netflix » :** il n'existe **aucune API officielle**
> permettant de connecter un compte Netflix (ou Disney+, Prime…) pour récupérer
> automatiquement l'historique. My Watch propose donc l'**import du fichier CSV**
> que Netflix te laisse télécharger (`netflix.com/viewingactivity`), ce qui est la
> méthode fiable et légale. L'affichage « Où regarder » indique par ailleurs sur
> quelles plateformes chaque titre est disponible.

---

## 🧱 Stack technique

| Élément              | Choix                              |
| -------------------- | ---------------------------------- |
| Framework            | **React Native** via **Expo**      |
| Langage              | **TypeScript**                     |
| Navigation           | **Expo Router** (routage fichiers) |
| Données films/séries | **TMDb** (The Movie Database)      |
| Back-end / compte    | **Firebase** (Firestore + Auth)    |
| Notifications        | **expo-notifications** (locales)   |
| Synchro externe      | **Trakt.tv** (API, optionnel)      |
| Tests / qualité      | **Jest** · ESLint · Prettier       |

---

## 🚀 Installation pas à pas

### 1. Prérequis

- **Node.js 18+** installé.
- L'application **Expo Go** sur ton téléphone (App Store / Google Play) pour tester.

### 2. Installer les dépendances

```bash
cd my_watch
npm install
```

### 3. Obtenir une clé TMDb (gratuit)

1. Crée un compte sur https://www.themoviedb.org
2. Va dans **Paramètres → API** et récupère le **jeton d'accès v4** (Bearer token).

### 4. Créer un projet Firebase (gratuit)

1. Crée un projet sur https://console.firebase.google.com
2. Ajoute une application **Web** (icône `</>`) : la configuration affichée te donne les clés.
3. Active **Authentication** (méthode _E-mail/mot de passe_) et **Firestore Database**.
4. Dans **Firestore Database → Rules**, colle le contenu de [`firestore.rules`](./firestore.rules) et publie.

### 5. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Puis ouvre `.env` et remplis les valeurs obligatoires (TMDb + les 6 clés Firebase) :

```
EXPO_PUBLIC_TMDB_ACCESS_TOKEN=...
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Les deux valeurs **Trakt.tv** sont **optionnelles** (voir « Synchro Trakt » ci-dessous).

### 6. Lancer l'application

```bash
npm start
```

Scanne le QR code affiché avec **Expo Go** (Android) ou l'appareil photo (iOS).

### (Optionnel) Synchro Trakt.tv

1. Crée une application sur https://trakt.tv/oauth/applications (Redirect URI : `urn:ietf:wg:oauth:2.0:oob`).
2. Renseigne `EXPO_PUBLIC_TRAKT_CLIENT_ID` et `EXPO_PUBLIC_TRAKT_CLIENT_SECRET` dans `.env`.
3. Dans l'app : **Profil → Connecter Trakt.tv**, saisis le code affiché sur `trakt.tv/activate`, puis synchronise.

> ⚠️ Trakt impose le _client secret_ côté application (pas de flux public) : il est donc embarqué dans l'app,
> comme pour la plupart des clients Trakt tiers.

### Scripts utiles

```bash
npm test        # tests unitaires (Jest) de la logique métier
npm run lint    # analyse ESLint
npm run format  # formatage Prettier
npm run typecheck  # vérification TypeScript (tsc --noEmit)
```

---

## 📁 Structure du projet

```
my_watch/
├── app/                      # Écrans + navigation (Expo Router)
│   ├── _layout.tsx           # Racine : auth + redirection
│   ├── (auth)/connexion.tsx  # Connexion / inscription
│   ├── (tabs)/               # Onglets : Accueil, Recherche, À venir, Ma liste, Profil
│   ├── titre/[id].tsx        # Détail d'un titre + épisodes + notes
│   ├── import.tsx            # Import CSV (Netflix / TV Time)
│   └── trakt.tsx             # Connexion & synchro Trakt.tv
├── src/
│   ├── components/           # Composants réutilisables (CartePoster, Etoiles…)
│   ├── hooks/                # useAuth (contexte d'authentification)
│   ├── lib/                  # Clients : firebase.ts, tmdb.ts
│   ├── services/             # Logique métier (+ tests *.test.ts) :
│   │   ├── bibliotheque.ts   #   biblio, épisodes vus, notes
│   │   ├── csv.ts            #   parsing d'import CSV (testé)
│   │   ├── import.ts         #   import Netflix / TV Time
│   │   ├── agenda.ts         #   prochains épisodes
│   │   ├── notifications.ts  #   rappels locaux
│   │   ├── trakt.ts          #   API Trakt (auth + synchro)
│   │   ├── traktMapping.ts   #   mapping Trakt → modèle (testé)
│   │   └── async.ts          #   utilitaires (ré-essais, concurrence)
│   ├── theme/                # Couleurs, espacements, constantes
│   └── types/                # Types TypeScript partagés
├── firestore.rules           # Règles de sécurité Firestore
├── app.json                  # Configuration Expo
├── jest.config.js            # Configuration des tests
└── .env.example              # Modèle de variables d'environnement
```

---

## 🗺️ Pistes d'évolution

- 🔁 Synchro Trakt **bidirectionnelle** (envoyer aussi My Watch → Trakt) + import des épisodes vus détaillés.
- ✍️ Avis / commentaires textuels en complément des notes.
- 🎨 Affiches personnalisées et badges.
- 📄 Pagination de l'import pour les très gros historiques.

---

## ⚖️ Mentions

- Les données de films et séries proviennent de **TMDb**. Ce produit utilise l'API
  de TMDb mais **n'est ni approuvé ni certifié par TMDb**.
- My Watch est un projet **indépendant** ; il ne reprend ni le code, ni les
  logos, ni les marques de TV Time.
