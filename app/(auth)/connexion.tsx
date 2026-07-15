// =============================================================================
//  Écran : Connexion / Inscription
//  ---------------------------------------------------------------------------
//  Un seul écran gère les deux cas (connexion et création de compte) via un
//  interrupteur. Après succès, la redirection est automatique grâce à la
//  <Garde> du layout racine (qui observe la session).
// =============================================================================

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, polices, rayons } from '@/theme/theme';

export default function EcranConnexion() {
  const { seConnecter, sInscrire } = useAuth();
  // La variante est un choix local (AsyncStorage) : elle est donc déjà connue
  // avant même d'être connecté.
  const { accent, encre } = useVariante();

  // Mode courant : true = inscription, false = connexion.
  const [modeInscription, setModeInscription] = useState(false);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function valider() {
    setErreur(null);
    setInfo(null);
    setEnCours(true);
    try {
      if (modeInscription) {
        const { confirmationRequise } = await sInscrire(email.trim(), motDePasse);
        if (confirmationRequise) {
          // Pas de session ouverte : on informe l'utilisateur et on repasse en
          // mode connexion (la <Garde> ne peut pas rediriger sans session).
          setInfo(
            'Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.'
          );
          setModeInscription(false);
        }
        // Avec Firebase, l'inscription ouvre la session immédiatement : la
        // <Garde> du layout racine redirige automatiquement vers les onglets.
      } else {
        await seConnecter(email.trim(), motDePasse);
      }
    } catch (e: any) {
      // On affiche un message lisible plutôt que l'erreur technique brute.
      setErreur(e?.message ?? 'Une erreur est survenue. Réessaie.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView style={styles.ecran}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centre}
      >
        {/* En-tête */}
        <Text style={[styles.logo, { color: accent }]}>My Watch</Text>
        <Text style={styles.sousTitre}>Suis tes séries et films, sans rien oublier.</Text>

        {/* Formulaire */}
        <TextInput
          style={styles.champ}
          placeholder="Adresse e-mail"
          placeholderTextColor={couleurs.texteDoux}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Adresse e-mail"
        />
        <TextInput
          style={styles.champ}
          placeholder="Mot de passe"
          placeholderTextColor={couleurs.texteDoux}
          secureTextEntry
          value={motDePasse}
          onChangeText={setMotDePasse}
          accessibilityLabel="Mot de passe"
        />

        {/* Message d'erreur éventuel */}
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        {/* Message d'information (ex : confirmation d'inscription) */}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        {/* Bouton principal */}
        <Pressable
          style={[styles.bouton, { backgroundColor: accent, shadowColor: accent }]}
          onPress={valider}
          disabled={enCours}
          accessibilityRole="button"
          accessibilityState={{ disabled: enCours }}
          accessibilityLabel={modeInscription ? "S'inscrire" : 'Se connecter'}
        >
          {enCours ? (
            <ActivityIndicator color={encre} />
          ) : (
            // `encre` et non blanc : du blanc sur le turquoise d'accent échoue au
            // rapport de contraste de 4,5:1.
            <Text style={[styles.boutonTexte, { color: encre }]}>
              {modeInscription ? "S'inscrire" : 'Se connecter'}
            </Text>
          )}
        </Pressable>

        {/* Bascule connexion <-> inscription */}
        <Pressable
          onPress={() => {
            setErreur(null);
            setInfo(null);
            setModeInscription((v) => !v);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.bascule}>
            {modeInscription
              ? 'Déjà un compte ? Se connecter'
              : 'Pas encore de compte ? Créer un compte'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espacements.l,
    // Sans cette borne, les champs et le bouton s'étirent sur toute la largeur
    // d'un écran de bureau : un formulaire de 1600px de large est le signe le
    // plus immédiat d'une application mobile étirée.
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  logo: {
    fontSize: 34,
    fontFamily: familles.extrabold,
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  sousTitre: {
    color: couleurs.texteDoux,
    fontSize: polices.moyenne,
    fontFamily: familles.medium,
    textAlign: 'center',
    marginTop: espacements.s,
    marginBottom: espacements.xl,
  },
  champ: {
    backgroundColor: couleurs.surface2,
    color: couleurs.texte,
    borderRadius: rayons.m,
    paddingHorizontal: espacements.m,
    height: 52,
    marginBottom: espacements.sm,
    fontSize: polices.moyenne,
    fontFamily: familles.medium,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
  },
  bouton: {
    borderRadius: rayons.rond,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacements.s,
    // Une seule source lumineuse par écran : elle désigne l'action.
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  boutonTexte: {
    fontSize: polices.moyenne,
    fontFamily: familles.bold,
  },
  bascule: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.l,
    fontSize: polices.normale,
    fontFamily: familles.medium,
  },
  erreur: {
    color: couleurs.accentRose,
    marginBottom: espacements.s,
    fontSize: polices.normale,
  },
  info: {
    color: couleurs.succes,
    marginBottom: espacements.s,
    fontSize: polices.normale,
    textAlign: 'center',
  },
});
