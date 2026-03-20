import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

// =====================================================
// ✅ PICKER MODAL
// =====================================================
function PickerModal({ visible, onClose, options, selected, onSelect, title }: {
  visible: boolean;
  onClose: () => void;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (val: string) => void;
  title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={pStyles.container}>
          <Text style={pStyles.title}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[pStyles.item, selected === opt.value && pStyles.itemActive]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <Text style={[pStyles.itemText, selected === opt.value && pStyles.itemTextActive]}>
                {opt.label}
              </Text>
              {selected === opt.value && (
                <Ionicons name="checkmark" size={16} color="#16a34a" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =====================================================
// ✅ BARRE DE PROGRESSION
// =====================================================
function BarreStatut({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.barreRow}>
      <Text style={styles.barreLabel}>{label}</Text>
      <View style={styles.barreTrack}>
        <View style={[styles.barreFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.barreVal}>{count} ({pct}%)</Text>
    </View>
  );
}

// =====================================================
// ✅ COMPOSANT PRINCIPAL
// =====================================================
function RapportModerationPage({ navigation }: { navigation: any }) {

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periode, setPeriode]       = useState('7j');
  const [showPeriodePicker, setShowPeriodePicker] = useState(false);

  const [stats, setStats] = useState({
    total:      0,
    nouveaux:   0,
    valides:    0,
    rejetes:    0,
    enCours:    0,
    fermes:     0,
    scoreMoyen: 0,
  });

  const [topLieux, setTopLieux]         = useState<{ lieu: string; count: number }[]>([]);
  const [activiteJours, setActiviteJours] = useState<{ date: string; count: number }[]>([]);

  // ── OPTIONS PÉRIODE ───────────────────────────────────────────
  const periodeOptions = [
    { label: 'Derniers 7 jours', value: '7j'  },
    { label: 'Dernier mois',     value: '30j' },
    { label: 'Tout le temps',    value: 'all' },
  ];

  const getLabelPeriode = () =>
    periodeOptions.find(o => o.value === periode)?.label || 'Derniers 7 jours';

  const getDateLimite = (): string | null => {
    if (periode === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - (periode === '7j' ? 7 : 30));
    return d.toISOString();
  };

  // =====================================================
  // CHARGEMENT DONNÉES
  // =====================================================
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const dateLimite = getDateLimite();

      let query = supabase
        .from('signalement')
        .select(`
          id, statut_validation, score_pertinence,
          ville_observation, lieu_observation, created_at
        `);

      if (dateLimite) query = query.gte('created_at', dateLimite);

      const { data, error } = await query;
      if (error) throw error;

      const list      = data || [];
      const total     = list.length;
      const nouveaux  = list.filter(s => s.statut_validation === 'en_attente').length;
      const valides   = list.filter(s => s.statut_validation === 'valide').length;
      const rejetes   = list.filter(s => ['invalide', 'spam', 'doublonne'].includes(s.statut_validation)).length;
      const enCours   = list.filter(s => s.statut_validation === 'en_verification').length;
      const fermes    = list.filter(s => ['classe_sans_suite', 'transfere'].includes(s.statut_validation)).length;
      const scores    = list.map(s => s.score_pertinence).filter(Boolean);
      const scoreMoyen = scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

      setStats({ total, nouveaux, valides, rejetes, enCours, fermes, scoreMoyen });

      // Top 10 lieux
      const lieuxMap: Record<string, number> = {};
      list.forEach(s => {
        const lieu = s.ville_observation || s.lieu_observation || 'Inconnu';
        lieuxMap[lieu] = (lieuxMap[lieu] || 0) + 1;
      });
      setTopLieux(
        Object.entries(lieuxMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([lieu, count]) => ({ lieu, count }))
      );

      // Activité 10 derniers jours
      const joursMap: Record<string, number> = {};
      const today = new Date();
      for (let i = 9; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        joursMap[d.toISOString().split('T')[0]] = 0;
      }
      list.forEach(s => {
        const key = s.created_at?.split('T')[0];
        if (key && joursMap[key] !== undefined) joursMap[key]++;
      });
      setActiviteJours(
        Object.entries(joursMap).map(([date, count]) => ({ date, count }))
      );

    } catch (err) {
      console.error('Erreur rapport:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periode]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const maxActivite = Math.max(...activiteJours.map(j => j.count), 1);

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {/* HEADER VERT */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rapports de Modération</Text>
        <Text style={styles.headerSub}>Statistiques et analyses des signalements modérés.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStats(); }}
          />
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* ── PÉRIODE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Période</Text>
          <TouchableOpacity
            style={styles.periodePicker}
            onPress={() => setShowPeriodePicker(true)}
          >
            <Text style={styles.periodePickerText}>{getLabelPeriode()}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <>
            {/* ── CARTES STATS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsScroll}
            >
              {[
                { icon: 'bar-chart-outline',       label: 'Total Signalements', value: stats.total        },
                { icon: 'time-outline',             label: 'Nouveaux',           value: stats.nouveaux     },
                { icon: 'checkmark-circle-outline', label: 'Validés',            value: stats.valides      },
                { icon: 'close-circle-outline',     label: 'Rejetés',            value: stats.rejetes      },
                { icon: 'trending-up-outline',      label: 'Score Moyen',        value: `${stats.scoreMoyen}%` },
                { icon: 'archive-outline',          label: 'En Cours',           value: stats.enCours      },
              ].map((card, i) => (
                <View key={i} style={styles.statCard}>
                  <Ionicons name={card.icon as any} size={26} color="#7c3aed" style={{ marginBottom: 8 }} />
                  <Text style={styles.statCardValue}>{card.value}</Text>
                  <Text style={styles.statCardLabel}>{card.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* ── DISTRIBUTION DES STATUTS ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distribution des Statuts</Text>
              <BarreStatut label="Nouveaux" count={stats.nouveaux} total={stats.total} color="#7c3aed" />
              <BarreStatut label="En Cours" count={stats.enCours}  total={stats.total} color="#2563eb" />
              <BarreStatut label="Validés"  count={stats.valides}  total={stats.total} color="#16a34a" />
              <BarreStatut label="Rejetés"  count={stats.rejetes}  total={stats.total} color="#dc2626" />
              <BarreStatut label="Fermés"   count={stats.fermes}   total={stats.total} color="#64748b" />
            </View>

            {/* ── TOP 10 LIEUX ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top 10 Lieux de Signalement</Text>
              {topLieux.length === 0 ? (
                <Text style={styles.emptyText}>Aucune donnée disponible</Text>
              ) : (
                topLieux.map((item, i) => (
                  <View key={i} style={styles.lieuRow}>
                    <View style={styles.lieuRank}>
                      <Text style={styles.lieuRankText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lieuNom}>{item.lieu}</Text>
                      <View style={styles.lieuBarreTrack}>
                        <View style={[
                          styles.lieuBarreFill,
                          { width: `${Math.round((item.count / (topLieux[0]?.count || 1)) * 100)}%` as any }
                        ]} />
                      </View>
                    </View>
                    <Text style={styles.lieuCount}>{item.count}</Text>
                  </View>
                ))
              )}
            </View>

            {/* ── ACTIVITÉ PAR DATE ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activité par Date (Derniers 10 jours)</Text>
              {activiteJours.every(j => j.count === 0) ? (
                <Text style={styles.emptyText}>Aucune activité sur cette période</Text>
              ) : (
                <View style={styles.graphContainer}>
                  {activiteJours.map((jour, i) => {
                    const hauteur  = Math.max(4, Math.round((jour.count / maxActivite) * 100));
                    const dateLabel = new Date(jour.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                    return (
                      <View key={i} style={styles.graphCol}>
                        <Text style={styles.graphVal}>{jour.count > 0 ? jour.count : ''}</Text>
                        <View style={styles.graphBarWrap}>
                          <View style={[
                            styles.graphBar,
                            { height: hauteur, backgroundColor: jour.count > 0 ? '#16a34a' : '#e2e8f0' }
                          ]} />
                        </View>
                        <Text style={styles.graphDate}>{dateLabel}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── RÉSUMÉ GLOBAL ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Résumé Global</Text>
              {[
                { label: 'Taux de validation', value: stats.total > 0 ? `${Math.round((stats.valides  / stats.total) * 100)}%` : '0%' },
                { label: 'Taux de rejet',      value: stats.total > 0 ? `${Math.round((stats.rejetes  / stats.total) * 100)}%` : '0%' },
                { label: 'Taux en attente',    value: stats.total > 0 ? `${Math.round((stats.nouveaux / stats.total) * 100)}%` : '0%' },
                { label: 'Score moyen',        value: `${stats.scoreMoyen}%` },
              ].map((row, i) => (
                <View key={i} style={styles.resumeRow}>
                  <Text style={styles.resumeLabel}>{row.label}</Text>
                  <Text style={styles.resumeValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* PICKER MODAL PÉRIODE */}
      <PickerModal
        visible={showPeriodePicker}
        onClose={() => setShowPeriodePicker(false)}
        options={periodeOptions}
        selected={periode}
        onSelect={setPeriode}
        title="Période"
      />

    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f1f5f9' },
  header:            { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  btnBack:           { marginBottom: 10 },
  headerTitle:       { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  headerSub:         { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  loadingContainer:  { paddingTop: 60, alignItems: 'center' },
  section:           { backgroundColor: '#FFF', borderRadius: 14, margin: 12, marginBottom: 0, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionLabel:      { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 10 },
  sectionTitle:      { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  emptyText:         { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  periodePicker:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, height: 44, backgroundColor: '#f8fafc' },
  periodePickerText: { fontSize: 14, color: '#1e293b' },
  cardsScroll:       { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4, gap: 10 },
  statCard:          { backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center', minWidth: 110, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statCardValue:     { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  statCardLabel:     { fontSize: 10, color: '#64748b', textAlign: 'center', fontWeight: '600' },
  barreRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  barreLabel:        { fontSize: 13, color: '#334155', width: 80, fontWeight: '500' },
  barreTrack:        { flex: 1, height: 10, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden', marginHorizontal: 10 },
  barreFill:         { height: '100%', borderRadius: 6 },
  barreVal:          { fontSize: 12, color: '#64748b', width: 70, textAlign: 'right' },
  lieuRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  lieuRank:          { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  lieuRankText:      { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  lieuNom:           { fontSize: 12, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  lieuBarreTrack:    { height: 6, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  lieuBarreFill:     { height: '100%', backgroundColor: '#16a34a', borderRadius: 4 },
  lieuCount:         { fontSize: 13, fontWeight: 'bold', color: '#16a34a', width: 30, textAlign: 'right' },
  graphContainer:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: 10 },
  graphCol:          { flex: 1, alignItems: 'center', gap: 4 },
  graphVal:          { fontSize: 9, color: '#64748b', fontWeight: '600', height: 12 },
  graphBarWrap:      { flex: 1, justifyContent: 'flex-end', width: '70%' },
  graphBar:          { width: '100%', borderRadius: 4 },
  graphDate:         { fontSize: 8, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  resumeRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resumeLabel:       { fontSize: 13, color: '#475569', fontWeight: '500' },
  resumeValue:       { fontSize: 14, fontWeight: 'bold', color: '#16a34a' },
});

const pStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '80%' },
  title:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  item:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemActive:     { backgroundColor: '#f0fdf4' },
  itemText:       { fontSize: 14, color: '#1e293b' },
  itemTextActive: { color: '#16a34a', fontWeight: '600' },
});

export default RapportModerationPage;