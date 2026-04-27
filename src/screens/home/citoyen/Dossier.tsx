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

// ─── HEADER avec style image ───
function Header({ navigation }: any) {
  return (
    <View style={hS.wrapper}>
      <Text style={hS.title}>Centre Opérationnel de Recherche</Text>
      <Text style={hS.subtitle}>
        Accédez à l'annuaire centralisé des personnes disparues. Chaque seconde compte dans nos opérations de recherche.
      </Text>
    </View>
  );
}

const hS = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0b1c30',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#45464d',
    lineHeight: 19,
  },
});

// ─── STATS BANNER ───
function StatsBanner({ totalActifs, totalSemaine }: { totalActifs: number; totalSemaine: number }) {
  return (
    <View style={statsS.container}>
      <View style={statsS.statBox}>
        <Text style={statsS.statNumber}>{totalActifs}</Text>
        <Text style={statsS.statLabel}>DOSSIERS ACTIFS</Text>
      </View>
      <View style={statsS.divider} />
      <View style={statsS.statBox}>
        <Text style={statsS.statNumber}>{totalSemaine}</Text>
        <Text style={statsS.statLabel}>CETTE SEMAINE</Text>
      </View>
    </View>
  );
}

const statsS = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0b1c30',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45f06',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
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

// ─── CARTE DOSSIER style image ───
function CarteDossier({ dossier, onVoir, onSignaler }: any) {
  const age = dossier.age ? `${dossier.age} ans` : 'Âge inconnu';
  const lieu = dossier.dernier_lieu || dossier.ville || 'Lieu inconnu';
  const date = dossier.date_disparition
    ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).replace('.', '')
    : 'Date inconnue';

  // Format date pour affichage "14 Oct. 2023"
  const formattedDate = dossier.date_disparition
    ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).replace('.', '').replace(/\b(\w{3})/, (m) => m.charAt(0).toUpperCase() + m.slice(1))
    : 'Date inconnue';

  return (
    <View style={cS.card}>
      <View style={cS.content}>
        {/* PHOTO */}
        <View style={cS.photoBox}>
          {dossier.photo_url ? (
            <Image source={{ uri: dossier.photo_url }} style={cS.photo} />
          ) : (
            <View style={cS.photoPlaceholder}>
              <Ionicons name="person-outline" size={40} color="#cbd5e1" />
            </View>
          )}
        </View>

        {/* INFOS */}
        <View style={cS.infoBox}>
          <Text style={cS.name} numberOfLines={1}>
            {dossier.prenom} {dossier.nom}
          </Text>
          <View style={cS.infoRow}>
            <Text style={cS.infoLabel}>Dernier lieu :</Text>
            <Text style={cS.infoValue} numberOfLines={1}>{lieu}</Text>
          </View>
          <View style={cS.infoRow}>
            <Text style={cS.infoLabel}>Âge :</Text>
            <Text style={cS.infoValue}>{age}</Text>
          </View>
          <View style={cS.infoRow}>
            <Text style={cS.infoLabel}>Depuis le :</Text>
            <Text style={cS.infoValue}>{formattedDate}</Text>
          </View>
        </View>
      </View>

      {/* BOUTON VOIR DOSSIER COMPLET */}
      <TouchableOpacity style={cS.btnVoir} onPress={onVoir} activeOpacity={0.8}>
        <Text style={cS.btnVoirText}>Voir le dossier complet</Text>
        <Ionicons name="arrow-forward" size={14} color="#0b1c30" />
      </TouchableOpacity>
    </View>
  );
}

const cS = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginRight: 14,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  infoBox: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0b1c30',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 90,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  btnVoir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnVoirText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0b1c30',
  },
});

// ─── MESSAGE D'ERREUR ───
function ErreurCard({ message, onRetry }: any) {
  return (
    <View style={errS.box}>
      <Ionicons name="warning-outline" size={40} color="#b45f06" />
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
  titre: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  msg:   { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  btn:   { marginTop: 10, backgroundColor: '#b45f06', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  btnTxt:{ color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ─── ÉCRAN PRINCIPAL ───
export default function Dossier({ navigation }: any) {
  const [recherche, setRecherche]   = useState('');
  const [ageMin, setAgeMin]         = useState('');
  const [ageMax, setAgeMax]         = useState('');
  const [lieu, setLieu]             = useState('');
  const [date, setDate]             = useState('');
  const [filtre, setFiltre]         = useState<Statut>('tous');
  const [dossiers, setDossiers]     = useState<Dossier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur]         = useState<string | null>(null);
  const [showFiltres, setShowFiltres] = useState(false);

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

      if (filtre !== 'tous') {
        queryDossiers = queryDossiers.eq('statut_dossier', filtre);
      }

      // Filtre âge - sera fait côté client
      // Filtre lieu
      if (lieu.trim()) {
        queryDossiers = queryDossiers.or(`lieu_disparition.ilike.%${lieu.trim()}%,ville_disparition.ilike.%${lieu.trim()}%`);
      }

      const { data: dataDossiers, error: errDossiers } = await queryDossiers;

      if (errDossiers) {
        setErreur(`Erreur BD: ${errDossiers.message}`);
        setDossiers([]);
        return;
      }

      if (!dataDossiers || dataDossiers.length === 0) {
        setDossiers([]);
        return;
      }

      const personneIds = [...new Set(dataDossiers.map((d: any) => d.id_personne).filter(Boolean))];
      let personnesMap: Record<string, any> = {};

      if (personneIds.length > 0) {
        const { data: dataPersonnes, error: errPersonnes } = await supabase
          .from('personne')
          .select(`id, nom, prenom, age_estime_min, age_estime_max, sexe, photo_principale`)
          .in('id', personneIds);

        if (!errPersonnes && dataPersonnes) {
          (dataPersonnes ?? []).forEach((p: any) => { personnesMap[p.id] = p; });
        }

        const { data: dataPhotos } = await supabase
          .from('photo')
          .select(`id, url_cloudinary, est_principale, approuvee, id_personne`)
          .in('id_personne', personneIds)
          .eq('approuvee', true);

        (dataPhotos ?? []).forEach((ph: any) => {
          if (personnesMap[ph.id_personne]) {
            if (!personnesMap[ph.id_personne]._photos) personnesMap[ph.id_personne]._photos = [];
            personnesMap[ph.id_personne]._photos.push(ph);
          }
        });
      }

      let mapped: Dossier[] = dataDossiers.map((d: any) => {
        const personne = personnesMap[d.id_personne] ?? null;
        const photos: any[] = personne?._photos ?? [];
        const photoUrl = personne?.photo_principale ??
          photos.find((p: any) => p.est_principale)?.url_cloudinary ??
          photos[0]?.url_cloudinary ??
          null;
        const age = personne?.age_estime_min ?? personne?.age_estime_max ?? null;

        return {
          id: d.id,
          numero_dossier: d.numero_dossier ?? '',
          nom: personne?.nom ?? '',
          prenom: personne?.prenom ?? '',
          age,
          sexe: personne?.sexe ?? null,
          dernier_lieu: d.lieu_disparition ?? null,
          ville: d.ville_disparition ?? null,
          date_disparition: d.date_disparition ?? null,
          description: d.circonstances ?? null,
          statut: d.statut_dossier ?? 'en_cours',
          niveau_urgence: d.niveau_urgence ?? null,
          photo_url: photoUrl,
          nb_vues: d.nombre_vues_fiche ?? 0,
          nombre_signalements: d.nombre_signalements ?? 0,
        };
      });

      // Filtres côté client
      if (recherche.trim()) {
        const q = recherche.toLowerCase().trim();
        mapped = mapped.filter(d =>
          d.nom?.toLowerCase().includes(q) ||
          d.prenom?.toLowerCase().includes(q) ||
          d.dernier_lieu?.toLowerCase().includes(q) ||
          d.ville?.toLowerCase().includes(q)
        );
      }

      // Filtre âge
      if (ageMin || ageMax) {
        const min = ageMin ? parseInt(ageMin) : 0;
        const max = ageMax ? parseInt(ageMax) : 999;
        mapped = mapped.filter(d => {
          const ageVal = d.age || 0;
          return ageVal >= min && ageVal <= max;
        });
      }

      setDossiers(mapped);

    } catch (err: any) {
      console.error('[Dossier] Exception:', err);
      setErreur(`Erreur: ${err?.message ?? 'inconnue'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtre, recherche, lieu, ageMin, ageMax]);

  useEffect(() => {
    const timer = setTimeout(fetchDossiers, recherche.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchDossiers]);

  const totalActifs = dossiers.filter(d => d.statut === 'en_cours').length;
  const totalSemaine = dossiers.filter(d => {
    if (!d.date_disparition) return false;
    const dateDisparition = new Date(d.date_disparition);
    const semaineDerniere = new Date();
    semaineDerniere.setDate(semaineDerniere.getDate() - 7);
    return dateDisparition >= semaineDerniere;
  }).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* HEADER */}
      <Header navigation={navigation} />

      {/* STATS BANNER */}
      <StatsBanner totalActifs={totalActifs} totalSemaine={totalSemaine} />

      {/* BARRE DE RECHERCHE */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou identifiant"
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

      {/* BOUTON FILTRES */}
      <TouchableOpacity 
        style={styles.filtresToggle} 
        onPress={() => setShowFiltres(!showFiltres)}
      >
        <Ionicons name="options-outline" size={18} color="#b45f06" />
        <Text style={styles.filtresToggleText}>Filtres avancés</Text>
        <Ionicons name={showFiltres ? "chevron-up" : "chevron-down"} size={16} color="#b45f06" />
      </TouchableOpacity>

      {/* FILTRES AVANCÉS */}
      {showFiltres && (
        <View style={styles.filtresAvances}>
          <View style={styles.filtreRow}>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Âge min</Text>
              <TextInput
                style={styles.filtreInput}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                value={ageMin}
                onChangeText={setAgeMin}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Âge max</Text>
              <TextInput
                style={styles.filtreInput}
                placeholder="100"
                placeholderTextColor="#94a3b8"
                value={ageMax}
                onChangeText={setAgeMax}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.filtreGroup}>
            <Text style={styles.filtreLabel}>Lieu</Text>
            <TextInput
              style={styles.filtreInputFull}
              placeholder="Ville, quartier, rue..."
              placeholderTextColor="#94a3b8"
              value={lieu}
              onChangeText={setLieu}
            />
          </View>

          <View style={styles.filtreGroup}>
            <Text style={styles.filtreLabel}>Date de disparition</Text>
            <TextInput
              style={styles.filtreInputFull}
              placeholder="jj/mm/aaaa"
              placeholderTextColor="#94a3b8"
              value={date}
              onChangeText={setDate}
            />
          </View>

          <View style={styles.filtreActions}>
            <TouchableOpacity 
              style={styles.btnAppliquer}
              onPress={fetchDossiers}
            >
              <Text style={styles.btnAppliquerText}>Appliquer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btnReset}
              onPress={() => {
                setAgeMin('');
                setAgeMax('');
                setLieu('');
                setDate('');
                setRecherche('');
                setFiltre('tous');
                fetchDossiers();
              }}
            >
              <Text style={styles.btnResetText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FILTRES STATUT */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtresStatutScroll}
        contentContainerStyle={styles.filtresStatutContent}
      >
        {filtres.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.statutBtn, filtre === f.key && styles.statutBtnActive]}
            onPress={() => setFiltre(f.key)}
          >
            <Text style={[styles.statutBtnText, filtre === f.key && styles.statutBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LISTE DES DOSSIERS */}
      <ScrollView
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDossiers(); }}
            colors={['#b45f06']}
            tintColor="#b45f06"
          />
        }
      >
        {loading ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.loadingText}>Chargement des dossiers...</Text>
          </View>
        ) : erreur ? (
          <ErreurCard message={erreur} onRetry={fetchDossiers} />
        ) : dossiers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucun dossier trouvé</Text>
            <Text style={styles.emptySub}>
              {recherche || lieu || ageMin || ageMax
                ? "Aucun résultat ne correspond à vos critères"
                : "Aucun dossier disponible pour le moment"}
            </Text>
          </View>
        ) : (
          dossiers.map(d => (
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0b1c30', padding: 0 },

  filtresToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
  },
  filtresToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45f06',
  },

  filtresAvances: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filtreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filtreGroup: {
    flex: 1,
  },
  filtreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filtreInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0b1c30',
  },
  filtreInputFull: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0b1c30',
  },
  filtreActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  btnAppliquer: {
    flex: 1,
    backgroundColor: '#b45f06',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnAppliquerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnReset: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnResetText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },

  filtresStatutScroll: { maxHeight: 48, marginBottom: 16 },
  filtresStatutContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  statutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statutBtnActive: { backgroundColor: '#0b1c30', borderColor: '#0b1c30' },
  statutBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statutBtnTextActive: { color: '#fff' },

  liste: { padding: 16, paddingBottom: 50 },

  centeredLoader: { alignItems: 'center', paddingTop: 80, gap: 14 },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
});