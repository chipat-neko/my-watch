// =============================================================================
//  Contexte d'authentification (Firebase)
//  ---------------------------------------------------------------------------
//  Expose l'état de connexion à toute l'application via un "Context" React.
//  Grâce au hook `useAuth()`, n'importe quel écran peut :
//    - savoir si un utilisateur est connecté (utilisateur)
//    - se connecter, s'inscrire, se déconnecter
//
//  Le fournisseur écoute en continu l'état d'authentification Firebase et met
//  l'UI à jour (connexion, déconnexion, restauration de session au démarrage).
// =============================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/** Valeurs et actions exposées par le contexte d'authentification. */
interface ContexteAuth {
  /** Utilisateur Firebase courant (null si déconnecté). */
  utilisateur: User | null;
  /** Vrai tant que l'on vérifie la session au démarrage. */
  chargement: boolean;
  /** Connecte un utilisateur existant. */
  seConnecter: (email: string, motDePasse: string) => Promise<void>;
  /**
   * Crée un nouveau compte. Avec Firebase, l'utilisateur est connecté
   * immédiatement (aucune confirmation par e-mail requise) : `confirmationRequise`
   * vaut donc toujours false. Le champ est conservé pour compatibilité d'API.
   */
  sInscrire: (email: string, motDePasse: string) => Promise<{ confirmationRequise: boolean }>;
  /** Déconnecte l'utilisateur courant. */
  seDeconnecter: () => Promise<void>;
}

const AuthContext = createContext<ContexteAuth | undefined>(undefined);

/**
 * Fournisseur à placer à la racine de l'app (voir app/_layout.tsx).
 * Il englobe tous les écrans pour leur donner accès à l'authentification.
 */
export function FournisseurAuth({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Écoute l'état de connexion ; le premier déclenchement (session restaurée
    // ou non) signale la fin de la vérification initiale.
    const desabonner = onAuthStateChanged(auth, (u) => {
      setUtilisateur(u);
      setChargement(false);
    });
    return desabonner;
  }, []);

  async function seConnecter(email: string, motDePasse: string) {
    await signInWithEmailAndPassword(auth, email, motDePasse);
  }

  async function sInscrire(email: string, motDePasse: string) {
    await createUserWithEmailAndPassword(auth, email, motDePasse);
    // Firebase ouvre la session immédiatement : la <Garde> redirige aussitôt.
    return { confirmationRequise: false };
  }

  async function seDeconnecter() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ utilisateur, chargement, seConnecter, sInscrire, seDeconnecter }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook pratique pour consommer le contexte d'authentification. */
export function useAuth(): ContexteAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <FournisseurAuth>.');
  }
  return ctx;
}
