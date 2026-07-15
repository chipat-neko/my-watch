// =============================================================================
//  Écran : Communauté
//  ---------------------------------------------------------------------------
//  Le fil de ce que regardent tes amis, et la gestion des amis.
//
//  Cet onglet avait été retiré tant qu'il n'affichait qu'un « bientôt
//  disponible » : le back-end social n'existait pas. Il existe maintenant
//  (profils publics, amitiés, activités), alors il revient.
//
//  Il n'y a toujours PAS d'invention : sans ami, le fil est vide et le dit.
// =============================================================================

import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import {
  accepterAmi,
  bloquer,
  chercherProfils,
  debloquer,
  demanderAmi,
  filDActualite,
  garantirReservation,
  mesAmities,
  mesBlocages,
  monProfil,
  Profil,
  profilsDe,
  PseudoPrisErreur,
  retirerAmi,
} from '@/services/social';
import {
  Activite,
  Amitie,
  autreMembre,
  grouperActivites,
  libelleActivite,
  pseudoValide,
} from '@/services/socialCalcul';
import { definirPseudo } from '@/services/social';
import { LignesSquelettes } from '@/components/Squelette';
import { libelleJour, jourLocal } from '@/services/historiqueCalcul';
import { urlAffiche } from '@/theme/constantes';
import { EtatPressable } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import {
  conteneurs,
  couleurs,
  densiteDe,
  espacements,
  largeurRail,
  paddingEcran,
  rayons,
  seuilLarge,
  typo,
} from '@/theme/theme';

const SANS_CONTOUR_WEB = { outlineStyle: 'none' } as unknown as TextStyle;

type Onglet = 'fil' | 'amis';

export default function EcranCommunaute() {
  const router = useRouter();
  const { utilisateur } = useAuth();
  const { accent, encre } = useVariante();
  const { width: fenetre } = useWindowDimensions();

  const grandEcran = fenetre >= seuilLarge;
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);

  const [onglet, setOnglet] = useState<Onglet>('fil');
  const [profil, setProfil] = useState<Profil | null>(null);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [amities, setAmities] = useState<Amitie[]>([]);
  const [profils, setProfils] = useState<Map<string, Profil>>(new Map());
  const [bloques, setBloques] = useState<Set<string>>(new Set());
  const [chargement, setChargement] = useState(true);

  const moi = utilisateur?.uid ?? '';

  const recharger = useCallback(async () => {
    // Ferme le trou des profils créés avant l'unicité : sans réservation, leur
    // pseudo reste prenable par n'importe qui.
    await garantirReservation();

    const p = await monProfil().catch(() => null);
    setProfil(p);
    // Sans pseudo, on n'est trouvable par personne : inutile d'aller plus loin,
    // l'écran demandera d'abord d'en choisir un.
    if (!p) {
      setChargement(false);
      return;
    }

    const [fil, liens, blocs] = await Promise.all([
      filDActualite().catch(() => [] as Activite[]),
      mesAmities().catch(() => [] as Amitie[]),
      mesBlocages().catch(() => new Set<string>()),
    ]);
    setActivites(fil);
    setAmities(liens);
    setBloques(blocs);

    // Les profils des amis ET des personnes bloquées : sans eux, la liste des
    // blocages n'afficherait que des identifiants.
    const autres = [...liens.map((a) => autreMembre(a, moi)).filter(Boolean), ...blocs];
    setProfils(await profilsDe(autres).catch(() => new Map()));
    setChargement(false);
  }, [moi]);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      setChargement(true);
      recharger().finally(() => {
        if (!actif) return;
      });
      return () => {
        actif = false;
      };
    }, [recharger])
  );

  const demandesRecues = amities.filter((a) => a.statut === 'attente' && a.demandeur !== moi);
  const amis = amities.filter((a) => a.statut === 'acceptee');

  // --- Pas encore de pseudo : c'est le préalable à tout ----------------------
  if (!chargement && !profil) {
    return (
      <ChoixPseudo
        accent={accent}
        encre={encre}
        densite={d}
        padding={padding}
        onFait={() => {
          setChargement(true);
          recharger();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={[styles.conteneur, { paddingHorizontal: padding }]}>
        <Text style={[t.h1, styles.enTete]}>Communauté</Text>

        <View style={styles.onglets}>
          {(['fil', 'amis'] as Onglet[]).map((o) => {
            const actif = o === onglet;
            const enAttente = o === 'amis' && demandesRecues.length > 0;
            return (
              <Pressable
                key={o}
                onPress={() => setOnglet(o)}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={({ hovered }: EtatPressable) => [
                  styles.onglet,
                  actif && { backgroundColor: accent, borderColor: accent },
                  hovered && !actif && { backgroundColor: couleurs.surface3 },
                ]}
              >
                <Text style={[t.label, { color: actif ? encre : couleurs.texteDoux }]}>
                  {o === 'fil' ? 'Le fil' : `Amis (${amis.length})`}
                </Text>
                {/* Une demande en attente doit se voir sans ouvrir l'onglet. */}
                {enAttente ? (
                  <View style={[styles.pastille, { backgroundColor: actif ? encre : accent }]}>
                    <Text style={[styles.pastilleTexte, { color: actif ? accent : encre }]}>
                      {demandesRecues.length}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {chargement ? (
          <LignesSquelettes nombre={5} />
        ) : onglet === 'fil' ? (
          <Fil
            activites={activites}
            moi={moi}
            accent={accent}
            densite={d}
            onOuvrir={(id) =>
              router.push({ pathname: '/titre/[id]', params: { id: String(id), type: 'serie' } })
            }
            onVersAmis={() => setOnglet('amis')}
          />
        ) : (
          <Amis
            moi={moi}
            amis={amis}
            demandes={demandesRecues}
            profils={profils}
            bloques={bloques}
            accent={accent}
            encre={encre}
            densite={d}
            onChange={recharger}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Choix du pseudo --------------------------------------------------------

function ChoixPseudo({
  accent,
  encre,
  densite,
  padding,
  onFait,
}: {
  accent: string;
  encre: string;
  densite: 'mobile' | 'desktop';
  padding: number;
  onFait: () => void;
}) {
  const t = typo(densite);
  const [pseudo, setPseudo] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function valider() {
    const v = pseudoValide(pseudo);
    if (!v.ok) {
      setErreur(v.erreur ?? 'Pseudo invalide.');
      return;
    }
    setOccupe(true);
    try {
      await definirPseudo(pseudo);
      onFait();
    } catch (e) {
      // Distinguer « déjà pris » d'une panne : dire « réessaie » sur un pseudo
      // occupé enverrait retenter à l'infini la même chose.
      setErreur(
        e instanceof PseudoPrisErreur
          ? 'Ce pseudo est déjà pris. Essayes-en un autre.'
          : 'Impossible d’enregistrer. Réessaie.'
      );
    } finally {
      setOccupe(false);
    }
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={[styles.conteneur, styles.centre, { paddingHorizontal: padding }]}>
        <View style={[styles.rond, { borderColor: accent, backgroundColor: `${accent}14` }]}>
          <Ionicons name="person-add-outline" size={40} color={accent} />
        </View>
        <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.l }]}>
          Choisis un pseudo
        </Text>
        {/* On explique à quoi il sert AVANT de le demander : personne ne saisit
            une donnée dont il ignore l'usage. */}
        <Text style={[t.body, styles.sous]}>
          C’est ce que verront tes amis, et ce par quoi ils te trouveront. Ton adresse e-mail reste
          privée.
        </Text>

        <View style={[styles.champBloc, erreur ? { borderColor: couleurs.accentRose } : null]}>
          <TextInput
            style={[t.bodyStrong, styles.champ, SANS_CONTOUR_WEB]}
            placeholder="Ton pseudo"
            placeholderTextColor={couleurs.texteFaible}
            value={pseudo}
            onChangeText={(v) => {
              setPseudo(v);
              setErreur(null);
            }}
            autoCorrect={false}
            maxLength={20}
            accessibilityLabel="Ton pseudo"
          />
        </View>
        {erreur ? (
          <Text style={[t.caption, { color: couleurs.accentRose, marginTop: espacements.s }]}>
            {erreur}
          </Text>
        ) : null}

        <Pressable
          onPress={valider}
          disabled={occupe}
          accessibilityRole="button"
          style={({ pressed }: EtatPressable) => [
            styles.valider,
            { backgroundColor: accent, shadowColor: accent },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[t.label, { color: encre }]}>{occupe ? 'Un instant…' : 'Continuer'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// --- Le fil -----------------------------------------------------------------

function Fil({
  activites,
  moi,
  accent,
  densite,
  onOuvrir,
  onVersAmis,
}: {
  activites: Activite[];
  moi: string;
  accent: string;
  densite: 'mobile' | 'desktop';
  onOuvrir: (tmdbId: number) => void;
  onVersAmis: () => void;
}) {
  const t = typo(densite);
  // Regroupe les épisodes consécutifs : sans cela, un ami qui rattrape une
  // saison remplit le fil de vingt lignes identiques.
  const groupes = useMemo(() => grouperActivites(activites), [activites]);

  if (groupes.length === 0) {
    return (
      <View style={styles.vide}>
        <View style={[styles.rond, { borderColor: accent, backgroundColor: `${accent}14` }]}>
          <Ionicons name="people-outline" size={38} color={accent} />
        </View>
        <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.l }]}>
          Ton fil est vide
        </Text>
        <Text style={[t.body, styles.sous]}>
          Ajoute des amis : ce qu’ils regardent apparaîtra ici. Et ce que tu regardes apparaîtra
          chez eux.
        </Text>
        <Pressable
          onPress={onVersAmis}
          accessibilityRole="button"
          style={({ hovered }: EtatPressable) => [
            styles.videBtn,
            { borderColor: accent },
            hovered && { backgroundColor: `${accent}14` },
          ]}
        >
          <Text style={[t.label, { color: accent }]}>Trouver des amis</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.liste}>
      {groupes.map((g, i) => {
        const a = g.tete;
        const uri = urlAffiche(a.cheminAffiche, 'w185');
        const quand = libelleJour(jourLocal(a.quand));
        const heure = new Date(a.quand).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <Animated.View key={a.id} entering={FadeInDown.duration(260).delay(Math.min(i, 8) * 40)}>
            <Pressable
              onPress={() => onOuvrir(a.tmdbId)}
              accessibilityRole="button"
              accessibilityLabel={`${a.pseudo} ${libelleActivite(a)} — ${a.serieTitre}`}
              style={({ hovered }: EtatPressable) => [
                styles.ligne,
                hovered && { backgroundColor: couleurs.surface3 },
              ]}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.affiche}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  accessible={false}
                />
              ) : (
                <View style={styles.affiche} />
              )}

              <View style={styles.infos}>
                <Text style={[t.caption, { color: couleurs.texteFaible }]}>
                  {quand} · {heure}
                </Text>
                <Text style={[t.h3, { color: couleurs.texte, marginTop: 2 }]} numberOfLines={1}>
                  {a.serieTitre}
                </Text>
                <Text style={[t.caption, { color: accent, marginTop: 2 }]} numberOfLines={1}>
                  <Text style={{ color: couleurs.texteCorps }}>
                    {a.auteur === moi ? 'Toi' : a.pseudo}
                  </Text>{' '}
                  {/* « a regardé 5 épisodes » plutôt que cinq lignes. */}
                  {g.combien > 1 ? `a regardé ${g.combien} épisodes` : libelleActivite(a)}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

// --- Les amis ---------------------------------------------------------------

function Amis({
  moi,
  amis,
  demandes,
  profils,
  bloques,
  accent,
  encre,
  densite,
  onChange,
}: {
  moi: string;
  amis: Amitie[];
  demandes: Amitie[];
  profils: Map<string, Profil>;
  bloques: Set<string>;
  accent: string;
  encre: string;
  densite: 'mobile' | 'desktop';
  onChange: () => Promise<void>;
}) {
  const t = typo(densite);
  const [terme, setTerme] = useState('');
  const [resultats, setResultats] = useState<Profil[]>([]);
  const [cherche, setCherche] = useState(false);

  async function chercher(v: string) {
    setTerme(v);
    if (v.trim().length < 2) {
      setResultats([]);
      return;
    }
    setCherche(true);
    try {
      setResultats(await chercherProfils(v));
    } catch {
      setResultats([]);
    } finally {
      setCherche(false);
    }
  }

  const dejaLies = new Set([...amis, ...demandes].map((a) => autreMembre(a, moi)));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.liste}>
      <View style={styles.barre}>
        <Ionicons name="search" size={17} color={couleurs.texteFaible} />
        <TextInput
          style={[t.bodyStrong, styles.champ, SANS_CONTOUR_WEB]}
          placeholder="Chercher un pseudo…"
          placeholderTextColor={couleurs.texteFaible}
          value={terme}
          onChangeText={chercher}
          autoCorrect={false}
          accessibilityLabel="Chercher quelqu’un par son pseudo"
        />
      </View>

      {terme.trim().length >= 2 ? (
        <View style={styles.bloc}>
          <Text style={[t.overline, styles.blocTitre]}>RÉSULTATS</Text>
          {cherche ? (
            <Text style={[t.caption, { color: couleurs.texteFaible }]}>Recherche…</Text>
          ) : resultats.length === 0 ? (
            <Text style={[t.caption, { color: couleurs.texteFaible }]}>
              Personne à ce pseudo. La recherche fonctionne par début de pseudo.
            </Text>
          ) : (
            resultats.map((p) => (
              <LignePersonne
                key={p.uid}
                pseudo={p.pseudo}
                accent={accent}
                encre={encre}
                densite={densite}
                action={
                  dejaLies.has(p.uid)
                    ? { libelle: 'Déjà lié', desactive: true }
                    : {
                        libelle: 'Ajouter',
                        onPress: async () => {
                          await demanderAmi(p.uid);
                          await onChange();
                        },
                      }
                }
              />
            ))
          )}
        </View>
      ) : null}

      {demandes.length > 0 ? (
        <View style={styles.bloc}>
          <Text style={[t.overline, styles.blocTitre]}>DEMANDES REÇUES</Text>
          {demandes.map((a) => (
            <LignePersonne
              key={a.id}
              pseudo={profils.get(autreMembre(a, moi))?.pseudo ?? 'Quelqu’un'}
              accent={accent}
              encre={encre}
              densite={densite}
              action={{
                libelle: 'Accepter',
                plein: true,
                onPress: async () => {
                  await accepterAmi(a.id);
                  await onChange();
                },
              }}
              secondaire={{
                libelle: 'Refuser',
                onPress: async () => {
                  await retirerAmi(a.id);
                  await onChange();
                },
              }}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.bloc}>
        <Text style={[t.overline, styles.blocTitre]}>MES AMIS</Text>
        {amis.length === 0 ? (
          <Text style={[t.caption, { color: couleurs.texteFaible }]}>
            Personne pour l’instant. Cherche un pseudo ci-dessus.
          </Text>
        ) : (
          amis.map((a) => {
            const uid = autreMembre(a, moi);
            const nom = profils.get(uid)?.pseudo ?? 'Quelqu’un';
            return (
              <LignePersonne
                key={a.id}
                pseudo={nom}
                accent={accent}
                encre={encre}
                densite={densite}
                secondaire={{
                  libelle: 'Retirer',
                  onPress: async () => {
                    await retirerAmi(a.id);
                    await onChange();
                  },
                }}
                // Bloquer rompt le lien ET interdit toute nouvelle demande :
                // trop lourd pour un clic isolé, d'où la confirmation.
                danger={{
                  libelle: 'Bloquer',
                  confirmation: 'Bloquer ?',
                  onPress: async () => {
                    await bloquer(uid);
                    await onChange();
                  },
                }}
              />
            );
          })
        )}
      </View>

      {bloques.size > 0 ? (
        <View style={styles.bloc}>
          <Text style={[t.overline, styles.blocTitre]}>BLOQUÉS</Text>
          {[...bloques].map((uid) => (
            <LignePersonne
              key={uid}
              pseudo={profils.get(uid)?.pseudo ?? 'Quelqu’un'}
              accent={accent}
              encre={encre}
              densite={densite}
              action={{
                libelle: 'Débloquer',
                onPress: async () => {
                  await debloquer(uid);
                  await onChange();
                },
              }}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Une ligne « quelqu'un » avec ses actions. */
function LignePersonne({
  pseudo,
  accent,
  encre,
  densite,
  action,
  secondaire,
  danger,
}: {
  pseudo: string;
  accent: string;
  encre: string;
  densite: 'mobile' | 'desktop';
  action?: { libelle: string; onPress?: () => Promise<void>; plein?: boolean; desactive?: boolean };
  secondaire?: { libelle: string; onPress: () => Promise<void> };
  /** Action irréversible : demande une confirmation en deux temps. */
  danger?: { libelle: string; confirmation: string; onPress: () => Promise<void> };
}) {
  const t = typo(densite);
  const [occupe, setOccupe] = useState(false);
  const [confirme, setConfirme] = useState(false);

  async function lancer(f?: () => Promise<void>) {
    if (!f || occupe) return;
    setOccupe(true);
    try {
      await f();
    } finally {
      setOccupe(false);
    }
  }

  return (
    <View style={styles.personne}>
      <View style={[styles.avatar, { backgroundColor: `${accent}29`, borderColor: `${accent}59` }]}>
        <Text style={[t.label, { color: accent }]}>
          {pseudo.slice(0, 1).toLocaleUpperCase('fr')}
        </Text>
      </View>
      <Text style={[t.h3, { color: couleurs.texte, flex: 1 }]} numberOfLines={1}>
        {pseudo}
      </Text>

      {danger ? (
        <Pressable
          onPress={() => {
            // Deux temps : le premier clic demande, le second agit. `Alert`
            // n'existe pas sur react-native-web — une confirmation maison est le
            // seul moyen d'avoir le même garde-fou partout.
            if (!confirme) {
              setConfirme(true);
              setTimeout(() => setConfirme(false), 4000);
              return;
            }
            lancer(danger.onPress);
          }}
          disabled={occupe}
          accessibilityRole="button"
          accessibilityLabel={
            confirme ? `Confirmer : ${danger.libelle} ${pseudo}` : `${danger.libelle} ${pseudo}`
          }
          style={({ hovered }: EtatPressable) => [
            styles.btnSecondaire,
            confirme && {
              backgroundColor: `${couleurs.accentRose}29`,
              borderColor: couleurs.accentRose,
            },
            hovered && { borderColor: couleurs.accentRose },
          ]}
        >
          <Text
            style={[t.caption, { color: confirme ? couleurs.accentRose : couleurs.texteFaible }]}
          >
            {occupe ? '…' : confirme ? danger.confirmation : danger.libelle}
          </Text>
        </Pressable>
      ) : null}

      {secondaire ? (
        <Pressable
          onPress={() => lancer(secondaire.onPress)}
          disabled={occupe}
          accessibilityRole="button"
          accessibilityLabel={`${secondaire.libelle} ${pseudo}`}
          style={({ hovered }: EtatPressable) => [
            styles.btnSecondaire,
            hovered && { borderColor: couleurs.accentRose },
          ]}
        >
          <Text style={[t.caption, { color: couleurs.texteDoux }]}>{secondaire.libelle}</Text>
        </Pressable>
      ) : null}

      {action ? (
        <Pressable
          onPress={() => lancer(action.onPress)}
          disabled={occupe || action.desactive}
          accessibilityRole="button"
          accessibilityLabel={`${action.libelle} ${pseudo}`}
          style={({ hovered }: EtatPressable) => [
            styles.btnAction,
            action.plein
              ? { backgroundColor: accent, borderColor: accent }
              : { borderColor: couleurs.bordure2 },
            action.desactive && { opacity: 0.45 },
            hovered && !action.desactive && !action.plein && { borderColor: accent },
          ]}
        >
          <Text
            style={[
              t.caption,
              { color: action.plein ? encre : action.desactive ? couleurs.texteFaible : accent },
            ]}
          >
            {occupe ? '…' : action.libelle}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Un fil se lit en colonne : borné à la mesure de lecture.
  conteneur: { flex: 1, width: '100%', maxWidth: conteneurs.lecture, alignSelf: 'center' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  enTete: { color: couleurs.texte, paddingTop: espacements.sm, marginBottom: espacements.m },
  onglets: { flexDirection: 'row', gap: espacements.s, marginBottom: espacements.ml },
  onglet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    height: 38,
    paddingHorizontal: espacements.m,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    cursor: 'pointer',
  },
  pastille: {
    minWidth: 18,
    height: 18,
    borderRadius: rayons.rond,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pastilleTexte: { fontFamily: 'Manrope_800ExtraBold', fontSize: 10 },
  liste: { paddingBottom: espacements.section },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.m,
    padding: espacements.s,
    marginBottom: espacements.s,
    cursor: 'pointer',
  },
  affiche: {
    width: 44,
    height: 66,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.lisere,
  },
  infos: { flex: 1 },
  bloc: { marginTop: espacements.l },
  blocTitre: { color: couleurs.texteFaible, marginBottom: espacements.sm },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    height: 48,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.m,
  },
  champ: { flex: 1, color: couleurs.texte, height: '100%' },
  champBloc: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    justifyContent: 'center',
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.ml,
    marginTop: espacements.l,
  },
  valider: {
    height: 48,
    paddingHorizontal: espacements.xl,
    justifyContent: 'center',
    borderRadius: rayons.rond,
    marginTop: espacements.m,
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    cursor: 'pointer',
  },
  personne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.m,
    padding: espacements.s,
    marginBottom: espacements.s,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAction: {
    height: 32,
    paddingHorizontal: espacements.sm,
    justifyContent: 'center',
    borderRadius: rayons.rond,
    borderWidth: 1,
    cursor: 'pointer',
  },
  btnSecondaire: {
    height: 32,
    paddingHorizontal: espacements.sm,
    justifyContent: 'center',
    borderRadius: rayons.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    cursor: 'pointer',
  },
  rond: {
    width: 84,
    height: 84,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sous: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.s,
    maxWidth: 380,
  },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: espacements.xxl },
  videBtn: {
    height: 44,
    paddingHorizontal: espacements.ml,
    justifyContent: 'center',
    borderRadius: rayons.rond,
    borderWidth: 1.5,
    marginTop: espacements.l,
    cursor: 'pointer',
  },
});
