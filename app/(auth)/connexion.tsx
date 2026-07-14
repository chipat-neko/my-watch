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
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

export default function EcranConnexion() {
  const { seConnecter, sInscrire } = useAuth();

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
        <Text style={styles.logo}>My Watch</Text>
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
          style={styles.bouton}
          onPress={valider}
          disabled={enCours}
          accessibilityRole="button"
          accessibilityState={{ disabled: enCours }}
          accessibilityLabel={modeInscription ? "S'inscrire" : 'Se connecter'}
        >
          {enCours ? (
            <ActivityIndicator color={couleurs.texte} />
          ) : (
            <Text style={styles.boutonTexte}>
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
  },
  logo: {
    color: couleurs.accent,
    fontSize: polices.grandTitre,
    fontWeight: '800',
    textAlign: 'center',
  },
  sousTitre: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    textAlign: 'center',
    marginTop: espacements.s,
    marginBottom: espacements.xl,
  },
  champ: {
    backgroundColor: couleurs.surface,
    color: couleurs.texte,
    borderRadius: rayons.m,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.m,
    marginBottom: espacements.m,
    fontSize: polices.moyenne,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  bouton: {
    backgroundColor: couleurs.accent,
    borderRadius: rayons.m,
    paddingVertical: espacements.m,
    alignItems: 'center',
    marginTop: espacements.s,
  },
  boutonTexte: {
    color: couleurs.texte,
    fontSize: polices.moyenne,
    fontWeight: '700',
  },
  bascule: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.l,
    fontSize: polices.normale,
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
