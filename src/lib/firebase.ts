// =============================================================================
//  Firebase — initialisation
//  ---------------------------------------------------------------------------
//  Firebase est notre back-end : Authentication (email / mot de passe) et
//  Firestore (base NoSQL) pour la synchronisation multi-appareils.
//
//  La session est persistée via AsyncStorage (stockage local du téléphone) afin
//  que l'utilisateur reste connecté d'un lancement à l'autre.
// =============================================================================

import { initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Lecture des variables d'environnement (voir le fichier .env) ------------
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  // On avertit clairement le développeur si la configuration manque.
  console.warn(
    '[My Watch] Configuration Firebase manquante. Copie .env.example en .env et remplis les valeurs.'
  );
}

/** Application Firebase (instance unique). */
export const app = initializeApp(config);

// `getReactNativePersistence` est fourni par le bundle React Native de
// firebase/auth, mais n'est pas déclaré dans les types du point d'entrée
// principal (résolu vers la version web). On y accède donc via un cast typé.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

/** Authentification, avec persistance de la session dans AsyncStorage. */
export const auth = firebaseAuth.initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

/** Base de données Firestore, partagée dans toute l'app. */
export const db = getFirestore(app);
