import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

// =====================================================
// ✅ COMPOSANT PRINCIPAL
// =====================================================
function MonHistoriquePage({ navigation }: { navigation: any }) {

  const [journaux, setJournaux]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periode, setPeriode]       = useState('30j');
  const [filtreType, setFiltreType] = useState('tous');

  const [stats, setStats] = useState({
    total:          0,
    semaine:        0,
    mois:           0,
    moyenneJour:    0,
    validations:    0,
    rejets:         0,
    photosModerees: 0,
    idVerifiees:    0,
  });

  // ── OPTIONS ──────────────────────────────────────────────────
  const periodes = [
    { label: '7 jours',          value: '7j'  },
    { label: '30 derniers jours', value: '30j' },
    { label: '90 jours',         value: '90j' },
    { label: 'Tout le temps',    value: 'all' },
  ];

  const types = [
    { label: 'Tous',        value: 'tous',                  icon: 'filter-outline'         },
    { label: 'Signalements', value: 'validation_signalement', icon: 'checkmark-circle-outline' },
    { label: 'Photos',      value: 'upload_photo',          icon: 'image-outline'          },
    { label: 'Identités',   value: 'attribution_role',      icon: 'person-outline'         },
  ];

  // ── CHARGEMENT ────────────────────────────────────────────────
  const fetchJournaux = useCallback(async () => {
    try {
      setLoading(true);

      // Date limite selon période
      let dateLimite: string | null = null;
      if (periode !== 'all') {
        const jours = periode === '7j' ? 7 : periode === '30j' ? 30 : 90;
        const d = new Date();
        d.setDate(d.getDate() - jours);
        dateLimite = d.toISOString();
      }

      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('journal_activite')
        .select(`
          id, type_action, action_detaillee, description,
          donnees_apres, date_action,
          id_dossier, id_signalement, id_alerte
        `)
        .eq('id_utilisateur', user.id)
        .order('date_action', { ascending: false })
        .limit(200);

      if (dateLimite) query = query.gte('date_action', dateLimite);
      if (filtreType !== 'tous') query = query.eq('type_action', filtreType);

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];
      setJournaux(list);

      // ── STATS ──────────────────────────────────────────────
      const now      = new Date();
      const semDeb   = new Date(); semDeb.setDate(now.getDate() - 7);
      const moisDeb  = new Date(); moisDeb.setDate(now.getDate() - 30);

      const semaine  = list.filter(j => new Date(j.date_action) >= semDeb).length;
      const mois     = list.filter(j => new Date(j.date_action) >= moisDeb).length;

      // Jours distincts pour moyenne
      const joursDistincts = new Set(
        list.map(j => new Date(j.date_action).toISOString().split('T')[0])
      ).size || 1;
      const moyenneJour = parseFloat((list.length / joursDistincts).toFixed(1));

      const validations    = list.filter(j => j.type_action === 'validation_signalement').length;
      const rejets         = list.filter(j => j.type_action === 'changement_statut').length;
      const photosModerees = list.filter(j => j.type_action === 'upload_photo').length;
      const idVerifiees    = list.filter(j => j.type_action === 'attribution_role').length;

      setStats({
        total: list.length, semaine, mois, moyenneJour,
        validations, rejets, photosModerees, idVerifiees,
      });

    } catch (err) {
      console.error('Erreur historique:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periode, filtreType]);

  useEffect(() => { fetchJournaux(); }, [fetchJournaux]);

  // ── GROUPER PAR DATE ──────────────────────────────────────────
  const groupParDate = () => {
    const groupes: Record<string, any[]> = {};
    journaux.forEach(j => {
      const dateKey = new Date(j.date_action).toISOString().split('T')[0];
      if (!groupes[dateKey]) groupes[dateKey] = [];
      groupes[dateKey].push(j);
    });
    return Object.entries(groupes).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const formatDateGroupe = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
  };

  const formatHeure = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ── STYLE PAR TYPE D'ACTION ───────────────────────────────────
  const getActionStyle = (type: string) => {
    const map: Record<string, { icon: string; color: string; label: string }> = {
      connexion:               { icon: 'time-outline',             color: '#2563eb', label: 'CONNEXION'             },
      deconnexion:             { icon: 'log-out-outline',          color: '#64748b', label: 'DÉCONNEXION'           },
      validation_signalement:  { icon: 'checkmark-circle-outline', color: '#16a34a', label: 'VALIDATION SIGNALEMENT' },
      upload_photo:            { icon: 'image-outline',            color: '#2563eb', label: 'UPLOAD PHOTO'          },
      attribution_role:        { icon: 'person-outline',           color: '#8b5cf6', label: 'ATTRIBUTION RÔLE'      },
      creation_dossier:        { icon: 'folder-open-outline',      color: '#0d9488', label: 'CRÉATION DOSSIER'      },
      modification_dossier:    { icon: 'create-outline',           color: '#f59e0b', label: 'MODIFICATION DOSSIER'  },
      creation_signalement:    { icon: 'add-circle-outline',       color: '#10b981', label: 'CRÉATION SIGNALEMENT'  },
      diffusion_alerte:        { icon: 'notifications-outline',    color: '#ef4444', label: 'DIFFUSION ALERTE'      },
      modification_profil:     { icon: 'person-circle-outline',    color: '#6366f1', label: 'MODIFICATION PROFIL'   },
      analyse_ia:              { icon: 'hardware-chip-outline',    color: '#8b5cf6', label: 'ANALYSE IA'            },
      validation_ia:           { icon: 'shield-checkmark-outline', color: '#16a34a', label: 'VALIDATION IA'         },
      changement_statut:       { icon: 'swap-horizontal-outline',  color: '#f59e0b', label: 'CHANGEMENT STATUT'     },
      autre:                   { icon: 'time-outline',             color: '#64748b', label: 'AUTRE'                 },
    };
    return map[type] || { icon: 'ellipse-outline', color: '#94a3b8', label: type?.toUpperCase() || '—' };
  };

  // ── EXPORTER CSV ──────────────────────────────────────────────
  const exporterCSV = () => {
    Alert.alert('Export CSV', `${journaux.length} actions exportées (fonctionnalité à connecter à un service de fichiers).`);
  };

  const groupes = groupParDate();

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Ionicons name="time-outline" size={22} color="#FFF" />
          <Text style={styles.headerTitle}>Mon Historique</Text>
        </View>
        <Text style={styles.headerSub}>Gérez les signalements et modérez le contenu sur la plateforme</Text>

        {/* FILTRES PÉRIODE */}
        <View style={styles.filtreRow}>
          <Text style={styles.filtreRowLabel}>Période:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtreChipsRow}>
              {periodes.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, periode === p.value && styles.chipActive]}
                  onPress={() => setPeriode(p.value)}
                >
                  <Text style={[styles.chipText, periode === p.value && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* FILTRES TYPE */}
        <View style={styles.filtreRow}>
          <Text style={styles.filtreRowLabel}>type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtreChipsRow}>
              {types.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, filtreType === t.value && styles.chipActive]}
                  onPress={() => setFiltreType(t.value)}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={13}
                    color={filtreType === t.value ? '#16a34a' : '#FFF'}
                  />
                  <Text style={[styles.chipText, filtreType === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* BOUTONS ACTUALISER + EXPORTER */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnAction} onPress={() => fetchJournaux()}>
            <Ionicons name="refresh-outline" size={15} color="#FFF" />
            <Text style={styles.btnActionText}>Actualiser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAction} onPress={exporterCSV}>
            <Ionicons name="download-outline" size={15} color="#FFF" />
            <Text style={styles.btnActionText}>Exporter CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchJournaux(); }}
            />
          }
        >
          {/* ── MES STATISTIQUES ── */}
          <View style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <Ionicons name="bar-chart-outline" size={18} color="#1e293b" />
              <Text style={styles.statsSectionTitle}>Mes Statistiques</Text>
            </View>

            {/* Ligne 1 */}
            <View style={styles.statsGrid}>
              {[
                { icon: 'time-outline',    color: '#2563eb', value: stats.total,       label: 'Actions totales' },
                { icon: 'trending-up-outline', color: '#2563eb', value: stats.semaine,  label: 'Cette semaine'   },
                { icon: 'calendar-outline', color: '#2563eb', value: stats.mois,        label: 'Ce mois'         },
                { icon: 'time-outline',    color: '#2563eb', value: stats.moyenneJour,  label: 'Moyenne/jour'    },
              ].map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={[styles.statIconBox, { backgroundColor: s.color + '15' }]}>
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Ligne 2 */}
            <View style={styles.statsGrid}>
              {[
                { icon: 'checkmark-circle-outline', color: '#16a34a', value: stats.validations,    label: 'Validations'     },
                { icon: 'close-circle-outline',     color: '#ef4444', value: stats.rejets,          label: 'Rejets'          },
                { icon: 'image-outline',            color: '#2563eb', value: stats.photosModerees,  label: 'Photos modérées' },
                { icon: 'person-outline',           color: '#2563eb', value: stats.idVerifiees,     label: 'ID vérifiées'    },
              ].map((s, i) => (
                <View key={i} style={[styles.statCard, styles.statCardAlt]}>
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── HISTORIQUE DES ACTIONS ── */}
          <View style={styles.historiqueSection}>
            <View style={styles.historiqueSectionHeader}>
              <Ionicons name="time-outline" size={18} color="#1e293b" />
              <Text style={styles.historiqueSectionTitle}>Historique des Actions</Text>
            </View>

            {groupes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={52} color="#cbd5e1" />
                <Text style={styles.emptyText}>Aucune action trouvée</Text>
              </View>
            ) : (
              groupes.map(([dateKey, actions]) => (
                <View key={dateKey} style={styles.groupeJour}>

                  {/* En-tête du groupe date */}
                  <View style={styles.groupeHeader}>
                    <View style={styles.groupeHeaderLeft}>
                      <Ionicons name="calendar-outline" size={16} color="#64748b" />
                      <Text style={styles.groupeDate}>{formatDateGroupe(dateKey)}</Text>
                    </View>
                    <View style={styles.groupeBadge}>
                      <Text style={styles.groupeBadgeText}>{actions.length} Action(s)</Text>
                    </View>
                  </View>

                  {/* Actions du jour */}
                  {actions.map((j: any) => {
                    const actionStyle = getActionStyle(j.type_action);
                    return (
                      <View key={j.id} style={styles.actionCard}>
                        <View style={[styles.actionIconBox, { backgroundColor: actionStyle.color + '15' }]}>
                          <Ionicons name={actionStyle.icon as any} size={18} color={actionStyle.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionType, { color: actionStyle.color }]}>
                            {actionStyle.label}
                          </Text>
                          {j.action_detaillee && (
                            <Text style={styles.actionDetail}>{j.action_detaillee}</Text>
                          )}
                          {j.description && (
                            <Text style={styles.actionDesc} numberOfLines={2}>{j.description}</Text>
                          )}
                          {/* Tags dossier/signalement */}
                          <View style={styles.actionTags}>
                            {j.id_signalement && (
                              <View style={styles.actionTag}>
                                <Text style={styles.actionTagText}>
                                  Signalement: {j.id_signalement.substring(0, 8)}...
                                </Text>
                              </View>
                            )}
                            {j.id_dossier && (
                              <View style={[styles.actionTag, { backgroundColor: '#eff6ff' }]}>
                                <Text style={[styles.actionTagText, { color: '#2563eb' }]}>
                                  Dossier: {j.id_dossier.substring(0, 8)}...
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text style={styles.actionHeure}>
                          {formatHeure(j.date_action)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header:                 { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  btnBack:                { marginBottom: 8 },
  headerTitleRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle:            { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  headerSub:              { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },

  // Filtres chips
  filtreRow:              { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  filtreRowLabel:         { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', flexShrink: 0 },
  filtreChipsRow:         { flexDirection: 'row', gap: 8 },
  chip:                   { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive:             { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipText:               { fontSize: 12, color: '#FFF', fontWeight: '600' },
  chipTextActive:         { color: '#16a34a' },

  // Boutons header
  headerActions:          { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnAction:              { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnActionText:          { fontSize: 12, color: '#FFF', fontWeight: '600' },

  loadingContainer:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Stats
  statsSection:           { backgroundColor: '#FFF', margin: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statsSectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  statsSectionTitle:      { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  statsGrid:              { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard:               { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  statCardAlt:            { backgroundColor: '#FFF' },
  statIconBox:            { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue:              { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  statLabel:              { fontSize: 9, color: '#64748b', textAlign: 'center' },

  // Historique
  historiqueSection:      { marginHorizontal: 12, marginBottom: 12 },
  historiqueSectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  historiqueSectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  emptyContainer:         { alignItems: 'center', paddingVertical: 60, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText:              { color: '#94a3b8', fontSize: 13, marginTop: 10 },

  // Groupe jour
  groupeJour:             { marginBottom: 16 },
  groupeHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 8 },
  groupeHeaderLeft:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupeDate:             { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  groupeBadge:            { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  groupeBadgeText:        { fontSize: 10, color: '#64748b', fontWeight: '600' },

  // Action card
  actionCard:             { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  actionIconBox:          { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  actionType:             { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  actionDetail:           { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  actionDesc:             { fontSize: 11, color: '#64748b', lineHeight: 15, marginBottom: 4 },
  actionTags:             { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionTag:              { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  actionTagText:          { fontSize: 9, color: '#16a34a', fontWeight: '600' },
  actionHeure:            { fontSize: 11, color: '#94a3b8', flexShrink: 0, marginTop: 2 },
});

export default MonHistoriquePage;