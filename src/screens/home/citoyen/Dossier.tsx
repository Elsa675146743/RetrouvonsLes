import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator,
  RefreshControl, Dimensions, Platform, Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

type Statut = 'tous' | 'en_cours' | 'retrouve_vivant' | 'retrouve_decede' | 'suspendu' | 'classe_sans_suite' | 'transfere';

interface Dossier {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  age: number | null;
  sexe: string | null;
  dernier_lieu: string | null;
  ville: string | null;
  date_disparition: string | null;
  description: string | null;
  statut: string;
  niveau_urgence: string | null;
  photo_url: string | null;
  nb_vues: number;
  nombre_signalements: number;
}

// ─── HEADER ───
function Header({ navigation }: any) {
  return (
    <View style={hS.wrapper}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={hS.back}>
        <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
      </TouchableOpacity>
      <View style={hS.center}>
        <Text style={hS.title}>Dossiers</Text>
        <Text style={hS.sub}>Personnes disparues</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

const hS = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  back:   { width: 40, height: 40, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  title:  { fontSize: 17, fontWeight: '800', color: '#1e3a5f' },
  sub:    { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
});

// ─── BADGE STATUT ───
function BadgeStatut({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    en_cours:           { label: 'En cours',        bg: '#fef3c7', color: '#d97706' },
    retrouve_vivant:    { label: 'Retrouvé vivant', bg: '#dcfce7', color: '#16a34a' },
    retrouve_decede:    { label: 'Retrouvé décédé', bg: '#fee2e2', color: '#dc2626' },
    suspendu:           { label: 'Suspendu',        bg: '#f1f5f9', color: '#64748b' },
    classe_sans_suite:  { label: 'Classé',          bg: '#f1f5f9', color: '#94a3b8' },
    transfere:          { label: 'Transféré',       bg: '#ede9fe', color: '#7c3aed' },
  };
  const s = map[statut] ?? { label: statut, bg: '#fef3c7', color: '#d97706' };
  return (
    <View style={[bS.badge, { backgroundColor: s.bg }]}>
      <Text style={[bS.text, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const bS = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  text:  { fontSize: 10, fontWeight: '700' },
});

// ─── BADGE URGENCE ───
function BadgeUrgence({ niveau }: { niveau: string | null }) {
  if (!niveau) return null;
  const map: Record<string, { label: string; color: string }> = {
    critique: { label: '🔴 Critique', color: '#dc2626' },
    urgent:   { label: '🟠 Urgent',   color: '#ea580c' },
    normal:   { label: '🟡 Normal',   color: '#d97706' },
    faible:   { label: '🟢 Faible',   color: '#16a34a' },
  };
  const u = map[niveau] ?? { label: niveau, color: '#64748b' };
  return (
    <Text style={{ fontSize: 10, color: u.color, fontWeight: '700', marginTop: 2 }}>
      {u.label}
    </Text>
  );
}

// ─── CARTE DOSSIER ───
function CarteDossier({ dossier, onVoir, onSignaler }: any) {
  const age  = dossier.age ? `${dossier.age} ans` : '—';
  const lieu = [dossier.dernier_lieu, dossier.ville].filter(Boolean).join(', ') || '—';
  const date = dossier.date_disparition
    ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <View style={cS.card}>
      <View style={cS.badgeTop}>
        <BadgeStatut statut={dossier.statut} />
        <BadgeUrgence niveau={dossier.niveau_urgence} />
      </View>

      <View style={cS.photoBox}>
        {dossier.photo_url ? (
          <Image
            source={{ uri: dossier.photo_url }}
            style={cS.photo}
            onError={() => {}}
          />
        ) : (
          <View style={cS.photoPlaceholder}>
            <Ionicons name="person" size={36} color="#93c5fd" />
          </View>
        )}
      </View>

      <View style={cS.infos}>
        <Text style={cS.nom} numberOfLines={1}>
          {dossier.prenom} {dossier.nom}
        </Text>
        <Text style={cS.age}>{age}</Text>
      </View>

      <View style={cS.detailRow}>
        <Ionicons name="location-outline" size={12} color="#64748b" />
        <Text style={cS.detailText} numberOfLines={1}>{lieu}</Text>
      </View>
      <View style={cS.detailRow}>
        <Ionicons name="calendar-outline" size={12} color="#64748b" />
        <Text style={cS.detailText}>{date}</Text>
      </View>
      {dossier.nombre_signalements > 0 && (
        <View style={cS.detailRow}>
          <Ionicons name="chatbubble-outline" size={12} color="#1d4ed8" />
          <Text style={[cS.detailText, { color: '#1d4ed8' }]}>
            {dossier.nombre_signalements} témoignage{dossier.nombre_signalements > 1 ? 's' : ''}
          </Text>
        </View>
      )}
      {dossier.description ? (
        <Text style={cS.description} numberOfLines={2}>{dossier.description}</Text>
      ) : null}

      <View style={cS.btns}>
        <TouchableOpacity style={cS.btnVoir} onPress={onVoir} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={14} color="#1d4ed8" />
          <Text style={cS.btnVoirText}>Voir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cS.btnSignaler} onPress={onSignaler} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={14} color="#fff" />
          <Text style={cS.btnSignalerText}>Signaler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cS = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 12, marginBottom: 16,
    width: (width - 48) / 2,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  badgeTop:         { marginBottom: 8, gap: 2 },
  photoBox:         { marginBottom: 10 },
  photo:            { width: '100%', height: 110, borderRadius: 10, resizeMode: 'cover' },
  photoPlaceholder: { width: '100%', height: 110, borderRadius: 10, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  infos:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 5 },
  nom:              { fontSize: 13, fontWeight: '800', color: '#1e3a5f', flex: 1 },
  age:              { fontSize: 11, color: '#64748b', fontWeight: '600', marginLeft: 4 },
  detailRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  detailText:       { fontSize: 10, color: '#64748b', flex: 1 },
  description:      { fontSize: 10, color: '#94a3b8', marginTop: 5, lineHeight: 14 },
  btns:             { flexDirection: 'row', gap: 6, marginTop: 10 },
  btnVoir: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#1d4ed8',
  },
  btnVoirText:     { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  btnSignaler: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  btnSignalerText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

// ─── MESSAGE D'ERREUR ───
function ErreurCard({ message, onRetry }: any) {
  return (
    <View style={errS.box}>
      <Ionicons name="warning-outline" size={40} color="#f59e0b" />
      <Text style={errS.titre}>Erreur de chargement</Text>
      <Text style={errS.msg}>{message}</Text>
      <TouchableOpacity style={errS.btn} onPress={onRetry}>
        <Text style={errS.btnTxt}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const errS = StyleSheet.create({
  box:   { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 30 },
  titre: { fontSize: 16, fontWeight: '700', color: '#1e3a5f' },
  msg:   { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  btn:   { marginTop: 10, backgroundColor: '#1d4ed8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  btnTxt:{ color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ─── ÉCRAN PRINCIPAL ───
export default function Dossier({ navigation }: any) {
  const [recherche, setRecherche]   = useState('');
  const [filtre, setFiltre]         = useState<Statut>('tous');
  const [dossiers, setDossiers]     = useState<Dossier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur]         = useState<string | null>(null);

  const filtres: { key: Statut; label: string }[] = [
    { key: 'tous',              label: 'Tous'            },
    { key: 'en_cours',          label: 'En cours'        },
    { key: 'retrouve_vivant',   label: 'Retrouvé vivant' },
    { key: 'retrouve_decede',   label: 'Retrouvé décédé' },
    { key: 'suspendu',          label: 'Suspendu'        },
    { key: 'classe_sans_suite', label: 'Classé'          },
  ];

  const fetchDossiers = useCallback(async () => {
    try {
      setErreur(null);
      setLoading(true);

      // ── STRATÉGIE 1 : requête simple sans jointure photo ──
      // On récupère d'abord les dossiers + personnes
      let queryDossiers = supabase
        .from('dossier_disparition')
        .select(`
          id,
          numero_dossier,
          date_disparition,
          lieu_disparition,
          ville_disparition,
          circonstances,
          statut_dossier,
          niveau_urgence,
          nombre_signalements,
          nombre_vues_fiche,
          id_personne
        `)
        .order('date_disparition', { ascending: false })
        .limit(50);

      // Filtre statut
      if (filtre !== 'tous') {
        queryDossiers = queryDossiers.eq('statut_dossier', filtre);
      }

      const { data: dataDossiers, error: errDossiers } = await queryDossiers;

      console.log('[Dossier] Résultats bruts:', dataDossiers?.length, errDossiers?.message);

      if (errDossiers) {
        setErreur(`Erreur BD: ${errDossiers.message}`);
        setDossiers([]);
        return;
      }

      if (!dataDossiers || dataDossiers.length === 0) {
        setDossiers([]);
        return;
      }

      // ── Récupère les IDs de personnes uniques ──
      const personneIds = [...new Set(
        dataDossiers
          .map((d: any) => d.id_personne)
          .filter(Boolean)
      )];

      // ── STRATÉGIE 2 : requête séparée pour les personnes ──
      let personnesMap: Record<string, any> = {};

      if (personneIds.length > 0) {
        const { data: dataPersonnes, error: errPersonnes } = await supabase
          .from('personne')
          .select(`
            id,
            nom,
            prenom,
            age_estime_min,
            age_estime_max,
            sexe,
            photo_principale
          `)
          .in('id', personneIds);

        if (errPersonnes) {
          console.warn('[Dossier] Erreur personnes:', errPersonnes.message);
        } else {
          (dataPersonnes ?? []).forEach((p: any) => {
            personnesMap[p.id] = p;
          });
        }

        // ── STRATÉGIE 3 : photos séparées ──
        const { data: dataPhotos, error: errPhotos } = await supabase
          .from('photo')
          .select(`
            id,
            url_cloudinary,
            est_principale,
            approuvee,
            id_personne
          `)
          .in('id_personne', personneIds)
          .eq('approuvee', true);

        if (errPhotos) {
          console.warn('[Dossier] Erreur photos:', errPhotos.message);
        } else {
          // Attache les photos à chaque personne
          (dataPhotos ?? []).forEach((ph: any) => {
            if (!personnesMap[ph.id_personne]) return;
            if (!personnesMap[ph.id_personne]._photos) {
              personnesMap[ph.id_personne]._photos = [];
            }
            personnesMap[ph.id_personne]._photos.push(ph);
          });
        }
      }

      // ── Construction des dossiers mappés ──
      let mapped: Dossier[] = dataDossiers.map((d: any) => {
        const personne = personnesMap[d.id_personne] ?? null;
        const photos: any[] = personne?._photos ?? [];

        // Priorité : photo_principale (url directe) → photo principale approuvée → première photo approuvée
        const photoUrl =
          personne?.photo_principale ??
          photos.find((p: any) => p.est_principale)?.url_cloudinary ??
          photos[0]?.url_cloudinary ??
          null;

        // Âge : priorité age_estime_min, sinon age_estime_max
        const age = personne?.age_estime_min ?? personne?.age_estime_max ?? null;

        return {
          id:                  d.id,
          numero_dossier:      d.numero_dossier ?? '',
          nom:                 personne?.nom ?? '',
          prenom:              personne?.prenom ?? '',
          age,
          sexe:                personne?.sexe ?? null,
          dernier_lieu:        d.lieu_disparition ?? null,
          ville:               d.ville_disparition ?? null,
          date_disparition:    d.date_disparition ?? null,
          description:         d.circonstances ?? null,
          statut:              d.statut_dossier ?? 'en_cours',
          niveau_urgence:      d.niveau_urgence ?? null,
          photo_url:           photoUrl,
          nb_vues:             d.nombre_vues_fiche ?? 0,
          nombre_signalements: d.nombre_signalements ?? 0,
        };
      });

      // ── Filtre recherche côté client ──
      if (recherche.trim()) {
        const q = recherche.toLowerCase().trim();
        mapped = mapped.filter(d =>
          d.nom?.toLowerCase().includes(q) ||
          d.prenom?.toLowerCase().includes(q) ||
          d.dernier_lieu?.toLowerCase().includes(q) ||
          d.ville?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
        );
      }

      console.log('[Dossier] Dossiers mappés:', mapped.length);
      setDossiers(mapped);

    } catch (err: any) {
      console.error('[Dossier] Exception:', err);
      setErreur(`Erreur inattendue: ${err?.message ?? 'inconnue'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtre, recherche]);

  useEffect(() => {
    const timer = setTimeout(fetchDossiers, recherche.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchDossiers]);

  const colonneGauche = dossiers.filter((_, i) => i % 2 === 0);
  const colonneDroite = dossiers.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header navigation={navigation} />

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un nom, un lieu..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
          returnKeyType="search"
          autoCorrect={false}
        />
        {recherche.length > 0 && (
          <TouchableOpacity onPress={() => setRecherche('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres statut */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtresScroll}
        contentContainerStyle={styles.filtresContent}
      >
        {filtres.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filtreBtn, filtre === f.key && styles.filtreBtnActive]}
            onPress={() => setFiltre(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filtreTxt, filtre === f.key && styles.filtreTxtActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Compteur */}
      <View style={styles.compteurRow}>
        <Text style={styles.compteurText}>
          {loading
            ? 'Chargement...'
            : `${dossiers.length} dossier${dossiers.length > 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDossiers(); }}
            colors={['#1d4ed8']}
            tintColor="#1d4ed8"
          />
        }
      >
        {loading ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.loadingText}>Chargement des dossiers...</Text>
          </View>
        ) : erreur ? (
          <ErreurCard message={erreur} onRetry={fetchDossiers} />
        ) : dossiers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucun dossier trouvé</Text>
            <Text style={styles.emptySub}>
              {recherche
                ? `Aucun résultat pour "${recherche}"`
                : filtre !== 'tous'
                  ? `Aucun dossier avec le statut "${filtre.replace(/_/g, ' ')}"`
                  : 'Aucun dossier disponible pour le moment'}
            </Text>
            {(recherche || filtre !== 'tous') && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => { setRecherche(''); setFiltre('tous'); }}
              >
                <Text style={styles.resetBtnTxt}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            <View style={styles.col}>
              {colonneGauche.map(d => (
                <CarteDossier
                  key={d.id}
                  dossier={d}
                  onVoir={() => navigation.navigate('VoirDossier', {
                    dossierId: d.id,
                    dossier: d,
                  })}
                  onSignaler={() => navigation.navigate('NouveauSignalement', {
                    dossierId: d.id,
                    dossier: d,
                  })}
                />
              ))}
            </View>
            <View style={styles.col}>
              {colonneDroite.map(d => (
                <CarteDossier
                  key={d.id}
                  dossier={d}
                  onVoir={() => navigation.navigate('VoirDossier', {
                    dossierId: d.id,
                    dossier: d,
                  })}
                  onSignaler={() => navigation.navigate('Signalement', {
                    dossierId: d.id,
                    dossier: d,
                  })}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e3a5f', padding: 0 },

  filtresScroll:   { maxHeight: 52, marginTop: 12 },
  filtresContent:  { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filtreBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  filtreBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filtreTxt:       { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filtreTxtActive: { color: '#fff' },

  compteurRow:  { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  compteurText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  liste: { padding: 16, paddingBottom: 50 },

  centeredLoader: { alignItems: 'center', paddingTop: 80, gap: 14 },
  loadingText:    { fontSize: 13, color: '#94a3b8' },

  grid: { flexDirection: 'row', gap: 16 },
  col:  { flex: 1 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e3a5f' },
  emptySub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  resetBtn:    { marginTop: 10, backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  resetBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});