import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl, Alert, Modal, Dimensions
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
              {selected === opt.value && <Ionicons name="checkmark" size={16} color="#10b981" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =====================================================
// ✅ CERCLE DE CONFIANCE
// =====================================================
function ConfidenceCircle({ score }: { score: number }) {
  const color = score >= 85 ? '#16a34a' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : '#dc2626';
  return (
    <View style={[circleStyles.container, { borderColor: color }]}>
      <Text style={[circleStyles.text, { color }]}>{score}%</Text>
      <Text style={circleStyles.label}>Confiance</Text>
    </View>
  );
}

const circleStyles = StyleSheet.create({
  container: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  text:      { fontSize: 14, fontWeight: 'bold' },
  label:     { fontSize: 8, color: '#64748b', marginTop: 1 },
});

// =====================================================
// ✅ MODAL DÉTAIL RÉSULTAT IA
// =====================================================
function DetailModal({ visible, onClose, resultat, onValider }: {
  visible: boolean;
  onClose: () => void;
  resultat: any;
  onValider: (id: string, statut: string) => void;
}) {
  if (!resultat) return null;
  const typeStyle = getTypeStyle(resultat.type_analyse);
  const score = resultat.score_confiance || 0;
  const scoreColor = score >= 85 ? '#16a34a' : score >= 70 ? '#f59e0b' : '#dc2626';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.container}>

          {/* Header */}
          <View style={detailStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[detailStyles.typeLabel, { color: typeStyle.color }]}>
                {typeStyle.label}
              </Text>
              <Text style={detailStyles.dossierText}>
                Dossier : {resultat.dossier?.numero_dossier || '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={detailStyles.btnClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Score */}
            <View style={detailStyles.scoreSection}>
              <View style={[detailStyles.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[detailStyles.scoreText, { color: scoreColor }]}>{score}%</Text>
                <Text style={detailStyles.scoreLabel}>Confiance IA</Text>
              </View>
              <View style={detailStyles.scoreInfo}>
                <View style={detailStyles.scoreBar}>
                  <View style={[detailStyles.scoreBarFill, {
                    width: `${score}%` as any,
                    backgroundColor: scoreColor
                  }]} />
                </View>
                <Text style={detailStyles.scoreDesc}>
                  {score >= 85 ? '🔴 Priorité haute — Action immédiate recommandée' :
                   score >= 70 ? '🟡 Priorité moyenne — Vérification recommandée' :
                   score >= 50 ? '🟠 Incertain — Investigation supplémentaire' :
                   '⚪ Score faible — Probablement faux positif'}
                </Text>
              </View>
            </View>

            {/* Infos analyse */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionTitle}>Informations de l'analyse</Text>
              <View style={detailStyles.infoGrid}>
                <View style={detailStyles.infoItem}>
                  <Text style={detailStyles.infoLabel}>MODÈLE IA</Text>
                  <Text style={detailStyles.infoValue}>{resultat.modele_ia_utilise || '—'}</Text>
                </View>
                <View style={detailStyles.infoItem}>
                  <Text style={detailStyles.infoLabel}>VERSION</Text>
                  <Text style={detailStyles.infoValue}>{resultat.version_algorithme || '—'}</Text>
                </View>
                <View style={detailStyles.infoItem}>
                  <Text style={detailStyles.infoLabel}>DATE ANALYSE</Text>
                  <Text style={detailStyles.infoValue}>
                    {resultat.date_analyse
                      ? new Date(resultat.date_analyse).toLocaleString('fr-FR')
                      : '—'}
                  </Text>
                </View>
                <View style={detailStyles.infoItem}>
                  <Text style={detailStyles.infoLabel}>TEMPS TRAITEMENT</Text>
                  <Text style={detailStyles.infoValue}>
                    {resultat.temps_traitement_ms ? `${resultat.temps_traitement_ms} ms` : '—'}
                  </Text>
                </View>
                <View style={detailStyles.infoItem}>
                  <Text style={detailStyles.infoLabel}>SEUIL DÉCISION</Text>
                  <Text style={detailStyles.infoValue}>{resultat.seuil_decision ?? 70}%</Text>
                </View>
                <View style={detailStyles.infoItem}>
                  <Text style={detailStyles.infoLabel}>STATUT</Text>
                  <Text style={[detailStyles.infoValue, { color: getStatutIAColor(resultat.statut_validation) }]}>
                    {getStatutIALabel(resultat.statut_validation)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Facteurs clés */}
            {resultat.facteurs_cles && (
              <View style={detailStyles.section}>
                <Text style={detailStyles.sectionTitle}>Facteurs clés</Text>
                {Object.entries(resultat.facteurs_cles).map(([k, v]: any) => (
                  <View key={k} style={detailStyles.facteurItem}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                    <Text style={detailStyles.facteurText}>
                      <Text style={{ fontWeight: '600' }}>{k}</Text> : {String(v)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Correspondances */}
            {resultat.correspondances_trouvees && (
              <View style={detailStyles.section}>
                <Text style={detailStyles.sectionTitle}>Correspondances trouvées</Text>
                <Text style={detailStyles.jsonText}>
                  {JSON.stringify(resultat.correspondances_trouvees, null, 2)}
                </Text>
              </View>
            )}

            {/* Données interprétées */}
            {resultat.donnees_interpretees && (
              <View style={detailStyles.section}>
                <Text style={detailStyles.sectionTitle}>Données interprétées</Text>
                <Text style={detailStyles.jsonText}>
                  {JSON.stringify(resultat.donnees_interpretees, null, 2)}
                </Text>
              </View>
            )}

          </ScrollView>

          {/* Boutons de validation — seulement si en attente */}
          {resultat.statut_validation === 'en_attente' && (
            <View style={detailStyles.actions}>
              <TouchableOpacity
                style={[detailStyles.btnAction, { backgroundColor: '#16a34a' }]}
                onPress={() => { onValider(resultat.id, 'confirme'); onClose(); }}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                <Text style={detailStyles.btnActionText}>Confirmer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[detailStyles.btnAction, { backgroundColor: '#f59e0b' }]}
                onPress={() => { onValider(resultat.id, 'necessite_verification'); onClose(); }}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#FFF" />
                <Text style={detailStyles.btnActionText}>Vérification</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[detailStyles.btnAction, { backgroundColor: '#dc2626' }]}
                onPress={() => { onValider(resultat.id, 'infirme'); onClose(); }}
              >
                <Ionicons name="close-circle-outline" size={16} color="#FFF" />
                <Text style={detailStyles.btnActionText}>Infirmer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:     { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  header:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  typeLabel:     { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  dossierText:   { fontSize: 12, color: '#64748b' },
  btnClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  scoreSection:  { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16 },
  scoreCircle:   { width: 80, height: 80, borderRadius: 40, borderWidth: 5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', flexShrink: 0 },
  scoreText:     { fontSize: 18, fontWeight: 'bold' },
  scoreLabel:    { fontSize: 9, color: '#64748b' },
  scoreInfo:     { flex: 1 },
  scoreBar:      { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  scoreBarFill:  { height: '100%', borderRadius: 4 },
  scoreDesc:     { fontSize: 11, color: '#64748b', lineHeight: 16 },
  section:       { marginBottom: 16 },
  sectionTitle:  { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem:      { width: '45%' },
  infoLabel:     { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  infoValue:     { fontSize: 12, color: '#1e293b', fontWeight: '600' },
  facteurItem:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  facteurText:   { fontSize: 12, color: '#1e293b', flex: 1 },
  jsonText:      { fontSize: 10, color: '#64748b', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, fontFamily: 'monospace' },
  actions:       { flexDirection: 'row', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8 },
  btnAction:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, gap: 5 },
  btnActionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
});

// =====================================================
// ✅ HELPERS GLOBAUX
// =====================================================
function getTypeStyle(type: string): { label: string; color: string; icon: string } {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    reconnaissance_faciale:    { label: 'Reconnaissance faciale',    color: '#2563eb', icon: 'person-outline'          },
    comparaison_photos:        { label: 'Comparaison photos',        color: '#7c3aed', icon: 'images-outline'          },
    prediction_localisation:   { label: 'Prédiction localisation',   color: '#0d9488', icon: 'location-outline'        },
    detection_similitudes:     { label: 'Détection similitudes',     color: '#f59e0b', icon: 'git-compare-outline'     },
    analyse_biometrique:       { label: 'Analyse biométrique',       color: '#8b5cf6', icon: 'body-outline'            },
    regroupement_cas:          { label: 'Regroupement de cas',       color: '#06b6d4', icon: 'albums-outline'          },
    estimation_age:            { label: 'Estimation d\'âge',         color: '#f97316', icon: 'calendar-outline'        },
    analyse_vetements:         { label: 'Analyse vêtements',         color: '#ec4899', icon: 'shirt-outline'           },
    detection_objets:          { label: 'Détection d\'objets',       color: '#84cc16', icon: 'scan-outline'            },
    autre:                     { label: 'Autre analyse',             color: '#64748b', icon: 'hardware-chip-outline'   },
  };
  return map[type] || { label: type, color: '#64748b', icon: 'hardware-chip-outline' };
}

function getStatutIALabel(statut: string): string {
  const map: Record<string, string> = {
    en_attente:            'En attente',
    confirme:              'Confirmé',
    infirme:               'Infirmé',
    incertain:             'Incertain',
    necessite_verification:'Vérification requise',
  };
  return map[statut] || statut;
}

function getStatutIAColor(statut: string): string {
  const map: Record<string, string> = {
    en_attente:            '#f59e0b',
    confirme:              '#16a34a',
    infirme:               '#dc2626',
    incertain:             '#f97316',
    necessite_verification:'#2563eb',
  };
  return map[statut] || '#64748b';
}

function getStatutIABg(statut: string): string {
  const map: Record<string, string> = {
    en_attente:            '#fef3c7',
    confirme:              '#f0fdf4',
    infirme:               '#fee2e2',
    incertain:             '#fff7ed',
    necessite_verification:'#eff6ff',
  };
  return map[statut] || '#f1f5f9';
}

// =====================================================
// ✅ COMPOSANT PRINCIPAL
// =====================================================
function ResultatsIAPage({ navigation }: { navigation: any }) {

  const [resultats, setResultats]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [selectedResultat, setSelectedResultat] = useState<any>(null);
  const [showDetail, setShowDetail]     = useState(false);

  const [filtreType, setFiltreType]     = useState('tous');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreScore, setFiltreScore]   = useState('tous');

  const [showTypePicker, setShowTypePicker]     = useState(false);
  const [showStatutPicker, setShowStatutPicker] = useState(false);
  const [showScorePicker, setShowScorePicker]   = useState(false);

  const [stats, setStats] = useState({
    total: 0, enAttente: 0, confirmes: 0, scoreMoyen: 0
  });

  // ── OPTIONS ──────────────────────────────────────────────────
  const typeOptions = [
    { label: 'Tous',                    value: 'tous'                    },
    { label: 'Reconnaissance faciale',  value: 'reconnaissance_faciale'  },
    { label: 'Comparaison photos',      value: 'comparaison_photos'      },
    { label: 'Prédiction localisation', value: 'prediction_localisation' },
    { label: 'Détection similitudes',   value: 'detection_similitudes'   },
    { label: 'Analyse biométrique',     value: 'analyse_biometrique'     },
    { label: 'Regroupement de cas',     value: 'regroupement_cas'        },
    { label: 'Estimation d\'âge',       value: 'estimation_age'          },
    { label: 'Analyse vêtements',       value: 'analyse_vetements'       },
    { label: 'Détection objets',        value: 'detection_objets'        },
  ];

  const statutOptions = [
    { label: 'Tous',                value: 'tous'                    },
    { label: 'En attente',          value: 'en_attente'              },
    { label: 'Confirmé',            value: 'confirme'                },
    { label: 'Infirmé',             value: 'infirme'                 },
    { label: 'Incertain',           value: 'incertain'               },
    { label: 'Vérification req.',   value: 'necessite_verification'  },
  ];

  const scoreOptions = [
    { label: 'Tous',    value: 'tous' },
    { label: '> 85%',  value: '85'   },
    { label: '> 70%',  value: '70'   },
    { label: '> 50%',  value: '50'   },
    { label: '< 50%',  value: 'low'  },
  ];

  const getLabelType   = () => typeOptions.find(o => o.value === filtreType)?.label   || 'Tous';
  const getLabelStatut = () => statutOptions.find(o => o.value === filtreStatut)?.label || 'Tous';
  const getLabelScore  = () => scoreOptions.find(o => o.value === filtreScore)?.label  || 'Tous';

  // ── CHARGEMENT ────────────────────────────────────────────────
  const fetchResultats = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('resultat_ia')
        .select(`
          id, type_analyse, score_confiance, seuil_decision,
          donnees_interpretees, correspondances_trouvees,
          zones_predites, facteurs_cles,
          modele_ia_utilise, version_algorithme,
          temps_traitement_ms, statut_validation,
          action_generee, faux_positif, date_analyse,
          valide_par, date_validation, commentaire_validation,
          dossier:id_dossier ( id, numero_dossier, ville_disparition,
            personne:id_personne ( nom, prenom ) ),
          signalement:id_signalement ( id, numero_signalement, ville_observation )
        `)
        .order('date_analyse', { ascending: false })
        .limit(100);

      if (filtreType !== 'tous')   query = query.eq('type_analyse', filtreType);
      if (filtreStatut !== 'tous') query = query.eq('statut_validation', filtreStatut);
      if (filtreScore === '85')    query = query.gte('score_confiance', 85);
      else if (filtreScore === '70') query = query.gte('score_confiance', 70);
      else if (filtreScore === '50') query = query.gte('score_confiance', 50);
      else if (filtreScore === 'low') query = query.lt('score_confiance', 50);

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];
      setResultats(list);

      const scoreMoyen = list.length
        ? Math.round(list.reduce((s: number, r: any) => s + (r.score_confiance || 0), 0) / list.length)
        : 0;

      setStats({
        total:      list.length,
        enAttente:  list.filter((r: any) => r.statut_validation === 'en_attente').length,
        confirmes:  list.filter((r: any) => r.statut_validation === 'confirme').length,
        scoreMoyen,
      });

    } catch (err) {
      console.error('Erreur résultats IA:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtreType, filtreStatut, filtreScore]);

  useEffect(() => { fetchResultats(); }, [fetchResultats]);

  // ── FILTRAGE LOCAL (recherche) ────────────────────────────────
  const filtered = resultats.filter(r => {
    const q = searchQuery.toLowerCase();
    return !q ||
      r.dossier?.numero_dossier?.toLowerCase().includes(q) ||
      r.signalement?.numero_signalement?.toLowerCase().includes(q) ||
      r.type_analyse?.toLowerCase().includes(q);
  });

  // ── VALIDER UN RÉSULTAT ───────────────────────────────────────
  const handleValider = async (id: string, statut: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('resultat_ia')
        .update({
          statut_validation: statut,
          valide_par:        user?.id,
          date_validation:   new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      const labels: Record<string, string> = {
        confirme:              '✅ Correspondance confirmée',
        infirme:               '❌ Correspondance infirmée',
        necessite_verification:'⚠️ Vérification demandée',
      };
      Alert.alert(labels[statut] || 'Mis à jour', 'Décision enregistrée.');
      fetchResultats();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de valider.');
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#065f46" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Ionicons name="hardware-chip-outline" size={22} color="#FFF" />
          <Text style={styles.headerTitle}>Résultats d'Analyse IA</Text>
        </View>
        <Text style={styles.headerSub}>
          Consultez les correspondances et analyses effectuées par l'intelligence artificielle.
        </Text>
        <Text style={styles.headerNote}>
          Note : La validation des résultats est réservée aux autorités (niveau 4+).
        </Text>

        {/* Barre recherche */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par dossier, signalement..."
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
          <TouchableOpacity style={styles.btnRefresh} onPress={() => fetchResultats()}>
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        {showFilters && (
          <View style={styles.filtresZone}>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Type</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowTypePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelType()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Statut</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowStatutPicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelStatut()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Score</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowScorePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelScore()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        {[
          { icon: 'hardware-chip-outline', count: stats.total,      label: 'Total analyses', color: '#10b981' },
          { icon: 'time-outline',          count: stats.enAttente,  label: 'En attente',     color: '#f59e0b' },
          { icon: 'checkmark-circle-outline', count: stats.confirmes, label: 'Confirmés',    color: '#16a34a' },
          { icon: 'analytics-outline',     count: `${stats.scoreMoyen}%`, label: 'Score moyen', color: '#2563eb' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={20} color={s.color} />
            <Text style={styles.statNumber}>{loading ? '...' : s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* LISTE */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchResultats(); }}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="hardware-chip-outline" size={52} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucun résultat IA trouvé</Text>
            </View>
          ) : (
            filtered.map((r: any) => {
              const typeStyle = getTypeStyle(r.type_analyse);
              const score     = r.score_confiance || 0;
              const scoreColor = score >= 85 ? '#16a34a' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : '#dc2626';
              const statutColor = getStatutIAColor(r.statut_validation);
              const statutBg    = getStatutIABg(r.statut_validation);

              return (
                <View key={r.id} style={[
                  styles.card,
                  score >= 85 && styles.cardPrioritaire
                ]}>
                  {/* Badge prioritaire */}
                  {score >= 85 && r.statut_validation === 'en_attente' && (
                    <View style={styles.prioritaireBanner}>
                      <Ionicons name="alert-circle" size={12} color="#FFF" />
                      <Text style={styles.prioritaireText}>PRIORITÉ HAUTE — Action immédiate</Text>
                    </View>
                  )}

                  <View style={styles.cardContent}>
                    {/* Cercle confiance */}
                    <ConfidenceCircle score={score} />

                    {/* Infos principales */}
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardType, { color: typeStyle.color }]}>
                          {typeStyle.label}
                        </Text>
                        <View style={[styles.statutBadge, { backgroundColor: statutBg }]}>
                          <Text style={[styles.statutBadgeText, { color: statutColor }]}>
                            {getStatutIALabel(r.statut_validation).toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {r.dossier && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Dossier:</Text>
                          <Text style={styles.infoValue}>
                            {r.dossier.numero_dossier}
                            {r.dossier.personne
                              ? ` — ${r.dossier.personne.prenom} ${r.dossier.personne.nom}` : ''}
                          </Text>
                        </View>
                      )}

                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={12} color="#94a3b8" />
                        <Text style={styles.infoDate}>
                          {r.date_analyse
                            ? new Date(r.date_analyse).toLocaleString('fr-FR')
                            : '—'}
                        </Text>
                      </View>

                      {r.modele_ia_utilise && (
                        <View style={styles.infoRow}>
                          <Ionicons name="hardware-chip-outline" size={12} color="#94a3b8" />
                          <Text style={styles.infoDate}>{r.modele_ia_utilise}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Bouton voir détails */}
                  <TouchableOpacity
                    style={styles.btnVoirDetail}
                    onPress={() => { setSelectedResultat(r); setShowDetail(true); }}
                  >
                    <Ionicons name="eye-outline" size={14} color="#64748b" />
                    <Text style={styles.btnVoirDetailText}>Voir détails</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* MODAL DÉTAIL */}
      <DetailModal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedResultat(null); }}
        resultat={selectedResultat}
        onValider={handleValider}
      />

      {/* PICKERS */}
      <PickerModal visible={showTypePicker}   onClose={() => setShowTypePicker(false)}   options={typeOptions}   selected={filtreType}   onSelect={setFiltreType}   title="Type d'analyse" />
      <PickerModal visible={showStatutPicker} onClose={() => setShowStatutPicker(false)} options={statutOptions} selected={filtreStatut} onSelect={setFiltreStatut} title="Statut validation" />
      <PickerModal visible={showScorePicker}  onClose={() => setShowScorePicker(false)}  options={scoreOptions}  selected={filtreScore}  onSelect={setFiltreScore}  title="Score de confiance" />

    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f0fdf4' },
  header:            { backgroundColor: '#065f46', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  btnBack:           { marginBottom: 8 },
  headerTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle:       { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  headerSub:         { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  headerNote:        { fontSize: 10, color: '#a7f3d0', fontStyle: 'italic', marginBottom: 14 },
  searchRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar:         { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput:       { flex: 1, fontSize: 13, color: '#1e293b' },
  btnFilters:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingHorizontal: 14, height: 44 },
  btnFiltersActive:  { backgroundColor: 'rgba(255,255,255,0.2)' },
  btnFiltersText:    { fontSize: 13, color: '#FFF', fontWeight: '600' },
  btnRefresh:        { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  filtresZone:       { flexDirection: 'row', gap: 8, marginTop: 14 },
  filtreGroup:       { flex: 1 },
  filtreLabel:       { fontSize: 9, color: '#a7f3d0', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  filtrePicker:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, height: 36 },
  filtrePickerText:  { fontSize: 11, color: '#1e293b', flex: 1 },
  statsRow:          { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#d1fae5' },
  statCard:          { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#d1fae5', gap: 3 },
  statNumber:        { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  statLabel:         { fontSize: 8, color: '#64748b', textAlign: 'center' },
  loadingContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer:    { alignItems: 'center', paddingTop: 60 },
  emptyText:         { color: '#94a3b8', fontSize: 13, marginTop: 12 },

  // Card résultat
  card:              { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardPrioritaire:   { borderColor: '#fca5a5', borderWidth: 1.5 },
  prioritaireBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 5 },
  prioritaireText:   { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
  cardContent:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  cardHeaderRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardType:          { fontSize: 13, fontWeight: 'bold', flex: 1 },
  statutBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  statutBadgeText:   { fontSize: 8, fontWeight: 'bold' },
  infoRow:           { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  infoLabel:         { fontSize: 11, color: '#64748b', fontWeight: '600' },
  infoValue:         { fontSize: 11, color: '#1e293b', flex: 1 },
  infoDate:          { fontSize: 10, color: '#94a3b8' },
  btnVoirDetail:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  btnVoirDetailText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
});

const pStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '85%', maxHeight: '70%' },
  title:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  item:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemActive:     { backgroundColor: '#f0fdf4' },
  itemText:       { fontSize: 14, color: '#1e293b' },
  itemTextActive: { color: '#10b981', fontWeight: '600' },
});

export default ResultatsIAPage;