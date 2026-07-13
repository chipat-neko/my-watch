// =============================================================================
//  Contexte d'authentification
//  ---------------------------------------------------------------------------
//  Expose l'état de connexion à toute l'application via un "Context" React.
//  Grâce au hook `useAuth()`, n'importe quel écran peut :
//    - savoir si un utilisateur est connecté (session)
//    - se connecter, s'inscrire, se déconnecter
//
//  Le fournisseur écoute en continu les changements d'état côté Supabase
//  (connexion, déconnexion, rafraîchissement du jeton) et met l'UI à jour.
// =============================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Valeurs et actions exposées par le contexte d'authentification. */
interface ContexteAuth {
  /** Session Supabase courante (null si déconnecté). */
  session: Session | null;
  /** Vrai tant que l'on vérifie la session au démarrage. */
  chargement: boolean;
  /** Connecte un utilisateur existant. */
  seConnecter: (email: string, motDePasse: string) => Promise<void>;
  /**
   * Crée un nouveau compte. Renvoie `confirmationRequise: true` lorsque
   * Supabase n'a pas ouvert de session (une validation par e-mail est attendue).
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
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // 1. Au démarrage, on récupère la session déjà enregistrée (si elle existe).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChargement(false);
    });

    // 2. On s'abonne aux changements (connexion / déconnexion / refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession);
    });

    // 3. On se désabonne proprement lorsque le composant est démonté.
    return () => sub.subscription.unsubscribe();
  }, []);

  async function seConnecter(email: string, motDePasse: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) throw error;
  }

  async function sInscrire(email: string, motDePasse: string) {
    const { data, error } = await supabase.auth.signUp({ email, password: motDePasse });
    if (error) throw error;
    // Si la confirmation e-mail est activée côté Supabase (comportement par
    // défaut), aucune session n'est ouverte : l'utilisateur doit d'abord
    // valider son adresse. On remonte l'info pour que l'écran l'en informe.
    return { confirmationRequise: data.session === null };
  }

  async function seDeconnecter() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ session, chargement, seConnecter, sInscrire, seDeconnecter }}>
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
