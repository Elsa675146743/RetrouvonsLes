import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

export default function GestionAlertesPage({ navigation }: any) {
  const [alertes, setAlertes]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [filtreStatut, setFiltreStatut] = useState('toutes');
  const [stats, setStats] = useState({ actives: 0, brouillons: 0, terminees: 0, vues: 0 });

  const filtreOptions = [
    { label: 'Toutes',     value: 'toutes'    },
    { label: 'Brouillons', value: 'brouillon' },
    { label: 'Actives',    value: 'en_cours'  },
    { label: 'Terminées',  value: 'terminee'  },
    { label: 'Annulées',   value: 'annulee'   },
  ];

  const fetchAlertes = useCallback(async () => {
    try {
      setLoading(true);

      const { count: actives }    = await supabase.from('alerte').select('*', { count: 'exact', head: true }).eq('statut_alerte', 'en_cours');
      const { count: brouillons } = await supabase.from('alerte').select('*', { count: 'exact', head: true }).eq('statut_alerte', 'brouillon');
      const { count: terminees }  = await supabase.from('alerte').select('*', { count: 'exact', head: true }).eq('statut_alerte', 'terminee');
      setStats({ actives: actives || 0, brouillons: brouillons || 0, terminees: terminees || 0, vues: 0 });

      // ✅ rayon_diffusion_km retiré
      let query = supabase
        .from('alerte')
        .select(`id, titre, message, statut_alerte, type_alerte, date_diffusion, created_at, dossier:id_dossier ( numero_dossier )`)
        .order('created_at', { ascending: false });

      if (filtreStatut !== 'toutes') query = query.eq('statut_alerte', filtreStatut);
      if (search.trim()) query = query.ilike('titre', `%${search.trim()}%`);

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setAlertes(data || []);
    } catch (err) {
      console.error('Erreur alertes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtreStatut, search]);

  useEffect(() => { fetchAlertes(); }, [fetchAlertes]);

  const getStatutStyle = (s: string) => {
    const map: Record<string, { bg: string; text: string; label: string; border: string }> = {
      en_cours:  { bg: '#f0fdf4', text: '#166534', label: 'ACTIVE',    border: '#16a34a' },
      brouillon: { bg: '#f8fafc', text: '#475569', label: 'BROUILLON', border: '#94a3b8' },
      terminee:  { bg: '#eff6ff', text: '#1e40af', label: 'TERMINÉE',  border: '#2563eb' },
      annulee:   { bg: '#fee2e2', text: '#991b1b', label: 'ANNULÉE',   border: '#dc2626' },
    };
    return map[s] || { bg: '#f1f5f9', text: '#64748b', label: s?.toUpperCase(), border: '#e2e8f0' };
  };

  const handleTerminer = async (id: string) => {
    await supabase.from('alerte').update({ statut_alerte: 'terminee' }).eq('id', id);
    fetchAlertes();
  };

  const handleAnnuler = async (id: string) => {
    await supabase.from('alerte').update({ statut_alerte: 'annulee' }).eq('id', id);
    fetchAlertes();
  };

  const alertesFiltrees = alertes.filter(a =>
    filtreStatut === 'toutes' || a.statut_alerte === filtreStatut
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ✅ HEADER HORIZONTAL CORRIGÉ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnBack}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>Gestion des Alertes</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {alertes.length} alerte{alertes.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity style={styles.btnActualiser} onPress={fetchAlertes}>
          <Ionicons name="refresh-outline" size={16} color="#64748b" />
          <Text style={styles.btnActualiserText}>Actualiser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnNouveau}
          onPress={() => navigation.navigate('CreerAlerte')}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.btnNouveauText}>Nouvelle Alerte</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAlertes(); }}
          />
        }
      >
        {/* STATS */}
        <View style={styles.statsRow}>
          {[
            { label: 'ACTIVES',      count: stats.actives,    color: '#16a34a' },
            { label: 'BROUILLONS',   count: stats.brouillons, color: '#64748b' },
            { label: 'TERMINÉES',    count: stats.terminees,  color: '#2563eb' },
            { label: 'VUES TOTALES', count: stats.vues,       color: '#2563eb' },
          ].map((s, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* RECHERCHE */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une alerte..."
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
        </View>

        {/* FILTRES */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtresScroll}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}>
            {filtreOptions.map(opt => {
              const count = opt.value === 'toutes'    ? alertes.length
                          : opt.value === 'en_cours'  ? stats.actives
                          : opt.value === 'brouillon' ? stats.brouillons
                          : opt.value === 'terminee'  ? stats.terminees
                          : 0;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filtreChip, filtreStatut === opt.value && styles.filtreChipActive]}
                  onPress={() => setFiltreStatut(opt.value)}
                >
                  <Text style={[styles.filtreChipText, filtreStatut === opt.value && styles.filtreChipTextActive]}>
                    {opt.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* LISTE */}
        <View style={styles.listeContainer}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : alertesFiltrees.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {filtreStatut === 'brouillon' ? 'Aucun brouillon'
                 : filtreStatut === 'annulee'  ? 'Aucune alerte annulée'
                 : filtreStatut === 'terminee' ? 'Aucune alerte terminée'
                 : filtreStatut === 'en_cours' ? 'Aucune alerte active'
                 : 'Aucune alerte'}
              </Text>
              {(filtreStatut === 'toutes' || filtreStatut === 'brouillon') && (
                <TouchableOpacity
                  style={styles.btnNouveauEmpty}
                  onPress={() => navigation.navigate('CreerAlerte')}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.btnNouveauEmptyText}>Créer une alerte</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {alertesFiltrees.map(a => {
                const ss = getStatutStyle(a.statut_alerte);
                return (
                  <View key={a.id} style={[styles.alerteCard, { borderLeftColor: ss.border }]}>
                    <View style={styles.alerteCardHeader}>
                      <Ionicons name="notifications-outline" size={16} color={ss.border} />
                      <Text style={styles.alerteTitre} numberOfLines={1}>{a.titre}</Text>
                      <View style={[styles.statutBadge, { backgroundColor: ss.bg }]}>
                        <Text style={[styles.statutBadgeText, { color: ss.text }]}>{ss.label}</Text>
                      </View>
                    </View>

                    <Text style={styles.alerteMessage} numberOfLines={2}>{a.message || '—'}</Text>

                    <View style={styles.alerteMeta}>
                      <View style={styles.alerteMetaItem}>
                        <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                        <Text style={styles.alerteMetaText}>
                          {a.date_diffusion
                            ? new Date(a.date_diffusion).toLocaleDateString('fr-FR')
                            : '—'}
                        </Text>
                      </View>
                      {a.type_alerte && (
                        <View style={styles.alerteMetaItem}>
                          <Ionicons name="pricetag-outline" size={12} color="#94a3b8" />
                          <Text style={styles.alerteMetaText}>{a.type_alerte}</Text>
                        </View>
                      )}
                      {/* ✅ rayon_diffusion_km supprimé */}
                    </View>

                    {/* BOUTONS */}
                    <View style={styles.alerteBtns}>
                      {a.statut_alerte === 'en_cours' && (
                        <TouchableOpacity
                          style={styles.btnTerminer}
                          onPress={() => handleTerminer(a.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color="#2563eb" />
                          <Text style={styles.btnTerminerText}>Terminer</Text>
                        </TouchableOpacity>
                      )}
                      {(a.statut_alerte === 'en_cours' || a.statut_alerte === 'brouillon') && (
                        <TouchableOpacity
                          style={styles.btnAnnuler}
                          onPress={() => handleAnnuler(a.id)}
                        >
                          <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.btnVoir}>
                        <Ionicons name="eye-outline" size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f8fafc' },

  // ✅ HEADER CORRIGÉ — horizontal, pas de flexWrap
  header:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 6 },
  btnBack:              { padding: 4, flexShrink: 0 },
  headerInfo:           { flex: 1, minWidth: 0 },
  headerTitle:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  headerSub:            { fontSize: 10, color: '#64748b' },
  btnActualiser:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flexShrink: 0 },
  btnActualiserText:    { fontSize: 11, color: '#64748b', fontWeight: '600' },
  btnNouveau:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
  btnNouveauText:       { fontSize: 11, color: '#FFF', fontWeight: '700' },

  statsRow:             { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statBox:              { flex: 1, alignItems: 'center', paddingVertical: 16, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  statCount:            { fontSize: 22, fontWeight: 'bold' },
  statLabel:            { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', marginTop: 2 },
  searchRow:            { padding: 12 },
  searchBar:            { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, height: 46 },
  searchInput:          { flex: 1, fontSize: 13, color: '#1e293b' },
  filtresScroll:        { marginBottom: 12 },
  filtreChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0' },
  filtreChipActive:     { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filtreChipText:       { fontSize: 12, color: '#64748b', fontWeight: '600' },
  filtreChipTextActive: { color: '#FFF' },
  listeContainer:       { paddingHorizontal: 12, paddingBottom: 20 },
  loadingBox:           { padding: 40, alignItems: 'center' },
  emptyBox:             { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle:           { fontSize: 15, fontWeight: 'bold', color: '#94a3b8' },
  btnNouveauEmpty:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  btnNouveauEmptyText:  { color: '#FFF', fontWeight: '700', fontSize: 13 },
  cardsGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  alerteCard:           { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, width: '47%' },
  alerteCardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  alerteTitre:          { fontSize: 13, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  statutBadge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutBadgeText:      { fontSize: 9, fontWeight: 'bold' },
  alerteMessage:        { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 10 },
  alerteMeta:           { gap: 4, marginBottom: 10 },
  alerteMetaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alerteMetaText:       { fontSize: 11, color: '#94a3b8' },
  alerteBtns:           { flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  btnTerminer:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnTerminerText:      { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  btnAnnuler:           { borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fff5f5', borderRadius: 8, padding: 6 },
  btnVoir:              { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 6, marginLeft: 'auto' as any },
});