import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl, Image, Alert, Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

export default function SignalementPage({ navigation }: any) {
  const [signalements, setSignalements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [total, setTotal] = useState(0);

  const troisMoisAgo = new Date();
  troisMoisAgo.setMonth(troisMoisAgo.getMonth() - 3);

  const fetchSignalements = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('signalement')
        .select(`
          id, 
          numero_signalement, 
          description,
          lieu_observation, 
          ville_observation,
          date_observation, 
          statut_validation,
          created_at,
          id_dossier,
          dossier_disparition!left (
            id,
            lieu_disparition,
            niveau_urgence,
            personne!left (
              nom,
              prenom,
              photo_principale,
              age_estime_min,
              age_estime_max
            )
          ),
          photo:photo ( url_cloudinary, url_thumbnail, est_principale )
        `)
        .eq('id_utilisateur', user.id)
        .gte('created_at', troisMoisAgo.toISOString())
        .order('created_at', { ascending: false });

      if (filtre === 'alertes') {
        query = query.not('id_dossier', 'is', null);
      } else if (filtre === 'signalements') {
        query = query.is('id_dossier', null);
      }

      if (search.trim()) {
        query = query.or(`description.ilike.%${search.trim()}%,ville_observation.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      setSignalements(data || []);
      setTotal(data?.length || 0);
      
    } catch (err) {
      console.error('Erreur signalements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtre, search]);

  useEffect(() => { fetchSignalements(); }, [fetchSignalements]);

  const getStatutColor = (s: string) => {
    const map: Record<string, string> = {
      en_attente:      '#ef4444',
      en_verification: '#f59e0b',
      valide:          '#16a34a',
      invalide:        '#dc2626',
    };
    return map[s] || '#94a3b8';
  };

  const getStatutLabel = (s: string) => {
    const map: Record<string, string> = {
      en_attente:      'En attente',
      en_verification: 'En vérification',
      valide:          'Validé',
      invalide:        'Rejeté',
    };
    return map[s] || s;
  };

  const filtreOptions = [
    { label: 'Tous les signalements', value: 'tous', count: signalements.length },
    { label: 'Signalements liés aux alertes', value: 'alertes', count: signalements.filter(s => s.id_dossier).length },
    { label: 'Mes signalements', value: 'signalements', count: signalements.filter(s => !s.id_dossier).length },
  ];

  const actifsCount = signalements.filter(s => s.statut_validation === 'en_attente' || s.statut_validation === 'en_verification').length;
  const valideCount = signalements.filter(s => s.statut_validation === 'valide').length;
  const rejeteCount = signalements.filter(s => s.statut_validation === 'invalide').length;
  const enAttenteCount = signalements.filter(s => s.statut_validation === 'en_attente' || s.statut_validation === 'en_verification').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Signalements Actifs</Text>
        <Text style={styles.headerSubtitle}>
          Consultez les dossiers de recherche prioritaires. Votre vigilance peut aider à ramener une personne chez elle.
        </Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher les signalements..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {
            const currentIndex = filtreOptions.findIndex(f => f.value === filtre);
            const nextIndex = (currentIndex + 1) % filtreOptions.length;
            setFiltre(filtreOptions[nextIndex].value);
          }}
        >
          <Ionicons name="options-outline" size={16} color="#1d4ed8" />
          <Text style={styles.filterButtonText}>
            {filtre === 'tous' ? 'Filtrer' : filtre === 'alertes' ? 'Alertes' : 'Mes signalements'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{signalements.length}</Text>
          <Text style={styles.statLabel}>CAS ACTIFS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{valideCount}</Text>
          <Text style={styles.statLabel}>VALIDÉS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{rejeteCount}</Text>
          <Text style={styles.statLabel}>REJETÉS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{enAttenteCount}</Text>
          <Text style={styles.statLabel}>EN ATTENTE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSignalements(); }}
            colors={['#b45f06']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#b45f06" />
          </View>
        ) : signalements.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucun signalement</Text>
            <Text style={styles.emptySub}>Vous n'avez pas encore fait de signalement dans les 3 derniers mois.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {signalements.map(s => {
              const photo = s.photo?.find((p: any) => p.est_principale) || s.photo?.[0];
              const photoUrl = photo?.url_thumbnail || photo?.url_cloudinary || null;
              const statutColor = getStatutColor(s.statut_validation);
              const statutLabel = getStatutLabel(s.statut_validation);
              const dossier = s.dossier_disparition;
              const personne = dossier?.personne;
              const isUrgent = dossier?.niveau_urgence === 'critique' || dossier?.niveau_urgence === 'urgent';
              const estValide = s.statut_validation === 'valide';
              
              const dateObj = new Date(s.date_observation || s.created_at);
              const diffHeures = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 3600));
              const delaiText = diffHeures < 24 
                ? `Depuis ${diffHeures} heures` 
                : `Depuis ${Math.floor(diffHeures / 24)} jours`;
              
              return (
                <View key={s.id} style={[styles.card, isUrgent && styles.cardUrgent]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusDot, { backgroundColor: statutColor }]} />
                    <Text style={styles.statusText}>{statutLabel}</Text>
                    <Text style={styles.delaiText}>{delaiText}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.cardContent}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (!estValide) {
                        navigation.navigate('VoirSignalement', { signalementId: s.id });
                      }
                    }}
                    disabled={estValide}
                  >
                    <View style={styles.cardImageBox}>
                      {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.cardImage} />
                      ) : (
                        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                          <Ionicons name="person-outline" size={40} color="#cbd5e1" />
                        </View>
                      )}
                    </View>

                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>
                        {personne?.prenom || personne?.nom || 'Personne inconnue'}
                        {personne?.prenom && personne?.nom && ` ${personne.nom}`}
                      </Text>
                      
                      <View style={styles.cardMeta}>
                        {(personne?.age_estime_min || personne?.age_estime_max) && (
                          <Text style={styles.cardMetaText}>
                            {personne.age_estime_min && personne.age_estime_max 
                              ? `${Math.floor((personne.age_estime_min + personne.age_estime_max) / 2)} ans`
                              : personne.age_estime_min || personne.age_estime_max || ''}
                          </Text>
                        )}
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={12} color="#94a3b8" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {s.ville_observation || s.lieu_observation || dossier?.lieu_disparition || 'Lieu inconnu'}
                          </Text>
                        </View>
                      </View>

                      {s.description && (
                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {s.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {!estValide && (
                    <View style={styles.cardButtons}>
                      <TouchableOpacity
                        style={styles.btnVoir}
                        onPress={() => navigation.navigate('VoirSignalement', { signalementId: s.id })}
                      >
                        <Ionicons name="eye-outline" size={14} color="#FFF" />
                        <Text style={styles.btnVoirText}>Voir le dossier</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#f8fafc' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#45464d', lineHeight: 19 },
  
  searchSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  filterButtonText: { fontSize: 13, fontWeight: '500', color: '#1d4ed8' },
  
  statsRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 20, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '800', color: '#0b1c30' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  
  scrollContent: { padding: 16, paddingBottom: 80 },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  
  list: { gap: 16 },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardUrgent: { borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#475569', flex: 1 },
  delaiText: { fontSize: 11, color: '#94a3b8' },
  
  cardContent: { flexDirection: 'row', padding: 16, gap: 12 },
  cardImageBox: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  cardImage: { width: 80, height: 80, backgroundColor: '#f1f5f9' },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  
  cardInfo: { flex: 1, gap: 6 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMetaText: { fontSize: 12, color: '#64748b' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#64748b', flex: 1 },
  cardDesc: { fontSize: 12, color: '#64748b', lineHeight: 16, marginTop: 4 },
  
  cardButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16 },
  btnVoir: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0b1c30' },
  btnVoirText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
});