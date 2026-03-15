import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Image, Modal, Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const PhotoDetailModal = ({ visible, photo, onClose, onVoirDossier }: any) => {
  if (!photo) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={mStyles.container}>
          <TouchableOpacity style={mStyles.btnClose} onPress={onClose}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: photo.url_cloudinary }}
            style={mStyles.image}
            resizeMode="cover"
          />
          <View style={mStyles.infoBox}>
            <Text style={mStyles.titre}>{photo.titre || 'Photo sans titre'}</Text>
            <Text style={mStyles.meta}>
              Type: {photo.type_photo?.replace(/_/g, ' ') || '—'}
              {'    '}
              Qualité: {photo.qualite_image || '—'}
            </Text>
            {photo.dossier?.numero_dossier && (
              <TouchableOpacity
                style={mStyles.btnVoirDossier}
                onPress={() => onVoirDossier(photo)}
              >
                <Ionicons name="document-text-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={mStyles.btnVoirDossierText}>
                  Voir le dossier ({photo.dossier.numero_dossier})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PhotosAttente = ({ navigation }: any) => {
  const [photos, setPhotos]               = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showModal, setShowModal]         = useState(false);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photo')
        .select(`
          id,
          url_cloudinary,
          url_thumbnail,
          type_photo,
          titre,
          qualite_image,
          approuvee,
          visible_public,
          created_at,
          date_prise,
          personne:id_personne (
            id, nom, prenom
          ),
          signalement:id_signalement (
            id,
            numero_signalement,
            dossier:id_dossier (
              id,
              numero_dossier,
              date_disparition,
              lieu_disparition,
              latitude_disparition,
              longitude_disparition
            )
          )
        `)
        .not('id_signalement', 'is', null)
        .eq('approuvee', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichies = (data || []).map((p: any) => {
        const sig = Array.isArray(p.signalement) ? p.signalement[0] : p.signalement;
        const dos = sig?.dossier
          ? (Array.isArray(sig.dossier) ? sig.dossier[0] : sig.dossier)
          : null;
        return { ...p, signalement: sig || null, dossier: dos || null };
      });

      setPhotos(enrichies);
    } catch (err) {
      console.error('Erreur photos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPhotos();
    }, [])
  );

  // ✅ Passe showMap: true pour que DetailsDossier sache qu'on vient des photos
  const handleVoirDossier = (photo: any) => {
    setShowModal(false);
    setTimeout(() => {
      navigation.navigate('DetailsDossier', {
        dossierId:     photo.dossier?.numero_dossier || '',
        dossierIdReal: photo.dossier?.id || '',
        showMap:       true, // ✅ signal clé
      });
    }, 300);
  };

  const getQualiteStyle = (qualite: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      excellente: { bg: '#f0fdf4', text: '#166534' },
      bonne:      { bg: '#eff6ff', text: '#1e40af' },
      moyenne:    { bg: '#fef3c7', text: '#92400e' },
      faible:     { bg: '#fee2e2', text: '#991b1b' },
    };
    return map[qualite] || { bg: '#f1f5f9', text: '#64748b' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <Text style={styles.appTitle}>RetrouvonsLes</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPhotos(); }}
          />
        }
      >
        <Text style={styles.pageTitle}>Photos en attente</Text>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color="#92400e" style={{ marginRight: 8 }} />
          <Text style={styles.noteText}>
            <Text style={{ fontWeight: 'bold' }}>Note : </Text>
            En tant qu'opérateur, vous pouvez consulter les photos en attente d'approbation.
            L'approbation ou le rejet des photos est effectué par les modérateurs (niveau 3+).
          </Text>
        </View>

        <View style={styles.topRow}>
          <View style={styles.compteurBadge}>
            <Ionicons name="image-outline" size={14} color="#92400e" style={{ marginRight: 6 }} />
            <Text style={styles.compteurText}>
              {loading ? '...' : photos.length} photo(s) en attente de validation
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnActualiser}
            onPress={() => { setLoading(true); fetchPhotos(); }}
          >
            <Ionicons name="refresh-outline" size={16} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.btnActualiserText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Chargement des photos...</Text>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucune photo en attente</Text>
            <Text style={styles.emptySubText}>
              Les photos en attente de validation apparaîtront ici
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo) => {
              const qualiteStyle = getQualiteStyle(photo.qualite_image);
              const numeroDoc    = photo.dossier?.numero_dossier || '—';
              const dateAjout    = photo.created_at
                ? new Date(photo.created_at).toLocaleDateString('fr-FR')
                : '—';
              const imageUri     = photo.url_cloudinary || photo.url_thumbnail;

              return (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.card}
                  onPress={() => { setSelectedPhoto(photo); setShowModal(true); }}
                  activeOpacity={0.85}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#cbd5e1" />
                    </View>
                  )}

                  <View style={styles.overlayBadge}>
                    <Text style={styles.overlayBadgeText}>En attente</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.badgesRow}>
                      <View style={styles.badgeType}>
                        <Text style={styles.badgeTypeText}>
                          {photo.type_photo?.replace(/_/g, ' ') || 'photo'}
                        </Text>
                      </View>
                      {photo.qualite_image && (
                        <View style={[styles.badgeQualite, { backgroundColor: qualiteStyle.bg }]}>
                          <Text style={[styles.badgeQualiteText, { color: qualiteStyle.text }]}>
                            {photo.qualite_image}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.infoLine}>
                      <Ionicons name="document-outline" size={12} color="#64748b" />
                      <Text style={styles.infoText} numberOfLines={1}>{numeroDoc}</Text>
                    </View>
                    <View style={styles.infoLine}>
                      <Ionicons name="calendar-outline" size={12} color="#64748b" />
                      <Text style={styles.infoText}>{dateAjout}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <PhotoDetailModal
        visible={showModal}
        photo={selectedPhoto}
        onClose={() => setShowModal(false)}
        onVoirDossier={handleVoirDossier}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  appHeader:           { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  appHeaderLeft:       { flexDirection: 'row', alignItems: 'center' },
  appTitle:            { fontSize: 18, fontWeight: '800', color: '#1e293b', marginLeft: 10 },
  scrollContent:       { padding: 16, paddingBottom: 40 },
  pageTitle:           { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  noteBox:             { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fefce8', borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#fde68a' },
  noteText:            { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  topRow:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  compteurBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#fde68a' },
  compteurText:        { fontSize: 13, color: '#92400e', fontWeight: '600' },
  btnActualiser:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnActualiserText:   { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  centerContainer:     { alignItems: 'center', marginTop: 60 },
  loadingText:         { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  emptyContainer:      { alignItems: 'center', marginTop: 60 },
  emptyTitle:          { color: '#1e293b', fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptySubText:        { color: '#94a3b8', fontSize: 13, marginTop: 6, textAlign: 'center' },
  grid:                { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card:                { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, overflow: 'hidden', elevation: 2 },
  cardImage:           { width: '100%', height: 160, backgroundColor: '#f1f5f9' },
  cardImagePlaceholder:{ width: '100%', height: 160, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  overlayBadge:        { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#fef3c7' },
  overlayBadgeText:    { fontSize: 9, fontWeight: 'bold', color: '#92400e' },
  cardBody:            { padding: 10 },
  badgesRow:           { flexDirection: 'row', marginBottom: 8, gap: 6, flexWrap: 'wrap' },
  badgeType:           { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTypeText:       { fontSize: 10, color: '#475569', fontWeight: '600' },
  badgeQualite:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeQualiteText:    { fontSize: 10, fontWeight: '600' },
  infoLine:            { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText:            { marginLeft: 5, fontSize: 11, color: '#64748b', flex: 1 },
});

const mStyles = StyleSheet.create({
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container:          { width: '90%', backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 10 },
  btnClose:           { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  image:              { width: '100%', height: 320, backgroundColor: '#f1f5f9' },
  infoBox:            { padding: 20 },
  titre:              { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  meta:               { fontSize: 13, color: '#64748b', marginBottom: 16 },
  btnVoirDossier:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnVoirDossierText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});

export default PhotosAttente;