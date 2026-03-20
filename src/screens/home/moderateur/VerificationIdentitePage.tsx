import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl, Alert, Dimensions, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

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
              {selected === opt.value && <Ionicons name="checkmark" size={16} color="#0d9488" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function VerificationIdentitePage({ navigation }: { navigation: any }) {

  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);

  const [filtreStatut, setFiltreStatut]   = useState('tous');
  const [filtrePeriode, setFiltrePeriode] = useState('toutes');

  const [showStatutPicker, setShowStatutPicker]   = useState(false);
  const [showPeriodePicker, setShowPeriodePicker] = useState(false);

  const [stats, setStats] = useState({ total: 0, enAttente: 0, actifs: 0, suspendus: 0 });

  // ── OPTIONS — valeurs exactes de l'enum statut_compte du schéma ──
  const statutOptions = [
    { label: 'Tous',              value: 'tous'                    },
    { label: 'En attente',        value: 'en_attente_verification' },
    { label: 'Actif / Vérifié',   value: 'actif'                   },
    { label: 'Suspendu / Rejeté', value: 'suspendu'                },
    { label: 'Désactivé',         value: 'desactive'               },
    { label: 'Bloqué',            value: 'bloque'                  },
  ];

  const periodeOptions = [
    { label: 'Toutes',            value: 'toutes' },
    { label: '7 derniers jours',  value: '7j'     },
    { label: '30 derniers jours', value: '30j'    },
  ];

  const getLabelStatut  = () => statutOptions.find(o => o.value === filtreStatut)?.label  || 'Tous';
  const getLabelPeriode = () => periodeOptions.find(o => o.value === filtrePeriode)?.label || 'Toutes';

  // ── CHARGEMENT ────────────────────────────────────────────────
  const fetchUtilisateurs = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ SELECT sans type_identification — colonne dans 'personne' pas 'utilisateur'
      let query = supabase
        .from('utilisateur')
        .select(`
          id, nom, prenom, email, telephone,
          statut_compte, type_compte,
          document_accreditation,
          score_fiabilite,
          nombre_signalements_valides,
          nombre_signalements_invalides,
          ville, region, pays,
          created_at, updated_at
        `)
        .order('created_at', { ascending: false });

      if (filtreStatut !== 'tous') {
        query = query.eq('statut_compte', filtreStatut);
      }

      if (filtrePeriode !== 'toutes') {
        const jours = filtrePeriode === '7j' ? 7 : 30;
        const d = new Date();
        d.setDate(d.getDate() - jours);
        query = query.gte('created_at', d.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];
      setUtilisateurs(list);

      setStats({
        total:     list.length,
        enAttente: list.filter((u: any) => u.statut_compte === 'en_attente_verification').length,
        actifs:    list.filter((u: any) => u.statut_compte === 'actif').length,
        suspendus: list.filter((u: any) => u.statut_compte === 'suspendu').length,
      });

    } catch (err) {
      console.error('Erreur utilisateurs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtreStatut, filtrePeriode]);

  useEffect(() => { fetchUtilisateurs(); }, [fetchUtilisateurs]);

  // ── FILTRAGE LOCAL ────────────────────────────────────────────
  const filtered = utilisateurs.filter((u: any) => {
    const q = searchQuery.toLowerCase();
    return !q ||
      u.nom?.toLowerCase().includes(q)    ||
      u.prenom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
  });

  // ── ACTIONS ───────────────────────────────────────────────────
  const handleAction = (userId: string, action: 'approuver' | 'rejeter') => {
    const nouveauStatut = action === 'approuver' ? 'actif' : 'suspendu';
    Alert.alert(
      action === 'approuver' ? 'Approuver' : 'Rejeter',
      `Passer cet utilisateur en statut "${nouveauStatut}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('utilisateur')
                .update({ statut_compte: nouveauStatut })
                .eq('id', userId);
              if (error) throw error;
              fetchUtilisateurs();
              Alert.alert(
                action === 'approuver' ? '✅ Approuvé' : '❌ Rejeté',
                'Décision enregistrée.'
              );
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de traiter.');
            }
          }
        }
      ]
    );
  };

  const getStatutStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      en_attente_verification: { bg: '#fef3c7', text: '#92400e', label: 'EN ATTENTE' },
      actif:                   { bg: '#f0fdf4', text: '#166534', label: 'ACTIF'       },
      suspendu:                { bg: '#fee2e2', text: '#991b1b', label: 'SUSPENDU'    },
      desactive:               { bg: '#f1f5f9', text: '#475569', label: 'DÉSACTIVÉ'  },
      bloque:                  { bg: '#eff6ff', text: '#1e40af', label: 'BLOQUÉ'      },
    };
    return map[statut] || { bg: '#f1f5f9', text: '#64748b', label: statut };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 50) return '#f59e0b';
    return '#dc2626';
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d9488" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérification d'identité des citoyens</Text>
        <Text style={styles.headerSub}>
          Examinez les documents d'identité soumis par les citoyens pour valider leur passage au niveau "Citoyen Vérifié" (badge de confiance).
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom, email..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.btnFilters, showFilters && styles.btnFiltersActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter-outline" size={16} color="#FFF" />
            <Text style={styles.btnFiltersText}>Filtres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnRefresh} onPress={() => fetchUtilisateurs()}>
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtresZone}>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Statut</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowStatutPicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelStatut()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Période</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowPeriodePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelPeriode()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        {[
          { icon: 'person-outline',           count: stats.total,     label: 'Total',      color: '#0d9488' },
          { icon: 'time-outline',             count: stats.enAttente, label: 'En attente', color: '#f59e0b' },
          { icon: 'checkmark-circle-outline', count: stats.actifs,    label: 'Vérifiés',   color: '#16a34a' },
          { icon: 'close-circle-outline',     count: stats.suspendus, label: 'Rejetés',    color: '#dc2626' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={22} color={s.color} />
            <Text style={styles.statNumber}>{loading ? '...' : s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* LISTE */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchUtilisateurs(); }}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-add-outline" size={52} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucune demande de vérification trouvée</Text>
            </View>
          ) : (
            filtered.map((u: any) => {
              const statStyle = getStatutStyle(u.statut_compte);
              return (
                <View key={u.id} style={styles.card}>

                  {/* Header carte */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>
                        {(u.prenom?.[0] || '?').toUpperCase()}
                        {(u.nom?.[0]   || '').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{u.prenom} {u.nom}</Text>
                      <Text style={styles.cardEmail}>{u.email || '—'}</Text>
                      {u.telephone && (
                        <Text style={styles.cardPhone}>{u.telephone}</Text>
                      )}
                    </View>
                    <View style={[styles.statutBadge, { backgroundColor: statStyle.bg }]}>
                      <Text style={[styles.statutBadgeText, { color: statStyle.text }]}>
                        {statStyle.label}
                      </Text>
                    </View>
                  </View>

                  {/* Infos */}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardInfoItem}>
                      <Text style={styles.cardInfoLabel}>TYPE COMPTE</Text>
                      <Text style={styles.cardInfoValue}>
                        {u.type_compte?.toUpperCase() || '—'}
                      </Text>
                    </View>
                    <View style={styles.cardInfoItem}>
                      <Text style={styles.cardInfoLabel}>SCORE FIABILITÉ</Text>
                      <Text style={[
                        styles.cardInfoValue,
                        { color: getScoreColor(u.score_fiabilite ?? 0) }
                      ]}>
                        {u.score_fiabilite ?? '—'}%
                      </Text>
                    </View>
                    <View style={styles.cardInfoItem}>
                      <Text style={styles.cardInfoLabel}>SIGNALEMENTS VALIDÉS</Text>
                      <Text style={styles.cardInfoValue}>
                        {u.nombre_signalements_valides ?? 0}
                      </Text>
                    </View>
                    <View style={styles.cardInfoItem}>
                      <Text style={styles.cardInfoLabel}>DATE INSCRIPTION</Text>
                      <Text style={styles.cardInfoValue}>
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                      </Text>
                    </View>
                    {(u.ville || u.region) && (
                      <View style={styles.cardInfoItem}>
                        <Text style={styles.cardInfoLabel}>LOCALISATION</Text>
                        <Text style={styles.cardInfoValue}>
                          {[u.ville, u.region].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    )}
                    {u.document_accreditation && (
                      <View style={styles.cardInfoItem}>
                        <Text style={styles.cardInfoLabel}>DOCUMENT</Text>
                        <View style={styles.docBadge}>
                          <Ionicons name="document-outline" size={11} color="#0d9488" />
                          <Text style={styles.docBadgeText}>Fourni</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Boutons action — uniquement si en attente */}
                  {u.statut_compte === 'en_attente_verification' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnApprouver]}
                        onPress={() => handleAction(u.id, 'approuver')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#FFF" />
                        <Text style={styles.btnActionText}>Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnRejeter]}
                        onPress={() => handleAction(u.id, 'rejeter')}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#FFF" />
                        <Text style={styles.btnActionText}>Rejeter</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Bouton suspendre si actif */}
                  {u.statut_compte === 'actif' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnSuspendre]}
                        onPress={() => handleAction(u.id, 'rejeter')}
                      >
                        <Ionicons name="ban-outline" size={15} color="#FFF" />
                        <Text style={styles.btnActionText}>Suspendre</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* PICKERS */}
      <PickerModal
        visible={showStatutPicker}
        onClose={() => setShowStatutPicker(false)}
        options={statutOptions}
        selected={filtreStatut}
        onSelect={setFiltreStatut}
        title="Statut"
      />
      <PickerModal
        visible={showPeriodePicker}
        onClose={() => setShowPeriodePicker(false)}
        options={periodeOptions}
        selected={filtrePeriode}
        onSelect={setFiltrePeriode}
        title="Période"
      />

    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f1f5f9' },
  header:           { backgroundColor: '#0d9488', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  btnBack:          { marginBottom: 10 },
  headerTitle:      { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 6 },
  headerSub:        { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 14, lineHeight: 16 },
  searchRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar:        { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput:      { flex: 1, fontSize: 13, color: '#1e293b' },
  btnFilters:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingHorizontal: 14, height: 44 },
  btnFiltersActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  btnFiltersText:   { fontSize: 13, color: '#FFF', fontWeight: '600' },
  btnRefresh:       { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  filtresZone:      { flexDirection: 'row', gap: 8, marginTop: 14 },
  filtreGroup:      { flex: 1 },
  filtreLabel:      { fontSize: 9, color: '#ccfbf1', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  filtrePicker:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, height: 36 },
  filtrePickerText: { fontSize: 11, color: '#1e293b', flex: 1 },
  statsRow:         { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statCard:         { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  statNumber:       { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  statLabel:        { fontSize: 9, color: '#64748b', textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer:   { alignItems: 'center', paddingTop: 60 },
  emptyText:        { color: '#94a3b8', fontSize: 13, marginTop: 12, textAlign: 'center' },
  card:             { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarBox:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center' },
  avatarText:       { fontSize: 15, fontWeight: 'bold', color: '#0d9488' },
  cardName:         { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  cardEmail:        { fontSize: 11, color: '#64748b', marginTop: 1 },
  cardPhone:        { fontSize: 11, color: '#94a3b8' },
  statutBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statutBadgeText:  { fontSize: 9, fontWeight: 'bold' },
  cardInfo:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginBottom: 10 },
  cardInfoItem:     { width: '45%' },
  cardInfoLabel:    { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  cardInfoValue:    { fontSize: 12, color: '#1e293b', fontWeight: '600' },
  docBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdfa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  docBadgeText:     { fontSize: 10, color: '#0d9488', fontWeight: '600' },
  cardActions:      { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnAction:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 8, gap: 6 },
  btnApprouver:     { backgroundColor: '#16a34a' },
  btnRejeter:       { backgroundColor: '#dc2626' },
  btnSuspendre:     { backgroundColor: '#f59e0b' },
  btnActionText:    { color: '#FFF', fontWeight: '700', fontSize: 13 },
});

const pStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '80%' },
  title:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  item:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemActive:     { backgroundColor: '#f0fdfa' },
  itemText:       { fontSize: 14, color: '#1e293b' },
  itemTextActive: { color: '#0d9488', fontWeight: '600' },
});

export default VerificationIdentitePage;