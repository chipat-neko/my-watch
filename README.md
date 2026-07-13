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

- 🔎 **Découverte & recherche** : tendances, séries/films populaires, recherche par titre (via TMDb), défilement infini.
- 📚 **Ma liste** : suivi des titres avec statut _À voir / En cours / Terminé_.
- ✅ **Suivi des épisodes** : coche les épisodes vus, saison par saison.
- ⭐ **Notes** : note personnelle (5 étoiles) par titre **et** par épisode.
- 🗓️ **À venir** : prochains épisodes de tes séries suivies, triés par date.
- 🔔 **Notifications** : rappel local le jour de diffusion d'un nouvel épisode.
- 📥 **Import CSV** : récupère ton historique depuis un export **Netflix** ou **TV Time**.
- 🔗 **Synchro Trakt.tv** : import automatique de l'historique et des notes via l'API officielle (optionnel).
- ☁️ **Synchro cloud** : compte utilisateur + synchronisation multi-appareils (Supabase).
- 📊 **Statistiques** : nombre de séries, films et épisodes vus.

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
| Back-end / compte    | **Supabase** (Postgres + Auth)     |
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

### 4. Créer un projet Supabase (gratuit)

1. Crée un projet sur https://supabase.com
2. Dans **SQL Editor**, colle et exécute le contenu de [`supabase/schema.sql`](./supabase/schema.sql).
   Cela crée les tables, la sécurité (RLS) et le trigger de date de visionnage.
   _Base déjà existante ?_ Exécute plutôt les scripts de [`supabase/migrations/`](./supabase/migrations/).
3. Dans **Project Settings → API**, récupère l'**URL du projet** et la **clé `anon` publique**.

### 5. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Puis ouvre `.env` et remplis les 3 valeurs obligatoires :

```
EXPO_PUBLIC_TMDB_ACCESS_TOKEN=...
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
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
│   ├── lib/                  # Clients : supabase.ts, tmdb.ts
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
├── supabase/
│   ├── schema.sql            # Schéma complet (base neuve)
│   └── migrations/           # Scripts d'évolution (base existante)
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
