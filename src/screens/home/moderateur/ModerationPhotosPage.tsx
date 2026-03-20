import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  RefreshControl, Alert, Dimensions, Modal, Image, FlatList
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width, height } = Dimensions.get('window');

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
                <Ionicons name="checkmark" size={16} color="#7c3aed" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =====================================================
// ✅ COMPOSANT PRINCIPAL
// =====================================================
function ModerationPhotosPage({ navigation }: { navigation: any }) {

  const [photos, setPhotos]               = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  // Filtres
  const [showFilters, setShowFilters]     = useState(false);
  const [filtreStatut, setFiltreStatut]   = useState('en_attente');
  const [filtreType, setFiltreType]       = useState('tous');
  const [filtreQualite, setFiltreQualite] = useState('toutes');

  // Picker modals filtres
  const [showStatutPicker, setShowStatutPicker]   = useState(false);
  const [showTypePicker, setShowTypePicker]       = useState(false);
  const [showQualitePicker, setShowQualitePicker] = useState(false);

  // Picker modals détail
  const [showModalTypePicker, setShowModalTypePicker]       = useState(false);
  const [showModalQualitePicker, setShowModalQualitePicker] = useState(false);

  // Panneau détail
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [modalQualite, setModalQualite]   = useState('moyenne');
  const [modalType, setModalType]         = useState('signalement');
  const [modalNotes, setModalNotes]       = useState('');
  const [modalPublic, setModalPublic]     = useState(false);
  const [modalBlur, setModalBlur]         = useState(false);

  // ── OPTIONS ──────────────────────────────────────────────────
  const statutOptions = [
    { label: 'Tous',       value: 'tous'       },
    { label: 'En attente', value: 'en_attente' },
    { label: 'Approuvée',  value: 'approuvee'  },
      { label: 'Rejetée',    value: 'rejetee'    },

  ];

  const typeOptions = [
    { label: 'Tous',             value: 'tous'             },
    { label: 'Portrait',         value: 'portrait'         },
    { label: 'Corps entier',     value: 'corps_entier'     },
    { label: 'Signalement',      value: 'signalement'      },
    { label: 'Lieu disparition', value: 'lieu_disparition' },
    { label: 'Objet personnel',  value: 'objet_personnel'  },
    { label: 'Document',         value: 'document'         },
    { label: 'Autre',            value: 'autre'            },
  ];

  const qualiteOptions = [
    { label: 'Toutes',     value: 'toutes'     },
    { label: 'Excellente', value: 'excellente' },
    { label: 'Bonne',      value: 'bonne'      },
    { label: 'Moyenne',    value: 'moyenne'    },
    { label: 'Faible',     value: 'faible'     },
  ];

  const qualiteModalOptions = [
    { label: 'Excellente', value: 'excellente' },
    { label: 'Bonne',      value: 'bonne'      },
    { label: 'Moyenne',    value: 'moyenne'    },
    { label: 'Faible',     value: 'faible'     },
  ];

  const typeModalOptions = typeOptions.filter(o => o.value !== 'tous');

  const getLabelStatut       = () => statutOptions.find(o => o.value === filtreStatut)?.label       || 'En attente';
  const getLabelType         = () => typeOptions.find(o => o.value === filtreType)?.label           || 'Tous';
  const getLabelQualite      = () => qualiteOptions.find(o => o.value === filtreQualite)?.label     || 'Toutes';
  const getLabelModalQualite = () => qualiteModalOptions.find(o => o.value === modalQualite)?.label || 'Moyenne';
  const getLabelModalType    = () => typeModalOptions.find(o => o.value === modalType)?.label       || 'Signalement';

  // =====================================================
  // CHARGEMENT PHOTOS — table "photo" du vrai schéma
  // =====================================================
  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);

      // 1️⃣ Charger toutes les photos depuis la vraie table "photo"
      const { data: photosData, error: photosError } = await supabase
        .from('photo')
        .select(`
          id, url_cloudinary, url_thumbnail,
          type_photo, qualite_image, titre, description,
          approuvee, visible_public,
          uploadee_par, moderee_par, date_moderation,
          id_signalement, id_personne,
          created_at
        `)
        .not('id_signalement', 'is', null)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      if (!photosData || photosData.length === 0) {
        setPhotos([]);
        return;
      }

      // 2️⃣ Récupérer les IDs signalements uniques
      const sigIds = [...new Set(
        photosData.map((p: any) => p.id_signalement).filter(Boolean)
      )];

      // 3️⃣ Charger les signalements correspondants
      const { data: sigData, error: sigError } = await supabase
        .from('signalement')
        .select(`
          id, numero_signalement,
          utilisateur:id_utilisateur ( id, nom, prenom )
        `)
        .in('id', sigIds);

      if (sigError) throw sigError;

      // 4️⃣ Mapper signalement sur chaque photo
      const sigMap: Record<string, any> = {};
      (sigData || []).forEach((s: any) => { sigMap[s.id] = s; });

      const liste = photosData.map((photo: any) => ({
        ...photo,
        signalement: sigMap[photo.id_signalement] || null,
      }));

      setPhotos(liste);
    } catch (err) {
      console.error('Erreur photos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // ── FILTRAGE ─────────────────────────────────────────────────
  const filteredPhotos = photos.filter((p: any) => {
    if (filtreStatut === 'en_attente' && p.approuvee === true)   return false;
    if (filtreStatut === 'approuvee'  && p.approuvee !== true)   return false;
      if (filtreStatut === 'rejetee'    && p.approuvee !== false) return false;

    if (filtreType    !== 'tous'   && p.type_photo    !== filtreType)    return false;
    if (filtreQualite !== 'toutes' && p.qualite_image !== filtreQualite) return false;
    const q = searchQuery.toLowerCase();
    return !q ||
      p.signalement?.numero_signalement?.toLowerCase().includes(q) ||
      p.signalement?.utilisateur?.nom?.toLowerCase().includes(q)   ||
      p.signalement?.utilisateur?.prenom?.toLowerCase().includes(q) ||
      p.titre?.toLowerCase().includes(q);
  });

  // ── OUVRIR DÉTAIL ─────────────────────────────────────────────
  const openDetail = (photo: any) => {
    setSelectedPhoto(photo);
    setModalQualite(photo.qualite_image  || 'moyenne');
    setModalType(photo.type_photo        || 'signalement');
    setModalNotes(photo.description      || '');
    setModalPublic(photo.visible_public  || false);
    setModalBlur(false);
    setDetailVisible(true);
  };

  // ── MODÉRER depuis panneau détail ────────────────────────────
  const handleModerate = async (action: 'approuvee' | 'rejetee') => {
    if (!selectedPhoto) return;
    Alert.alert(
      action === 'approuvee' ? 'Approuver' : 'Rejeter',
      'Confirmer la décision pour cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setSubmitting(true);
            try {
              const { error } = await supabase
                .from('photo')
                .update({
                  approuvee:       action === 'approuvee',
                  visible_public:  action === 'approuvee' ? modalPublic : false,
                  qualite_image:   modalQualite,
                  type_photo:      modalType,
                  description:     modalNotes,
                  date_moderation: new Date().toISOString(),
                })
                .eq('id', selectedPhoto.id);

              if (error) throw error;

              setPhotos(prev => prev.map(p =>
                p.id === selectedPhoto.id
                  ? { ...p, approuvee: action === 'approuvee' }
                  : p
              ));
              setDetailVisible(false);
              setSelectedPhoto(null);
              Alert.alert(
                action === 'approuvee' ? '✅ Approuvée' : '❌ Rejetée',
                'Décision enregistrée avec succès.'
              );
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de traiter.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ── MODÉRER directement depuis la card ──────────────────────
  const handleModerateDirecte = (photo: any, action: 'approuvee' | 'rejetee') => {
    Alert.alert(
      action === 'approuvee' ? 'Approuver' : 'Rejeter',
      'Confirmer la décision pour cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('photo')
                .update({
                  approuvee:       action === 'approuvee',
                  visible_public:  action === 'approuvee',
                  date_moderation: new Date().toISOString(),
                })
                .eq('id', photo.id);
              if (error) throw error;
              setPhotos(prev => prev.map(p =>
                p.id === photo.id ? { ...p, approuvee: action === 'approuvee' } : p
              ));
              Alert.alert(
                action === 'approuvee' ? '✅ Approuvée' : '❌ Rejetée',
                'Décision enregistrée.'
              );
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de traiter.');
            }
          },
        },
      ]
    );
  };

  // ── HELPERS ───────────────────────────────────────────────────
  const getStatutStyle = (approuvee: boolean | null) => {
    if (approuvee === true)  return { bg: '#16a34a', label: 'APPROUVÉE'  };
    if (approuvee === false) return { bg: '#dc2626', label: 'REJETÉE'    };
    return                          { bg: '#f59e0b', label: 'EN ATTENTE' };
  };

  const getQualiteColor = (q: string) => {
    const map: Record<string, string> = {
      excellente: '#10b981',
      bonne:      '#2563eb',
      moyenne:    '#f59e0b',
      faible:     '#ef4444',
    };
    return map[q] || '#94a3b8';
  };

  const getUploaderName = (photo: any) => {
    const u = photo?.signalement?.utilisateur;
    if (!u) return '—';
    return `${u.prenom || ''} ${u.nom || ''}`.trim() || '—';
  };

  // ── RENDER CARD ───────────────────────────────────────────────
  const renderCard = ({ item }: { item: any }) => {
    const statStyle   = getStatutStyle(item.approuvee);
    const isEnAttente = item.approuvee === null || item.approuvee === undefined;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.9}>
        <View style={styles.cardImgWrap}>
          {item.url_cloudinary ? (
            <Image source={{ uri: item.url_thumbnail || item.url_cloudinary }} style={styles.cardImg} />
          ) : (
            <View style={styles.cardImgPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#94a3b8" />
            </View>
          )}
          <View style={[styles.cardBadge, { backgroundColor: statStyle.bg }]}>
            <Text style={styles.cardBadgeText}>{statStyle.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardMetaRow}>
            <Text style={[styles.cardQualite, { color: getQualiteColor(item.qualite_image) }]}>
              ☆ {item.qualite_image || '—'}
            </Text>
            <Text style={styles.cardType}>🏷 {item.type_photo || '—'}</Text>
          </View>
          <Text style={styles.cardSignalement}>
            📍 {item.signalement?.numero_signalement || '—'}
          </Text>
          <Text style={styles.cardDate}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : '—'}
          </Text>

          {isEnAttente && (
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={[styles.cardBtn, styles.cardBtnApprouver]}
                onPress={() => handleModerateDirecte(item, 'approuvee')}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color="#FFF" />
                <Text style={styles.cardBtnText}>Approuver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardBtn, styles.cardBtnRejeter]}
                onPress={() => handleModerateDirecte(item, 'rejetee')}
              >
                <Ionicons name="close-circle-outline" size={14} color="#FFF" />
                <Text style={styles.cardBtnText}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />

      {/* HEADER VIOLET */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modération des photos</Text>
        <Text style={styles.headerSub}>Examinez et approuvez les photos des signalements</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
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
          <TouchableOpacity style={styles.btnRefresh} onPress={() => fetchPhotos()}>
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* PANNEAU FILTRES */}
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
              <Text style={styles.filtreLabel}>Type</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowTypePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelType()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Qualité</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowQualitePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelQualite()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* BARRE RÉSULTATS */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>{filteredPhotos.length} photo(s) trouvée(s)</Text>
        <Text style={styles.resultsText}>
          Page 1 / {Math.max(1, Math.ceil(filteredPhotos.length / 12))}
        </Text>
      </View>

      {/* GRILLE PHOTOS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={filteredPhotos}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPhotos(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucune photo trouvée</Text>
            </View>
          }
        />
      )}

      {/* PANNEAU DÉTAIL PHOTO */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailPanel}>

            {/* CÔTÉ GAUCHE — photo fond sombre */}
            <View style={styles.detailLeft}>
              {selectedPhoto?.url_cloudinary ? (
                <Image
                  source={{ uri: selectedPhoto.url_cloudinary }}
                  style={[styles.detailPhoto, modalBlur && { opacity: 0.08 }]}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.detailPhotoPlaceholder}>
                  <Ionicons name="image-outline" size={52} color="#475569" />
                </View>
              )}
              <TouchableOpacity
                style={styles.btnCloseDetail}
                onPress={() => setDetailVisible(false)}
              >
                <Ionicons name="close" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* CÔTÉ DROIT — formulaire */}
            <ScrollView style={styles.detailRight} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailTitle}>Détails de la photo</Text>
              <View style={styles.detailDivider} />

              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>ID</Text>
                <Text style={styles.detailInfoValue}>{selectedPhoto?.id?.substring(0, 10)}...</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>SIGNALEMENT</Text>
                <Text style={styles.detailInfoValue}>
                  {selectedPhoto?.signalement?.numero_signalement || '—'}
                </Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>UPLOADÉ PAR</Text>
                <Text style={styles.detailInfoValue}>{getUploaderName(selectedPhoto)}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>DATE</Text>
                <Text style={styles.detailInfoValue}>
                  {selectedPhoto?.created_at
                    ? new Date(selectedPhoto.created_at).toLocaleString('fr-FR') : '—'}
                </Text>
              </View>

              {/* Flouter */}
              <TouchableOpacity style={styles.blurBtn} onPress={() => setModalBlur(v => !v)}>
                <View style={[styles.blurCheckbox, modalBlur && styles.blurCheckboxActive]}>
                  {modalBlur && <Ionicons name="checkmark" size={10} color="#FFF" />}
                </View>
                <Text style={styles.blurBtnText}>Flouter des éléments sensibles</Text>
              </TouchableOpacity>

              {/* Section Modération */}
              <View style={styles.moderationBox}>
                <Text style={styles.moderationTitle}>Modération</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>☆ Qualité de l'image</Text>
                  <TouchableOpacity
                    style={styles.formPicker}
                    onPress={() => setShowModalQualitePicker(true)}
                  >
                    <Text style={styles.formPickerText}>{getLabelModalQualite()}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>🏷 Type de photo</Text>
                  <TouchableOpacity
                    style={styles.formPicker}
                    onPress={() => setShowModalTypePicker(true)}
                  >
                    <Text style={styles.formPickerText}>{getLabelModalType()}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.checkboxRow} onPress={() => setModalPublic(v => !v)}>
                  <View style={[styles.checkbox, modalPublic && styles.checkboxActive]}>
                    {modalPublic && <Ionicons name="checkmark" size={11} color="#FFF" />}
                  </View>
                  <Ionicons name="eye-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.checkboxLabel}>Visible publiquement</Text>
                </TouchableOpacity>

                <Text style={styles.formLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Notes de modération..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  value={modalNotes}
                  onChangeText={setModalNotes}
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn, styles.actionBtnApprouver,
                      (selectedPhoto?.approuvee === true || submitting) && { opacity: 0.45 },
                    ]}
                    disabled={selectedPhoto?.approuvee === true || submitting}
                    onPress={() => handleModerate('approuvee')}
                  >
                    {submitting
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <>
                          <Ionicons name="checkmark-circle-outline" size={17} color="#FFF" />
                          <Text style={styles.actionBtnText}>Approuver</Text>
                        </>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn, styles.actionBtnRejeter,
                      submitting && { opacity: 0.45 },
                    ]}
                    disabled={submitting}
                    onPress={() => handleModerate('rejetee')}
                  >
                    {submitting
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <>
                          <Ionicons name="close-circle-outline" size={17} color="#FFF" />
                          <Text style={styles.actionBtnText}>Rejeter</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PICKER MODALS FILTRES */}
      <PickerModal
        visible={showStatutPicker}
        onClose={() => setShowStatutPicker(false)}
        options={statutOptions}
        selected={filtreStatut}
        onSelect={setFiltreStatut}
        title="Statut"
      />
      <PickerModal
        visible={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        options={typeOptions}
        selected={filtreType}
        onSelect={setFiltreType}
        title="Type"
      />
      <PickerModal
        visible={showQualitePicker}
        onClose={() => setShowQualitePicker(false)}
        options={qualiteOptions}
        selected={filtreQualite}
        onSelect={setFiltreQualite}
        title="Qualité"
      />

      {/* PICKER MODALS DÉTAIL */}
      <PickerModal
        visible={showModalQualitePicker}
        onClose={() => setShowModalQualitePicker(false)}
        options={qualiteModalOptions}
        selected={modalQualite}
        onSelect={setModalQualite}
        title="Qualité de l'image"
      />
      <PickerModal
        visible={showModalTypePicker}
        onClose={() => setShowModalTypePicker(false)}
        options={typeModalOptions}
        selected={modalType}
        onSelect={setModalType}
        title="Type de photo"
      />

    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#f1f5f9' },
  header:                 { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  btnBack:                { marginBottom: 10 },
  headerTitle:            { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  headerSub:              { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  searchRow:              { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar:              { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput:            { flex: 1, fontSize: 14, color: '#1e293b' },
  btnFilters:             { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingHorizontal: 14, height: 44 },
  btnFiltersActive:       { backgroundColor: 'rgba(255,255,255,0.2)' },
  btnFiltersText:         { fontSize: 13, color: '#FFF', fontWeight: '600' },
  btnRefresh:             { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  filtresZone:            { flexDirection: 'row', gap: 10, marginTop: 16 },
  filtreGroup:            { flex: 1 },
  filtreLabel:            { fontSize: 10, color: '#e9d5ff', fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
  filtrePicker:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, height: 38 },
  filtrePickerText:       { fontSize: 12, color: '#1e293b', flex: 1 },
  resultsBar:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  resultsText:            { fontSize: 13, color: '#64748b' },
  loadingContainer:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid:                   { padding: 12, paddingBottom: 30 },
  gridRow:                { gap: 12, marginBottom: 0 },
  emptyContainer:         { alignItems: 'center', paddingTop: 60 },
  emptyText:              { color: '#94a3b8', fontSize: 14, marginTop: 10 },
  card:                   { flex: 1, backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardImgWrap:            { position: 'relative', aspectRatio: 4 / 3, backgroundColor: '#e2e8f0' },
  cardImg:                { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImgPlaceholder:     { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  cardBadge:              { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  cardBadgeText:          { fontSize: 9, fontWeight: 'bold', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBody:               { padding: 10 },
  cardMetaRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  cardQualite:            { fontSize: 11, fontWeight: '600' },
  cardType:               { fontSize: 11, color: '#64748b' },
  cardSignalement:        { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  cardDate:               { fontSize: 11, color: '#94a3b8', marginBottom: 10 },
  cardActionsRow:         { flexDirection: 'row', gap: 8 },
  cardBtn:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: 8, gap: 5 },
  cardBtnApprouver:       { backgroundColor: '#16a34a' },
  cardBtnRejeter:         { backgroundColor: '#dc2626' },
  cardBtnText:            { color: '#FFF', fontWeight: '700', fontSize: 12 },
  detailOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  detailPanel:            { flexDirection: 'row', backgroundColor: '#FFF', width: width * 0.95, maxHeight: height * 0.88, borderRadius: 16, overflow: 'hidden' },
  detailLeft:             { width: '52%', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  detailPhoto:            { width: '100%', height: '100%' },
  detailPhotoPlaceholder: { width: '100%', height: 300, justifyContent: 'center', alignItems: 'center' },
  btnCloseDetail:         { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.15)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  detailRight:            { flex: 1, padding: 18 },
  detailTitle:            { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  detailDivider:          { height: 1, backgroundColor: '#e2e8f0', marginBottom: 14 },
  detailInfoRow:          { marginBottom: 12 },
  detailInfoLabel:        { fontSize: 9, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  detailInfoValue:        { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  blurBtn:                { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fef9c3', borderWidth: 1.5, borderColor: '#fde047', borderRadius: 8, padding: 11, marginBottom: 14 },
  blurCheckbox:           { width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  blurCheckboxActive:     { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  blurBtnText:            { fontSize: 12, fontWeight: '600', color: '#92400e', flex: 1 },
  moderationBox:          { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  moderationTitle:        { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 14 },
  formGroup:              { marginBottom: 12 },
  formLabel:              { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  formPicker:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 42, backgroundColor: '#FFF' },
  formPickerText:         { fontSize: 13, color: '#1e293b' },
  checkboxRow:            { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  checkbox:               { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#94a3b8', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxActive:         { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkboxLabel:          { fontSize: 12, color: '#475569', fontWeight: '500' },
  textarea:               { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, color: '#1e293b', backgroundColor: '#FFF', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  actionRow:              { flexDirection: 'row', gap: 10 },
  actionBtn:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 10, gap: 7, elevation: 2 },
  actionBtnApprouver:     { backgroundColor: '#16a34a' },
  actionBtnRejeter:       { backgroundColor: '#dc2626' },
  actionBtnText:          { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});

const pStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '80%' },
  title:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  item:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemActive:     { backgroundColor: '#faf5ff' },
  itemText:       { fontSize: 14, color: '#1e293b' },
  itemTextActive: { color: '#7c3aed', fontWeight: '600' },
});

export default ModerationPhotosPage;