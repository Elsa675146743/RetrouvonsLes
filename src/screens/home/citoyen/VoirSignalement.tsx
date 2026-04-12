import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator, Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

export default function VoirSignalement({ navigation, route }: any) {
  const signalementId = route?.params?.signalementId || null;
  const [signalement, setSignalement] = useState<any>(null);
  const [photos, setPhotos]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  const fetchSignalement = useCallback(async () => {
    if (!signalementId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('signalement')
        .select(`
          id, numero_signalement, description,
          lieu_observation, ville_observation, region_observation,
          pays_observation, latitude_observation, longitude_observation,
          date_observation, statut_validation,
          niveau_certitude, direction_deplacement,
          source_signalement, created_at, updated_at,
          dossier:id_dossier ( numero_dossier, personne:id_personne ( nom_complet ) )
        `)
        .eq('id', signalementId)
        .single();
      if (error) throw error;
      setSignalement(data);

      // Photos
      const { data: photosData } = await supabase
        .from('photo')
        .select('id, url_cloudinary, url_thumbnail, type_photo')
        .eq('id_signalement', signalementId);
      setPhotos(photosData || []);
    } catch (err) {
      console.error('Erreur signalement:', err);
    } finally {
      setLoading(false);
    }
  }, [signalementId]);

  useEffect(() => { fetchSignalement(); }, [fetchSignalement]);

  const getStatutStyle = (s: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      en_attente:      { bg: '#fee2e2', text: '#991b1b', label: 'Rejeté'         },
      en_verification: { bg: '#fef3c7', text: '#92400e', label: 'En vérification' },
      valide:          { bg: '#f0fdf4', text: '#166534', label: 'Validé'          },
      invalide:        { bg: '#fee2e2', text: '#991b1b', label: 'Invalide'        },
    };
    return map[s] || { bg: '#f1f5f9', text: '#64748b', label: s?.toUpperCase() || '—' };
  };

  if (!signalementId || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingFull}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      </SafeAreaView>
    );
  }

  const ss = getStatutStyle(signalement?.statut_validation || '');
  const numCourt = '#' + (signalement?.numero_signalement || signalement?.id || '').toString().slice(-8);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.btnRetourText}>Retour</Text>
        </TouchableOpacity>
        <View style={[styles.statutBadge, { backgroundColor: ss.bg }]}>
          <Ionicons name="close-circle-outline" size={14} color={ss.text} />
          <Text style={[styles.statutBadgeText, { color: ss.text }]}>{ss.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TITRE */}
        <Text style={styles.titre}>Signalement {numCourt}</Text>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={13} color="#94a3b8" />
          <Text style={styles.dateText}>
            createdAt: {signalement?.created_at
              ? new Date(signalement.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })
              : '—'}
          </Text>
        </View>

        {/* LOCALISATION + DATE */}
        <View style={styles.grid}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="location-outline" size={16} color="#1d4ed8" />
              <Text style={styles.infoCardTitle}>location</Text>
            </View>
            <InfoRow label="location" value={signalement?.lieu_observation || '—'} />
            <InfoRow label="Ville"    value={signalement?.ville_observation || '—'} />
            <InfoRow label="Région"   value={signalement?.region_observation || '—'} />
            <InfoRow label="country"  value={signalement?.pays_observation || 'Cameroun'} />
            {signalement?.latitude_observation && signalement?.longitude_observation && (
              <Text style={styles.gps}>
                GPS: {parseFloat(signalement.latitude_observation).toFixed(5)}, {parseFloat(signalement.longitude_observation).toFixed(5)}
              </Text>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="calendar-outline" size={16} color="#1d4ed8" />
              <Text style={styles.infoCardTitle}>Date d'observation</Text>
            </View>
            <Text style={styles.dateObservation}>
              {signalement?.date_observation
                ? new Date(signalement.date_observation).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })
                : '—'}
            </Text>
            {signalement?.niveau_certitude && (
              <View style={styles.certitudeRow}>
                <Text style={styles.certitudeLabel}>Niveau de certitude: </Text>
                <Text style={styles.certitudeValue}>
                  {signalement.niveau_certitude.charAt(0).toUpperCase() + signalement.niveau_certitude.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>description</Text>
          <Text style={styles.sectionValue}>
            {signalement?.description || 'Aucune description'}
          </Text>
        </View>

        {/* DIRECTION */}
        {signalement?.direction_deplacement && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>direction</Text>
            <Text style={styles.sectionValue}>{signalement.direction_deplacement}</Text>
          </View>
        )}

        {/* PHOTOS */}
        <View style={styles.sectionCard}>
          <View style={styles.photosHeader}>
            <Ionicons name="images-outline" size={16} color="#1d4ed8" />
            <Text style={styles.sectionLabel}>photos ({photos.length})</Text>
          </View>
          {photos.length === 0 ? (
            <Text style={styles.noPhotos}>Aucune photo</Text>
          ) : (
            <View style={styles.photosGrid}>
              {photos.map((p, i) => (
                <Image
                  key={i}
                  source={{ uri: p.url_thumbnail || p.url_cloudinary }}
                  style={styles.photoThumb}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </View>

        {/* MÉTADONNÉES */}
        <View style={styles.sectionCard}>
          {signalement?.source_signalement && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>source: </Text>
              <Text style={styles.metaValue}>{signalement.source_signalement}</Text>
            </View>
          )}
          {signalement?.updated_at && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>updatedAt: </Text>
              <Text style={styles.metaValue}>
                {new Date(signalement.updated_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </Text>
            </View>
          )}
          {signalement?.dossier && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Dossier: </Text>
              <Text style={styles.metaValue}>{signalement.dossier.numero_dossier}</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}: </Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  loadingFull:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  btnRetour:          { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnRetourText:      { fontSize: 13, color: '#64748b', fontWeight: '600' },
  statutBadge:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statutBadgeText:    { fontSize: 12, fontWeight: 'bold' },
  scrollContent:      { padding: 16, paddingBottom: 30 },
  titre:              { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  dateRow:            { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  dateText:           { fontSize: 12, color: '#94a3b8' },
  grid:               { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoCard:           { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  infoCardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoCardTitle:      { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  infoRow:            { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  infoLabel:          { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  infoValue:          { fontSize: 12, color: '#475569', flex: 1 },
  gps:                { fontSize: 10, color: '#94a3b8', marginTop: 6 },
  dateObservation:    { fontSize: 13, color: '#1e293b', fontWeight: '600', marginBottom: 8 },
  certitudeRow:       { flexDirection: 'row', flexWrap: 'wrap' },
  certitudeLabel:     { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  certitudeValue:     { fontSize: 12, color: '#475569' },
  sectionCard:        { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  sectionLabel:       { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  sectionValue:       { fontSize: 13, color: '#64748b', lineHeight: 18 },
  photosHeader:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  noPhotos:           { fontSize: 12, color: '#94a3b8' },
  photosGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb:         { width: 100, height: 100, borderRadius: 8, backgroundColor: '#f1f5f9' },
  metaRow:            { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  metaLabel:          { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  metaValue:          { fontSize: 12, color: '#64748b', flex: 1 },
});