// =============================================================================
//  Contexte de variante visuelle (classic / grid / social)
//  ---------------------------------------------------------------------------
//  Le handoff de design propose 3 directions au choix de l'utilisateur. Elles
//  partagent les mêmes données et la même navigation ; elles diffèrent par la
//  couleur d'accent et la mise en page de certains écrans.
//
//  Ce contexte expose la variante courante + sa couleur d'accent, et persiste
//  le choix de l'utilisateur (AsyncStorage). Le réglage se fait dans le Profil.
// =============================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Variante = 'classic' | 'grid' | 'social';

/** Accent (et son "encre" = couleur du texte posé sur l'accent) par variante. */
export const ACCENTS: Record<Variante, { accent: string; encre: string }> = {
  classic: { accent: '#34E0C4', encre: '#04231F' },
  grid: { accent: '#7AA2FF', encre: '#04122B' },
  social: { accent: '#FF5D7D', encre: '#2B040F' },
};

/** Libellés lisibles des variantes (pour le sélecteur). */
export const LIBELLES_VARIANTE: Record<Variante, string> = {
  classic: 'Classique',
  grid: 'Grille',
  social: 'Social',
};

interface ContexteVariante {
  variante: Variante;
  /** Couleur d'accent de la variante courante. */
  accent: string;
  /** Couleur de texte à poser sur l'accent (boutons pleins). */
  encre: string;
  definirVariante: (v: Variante) => void;
}

const VarianteContext = createContext<ContexteVariante | undefined>(undefined);
const CLE = 'variante_ui';

export function FournisseurVariante({ children }: { children: ReactNode }) {
  const [variante, setVariante] = useState<Variante>('classic');

  // Restaure le choix enregistré au démarrage.
  useEffect(() => {
    AsyncStorage.getItem(CLE).then((v) => {
      if (v === 'classic' || v === 'grid' || v === 'social') setVariante(v);
    });
  }, []);

  function definirVariante(v: Variante) {
    setVariante(v);
    AsyncStorage.setItem(CLE, v);
  }

  const { accent, encre } = ACCENTS[variante];

  return (
    <VarianteContext.Provider value={{ variante, accent, encre, definirVariante }}>
      {children}
    </VarianteContext.Provider>
  );
}

export function useVariante(): ContexteVariante {
  const ctx = useContext(VarianteContext);
  if (!ctx) {
    throw new Error('useVariante doit être utilisé à l’intérieur de <FournisseurVariante>.');
  }
  return ctx;
}
