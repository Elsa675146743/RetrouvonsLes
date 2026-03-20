import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl, Alert, Dimensions, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

// =====================================================
// ✅ PICKER MODAL — OBLIGATOIREMENT EN DEHORS
// =====================================================
const PickerModal = ({ visible, onClose, options, selected, onSelect, title }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={pStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={pStyles.container}>
        <Text style={pStyles.title}>{title}</Text>
        {options.map((opt: any) => (
          <TouchableOpacity
            key={opt.value}
            style={[pStyles.item, selected === opt.value && pStyles.itemActive]}
            onPress={() => { onSelect(opt.value); onClose(); }}
          >
            <Text style={[pStyles.itemText, selected === opt.value && pStyles.itemTextActive]}>
              {opt.label}
            </Text>
            {selected === opt.value && (
              <Ionicons name="checkmark" size={16} color="#0f2744" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
const ValidationSignalementsPage = ({ navigation }: any) => {

  const [signalements, setSignalements]     = useState<any[]>([]);
  const [selected, setSelected]             = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [validating, setValidating]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [collapseLeft, setCollapseLeft]     = useState(false);

  const [showFilters, setShowFilters]       = useState(false);
  const [filtreStatut, setFiltreStatut]     = useState('tous');
  const [filtrePrio, setFiltrePrio]         = useState('toutes');
  const [filtrePeriode, setFiltrePeriode]   = useState('toutes');

  const [dossierVisible, setDossierVisible] = useState(false);
  const [dossierDetail, setDossierDetail]   = useState<any>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const [decisionMode, setDecisionMode]     = useState<'approuver' | 'rejeter' | 'clarification' | null>(null);
  const [typeRejet, setTypeRejet]           = useState<'non_pertinent' | 'spam' | 'doublons'>('non_pertinent');
  const [priorite, setPriorite]             = useState('moyenne');
  const [scoreConfiance, setScoreConfiance] = useState(80);
  const [raison, setRaison]                 = useState('');
  const [notes, setNotes]                   = useState('');
  const [transferer, setTransferer]         = useState(false);

  const [showStatutPicker, setShowStatutPicker]   = useState(false);
  const [showPrioPicker, setShowPrioPicker]       = useState(false);
  const [showPeriodePicker, setShowPeriodePicker] = useState(false);
  const [showPrioDecision, setShowPrioDecision]   = useState(false);

  const [stats, setStats] = useState({ enAttente: 0, enCours: 0, valides: 0, semaine: 0 });

  const statutOptions = [
    { label: 'Tous les statuts',    value: 'tous'            },
    { label: "En attente d'examen", value: 'en_attente'      },
    { label: 'En cours',            value: 'en_verification' },
    { label: 'Validé',              value: 'valide'          },
    { label: 'Rejeté',              value: 'invalide'        },
    { label: 'Spam',                value: 'spam'            },
    { label: 'Doublons',            value: 'doublons'        },
  ];
  const prioOptions = [
    { label: 'Toutes',  value: 'toutes'  },
    { label: 'Haute',   value: 'haute'   },
    { label: 'Moyenne', value: 'moyenne' },
    { label: 'Basse',   value: 'basse'   },
  ];
  const periodeOptions = [
    { label: 'Toutes les périodes', value: 'toutes' },
    { label: 'Depuis 7 jours',      value: '7j'     },
    { label: 'Dernier mois',        value: '30j'    },
    { label: 'Depuis 90 jours',     value: '90j'    },
  ];
  const prioDecisionOptions = [
    { label: 'Haute',   value: 'haute'   },
    { label: 'Moyenne', value: 'moyenne' },
    { label: 'Basse',   value: 'basse'   },
  ];

  const getLabelStatut  = () => statutOptions.find(o => o.value === filtreStatut)?.label          || 'Tous les statuts';
  const getLabelPrio    = () => prioOptions.find(o => o.value === filtrePrio)?.label               || 'Toutes';
  const getLabelPeriode = () => periodeOptions.find(o => o.value === filtrePeriode)?.label         || 'Toutes les périodes';
  const getLabelPrioD   = () => prioDecisionOptions.find(o => o.value === priorite)?.label         || 'Moyenne';

  // =====================================================
  // CHARGEMENT SIGNALEMENTS
  // =====================================================
  const fetchSignalements = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('signalement')
        .select(`
          id, numero_signalement, description,
          date_observation, lieu_observation, ville_observation,
          region_observation, niveau_certitude, statut_validation,
          contexte_observation, etat_personne_observee,
          temoin_anonyme, nom_temoin, source_signalement,
          created_at, updated_at,
          utilisateur:id_utilisateur ( id, nom, prenom, telephone ),
          dossier:id_dossier (
            id, numero_dossier,
            personne:id_personne ( nom, prenom )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = data || [];
      setSignalements(list);

      const enAttente  = list.filter(s => s.statut_validation === 'en_attente').length;
      const enCours    = list.filter(s => s.statut_validation === 'en_verification').length;
      const valides    = list.filter(s => s.statut_validation === 'valide').length;
      const semaineDeb = new Date();
      semaineDeb.setDate(semaineDeb.getDate() - 7);
      const semaine    = list.filter(s =>
        s.statut_validation !== 'en_attente' &&
        new Date(s.updated_at) >= semaineDeb
      ).length;
      setStats({ enAttente, enCours, valides, semaine });
    } catch (err) {
      console.error('Erreur signalements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSignalements(); }, [fetchSignalements]);

  // =====================================================
  // ✅ CHARGER DOSSIER — maybeSingle évite l'erreur
  // =====================================================
  const fetchDossierDetail = async (dossierId: string) => {
    if (!dossierId) {
      Alert.alert('Info', 'Aucun dossier associé à ce signalement.');
      return;
    }
    setLoadingDossier(true);
    setDossierDetail(null);
    try {
      const { data, error } = await supabase
        .from('dossier_disparition')
        .select(`
          id, numero_dossier, statut_dossier, niveau_urgence,
          date_disparition, lieu_disparition, ville_disparition,
          region_disparition, circonstances,
          personne:id_personne (
            id, nom, prenom, sexe, taille_cm,
            description_physique, signes_distinctifs,
            derniers_vetements_portes, photo_principale
          )
        `)
        .eq('id', dossierId)
        .maybeSingle(); // ✅ ne plante pas si introuvable

      if (error) throw error;

      if (!data) {
        Alert.alert('Info', 'Dossier introuvable dans la base de données.');
        setDossierVisible(false);
        return;
      }
      setDossierDetail(data);
    } catch (err: any) {
      console.error('Erreur dossier:', err);
      Alert.alert('Erreur', err?.message || 'Impossible de charger le dossier.');
      setDossierVisible(false);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Filtrage
  const filteredSignalements = signalements.filter(s => {
    if (filtreStatut === 'en_attente'      && s.statut_validation !== 'en_attente')      return false;
    if (filtreStatut === 'en_verification' && s.statut_validation !== 'en_verification') return false;
    if (filtreStatut === 'valide'          && s.statut_validation !== 'valide')          return false;
    if (filtreStatut === 'invalide'        && s.statut_validation !== 'invalide')        return false;
    if (filtrePeriode !== 'toutes') {
      const jours  = filtrePeriode === '7j' ? 7 : filtrePeriode === '30j' ? 30 : 90;
      const limite = new Date();
      limite.setDate(limite.getDate() - jours);
      if (new Date(s.created_at) < limite) return false;
    }
    const q = searchQuery.toLowerCase();
    return !q ||
      s.lieu_observation?.toLowerCase().includes(q) ||
      s.ville_observation?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.numero_signalement?.toLowerCase().includes(q) ||
      s.dossier?.numero_dossier?.toLowerCase().includes(q);
  });

  // Submit décision
  const handleSubmit = async () => {
    if (!selected || !decisionMode) return;
    const nouveauStatut = decisionMode === 'approuver' ? 'valide' : 'invalide';
    Alert.alert(
      decisionMode === 'approuver' ? 'Approuver' : 'Rejeter',
      'Confirmer la décision pour ce signalement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setValidating(true);
            try {
              const { error } = await supabase
                .from('signalement')
                .update({
                  statut_validation: nouveauStatut,
                  date_verification: new Date().toISOString(),
                  updated_at:        new Date().toISOString(),
                })
                .eq('id', selected.id);
              if (error) throw error;
              setSignalements(prev =>
                prev.map(s => s.id === selected.id ? { ...s, statut_validation: nouveauStatut } : s)
              );
              setSelected((prev: any) => ({ ...prev, statut_validation: nouveauStatut }));
              setStats(prev => ({
                ...prev,
                enAttente: Math.max(0, prev.enAttente - 1),
                valides: nouveauStatut === 'valide' ? prev.valides + 1 : prev.valides,
              }));
              setDecisionMode(null); setRaison(''); setNotes('');
              Alert.alert(
                nouveauStatut === 'valide' ? '✅ Approuvé' : '❌ Rejeté',
                'Décision enregistrée avec succès.'
              );
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de traiter.');
            } finally {
              setValidating(false);
            }
          }
        }
      ]
    );
  };

  const getStatutStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      en_attente:      { bg: '#fef3c7', text: '#92400e', label: 'EN ATTENTE' },
      en_verification: { bg: '#eff6ff', text: '#1e40af', label: 'EN COURS'   },
      valide:          { bg: '#f0fdf4', text: '#166534', label: 'VALIDÉS'    },
      invalide:        { bg: '#fee2e2', text: '#991b1b', label: 'REJETÉ'     },
    };
    return map[statut] || { bg: '#f1f5f9', text: '#64748b', label: statut };
  };

  const getCertitudeColor = (c: string) => {
    const map: Record<string, string> = {
      certain: '#10b981', tres_probable: '#2563eb',
      probable: '#f59e0b', incertain: '#94a3b8', doute: '#ef4444',
    };
    return map[c] || '#94a3b8';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f2744" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation des signalements</Text>
        <Text style={styles.headerSub}>Examinez et validez les signalements reçus</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par lieu, description..."
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
            <Ionicons name="filter-outline" size={16} color={showFilters ? '#FFF' : '#64748b'} />
            <Text style={[styles.btnFiltersText, showFilters && { color: '#FFF' }]}>filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnActualiser} onPress={() => fetchSignalements()}>
            <Ionicons name="refresh-outline" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtresZone}>
            <View style={styles.filtreItem}>
              <Text style={styles.filtreLabel}>Statut</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowStatutPicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelStatut()}</Text>
                <Ionicons name="chevron-down" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreItem}>
              <Text style={styles.filtreLabel}>Priorité</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowPrioPicker(true)}>
                <Text style={styles.filtrePickerText}>{getLabelPrio()}</Text>
                <Ionicons name="chevron-down" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreItem}>
              <Text style={styles.filtreLabel}>Période</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowPeriodePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelPeriode()}</Text>
                <Ionicons name="chevron-down" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        {[
          { count: stats.enAttente, label: 'En attente'    },
          { count: stats.enCours,   label: 'En cours'      },
          { count: stats.valides,   label: 'Validés'       },
          { count: stats.semaine,   label: 'cette semaine' },
        ].map((item, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statNumber}>{loading ? '...' : item.count}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* CORPS */}
      <View style={styles.body}>

        {/* ✅ COLONNE GAUCHE — masquée si collapseLeft */}
        {!collapseLeft && (
          <View style={styles.colLeft}>
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#10b981" />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); fetchSignalements(); }} />
                }
              >
                <Text style={styles.listCount}>{filteredSignalements.length} signalement(s)</Text>
                {filteredSignalements.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={40} color="#cbd5e1" />
                    <Text style={styles.emptyText}>Aucun signalement</Text>
                  </View>
                ) : (
                  filteredSignalements.map(item => {
                    const statStyle  = getStatutStyle(item.statut_validation);
                    const isSelected = selected?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.signalCard, isSelected && styles.signalCardSelected]}
                        onPress={() => {
                          setSelected(item);
                          setDecisionMode(null);
                          setDossierVisible(false);
                          setDossierDetail(null);
                          setCollapseLeft(true); // ✅ cache la liste
                        }}
                      >
                        <View style={styles.signalCardHeader}>
                          <View style={styles.signalLieuRow}>
                            <Ionicons name="location-outline" size={13} color="#2563eb" />
                            <Text style={styles.signalLieu} numberOfLines={1}>
                              {item.ville_observation || item.lieu_observation || '—'}
                            </Text>
                          </View>
                          <View style={[styles.statutBadge, { backgroundColor: statStyle.bg }]}>
                            <Text style={[styles.statutBadgeText, { color: statStyle.text }]}>
                              {statStyle.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.signalDesc} numberOfLines={2}>{item.description || '—'}</Text>
                        <View style={styles.signalFooter}>
                          <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                          <Text style={styles.signalDate}>
                            {item.date_observation
                              ? new Date(item.date_observation).toLocaleDateString('fr-FR') : '—'}
                          </Text>
                          <Text style={[styles.signalCertitude, { color: getCertitudeColor(item.niveau_certitude) }]}>
                            {item.niveau_certitude?.replace(/_/g, ' ') || '—'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* COLONNE DROITE — pleine largeur si collapseLeft */}
        <View style={[styles.colRight, collapseLeft && styles.colRightFull]}>
          {!selected ? (
            <View style={styles.emptyDetail}>
              <Ionicons name="chatbox-outline" size={50} color="#d1fae5" />
              <Text style={styles.emptyDetailText}>Sélectionnez un signalement pour le valider</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

              {/* ✅ BOUTON RETOUR LISTE — réaffiche la colonne gauche */}
              {collapseLeft && (
                <TouchableOpacity
                  style={styles.btnRetourListe}
                  onPress={() => {
                    setCollapseLeft(false);
                    // garde le signalement sélectionné visible dans la liste
                  }}
                >
                  <Ionicons name="arrow-back" size={14} color="#2563eb" />
                  <Text style={styles.btnRetourListeText}>Retour à la liste</Text>
                </TouchableOpacity>
              )}

              {/* STATUT + NUMÉRO */}
              <View style={styles.detailStatutRow}>
                <View style={[styles.statutBadge, { backgroundColor: getStatutStyle(selected.statut_validation).bg }]}>
                  <Text style={[styles.statutBadgeText, { color: getStatutStyle(selected.statut_validation).text }]}>
                    {getStatutStyle(selected.statut_validation).label}
                  </Text>
                </View>
                <Text style={styles.detailNumero}>
                  {selected.numero_signalement || `SIG-${selected.id.slice(-6).toUpperCase()}`}
                </Text>
              </View>

              {/* ✅ DOSSIER ASSOCIÉ */}
              {selected.dossier && (
                <View style={styles.dossierBox}>
                  <View style={styles.dossierBoxHeader}>
                    <View style={styles.dossierBoxLeft}>
                      <View style={styles.dossierIconBox}>
                        <Ionicons name="document-text-outline" size={16} color="#2563eb" />
                      </View>
                      <View>
                        <Text style={styles.dossierBoxTitle}>Dossier de disparition associé</Text>
                        <Text style={styles.dossierBoxNumero}>{selected.dossier.numero_dossier}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.btnVoirDossier}
                      onPress={() => {
                        if (dossierVisible) {
                          setDossierVisible(false);
                          setDossierDetail(null);
                        } else {
                          setDossierVisible(true);
                          fetchDossierDetail(selected.dossier.id);
                        }
                      }}
                    >
                      <Ionicons name={dossierVisible ? 'chevron-up' : 'chevron-down'} size={14} color="#FFF" />
                      <Text style={styles.btnVoirDossierText}>
                        {dossierVisible ? 'Masquer' : 'Voir le dossier'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* CONTENU DOSSIER */}
                  {dossierVisible && (
                    <View style={styles.dossierContent}>
                      {loadingDossier ? (
                        <View style={styles.dossierLoading}>
                          <ActivityIndicator size="small" color="#2563eb" />
                          <Text style={styles.dossierLoadingText}>Chargement du dossier...</Text>
                        </View>
                      ) : dossierDetail ? (
                        <View>
                          {/* Personne */}
                          <View style={styles.dossierPersonneRow}>
                            <View style={styles.dossierPhoto}>
                              <Ionicons name="person-outline" size={22} color="#94a3b8" />
                              <Text style={styles.dossierPhotoText}>Pas de photo</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dossierPersonneNom}>
                                {dossierDetail.personne
                                  ? `${dossierDetail.personne.prenom} ${dossierDetail.personne.nom}`
                                  : '—'}
                              </Text>
                              <Text style={styles.dossierNumero}>
                                Dossier: {dossierDetail.numero_dossier}
                              </Text>
                              <View style={styles.dossierPersonneInfoRow}>
                                {dossierDetail.date_disparition && (
                                  <>
                                    <Ionicons name="calendar-outline" size={11} color="#64748b" />
                                    <Text style={styles.dossierPersonneInfo}>
                                      {new Date(dossierDetail.date_disparition).toLocaleDateString('fr-FR')}
                                    </Text>
                                  </>
                                )}
                                {dossierDetail.personne?.sexe && (
                                  <Text style={styles.dossierPersonneInfo}>{dossierDetail.personne.sexe}</Text>
                                )}
                                {dossierDetail.personne?.taille && (
                                  <Text style={styles.dossierPersonneInfo}>{dossierDetail.personne.taille} cm</Text>
                                )}
                              </View>
                            </View>
                          </View>

                          {/* Infos */}
                          <View style={styles.dossierInfosCard}>
                            {[
                              { label: 'DATE DISPARITION',   value: dossierDetail.date_disparition ? new Date(dossierDetail.date_disparition).toLocaleDateString('fr-FR') : '—' },
                              { label: 'LIEU DISPARITION',   value: [dossierDetail.lieu_disparition, dossierDetail.ville_disparition, dossierDetail.region_disparition].filter(Boolean).join(', ') || '—' },
                              { label: 'CIRCONSTANCES',      value: dossierDetail.circonstances || '—' },
                              { label: 'VÊTEMENTS',          value: dossierDetail.personne?.vetements_disparition || '—' },
                              { label: 'SIGNES DISTINCTIFS', value: dossierDetail.personne?.signes_distinctifs || '—' },
                            ].map((row, i) => (
                              <View key={i} style={styles.dossierInfoRow}>
                                <Text style={styles.dossierInfoLabel}>{row.label}</Text>
                                <Text style={styles.dossierInfoValue}>{row.value}</Text>
                              </View>
                            ))}
                          </View>

                          {/* Badges */}
                          <View style={styles.dossierBadgesRow}>
                            <View style={styles.dossierBadgeRecherche}>
                              <Text style={styles.dossierBadgeRechercheText}>RECHERCHES EN COURS</Text>
                            </View>
                            {dossierDetail.niveau_urgence && (
                              <View style={[styles.dossierBadgeUrgent, {
                                backgroundColor:
                                  dossierDetail.niveau_urgence === 'critique' ? '#fee2e2' :
                                  dossierDetail.niveau_urgence === 'urgent'   ? '#fef3c7' : '#f1f5f9',
                              }]}>
                                <Text style={[styles.dossierBadgeUrgentText, {
                                  color:
                                    dossierDetail.niveau_urgence === 'critique' ? '#991b1b' :
                                    dossierDetail.niveau_urgence === 'urgent'   ? '#92400e' : '#64748b',
                                }]}>
                                  Urgence: {dossierDetail.niveau_urgence}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Alerte */}
                          <View style={styles.dossierAlerte}>
                            <Ionicons name="warning-outline" size={14} color="#92400e" style={{ marginRight: 8 }} />
                            <Text style={styles.dossierAlerteText}>
                              Vérifiez la cohérence: Le signalement correspond-il à la description physique,
                              aux vêtements et au lieu de disparition du dossier ?
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.dossierLoading}>
                          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                          <Text style={[styles.dossierLoadingText, { color: '#ef4444' }]}>Dossier introuvable</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* DÉTAILS SIGNALEMENT */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Détails du signalement</Text>
                {[
                  { label: 'Location',     value: selected.lieu_observation || '—' },
                  { label: 'Ville/Région', value: [selected.ville_observation, selected.region_observation].filter(Boolean).join(', ') || '—' },
                  { label: 'Date',         value: selected.date_observation ? new Date(selected.date_observation).toLocaleDateString('fr-FR') : '—' },
                  { label: 'Certitude',    value: selected.niveau_certitude?.replace(/_/g, ' ') || '—' },
                ].map((row, i) => (
                  <View key={i} style={styles.detailGrid}>
                    <Text style={styles.detailGridLabel}>{row.label}</Text>
                    <Text style={styles.detailGridValue}>{row.value}</Text>
                  </View>
                ))}
                <Text style={styles.detailDescLabel}>Description</Text>
                <View style={styles.detailDescBox}>
                  <Text style={styles.detailDescText}>{selected.description || '—'}</Text>
                </View>
              </View>

              {/* DÉCISION */}
              <View style={styles.detailSection}>
                <View style={styles.decisionTitleRow}>
                  <Ionicons name="chatbox-outline" size={16} color="#1e293b" />
                  <Text style={styles.decisionTitle}>Décision</Text>
                </View>

                <Text style={styles.decisionLabel}>Choisir une décision</Text>
                <View style={styles.decisionBtnsRow}>
                  <TouchableOpacity
                    style={[styles.decisionBtn, decisionMode === 'approuver' && styles.decisionBtnApprouver]}
                    onPress={() => setDecisionMode(decisionMode === 'approuver' ? null : 'approuver')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color={decisionMode === 'approuver' ? '#FFF' : '#1e293b'} />
                    <Text style={[styles.decisionBtnText, decisionMode === 'approuver' && { color: '#FFF' }]}>Approuver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.decisionBtn, decisionMode === 'rejeter' && styles.decisionBtnRejeter]}
                    onPress={() => setDecisionMode(decisionMode === 'rejeter' ? null : 'rejeter')}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={decisionMode === 'rejeter' ? '#FFF' : '#1e293b'} />
                    <Text style={[styles.decisionBtnText, decisionMode === 'rejeter' && { color: '#FFF' }]}>Rejeter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.decisionBtn, decisionMode === 'clarification' && styles.decisionBtnClarif]}
                    onPress={() => setDecisionMode(decisionMode === 'clarification' ? null : 'clarification')}
                  >
                    <Ionicons name="warning-outline" size={15} color={decisionMode === 'clarification' ? '#FFF' : '#1e293b'} />
                    <Text style={[styles.decisionBtnText, decisionMode === 'clarification' && { color: '#FFF' }]}>Clarification</Text>
                  </TouchableOpacity>
                </View>

                {decisionMode === 'rejeter' && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.decisionLabel}>Type de rejet</Text>
                    <View style={styles.typeRejetRow}>
                      {([
                        { label: 'Non pertinent', value: 'non_pertinent', icon: 'close-circle-outline' },
                        { label: 'Spam',          value: 'spam',          icon: 'flag-outline'         },
                        { label: 'Doublons',      value: 'doublons',      icon: 'copy-outline'         },
                      ] as const).map(opt => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.typeRejetBtn, typeRejet === opt.value && styles.typeRejetBtnActive]}
                          onPress={() => setTypeRejet(opt.value)}
                        >
                          {typeRejet === opt.value && <View style={styles.typeRejetDot} />}
                          <Ionicons name={opt.icon} size={16} color={typeRejet === opt.value ? '#ef4444' : '#64748b'} />
                          <Text style={[styles.typeRejetText, typeRejet === opt.value && { color: '#ef4444' }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {decisionMode && (
                  <View style={styles.decisionForm}>
                    <Text style={styles.decisionLabel}>Priorité de traitement</Text>
                    <TouchableOpacity style={styles.prioritePicker} onPress={() => setShowPrioDecision(true)}>
                      <Text style={styles.prioritePickerText}>{getLabelPrioD()}</Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>

                    <Text style={[styles.decisionLabel, { marginTop: 14 }]}>Score de confiance: {scoreConfiance}%</Text>
                    <View style={styles.sliderRow}>
                      <TouchableOpacity style={styles.sliderBtn} onPress={() => setScoreConfiance(p => Math.max(0, p - 10))}>
                        <Text style={styles.sliderBtnText}>−10</Text>
                      </TouchableOpacity>
                      <View style={styles.sliderBar}>
                        <View style={[styles.sliderFill, { width: `${scoreConfiance}%` as any }]} />
                      </View>
                      <TouchableOpacity style={styles.sliderBtn} onPress={() => setScoreConfiance(p => Math.min(100, p + 10))}>
                        <Text style={styles.sliderBtnText}>+10</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.decisionLabel, { marginTop: 14 }]}>Raison</Text>
                    <TextInput
                      style={styles.decisionInput}
                      placeholder="Raison de la décision..."
                      placeholderTextColor="#94a3b8"
                      value={raison}
                      onChangeText={setRaison}
                    />

                    <Text style={[styles.decisionLabel, { marginTop: 14 }]}>Notes (confidentielles)</Text>
                    <TextInput
                      style={[styles.decisionInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                      placeholder="Notes internes de modération..."
                      placeholderTextColor="#94a3b8"
                      multiline
                      value={notes}
                      onChangeText={setNotes}
                    />

                    <TouchableOpacity style={styles.transfererRow} onPress={() => setTransferer(!transferer)}>
                      <View style={[styles.checkbox, transferer && styles.checkboxActive]}>
                        {transferer && <Ionicons name="checkmark" size={12} color="#FFF" />}
                      </View>
                      <Ionicons name="send-outline" size={14} color="#64748b" />
                      <Text style={styles.transfererText}>Transférer aux autorités compétentes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnSubmit, validating && { opacity: 0.6 }]}
                      onPress={handleSubmit}
                      disabled={validating}
                    >
                      {validating ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="arrow-forward" size={18} color="#FFF" />
                          <Text style={styles.btnSubmitText}>Soumettre la décision</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </ScrollView>
          )}
        </View>
      </View>

      {/* MODALS */}
      <PickerModal visible={showStatutPicker}  onClose={() => setShowStatutPicker(false)}  options={statutOptions}       selected={filtreStatut}  onSelect={setFiltreStatut}  title="Statut" />
      <PickerModal visible={showPrioPicker}    onClose={() => setShowPrioPicker(false)}    options={prioOptions}         selected={filtrePrio}    onSelect={setFiltrePrio}    title="Priorité" />
      <PickerModal visible={showPeriodePicker} onClose={() => setShowPeriodePicker(false)} options={periodeOptions}      selected={filtrePeriode} onSelect={setFiltrePeriode} title="Période" />
      <PickerModal visible={showPrioDecision}  onClose={() => setShowPrioDecision(false)}  options={prioDecisionOptions} selected={priorite}      onSelect={setPriorite}      title="Priorité de traitement" />

    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#f1f5f9' },
  header:                 { backgroundColor: '#0f2744', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  btnBack:                { marginBottom: 10 },
  headerTitle:            { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  headerSub:              { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  searchRow:              { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar:              { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 42 },
  searchInput:            { flex: 1, fontSize: 13, color: '#1e293b' },
  btnFilters:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 42, gap: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  btnFiltersActive:       { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  btnFiltersText:         { fontSize: 12, color: '#64748b', fontWeight: '600' },
  btnActualiser:          { backgroundColor: '#FFF', width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filtresZone:            { flexDirection: 'row', marginTop: 14, gap: 8 },
  filtreItem:             { flex: 1 },
  filtreLabel:            { fontSize: 10, color: '#a7f3d0', fontWeight: 'bold', marginBottom: 5 },
  filtrePicker:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, height: 36 },
  filtrePickerText:       { fontSize: 11, color: '#FFF', flex: 1 },
  statsRow:               { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statCard:               { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statNumber:             { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  statLabel:              { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 },
  body:                   { flex: 1, flexDirection: 'row' },
  colLeft:                { width: width * 0.36, borderRightWidth: 1, borderRightColor: '#e2e8f0', backgroundColor: '#FFF', padding: 10 },
  colRight:               { flex: 1, backgroundColor: '#f1f5f9', padding: 12 },
  colRightFull:           { flex: 1 },
  listCount:              { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontWeight: '600' },
  centerContainer:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyContainer:         { alignItems: 'center', paddingTop: 40 },
  emptyText:              { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  signalCard:             { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  signalCardSelected:     { borderColor: '#10b981', borderWidth: 2, backgroundColor: '#f0fdf4' },
  signalCardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  signalLieuRow:          { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4 },
  signalLieu:             { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginLeft: 4, flex: 1 },
  signalDesc:             { fontSize: 11, color: '#64748b', lineHeight: 15, marginBottom: 6 },
  signalFooter:           { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  signalDate:             { fontSize: 10, color: '#94a3b8' },
  signalCertitude:        { fontSize: 10, fontWeight: '600' },
  statutBadge:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutBadgeText:        { fontSize: 9, fontWeight: 'bold' },
  emptyDetail:            { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.4 },
  emptyDetailText:        { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 12 },
  btnRetourListe:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#dbeafe', alignSelf: 'flex-start', marginBottom: 14 },
  btnRetourListeText:     { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  detailStatutRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  detailNumero:           { fontSize: 12, color: '#64748b', fontWeight: '600' },
  dossierBox:             { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#dbeafe', overflow: 'hidden' },
  dossierBoxHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#eff6ff' },
  dossierBoxLeft:         { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dossierIconBox:         { width: 34, height: 34, borderRadius: 8, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  dossierBoxTitle:        { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
  dossierBoxNumero:       { fontSize: 10, color: '#64748b', marginTop: 1 },
  btnVoirDossier:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, gap: 5 },
  btnVoirDossierText:     { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  dossierContent:         { padding: 12 },
  dossierLoading:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  dossierLoadingText:     { fontSize: 13, color: '#64748b' },
  dossierPersonneRow:     { flexDirection: 'row', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  dossierPhoto:           { width: 52, height: 64, backgroundColor: '#f1f5f9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  dossierPhotoText:       { fontSize: 8, color: '#94a3b8', textAlign: 'center', marginTop: 3 },
  dossierPersonneNom:     { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  dossierNumero:          { fontSize: 11, color: '#64748b' },
  dossierPersonneInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  dossierPersonneInfo:    { fontSize: 11, color: '#64748b' },
  dossierInfosCard:       { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  dossierInfoRow:         { flexDirection: 'row', marginBottom: 7 },
  dossierInfoLabel:       { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', width: 115, letterSpacing: 0.3 },
  dossierInfoValue:       { fontSize: 11, color: '#1e293b', flex: 1, lineHeight: 15 },
  dossierBadgesRow:       { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dossierBadgeRecherche:  { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dossierBadgeRechercheText:{ fontSize: 9, fontWeight: 'bold', color: '#334155' },
  dossierBadgeUrgent:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dossierBadgeUrgentText: { fontSize: 9, fontWeight: 'bold' },
  dossierAlerte:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#fde68a' },
  dossierAlerteText:      { fontSize: 10, color: '#92400e', flex: 1, lineHeight: 14 },
  detailSection:          { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  detailSectionTitle:     { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailGrid:             { flexDirection: 'row', marginBottom: 10 },
  detailGridLabel:        { fontSize: 11, color: '#64748b', width: 110, fontWeight: '600' },
  detailGridValue:        { fontSize: 12, color: '#1e293b', flex: 1 },
  detailDescLabel:        { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 8 },
  detailDescBox:          { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  detailDescText:         { fontSize: 13, color: '#1e293b', lineHeight: 18 },
  decisionTitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  decisionTitle:          { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  decisionLabel:          { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 8 },
  decisionBtnsRow:        { flexDirection: 'row', gap: 6, marginBottom: 4 },
  decisionBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 11, gap: 5 },
  decisionBtnApprouver:   { backgroundColor: '#10b981', borderColor: '#10b981' },
  decisionBtnRejeter:     { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  decisionBtnClarif:      { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  decisionBtnText:        { fontSize: 11, fontWeight: '700', color: '#1e293b' },
  typeRejetRow:           { flexDirection: 'row', gap: 8 },
  typeRejetBtn:           { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 12, gap: 5, position: 'relative' },
  typeRejetBtnActive:     { borderColor: '#ef4444', backgroundColor: '#fff1f2' },
  typeRejetDot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', position: 'absolute', top: 6, left: 6 },
  typeRejetText:          { fontSize: 10, color: '#64748b', textAlign: 'center', fontWeight: '600' },
  decisionForm:           { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  prioritePicker:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, height: 44, backgroundColor: '#f8fafc' },
  prioritePickerText:     { fontSize: 13, color: '#1e293b' },
  sliderRow:              { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn:              { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#e2e8f0' },
  sliderBtnText:          { fontSize: 13, color: '#2563eb', fontWeight: 'bold' },
  sliderBar:              { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  sliderFill:             { height: 8, backgroundColor: '#2563eb', borderRadius: 4 },
  decisionInput:          { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1e293b', backgroundColor: '#f8fafc', height: 44 },
  transfererRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 18, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  checkbox:               { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#94a3b8', justifyContent: 'center', alignItems: 'center' },
  checkboxActive:         { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  transfererText:         { fontSize: 12, color: '#334155', flex: 1 },
  btnSubmit:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 15, gap: 10, elevation: 3 },
  btnSubmitText:          { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});

const pStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '80%' },
  title:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  item:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemActive:     { backgroundColor: '#eff6ff' },
  itemText:       { fontSize: 14, color: '#1e293b' },
  itemTextActive: { color: '#0f2744', fontWeight: '600' },
});

export default ValidationSignalementsPage;