import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl, Image, Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

export default function SignalementPage({ navigation }: any) {
  const [signalements, setSignalements] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [filtre, setFiltre]             = useState('tous');
  const [total, setTotal]               = useState(0);

  const fetchSignalements = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('signalement')
        .select(`
          id, numero_signalement, description,
          lieu_observation, ville_observation,
          date_observation, statut_validation,
          created_at,
          photo:photo ( url_cloudinary, url_thumbnail )
        `)
        .eq('id_utilisateur', user.id)
        .order('created_at', { ascending: false });

      if (filtre !== 'tous') query = query.eq('statut_validation', filtre);
      if (search.trim())     query = query.ilike('description', `%${search.trim()}%`);

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

  const handleSupprimer = (id: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce signalement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            await supabase.from('signalement').delete().eq('id', id);
            fetchSignalements();
          }
        }
      ]
    );
  };

  const getStatutColor = (s: string) => {
    const map: Record<string, string> = {
      en_attente:      '#ef4444',
      en_verification: '#f59e0b',
      valide:          '#16a34a',
      invalide:        '#dc2626',
    };
    return map[s] || '#94a3b8';
  };

  const filtreOptions = [
    { label: `Tous les éléments (${total})`, value: 'tous'            },
    { label: 'En attente',                   value: 'en_attente'      },
    { label: 'En vérification',              value: 'en_verification' },
    { label: 'Validé',                       value: 'valide'          },
    { label: 'Invalide',                     value: 'invalide'        },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher les signalements..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.btnNouveau}
          onPress={() => navigation.navigate('NouveauSignalement')}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.btnNouveauText}>Nouveau signalement</Text>
        </TouchableOpacity>
      </View>

      {/* FILTRE */}
      <View style={styles.filtreRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            {filtreOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filtreChip, filtre === opt.value && styles.filtreChipActive]}
                onPress={() => setFiltre(opt.value)}
              >
                <Text style={[styles.filtreChipText, filtre === opt.value && styles.filtreChipTextActive]}>
                  {opt.label}
                </Text>
                {filtre === opt.value && (
                  <Ionicons name="chevron-down" size={12} color={filtre === opt.value ? '#1d4ed8' : '#64748b'} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* LISTE */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSignalements(); }}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1d4ed8" />
          </View>
        ) : signalements.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucun signalement</Text>
            <Text style={styles.emptySub}>Vous n'avez pas encore fait de signalement.</Text>
            <TouchableOpacity
              style={styles.btnNouveauEmpty}
              onPress={() => navigation.navigate('NouveauSignalement')}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.btnNouveauEmptyText}>Nouveau signalement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {signalements.map(s => {
              const photo = s.photo?.[0];
              const photoUrl = photo?.url_thumbnail || photo?.url_cloudinary || null;
              const statutColor = getStatutColor(s.statut_validation);

              return (
                <View key={s.id} style={styles.card}>
                  {/* IMAGE */}
                  <View style={styles.cardImageBox}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                        <Ionicons name="image-outline" size={32} color="#cbd5e1" />
                      </View>
                    )}
                    {/* BADGE STATUT */}
                    <View style={[styles.statutBadge, { backgroundColor: statutColor }]} />
                  </View>

                  {/* INFOS */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardNum}>
                      #{(s.numero_signalement || s.id || '').toString().slice(-8)}
                    </Text>

                    <View style={styles.cardMeta}>
                      <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                      <Text style={styles.cardMetaText}>
                        {s.date_observation
                          ? new Date(s.date_observation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : s.created_at
                          ? new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </Text>
                    </View>

                    {s.ville_observation && (
                      <View style={styles.cardMeta}>
                        <Ionicons name="location-outline" size={12} color="#94a3b8" />
                        <Text style={styles.cardMetaText}>{s.ville_observation}</Text>
                      </View>
                    )}

                    {s.description && (
                      <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text>
                    )}
                  </View>

                  {/* BOUTONS */}
                  <View style={styles.cardBtns}>
                    <TouchableOpacity
                      style={styles.btnVoir}
                      onPress={() => navigation.navigate('VoirSignalement', { signalementId: s.id })}
                    >
                      <Ionicons name="eye-outline" size={14} color="#FFF" />
                      <Text style={styles.btnVoirText}>Voir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnSupprimer}
                      onPress={() => handleSupprimer(s.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
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
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  header:              { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBar:           { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, height: 42 },
  searchInput:         { flex: 1, fontSize: 13, color: '#1e293b' },
  btnNouveau:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnNouveauText:      { color: '#FFF', fontWeight: '700', fontSize: 12 },
  filtreRow:           { paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filtreChip:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFF' },
  filtreChipActive:    { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  filtreChipText:      { fontSize: 12, color: '#64748b', fontWeight: '600' },
  filtreChipTextActive:{ color: '#1d4ed8' },
  scrollContent:       { padding: 16, paddingBottom: 30 },
  loadingBox:          { padding: 60, alignItems: 'center' },
  emptyBox:            { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:          { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  emptySub:            { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  btnNouveauEmpty:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  btnNouveauEmptyText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  grid:                { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card:                { width: '47%', backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  cardImageBox:        { position: 'relative' },
  cardImage:           { width: '100%', height: 160, backgroundColor: '#f1f5f9' },
  cardImagePlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  statutBadge:         { position: 'absolute', top: 10, left: 10, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  cardBody:            { padding: 12, gap: 5 },
  cardNum:             { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  cardMeta:            { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText:        { fontSize: 11, color: '#94a3b8' },
  cardDesc:            { fontSize: 12, color: '#64748b', lineHeight: 16, marginTop: 4 },
  cardBtns:            { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  btnVoir:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 9 },
  btnVoirText:         { color: '#FFF', fontWeight: '700', fontSize: 12 },
  btnSupprimer:        { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, justifyContent: 'center', alignItems: 'center' },
});