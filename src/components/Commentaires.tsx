// =============================================================================
//  Composant : Commentaires d'un épisode
//  ---------------------------------------------------------------------------
//  Publics entre utilisateurs, comme chez TV Time : discuter d'un épisode avec
//  ses seuls amis n'aurait aucun intérêt — on veut réagir avec ceux qui viennent
//  de le voir, pas avec les trois personnes qu'on connaît.
//
//  ⚠️ Spoilers : le bloc est repliable et FERMÉ par défaut. Afficher d'office
//  les commentaires d'un épisode non vu serait le meilleur moyen de gâcher la
//  série de quelqu'un.
// =============================================================================

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commentairesEpisode, commenter, signaler, supprimerCommentaire } from '@/services/social';
import { Commentaire } from '@/services/socialCalcul';
import { jourLocal, libelleJour } from '@/services/historiqueCalcul';
import { EtatPressable } from '@/types';
import { couleurs, Densite, espacements, rayons, typo } from '@/theme/theme';

const SANS_CONTOUR_WEB = { outlineStyle: 'none' } as unknown as TextStyle;

/** Nombre de caractères au-delà duquel on refuse — la même borne que les règles. */
const MAX = 500;

interface Props {
  serieId: number;
  episodeId: number;
  /** Vrai si l'utilisateur a vu l'épisode : sinon, on prévient du risque de spoiler. */
  vu: boolean;
  moi: string;
  accent: string;
  encre: string;
  densite: Densite;
}

export function Commentaires({ serieId, episodeId, vu, moi, accent, encre, densite }: Props) {
  const t = typo(densite);
  const [ouvert, setOuvert] = useState(false);
  const [liste, setListe] = useState<Commentaire[]>([]);
  const [texte, setTexte] = useState('');
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Identifiant du commentaire signalé, pour confirmer l'envoi. */
  const [signale, setSignale] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setListe(await commentairesEpisode(episodeId));
    } catch {
      setErreur('Impossible de charger les commentaires.');
    } finally {
      setChargement(false);
    }
  }, [episodeId]);

  function basculer() {
    const suivant = !ouvert;
    setOuvert(suivant);
    // On ne charge qu'à l'ouverture : sur une saison de vingt épisodes, charger
    // tous les commentaires d'avance ferait vingt requêtes pour rien.
    if (suivant && liste.length === 0) charger();
  }

  async function envoyer() {
    const propre = texte.trim();
    if (!propre || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const c = await commenter(serieId, episodeId, propre);
      // En tête : le fil va du plus récent au plus ancien.
      setListe((l) => [c, ...l]);
      setTexte('');
    } catch (e) {
      setErreur((e as Error)?.message ?? 'Envoi impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer(id: string) {
    try {
      await supprimerCommentaire(id);
      setListe((l) => l.filter((c) => c.id !== id));
    } catch {
      setErreur('Suppression impossible.');
    }
  }

  /**
   * Signale un commentaire. Le motif n'est pas demandé : ajouter un formulaire
   * ferait renoncer la plupart des gens, et un signalement sans motif vaut mieux
   * qu'un signalement jamais envoyé. Le commentaire est joint, la console
   * Firebase permet de juger sur pièce.
   */
  async function signalerCommentaire(id: string) {
    if (signale) return;
    try {
      const c = liste.find((x) => x.id === id);
      await signaler('commentaire', id, c?.texte.slice(0, 300) ?? 'Contenu inapproprié');
      setSignale(id);
    } catch {
      setErreur('Signalement impossible.');
    }
  }

  return (
    <View style={styles.bloc}>
      <Pressable
        onPress={basculer}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={ouvert ? 'Masquer les commentaires' : 'Afficher les commentaires'}
        style={({ hovered }: EtatPressable) => [
          styles.bascule,
          hovered && { backgroundColor: couleurs.surface3 },
        ]}
      >
        <Ionicons name="chatbubble-outline" size={14} color={couleurs.texteFaible} />
        <Text style={[t.caption, { color: couleurs.texteDoux }]}>
          {ouvert ? 'Masquer les commentaires' : 'Commentaires'}
        </Text>
        <Ionicons
          name={ouvert ? 'chevron-up' : 'chevron-down'}
          size={13}
          color={couleurs.texteFaible}
        />
      </Pressable>

      {ouvert ? (
        <View style={styles.contenu}>
          {/* Un avertissement, pas un blocage : c'est à chacun de décider. */}
          {!vu ? (
            <View style={styles.alerte}>
              <Ionicons name="eye-off-outline" size={14} color={couleurs.statOr} />
              <Text style={[t.caption, { color: couleurs.statOr, flex: 1 }]}>
                Tu n’as pas vu cet épisode : les commentaires peuvent le divulgâcher.
              </Text>
            </View>
          ) : null}

          <View style={styles.saisie}>
            <TextInput
              style={[t.body, styles.champ, SANS_CONTOUR_WEB]}
              placeholder="Ton avis sur cet épisode…"
              placeholderTextColor={couleurs.texteFaible}
              value={texte}
              onChangeText={setTexte}
              multiline
              maxLength={MAX}
              accessibilityLabel="Écrire un commentaire"
            />
            <Pressable
              onPress={envoyer}
              disabled={!texte.trim() || envoi}
              accessibilityRole="button"
              accessibilityLabel="Publier le commentaire"
              style={({ hovered }: EtatPressable) => [
                styles.envoyer,
                { backgroundColor: texte.trim() ? accent : couleurs.surface2 },
                hovered && texte.trim() ? { opacity: 0.9 } : null,
              ]}
            >
              <Ionicons
                name={envoi ? 'hourglass-outline' : 'send'}
                size={15}
                color={texte.trim() ? encre : couleurs.texteFaible}
              />
            </Pressable>
          </View>

          {erreur ? (
            <Text style={[t.caption, { color: couleurs.accentRose }]}>{erreur}</Text>
          ) : null}

          {chargement ? (
            <Text style={[t.caption, { color: couleurs.texteFaible }]}>Chargement…</Text>
          ) : liste.length === 0 ? (
            <Text style={[t.caption, { color: couleurs.texteFaible }]}>
              Aucun commentaire. Sois le premier.
            </Text>
          ) : (
            liste.map((c) => (
              <View key={c.id} style={styles.commentaire}>
                <View style={styles.enTeteC}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: `${accent}29`, borderColor: `${accent}59` },
                    ]}
                  >
                    <Text style={[styles.initiale, { color: accent }]}>
                      {c.pseudo.slice(0, 1).toLocaleUpperCase('fr')}
                    </Text>
                  </View>
                  <Text style={[t.label, { color: couleurs.texte }]}>{c.pseudo}</Text>
                  <Text style={[t.caption, { color: couleurs.texteFaible, flex: 1 }]}>
                    {libelleJour(jourLocal(c.quand))}
                  </Text>
                  {/* On ne peut supprimer que le sien : les règles le
                      garantissent, l'interface ne fait que le refléter. */}
                  {c.auteur === moi ? (
                    <Pressable
                      onPress={() => retirer(c.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer mon commentaire"
                      hitSlop={8}
                      style={styles.suppr}
                    >
                      <Ionicons name="trash-outline" size={13} color={couleurs.texteFaible} />
                    </Pressable>
                  ) : (
                    // Signaler le commentaire d'un autre : c'est ici que le
                    // problème se voit, donc ici que l'action doit être.
                    <Pressable
                      onPress={() => signalerCommentaire(c.id)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        signale === c.id ? 'Commentaire signalé' : 'Signaler ce commentaire'
                      }
                      hitSlop={8}
                      style={styles.suppr}
                    >
                      <Ionicons
                        name={signale === c.id ? 'checkmark' : 'flag-outline'}
                        size={13}
                        color={signale === c.id ? accent : couleurs.texteFaible}
                      />
                    </Pressable>
                  )}
                </View>
                <Text style={[t.body, { color: couleurs.texteCorps }]}>{c.texte}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { marginTop: espacements.s },
  bascule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    alignSelf: 'flex-start',
    height: 30,
    paddingHorizontal: espacements.s,
    borderRadius: rayons.rond,
    cursor: 'pointer',
  },
  contenu: { gap: espacements.sm, marginTop: espacements.s },
  alerte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    backgroundColor: `${couleurs.statOr}14`,
    borderWidth: 1,
    borderColor: `${couleurs.statOr}40`,
    borderRadius: rayons.s,
    padding: espacements.s,
  },
  saisie: { flexDirection: 'row', alignItems: 'flex-end', gap: espacements.s },
  champ: {
    flex: 1,
    color: couleurs.texte,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.m,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.s,
    minHeight: 40,
    maxHeight: 120,
  },
  envoyer: {
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  commentaire: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.m,
    padding: espacements.sm,
    gap: espacements.s,
  },
  enTeteC: { flexDirection: 'row', alignItems: 'center', gap: espacements.s },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initiale: { fontFamily: 'Manrope_800ExtraBold', fontSize: 11 },
  suppr: { cursor: 'pointer' },
});
