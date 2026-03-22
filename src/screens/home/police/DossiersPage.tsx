import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

export default function DossiersPage({ navigation }: any) {

  const [dossiers, setDossiers]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreSort, setFiltreSort]     = useState('recent');
  const [stats, setStats] = useState({ total: 0, enCours: 0, retrouves: 0, suspendus: 0 });

  const sortOptions = [
    { label: 'Plus récents', value: 'recent'  },
    { label: 'Plus anciens', value: 'ancien'  },
    { label: 'Urgence',      value: 'urgence' },
  ];

  const fetchDossiers = useCallback(async () => {
    try {
      setLoading(true);

      const { count: total }     = await supabase.from('dossier_disparition').select('*', { count: 'exact', head: true });
      const { count: enCours }   = await supabase.from('dossier_disparition').select('*', { count: 'exact', head: true }).eq('statut_dossier', 'en_cours');
      const { count: retrouves } = await supabase.from('dossier_disparition').select('*', { count: 'exact', head: true }).eq('statut_dossier', 'retrouve_vivant');
      const { count: suspendus } = await supabase.from('dossier_disparition').select('*', { count: 'exact', head: true }).eq('statut_dossier', 'suspendu');
      setStats({ total: total || 0, enCours: enCours || 0, retrouves: retrouves || 0, suspendus: suspendus || 0 });

      let query = supabase
        .from('dossier_disparition')
        .select(`
          id, numero_dossier, statut_dossier, niveau_urgence,
          date_disparition, lieu_disparition, ville_disparition, created_at,
          personne:id_personne ( nom, prenom, nom_complet )
        `);

      if (filtreStatut !== 'tous') query = query.eq('statut_dossier', filtreStatut);
      if (search.trim()) query = query.ilike('numero_dossier', `%${search.trim()}%`);
      if (filtreSort === 'recent')  query = query.order('created_at', { ascending: false });
      if (filtreSort === 'ancien')  query = query.order('created_at', { ascending: true });
      if (filtreSort === 'urgence') query = query.order('niveau_urgence', { ascending: false });

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setDossiers(data || []);

    } catch (err) {
      console.error('Erreur dossiers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtreStatut, search, filtreSort]);

  useEffect(() => { fetchDossiers(); }, [fetchDossiers]);

  const getStatutStyle = (s: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      en_cours:        { bg: '#fef3c7', text: '#92400e', label: 'En Cours'  },
      retrouve_vivant: { bg: '#f0fdf4', text: '#166534', label: 'Retrouvé'  },
      suspendu:        { bg: '#f1f5f9', text: '#475569', label: 'Suspendu'  },
      cloture:         { bg: '#fee2e2', text: '#991b1b', label: 'Clôturé'   },
    };
    return map[s] || { bg: '#f1f5f9', text: '#64748b', label: s || '—' };
  };

  const getUrgenceStyle = (u: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      critique: { bg: '#fee2e2', text: '#991b1b' },
      urgent:   { bg: '#fff7ed', text: '#9a3412' },
      normal:   { bg: '#fef9c3', text: '#854d0e' },
      faible:   { bg: '#f0fdf4', text: '#166534' },
    };
    return map[u] || { bg: '#f1f5f9', text: '#64748b' };
  };

  const filtreActif = filtreStatut !== 'tous'
    ? ({ en_cours: 'En cours', retrouve_vivant: 'Retrouvés', suspendu: 'Suspendus' } as any)[filtreStatut]
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER CORRIGÉ */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle} numberOfLines={1}>Gestion des Dossiers</Text>
                <Text style={styles.headerSub}>{dossiers.length} dossier{dossiers.length !== 1 ? 's' : ''}</Text>
            </View>
        </View>
        
        <View style={styles.headerActionsRow}>
            <TouchableOpacity style={styles.btnActualiser} onPress={fetchDossiers}>
                <Ionicons name="refresh-outline" size={16} color="#64748b" />
                <Text style={styles.btnActualiserText}>Actualiser</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.btnNouveau}
                onPress={() => navigation.navigate('NouveauDossier')}
            >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.btnNouveauText}>Nouveau Dossier</Text>
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDossiers(); }}
          />
        }
      >
        {/* STATS GRID CORRIGÉ (2 par ligne sur mobile) */}
        <View style={styles.statsGrid}>
          {[
            { icon: 'folder-outline',           count: stats.total,     label: 'Total',     value: 'tous',            color: '#2563eb' },
            { icon: 'time-outline',             count: stats.enCours,   label: 'En cours',  value: 'en_cours',        color: '#f59e0b' },
            { icon: 'checkmark-circle-outline', count: stats.retrouves, label: 'Retrouvés', value: 'retrouve_vivant', color: '#16a34a' },
            { icon: 'warning-outline',          count: stats.suspendus, label: 'Suspendus', value: 'suspendu',        color: '#ef4444' },
          ].map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.statCard, filtreStatut === s.value && styles.statCardActive]}
              onPress={() => setFiltreStatut(filtreStatut === s.value ? 'tous' : s.value)}
            >
              <Ionicons name={s.icon as any} size={20} color={s.color} />
              <View>
                <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* RECHERCHE ET TRI */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              const idx = sortOptions.findIndex(o => o.value === filtreSort);
              setFiltreSort(sortOptions[(idx + 1) % sortOptions.length].value);
            }}
          >
            <Ionicons name="swap-vertical-outline" size={14} color="#64748b" />
            <Text style={styles.sortBtnText} numberOfLines={1}>
              {sortOptions.find(o => o.value === filtreSort)?.label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTE (Scroll Horizontal ajouté pour les petits écrans) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.listeContainer}>
            {loading ? (
                <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : dossiers.length === 0 ? (
                <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={56} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Aucun dossier</Text>
                </View>
            ) : (
                <>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: 140 }]}>N° DOSSIER</Text>
                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>PERSONNE</Text>
                    <Text style={[styles.tableHeaderCell, { width: 100 }]}>DATE</Text>
                    <Text style={[styles.tableHeaderCell, { width: 100 }]}>STATUT</Text>
                    <Text style={[styles.tableHeaderCell, { width: 90 }]}>URGENCE</Text>
                    <Text style={[styles.tableHeaderCell, { width: 70 }]}>ACTIONS</Text>
                </View>

                {dossiers.map((d, i) => {
                    const ss = getStatutStyle(d.statut_dossier);
                    const us = getUrgenceStyle(d.niveau_urgence);
                    const nomPersonne = d.personne?.nom_complet || '—';
                    return (
                    <TouchableOpacity
                        key={d.id}
                        style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}
                        onPress={() => navigation.navigate('DetailDossier', { dossierId: d.id })}
                    >
                        <View style={{ width: 140, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Ionicons name="folder-outline" size={12} color="#2563eb" />
                            <Text style={styles.dossierNum} numberOfLines={1}>{d.numero_dossier}</Text>
                        </View>
                        <Text style={[styles.tableCellText, { width: 120 }]} numberOfLines={1}>{nomPersonne}</Text>
                        <Text style={[styles.tableCellText, { width: 100 }]}>
                            {d.date_disparition ? new Date(d.date_disparition).toLocaleDateString('fr-FR') : '—'}
                        </Text>
                        <View style={{ width: 100 }}>
                            <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                                <Text style={[styles.badgeText, { color: ss.text }]}>{ss.label}</Text>
                            </View>
                        </View>
                        <View style={{ width: 90 }}>
                            <View style={[styles.badge, { backgroundColor: us.bg }]}>
                                <Text style={[styles.badgeText, { color: us.text }]}>{d.niveau_urgence?.toUpperCase()}</Text>
                            </View>
                        </View>
                        <View style={{ width: 70, flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('DetailDossier', { dossierId: d.id })}>
                                <Ionicons name="eye-outline" size={18} color="#94a3b8" />
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <Ionicons name="create-outline" size={18} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                    );
                })}
                </>
            )}
            </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header Style Corrigé pour mobile
  header:              { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12 },
  headerTopRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, marginBottom: 12 },
  backBtn:             { marginRight: 12 },
  headerInfo:          { flex: 1 },
  headerTitle:         { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  headerSub:           { fontSize: 12, color: '#64748b' },
  headerActionsRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  
  btnActualiser:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingVertical: 10 },
  btnActualiserText:   { fontSize: 13, color: '#64748b', fontWeight: '600' },
  btnNouveau:          { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10 },
  btnNouveauText:      { fontSize: 13, color: '#FFF', fontWeight: '700' },

  // Stats Grid responsive (2 colonnes)
  statsGrid:           { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard:            { width: '48.5%', backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statCardActive:      { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  statCount:           { fontSize: 20, fontWeight: 'bold' },
  statLabel:           { fontSize: 11, color: '#64748b', fontWeight: '500' },

  searchRow:           { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  searchBar:           { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput:         { flex: 1, fontSize: 14, color: '#1e293b' },
  sortBtn:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#FFF', paddingHorizontal: 8 },
  sortBtnText:         { fontSize: 12, color: '#64748b', fontWeight: '600' },

  // Tableau avec largeur fixe pour permettre le scroll horizontal
  listeContainer:      { marginHorizontal: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 30 },
  tableHeader:         { flexDirection: 'row', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderCell:     { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  tableRow:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowEven:        { backgroundColor: '#fafafa' },
  dossierNum:          { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  tableCellText:       { fontSize: 12, color: '#475569' },
  badge:               { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:           { fontSize: 10, fontWeight: 'bold' },
  loadingContainer:    { padding: 40, alignItems: 'center' },
  emptyContainer:      { padding: 40, alignItems: 'center', width: 300 },
  emptyTitle:          { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
});