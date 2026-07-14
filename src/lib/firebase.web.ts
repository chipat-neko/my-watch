// =============================================================================
//  Firebase — initialisation (web)
//  ---------------------------------------------------------------------------
//  Version navigateur : Metro utilise ce fichier à la place de firebase.ts sur
//  le web. Ici `getAuth` suffit — la persistance de session est gérée nativement
//  par le navigateur (IndexedDB / localStorage), pas besoin d'AsyncStorage.
// =============================================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.warn(
    '[My Watch] Configuration Firebase manquante. Copie .env.example en .env et remplis les valeurs.'
  );
}

/** Application Firebase (instance unique). */
export const app = initializeApp(config);

/** Authentification (persistance navigateur par défaut). */
export const auth = getAuth(app);

/** Base de données Firestore, partagée dans toute l'app. */
export const db = getFirestore(app);
