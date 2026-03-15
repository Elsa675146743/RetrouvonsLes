import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, Dimensions, StatusBar, Image,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

// =====================================================
// ONGLET INFORMATIONS
// =====================================================
const TabInformations = ({
  dossier,
  showMap = false,
}: {
  dossier: any;
  showMap?: boolean;
}) => {
  const [nbSignalements, setNbSignalements]   = useState<number>(0);
  const [nbLocalisations, setNbLocalisations] = useState<number>(0);
  const [loadingStats, setLoadingStats]       = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!dossier?.id) return;
      try {
        const { count: countSig } = await supabase
          .from('signalement')
          .select('*', { count: 'exact', head: true })
          .eq('id_dossier', dossier.id);

        const { count: countLoc } = await supabase
          .from('localisation')
          .select('*', { count: 'exact', head: true })
          .eq('id_dossier', dossier.id);

        setNbSignalements(countSig || 0);
        setNbLocalisations(countLoc || 0);
      } catch (err) {
        console.error('Erreur stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [dossier?.id]);

  if (!dossier) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  // ✅ Carte visible SEULEMENT si :
  // 1. On vient de PhotosAttente (showMap = true)
  // 2. ET les coordonnées GPS existent dans le dossier
  const hasCoords =
    showMap &&
    dossier.latitude_disparition  != null &&
    dossier.longitude_disparition != null;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
        <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet" />
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = new maplibregl.Map({
            container: 'map',
            style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
            center: [${dossier.longitude_disparition}, ${dossier.latitude_disparition}],
            zoom: 13
          });
          new maplibregl.Marker({ color: '#ef4444' })
            .setLngLat([${dossier.longitude_disparition}, ${dossier.latitude_disparition}])
            .setPopup(
              new maplibregl.Popup({ offset: 25 })
                .setText('${(dossier.lieu_disparition || 'Lieu de disparition').replace(/'/g, "\\'")}')
            )
            .addTo(map);
        </script>
      </body>
    </html>
  `;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>

      {/* 3 CARTES HORIZONTALES */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
      >
        {/* CARTE 1 — DISPARITION */}
        <View style={iStyles.card}>
          <View style={iStyles.cardHeader}>
            <View style={iStyles.cardIconBox}>
              <Ionicons name="calendar-outline" size={16} color="#2563eb" />
            </View>
            <Text style={iStyles.cardTitle}>Informations de Disparition</Text>
          </View>
          <View style={iStyles.divider} />

          <Text style={iStyles.fieldLabel}>DATE DISPARITION:</Text>
          <Text style={iStyles.fieldValue}>
            {dossier.date_disparition
              ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR')
              : '—'}
          </Text>

          <Text style={iStyles.fieldLabel}>LIEU DISPARITION:</Text>
          <Text style={iStyles.fieldValue}>
            {dossier.lieu_disparition || dossier.ville_disparition || '—'}
          </Text>

          {dossier.region_disparition && (
            <>
              <Text style={iStyles.fieldLabel}>RÉGION:</Text>
              <Text style={iStyles.fieldValue}>{dossier.region_disparition}</Text>
            </>
          )}

          <Text style={iStyles.fieldLabel}>TYPE:</Text>
          <Text style={iStyles.fieldValue}>
            {dossier.type_disparition?.replace(/_/g, ' ') || '—'}
          </Text>

          <Text style={iStyles.fieldLabel}>URGENCE:</Text>
          <Text style={[iStyles.fieldValue, {
            color:
              dossier.niveau_urgence === 'critique' ? '#991b1b' :
              dossier.niveau_urgence === 'urgent'   ? '#92400e' :
              dossier.niveau_urgence === 'normal'   ? '#166534' : '#64748b',
            fontWeight: '700',
          }]}>
            {dossier.niveau_urgence
              ? dossier.niveau_urgence.charAt(0).toUpperCase() + dossier.niveau_urgence.slice(1)
              : '—'}
          </Text>

          <Text style={iStyles.fieldLabel}>CIRCONSTANCES:</Text>
          <Text style={[iStyles.fieldValue, { lineHeight: 18 }]}>
            {dossier.circonstances || '—'}
          </Text>
        </View>

        {/* CARTE 2 — CONTACTS */}
        <View style={iStyles.card}>
          <View style={iStyles.cardHeader}>
            <View style={iStyles.cardIconBox}>
              <Ionicons name="call-outline" size={16} color="#2563eb" />
            </View>
            <Text style={iStyles.cardTitle}>Contacts</Text>
          </View>
          <View style={iStyles.divider} />

          <Text style={iStyles.fieldLabel}>CONTACT FAMILLE:</Text>
          <Text style={iStyles.fieldValue}>
            {dossier.contact_famille_principale || '—'}
          </Text>

          {dossier.telephone_contact && (
            <>
              <View style={iStyles.iconLabelRow}>
                <Ionicons name="call-outline" size={11} color="#64748b" />
                <Text style={[iStyles.fieldLabel, { marginTop: 0, marginLeft: 4 }]}>TÉLÉPHONE:</Text>
              </View>
              <Text style={iStyles.fieldValue}>{dossier.telephone_contact}</Text>
            </>
          )}

          {dossier.email_contact && (
            <>
              <View style={iStyles.iconLabelRow}>
                <Ionicons name="mail-outline" size={11} color="#64748b" />
                <Text style={[iStyles.fieldLabel, { marginTop: 0, marginLeft: 4 }]}>EMAIL:</Text>
              </View>
              <Text style={iStyles.fieldValue}>{dossier.email_contact}</Text>
            </>
          )}

          {dossier.personne && (
            <>
              <View style={[iStyles.divider, { marginTop: 14 }]} />
              <Text style={[iStyles.cardTitle, { marginTop: 10, marginBottom: 8 }]}>
                Personne concernée
              </Text>
              <Text style={iStyles.fieldLabel}>NOM COMPLET:</Text>
              <Text style={iStyles.fieldValue}>
                {`${dossier.personne.prenom || ''} ${dossier.personne.nom || ''}`.trim() || '—'}
              </Text>
              <Text style={iStyles.fieldLabel}>SEXE:</Text>
              <Text style={iStyles.fieldValue}>{dossier.personne.sexe || '—'}</Text>
              {dossier.personne.age_estime_min && (
                <>
                  <Text style={iStyles.fieldLabel}>ÂGE ESTIMÉ:</Text>
                  <Text style={iStyles.fieldValue}>
                    {`${dossier.personne.age_estime_min} - ${dossier.personne.age_estime_max || '?'} ans`}
                  </Text>
                </>
              )}
              <Text style={iStyles.fieldLabel}>NATIONALITÉ:</Text>
              <Text style={iStyles.fieldValue}>{dossier.personne.nationalite || '—'}</Text>
            </>
          )}
        </View>

        {/* CARTE 3 — STATISTIQUES */}
        <View style={iStyles.card}>
          <View style={iStyles.cardHeader}>
            <View style={iStyles.cardIconBox}>
              <Ionicons name="bar-chart-outline" size={16} color="#2563eb" />
            </View>
            <Text style={iStyles.cardTitle}>Statistiques</Text>
          </View>
          <View style={iStyles.divider} />

          <View style={iStyles.statsRow}>
            <View style={iStyles.statBox}>
              <Ionicons name="alert-circle-outline" size={22} color="#2563eb" />
              <Text style={iStyles.statLabel}>SIGNALEMENTS</Text>
              {loadingStats ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={iStyles.statNumber}>{nbSignalements}</Text>
              )}
            </View>
            <View style={iStyles.statBox}>
              <Ionicons name="location-outline" size={22} color="#2563eb" />
              <Text style={iStyles.statLabel}>LOCALISATIONS</Text>
              {loadingStats ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={iStyles.statNumber}>{nbLocalisations}</Text>
              )}
            </View>
          </View>

          <View style={[iStyles.divider, { marginTop: 16 }]} />
          <Text style={[iStyles.fieldLabel, { marginTop: 10 }]}>STATUT DOSSIER:</Text>
          <View style={[iStyles.statutBadge, {
            backgroundColor:
              dossier.statut_dossier === 'en_cours'        ? '#fef3c7' :
              dossier.statut_dossier === 'retrouve_vivant' ? '#f0fdf4' :
              dossier.statut_dossier === 'retrouve_decede' ? '#fee2e2' : '#f1f5f9'
          }]}>
            <Text style={[iStyles.statutText, {
              color:
                dossier.statut_dossier === 'en_cours'        ? '#92400e' :
                dossier.statut_dossier === 'retrouve_vivant' ? '#166534' :
                dossier.statut_dossier === 'retrouve_decede' ? '#991b1b' : '#64748b'
            }]}>
              {dossier.statut_dossier?.replace(/_/g, ' ') || 'en cours'}
            </Text>
          </View>

          <Text style={[iStyles.fieldLabel, { marginTop: 14 }]}>CRÉÉ LE:</Text>
          <Text style={iStyles.fieldValue}>
            {dossier.created_at
              ? new Date(dossier.created_at).toLocaleDateString('fr-FR')
              : '—'}
          </Text>

          <Text style={[iStyles.fieldLabel, { marginTop: 10 }]}>VUES:</Text>
          <Text style={iStyles.fieldValue}>{dossier.nombre_vues_fiche || 0}</Text>
        </View>
      </ScrollView>

      {/* ✅ CARTE LOCALISATION
          - Visible SEULEMENT si showMap=true (vient de PhotosAttente)
          - ET coordonnées GPS présentes dans le dossier */}
      {hasCoords && (
        <View style={iStyles.mapSection}>
          <View style={iStyles.mapHeader}>
            <Ionicons name="location-outline" size={18} color="#2563eb" />
            <Text style={iStyles.mapTitle}>Localisation sur la carte</Text>
          </View>
          <View style={iStyles.mapContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              style={{ flex: 1 }}
              javaScriptEnabled
              scrollEnabled={false}
            />
          </View>
        </View>
      )}

    </ScrollView>
  );
};

// =====================================================
// ONGLET PHOTOS
// =====================================================
const TabPhotos = ({ dossier }: { dossier: any }) => {
  const [photos, setPhotos]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!dossier) return;
      try {
        setLoading(true);
        const listePhotos: any[] = [];

        if (dossier.personne?.photo_principale) {
          listePhotos.push({
            id:             'principal',
            url_cloudinary: dossier.personne.photo_principale,
            type_photo:     'portrait',
            titre:          `${dossier.personne.prenom} ${dossier.personne.nom}`,
            est_principale: true,
          });
        }

        const { data: photosDB } = await supabase
          .from('photo')
          .select('*')
          .eq('id_personne', dossier.personne?.id)
          .eq('visible_public', true);

        if (photosDB && photosDB.length > 0) {
          const autresPhotos = photosDB.filter(
            p => p.url_cloudinary !== dossier.personne?.photo_principale
          );
          listePhotos.push(...autresPhotos);
        }
        setPhotos(listePhotos);
      } catch (err) {
        console.error('Erreur photos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, [dossier?.id]);

  if (loading) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  if (photos.length === 0) return (
    <View style={styles.emptyContainer}>
      <Ionicons name="image-outline" size={50} color="#cbd5e1" />
      <Text style={styles.emptyText}>Aucune photo</Text>
      <Text style={styles.emptySubText}>Aucune photo n'a été ajoutée pour ce dossier</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={styles.tabCard}>
        <View style={styles.tabCardHeader}>
          <Ionicons name="image-outline" size={18} color="#2563eb" />
          <Text style={styles.tabCardTitle}>Photos du dossier ({photos.length})</Text>
        </View>
        <View style={styles.photosGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoWrapper}>
              <Image source={{ uri: photo.url_cloudinary }} style={styles.photoItem} resizeMode="cover" />
              {photo.est_principale && (
                <View style={styles.photoBadge}>
                  <Text style={styles.photoBadgeText}>Principal</Text>
                </View>
              )}
              {photo.type_photo && (
                <Text style={styles.photoType}>{photo.type_photo.replace(/_/g, ' ')}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

// =====================================================
// ONGLET SIGNALEMENTS
// =====================================================
const TabSignalements = ({ dossier }: { dossier: any }) => {
  const [signalements, setSignalements] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchSignalements = useCallback(async () => {
    if (!dossier?.id) return;
    try {
      const { data, error } = await supabase
        .from('signalement')
        .select(`
          id, numero_signalement, description,
          date_observation, lieu_observation, ville_observation,
          niveau_certitude, statut_validation, created_at,
          utilisateur:id_utilisateur ( nom, prenom )
        `)
        .eq('id_dossier', dossier.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignalements(data || []);
    } catch (err) {
      console.error('Erreur signalements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dossier?.id]);

  useEffect(() => { fetchSignalements(); }, [fetchSignalements]);

  const getStatutStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      valide:          { bg: '#f0fdf4', text: '#166534' },
      en_attente:      { bg: '#fef3c7', text: '#92400e' },
      invalide:        { bg: '#fee2e2', text: '#991b1b' },
      en_verification: { bg: '#eff6ff', text: '#1e40af' },
    };
    return map[statut] || { bg: '#f1f5f9', text: '#64748b' };
  };

  const getCertitudeColor = (certitude: string) => {
    const map: Record<string, string> = {
      certain: '#10b981', tres_probable: '#2563eb',
      probable: '#f59e0b', incertain: '#94a3b8',
    };
    return map[certitude] || '#94a3b8';
  };

  if (loading) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  if (signalements.length === 0) return (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={50} color="#cbd5e1" />
      <Text style={styles.emptyText}>Aucun signalement</Text>
      <Text style={styles.emptySubText}>Les signalements des citoyens apparaîtront ici</Text>
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchSignalements(); }} />
      }
    >
      <View style={styles.tabCard}>
        <View style={styles.tabCardHeader}>
          <Ionicons name="alert-circle-outline" size={18} color="#2563eb" />
          <Text style={styles.tabCardTitle}>Signalements Liés ({signalements.length})</Text>
        </View>
        {signalements.map((item, index) => {
          const statutStyle    = getStatutStyle(item.statut_validation);
          const certitudeColor = getCertitudeColor(item.niveau_certitude);
          return (
            <View key={item.id}
              style={[styles.itemCard, index < signalements.length - 1 && styles.itemCardBorder]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumero}>
                  {item.numero_signalement || `SIG-${item.id.slice(-6).toUpperCase()}`}
                </Text>
                <View style={[styles.itemBadge, { backgroundColor: statutStyle.bg }]}>
                  <Text style={[styles.itemBadgeText, { color: statutStyle.text }]}>
                    {item.statut_validation?.replace(/_/g, ' ') || 'en attente'}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemDesc} numberOfLines={3}>{item.description}</Text>
              <View style={styles.itemInfoRow}>
                <Ionicons name="location-outline" size={12} color="#64748b" />
                <Text style={styles.itemInfoText}>
                  {item.ville_observation || item.lieu_observation || '—'}
                </Text>
              </View>
              <View style={styles.itemInfoRow}>
                <Ionicons name="calendar-outline" size={12} color="#64748b" />
                <Text style={styles.itemInfoText}>
                  {new Date(item.date_observation).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View style={styles.itemInfoRow}>
                <View style={[styles.dot, { backgroundColor: certitudeColor }]} />
                <Text style={styles.itemInfoText}>
                  Certitude : {item.niveau_certitude?.replace(/_/g, ' ') || '—'}
                </Text>
              </View>
              {item.utilisateur && (
                <Text style={styles.itemAuteur}>
                  👤 {item.utilisateur.prenom} {item.utilisateur.nom}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// =====================================================
// ONGLET LOCALISATIONS
// =====================================================
const TabLocalisations = ({ dossier }: { dossier: any }) => {
  const [localisations, setLocalisations] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchLocalisations = useCallback(async () => {
    if (!dossier?.id) return;
    try {
      const { data, error } = await supabase
        .from('localisation')
        .select(`
          id, latitude, longitude, adresse, ville, region,
          type_localisation, source_localisation,
          fiabilite_source, date_localisation, description, created_at
        `)
        .eq('id_dossier', dossier.id)
        .order('date_localisation', { ascending: false });

      if (error) throw error;
      setLocalisations(data || []);
    } catch (err) {
      console.error('Erreur localisations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dossier?.id]);

  useEffect(() => { fetchLocalisations(); }, [fetchLocalisations]);

  const getTypeIcon = (type: string) => {
    const map: Record<string, string> = {
      disparition: 'warning-outline', derniere_observation: 'eye-outline',
      signalement: 'alert-circle-outline', decouverte: 'search-outline',
      prediction: 'analytics-outline',
    };
    return map[type] || 'location-outline';
  };

  const getFiabiliteColor = (f: string) =>
    ({ haute: '#10b981', moyenne: '#f59e0b', faible: '#ef4444' }[f] || '#94a3b8');

  if (loading) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  if (localisations.length === 0) return (
    <View style={styles.emptyContainer}>
      <Ionicons name="location-outline" size={50} color="#cbd5e1" />
      <Text style={styles.emptyText}>Aucune localisation</Text>
      <Text style={styles.emptySubText}>Les localisations des signalements apparaîtront ici</Text>
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchLocalisations(); }} />
      }
    >
      <View style={styles.tabCard}>
        <View style={styles.tabCardHeader}>
          <Ionicons name="location-outline" size={18} color="#2563eb" />
          <Text style={styles.tabCardTitle}>
            Localisations Enregistrées ({localisations.length})
          </Text>
        </View>
        {localisations.map((item, index) => {
          const fiabiliteColor = getFiabiliteColor(item.fiabilite_source);
          return (
            <View key={item.id}
              style={[styles.itemCard, index < localisations.length - 1 && styles.itemCardBorder]}>
              <View style={styles.itemHeader}>
                <View style={styles.locIconBox}>
                  <Ionicons name={getTypeIcon(item.type_localisation)} size={16} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNumero}>
                    {item.type_localisation?.replace(/_/g, ' ') || 'localisation'}
                  </Text>
                  <Text style={styles.itemDate}>
                    {new Date(item.date_localisation).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={[styles.fiabiliteBadge, { backgroundColor: fiabiliteColor + '20' }]}>
                  <View style={[styles.dot, { backgroundColor: fiabiliteColor }]} />
                  <Text style={[styles.fiabiliteText, { color: fiabiliteColor }]}>
                    {item.fiabilite_source || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.itemInfoRow}>
                <Ionicons name="pin-outline" size={12} color="#64748b" />
                <Text style={styles.itemInfoText}>
                  {item.adresse || item.ville || '—'}{item.region ? `, ${item.region}` : ''}
                </Text>
              </View>
              <View style={styles.itemInfoRow}>
                <Ionicons name="navigate-outline" size={12} color="#2563eb" />
                <Text style={[styles.itemInfoText, { color: '#2563eb' }]}>
                  {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
                </Text>
              </View>
              <View style={styles.itemInfoRow}>
                <Ionicons name="information-circle-outline" size={12} color="#64748b" />
                <Text style={styles.itemInfoText}>
                  Source : {item.source_localisation?.replace(/_/g, ' ') || '—'}
                </Text>
              </View>
              {item.description && (
                <Text style={styles.itemAuteur}>{item.description}</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// =====================================================
// ONGLET FILIATION
// =====================================================
const TabFiliation = ({ dossier }: { dossier: any }) => {
  const [liens, setLiens]                           = useState<any[]>([]);
  const [personnes, setPersonnes]                   = useState<any[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [showForm, setShowForm]                     = useState(false);
  const [showModalNouveauMembre, setShowModalNouveauMembre] = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [savingMembre, setSavingMembre]             = useState(false);
  const [typeLien, setTypeLien]                     = useState('pere_biologique');
  const [personnelieeId, setPersonneLieeId]         = useState('');
  const [precisions, setPrecisions]                 = useState('');
  const [commentaire, setCommentaire]               = useState('');
  const [nvPrenom, setNvPrenom]                     = useState('');
  const [nvNom, setNvNom]                           = useState('');
  const [nvSexe, setNvSexe]                         = useState('non_precise');
  const [showTypeLienPicker, setShowTypeLienPicker] = useState(false);
  const [showPersonnePicker, setShowPersonnePicker] = useState(false);
  const [showSexePicker, setShowSexePicker]         = useState(false);

  const typesLien = [
    { titre: 'Parent', items: [
      { label: 'Père biologique',  value: 'pere_biologique' },
      { label: 'Mère biologique',  value: 'mere_biologique' },
      { label: 'Père adoptif',     value: 'pere_adoptif' },
      { label: 'Mère adoptive',    value: 'mere_adoptive' },
    ]},
    { titre: 'Enfant', items: [
      { label: 'Enfant biologique', value: 'enfant_biologique' },
      { label: 'Enfant adoptif',    value: 'enfant_adoptif' },
    ]},
    { titre: 'Fratrie', items: [
      { label: 'Frère biologique', value: 'frere_biologique' },
      { label: 'Sœur biologique',  value: 'soeur_biologique' },
      { label: 'Demi-frère',       value: 'demi_frere' },
      { label: 'Demi-sœur',        value: 'demi_soeur' },
    ]},
    { titre: 'Autre', items: [
      { label: 'Époux / Épouse',   value: 'conjoint' },
      { label: 'Oncle / Tante',    value: 'oncle_paternel' },
      { label: 'Cousin / Cousine', value: 'cousin_germain' },
      { label: 'Neveu / Nièce',    value: 'neveu' },
      { label: 'Autre',            value: 'autre' },
    ]},
  ];

  const sexeOptions = [
    { label: 'Non précisé', value: 'non_precise' },
    { label: 'Masculin',    value: 'masculin' },
    { label: 'Féminin',     value: 'feminin' },
  ];

  const getLabelTypeLien = (val: string) => {
    for (const groupe of typesLien) {
      const found = groupe.items.find(i => i.value === val);
      if (found) return found.label;
    }
    return val;
  };

  const getLabelPersonne = (id: string) => {
    const p = personnes.find(p => p.id === id);
    return p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : '-- Sélectionner --';
  };

  const fetchData = useCallback(async () => {
    if (!dossier?.personne?.id) return;
    try {
      setLoading(true);
      const { data: liensData } = await supabase
        .from('lien_filiation')
        .select(`
          id, type_lien, precision_lien, nature_filiation,
          statut_verification, type_preuve, commentaire, created_at,
          personne_cible:id_personne_cible ( id, nom, prenom, sexe )
        `)
        .eq('id_personne_source', dossier.personne.id)
        .order('created_at', { ascending: false });

      setLiens(liensData || []);

      const { data: personnesData } = await supabase
        .from('personne')
        .select('id, nom, prenom, sexe')
        .neq('id', dossier.personne.id)
        .order('nom');

      setPersonnes(personnesData || []);
    } catch (err) {
      console.error('Erreur filiation:', err);
    } finally {
      setLoading(false);
    }
  }, [dossier?.personne?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setTypeLien('pere_biologique');
    setPersonneLieeId('');
    setPrecisions('');
    setCommentaire('');
    setShowForm(false);
    setShowTypeLienPicker(false);
    setShowPersonnePicker(false);
  };

  const handleCreerMembre = async () => {
    if (!nvPrenom.trim() || !nvNom.trim()) {
      Alert.alert('Erreur', 'Le prénom et le nom sont obligatoires.');
      return;
    }
    setSavingMembre(true);
    try {
      const { data, error } = await supabase
        .from('personne')
        .insert([{
          prenom: nvPrenom.trim(), nom: nvNom.trim(),
          nom_complet: `${nvPrenom.trim()} ${nvNom.trim()}`,
          sexe: nvSexe, statut_identite: 'partiellement_identifie',
        }])
        .select().single();

      if (error) throw error;
      setPersonnes(prev => [data, ...prev]);
      setPersonneLieeId(data.id);
      setShowModalNouveauMembre(false);
      setNvPrenom(''); setNvNom(''); setNvSexe('non_precise'); setShowSexePicker(false);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de créer le membre.');
    } finally {
      setSavingMembre(false);
    }
  };

  const handleEnregistrer = async () => {
    if (!personnelieeId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une personne liée.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lien_filiation')
        .insert([{
          id_personne_source: dossier.personne.id,
          id_personne_cible:  personnelieeId,
          type_lien:          typeLien,
          precision_lien:     precisions.trim() || null,
          commentaire:        commentaire.trim() || null,
          nature_filiation:   'biologique',
          statut_verification:'declare_famille',
          type_preuve:        'temoignages',
        }])
        .select(`
          id, type_lien, precision_lien, nature_filiation,
          statut_verification, type_preuve, commentaire, created_at,
          personne_cible:id_personne_cible ( id, nom, prenom, sexe )
        `)
        .single();

      if (error) throw error;
      setLiens(prev => [data, ...prev]);
      resetForm();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'enregistrer le lien.');
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = (lienId: string) => {
    Alert.alert('Confirmer la suppression', 'Voulez-vous vraiment supprimer ce lien ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('lien_filiation').delete().eq('id', lienId);
              setLiens(prev => prev.filter(l => l.id !== lienId));
            } catch { Alert.alert('Erreur', 'Impossible de supprimer ce lien.'); }
          }
        }
      ]
    );
  };

  const getStatutVerifStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string; icon: string }> = {
      confirme_officiellement: { bg: '#f0fdf4', text: '#166534', icon: '✅' },
      confirme_genetiquement:  { bg: '#f0fdf4', text: '#166534', icon: '🧬' },
      declare_famille:         { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
      en_verification:         { bg: '#eff6ff', text: '#1e40af', icon: '🔍' },
      conteste:                { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
    };
    return map[statut] || { bg: '#f1f5f9', text: '#64748b', icon: '❓' };
  };

  if (loading) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={fStyles.card}>
        <View style={fStyles.cardHeader}>
          <View style={fStyles.cardHeaderLeft}>
            <Ionicons name="people-outline" size={18} color="#2563eb" />
            <Text style={fStyles.cardTitle}>Liens de Filiation</Text>
          </View>
          <TouchableOpacity style={fStyles.btnAjouter} onPress={() => setShowForm(!showForm)}>
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={fStyles.btnAjouterText}>Ajouter un lien</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={fStyles.formContainer}>
            <Text style={fStyles.formTitle}>Nouveau lien de filiation</Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={fStyles.fieldLabel}>Type de lien *</Text>
              <TouchableOpacity style={fStyles.pickerBtn}
                onPress={() => { setShowTypeLienPicker(!showTypeLienPicker); setShowPersonnePicker(false); }}>
                <Text style={fStyles.pickerBtnText} numberOfLines={1}>{getLabelTypeLien(typeLien)}</Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
              {showTypeLienPicker && (
                <View style={fStyles.dropdownContainer}>
                  <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                    {typesLien.map((groupe) => (
                      <View key={groupe.titre}>
                        <Text style={fStyles.dropdownGroupTitle}>{groupe.titre}</Text>
                        {groupe.items.map((item) => (
                          <TouchableOpacity key={item.value}
                            style={[fStyles.dropdownItem, typeLien === item.value && fStyles.dropdownItemActive]}
                            onPress={() => { setTypeLien(item.value); setShowTypeLienPicker(false); }}>
                            <Text style={[fStyles.dropdownItemText, typeLien === item.value && fStyles.dropdownItemTextActive]}>
                              {item.label}
                            </Text>
                            {typeLien === item.value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={fStyles.fieldLabel}>Personne liée *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[fStyles.pickerBtn, { flex: 1, marginRight: 8 }]}
                  onPress={() => { setShowPersonnePicker(!showPersonnePicker); setShowTypeLienPicker(false); }}>
                  <Text style={[fStyles.pickerBtnText, !personnelieeId && { color: '#94a3b8' }]} numberOfLines={1}>
                    {personnelieeId ? getLabelPersonne(personnelieeId) : '-- Sélectionner --'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={fStyles.btnNouveau} onPress={() => setShowModalNouveauMembre(true)}>
                  <Ionicons name="add" size={14} color="#FFF" />
                  <Text style={fStyles.btnNouveauText}>Nouveau</Text>
                </TouchableOpacity>
              </View>
              <Text style={fStyles.fieldHint}>Sélectionnez une personne existante ou créez-en une nouvelle</Text>
              {showPersonnePicker && (
                <View style={fStyles.dropdownContainer}>
                  <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                    {personnes.length === 0 ? (
                      <Text style={fStyles.dropdownEmpty}>Aucune personne disponible</Text>
                    ) : (
                      personnes.map((p) => (
                        <TouchableOpacity key={p.id}
                          style={[fStyles.dropdownItem, personnelieeId === p.id && fStyles.dropdownItemActive]}
                          onPress={() => { setPersonneLieeId(p.id); setShowPersonnePicker(false); }}>
                          <View style={fStyles.personneItemRow}>
                            <View style={fStyles.personneAvatar}>
                              <Text style={fStyles.personneAvatarText}>{(p.prenom?.[0] || '?').toUpperCase()}</Text>
                            </View>
                            <View>
                              <Text style={[fStyles.dropdownItemText, personnelieeId === p.id && fStyles.dropdownItemTextActive]}>
                                {p.prenom} {p.nom}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{p.sexe || '—'}</Text>
                            </View>
                          </View>
                          {personnelieeId === p.id && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={[fStyles.fieldLabel, { marginTop: 8 }]}>Précisions sur le lien</Text>
            <TextInput style={fStyles.input} placeholder="Ex: côté maternel, décédé, etc."
              placeholderTextColor="#94a3b8" value={precisions} onChangeText={setPrecisions} />

            <Text style={[fStyles.fieldLabel, { marginTop: 12 }]}>Commentaire</Text>
            <TextInput style={fStyles.textArea} placeholder="Notes supplémentaires..."
              placeholderTextColor="#94a3b8" multiline value={commentaire} onChangeText={setCommentaire} />

            <View style={fStyles.formActions}>
              <TouchableOpacity style={fStyles.btnAnnuler} onPress={resetForm} disabled={saving}>
                <Text style={fStyles.btnAnnulerText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[fStyles.btnEnregistrer, saving && { opacity: 0.7 }]}
                onPress={handleEnregistrer} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <><Ionicons name="save-outline" size={16} color="#FFF" />
                    <Text style={fStyles.btnEnregistrerText}>Enregistrer</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showForm && <View style={fStyles.divider} />}

        {liens.length === 0 ? (
          <View style={fStyles.emptyContainer}>
            <Ionicons name="people-outline" size={45} color="#cbd5e1" />
            <Text style={fStyles.emptyText}>Aucun lien de filiation enregistré</Text>
            <Text style={fStyles.emptySubText}>Cliquez sur "Ajouter un lien" pour créer un lien familial</Text>
          </View>
        ) : (
          liens.map((lien) => {
            const statutStyle = getStatutVerifStyle(lien.statut_verification);
            const nomPersonne = lien.personne_cible
              ? `${lien.personne_cible.prenom || ''} ${lien.personne_cible.nom || ''}`.trim()
              : 'Personne inconnue';
            return (
              <View key={lien.id} style={fStyles.lienCard}>
                <View style={fStyles.lienHeader}>
                  <View style={fStyles.lienTypeBadge}>
                    <Text style={fStyles.lienTypeBadgeText}>{getLabelTypeLien(lien.type_lien)}</Text>
                  </View>
                  <TouchableOpacity style={fStyles.btnDelete} onPress={() => handleSupprimer(lien.id)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={fStyles.lienPersonneRow}>
                  <Ionicons name="person-outline" size={16} color="#64748b" />
                  <Text style={fStyles.lienPersonneNom}>{nomPersonne}</Text>
                </View>
                <View style={fStyles.lienInfoGrid}>
                  <View style={fStyles.lienInfoItem}>
                    <Text style={fStyles.lienInfoLabel}>Nature</Text>
                    <Text style={fStyles.lienInfoValue}>{lien.nature_filiation?.replace(/_/g, ' ') || '—'}</Text>
                  </View>
                  <View style={fStyles.lienInfoItem}>
                    <Text style={fStyles.lienInfoLabel}>Statut vérification</Text>
                    <View style={[fStyles.statutBadge, { backgroundColor: statutStyle.bg }]}>
                      <Text style={{ marginRight: 4 }}>{statutStyle.icon}</Text>
                      <Text style={[fStyles.statutText, { color: statutStyle.text }]}>
                        {lien.statut_verification?.replace(/_/g, ' ') || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={fStyles.lienInfoItem}>
                    <Text style={fStyles.lienInfoLabel}>Type de preuve</Text>
                    <Text style={fStyles.lienInfoValue}>{lien.type_preuve?.replace(/_/g, ' ') || '—'}</Text>
                  </View>
                  <View style={fStyles.lienInfoItem}>
                    <Text style={fStyles.lienInfoLabel}>Créé le</Text>
                    <Text style={fStyles.lienInfoValue}>{new Date(lien.created_at).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </View>
                {lien.precision_lien && <Text style={fStyles.lienPrecision}>📝 {lien.precision_lien}</Text>}
              </View>
            );
          })
        )}
      </View>

      <Modal visible={showModalNouveauMembre} transparent animationType="slide"
        onRequestClose={() => setShowModalNouveauMembre(false)}>
        <View style={fStyles.modalOverlay}>
          <View style={fStyles.modalContent}>
            <View style={fStyles.modalHeader}>
              <Text style={fStyles.modalTitle}>Nouveau membre de famille</Text>
              <TouchableOpacity onPress={() => setShowModalNouveauMembre(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={fStyles.modalInfoBox}>
              <Text style={fStyles.modalInfoText}>
                Créez rapidement une fiche pour un membre de la famille afin de l'associer à ce dossier.
              </Text>
            </View>
            <Text style={fStyles.fieldLabel}>Prénom *</Text>
            <TextInput style={fStyles.input} placeholder="Ex: Jean" placeholderTextColor="#94a3b8"
              value={nvPrenom} onChangeText={setNvPrenom} />
            <Text style={[fStyles.fieldLabel, { marginTop: 12 }]}>Nom *</Text>
            <TextInput style={fStyles.input} placeholder="Ex: Dupont" placeholderTextColor="#94a3b8"
              value={nvNom} onChangeText={setNvNom} />
            <Text style={[fStyles.fieldLabel, { marginTop: 12 }]}>Sexe</Text>
            <TouchableOpacity style={fStyles.pickerBtn} onPress={() => setShowSexePicker(!showSexePicker)}>
              <Text style={fStyles.pickerBtnText}>
                {sexeOptions.find(s => s.value === nvSexe)?.label || 'Non précisé'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
            {showSexePicker && (
              <View style={fStyles.dropdownContainer}>
                {sexeOptions.map((opt) => (
                  <TouchableOpacity key={opt.value}
                    style={[fStyles.dropdownItem, nvSexe === opt.value && fStyles.dropdownItemActive]}
                    onPress={() => { setNvSexe(opt.value); setShowSexePicker(false); }}>
                    <Text style={[fStyles.dropdownItemText, nvSexe === opt.value && fStyles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {nvSexe === opt.value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={[fStyles.formActions, { marginTop: 24 }]}>
              <TouchableOpacity style={fStyles.btnAnnuler}
                onPress={() => setShowModalNouveauMembre(false)} disabled={savingMembre}>
                <Text style={fStyles.btnAnnulerText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[fStyles.btnEnregistrer, { backgroundColor: '#8b5cf6' }, savingMembre && { opacity: 0.7 }]}
                onPress={handleCreerMembre} disabled={savingMembre}>
                {savingMembre ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <><Ionicons name="add" size={16} color="#FFF" />
                    <Text style={fStyles.btnEnregistrerText}>Créer et sélectionner</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
const DetailsDossier = ({ route, navigation }: any) => {
  // ✅ Récupère showMap depuis les params
  const {
    dossierId     = '',
    dossierIdReal = '',
    showMap       = false, // ✅ false par défaut — carte cachée si vient de Dossiers
  } = route.params || {};

  const [activeTab, setActiveTab] = useState('Informations');
  const [dossier, setDossier]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);

  const tabs = [
    { name: 'Informations', icon: 'information-circle-outline' },
    { name: 'Photos',       icon: 'image-outline' },
    { name: 'Signalements', icon: 'alert-circle-outline' },
    { name: 'Localisations',icon: 'location-outline' },
    { name: 'Filiation',    icon: 'people-outline' },
  ];

  const fetchDossier = useCallback(async () => {
    try {
      setLoading(true);
      const idRecherche = dossierIdReal || dossierId;
      const isUUID      = idRecherche.length === 36 && idRecherche.includes('-');
      const query       = supabase.from('dossier_disparition').select(`*, personne:id_personne (*)`);
      const { data, error } = isUUID
        ? await query.eq('id', idRecherche).single()
        : await query.eq('numero_dossier', idRecherche).single();
      if (error) throw error;
      setDossier(data);
    } catch (err) {
      console.error('Erreur chargement dossier:', err);
    } finally {
      setLoading(false);
    }
  }, [dossierIdReal, dossierId]);

  useFocusEffect(useCallback(() => { fetchDossier(); }, [fetchDossier]));

  const getStatutStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      en_cours:        { bg: '#fef3c7', text: '#92400e' },
      retrouve_vivant: { bg: '#f0fdf4', text: '#166534' },
      retrouve_decede: { bg: '#fee2e2', text: '#991b1b' },
      suspendu:        { bg: '#f1f5f9', text: '#64748b' },
    };
    return map[statut] || { bg: '#fef3c7', text: '#92400e' };
  };

  const handleEditer = () => {
    navigation.navigate('ModifierDossier', {
      dossierId:     dossier?.id,
      numeroDossier: dossier?.numero_dossier,
      initialData: {
        dateLabel:       dossier?.date_disparition
          ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR') : '',
        dateISO:         dossier?.date_disparition || '',
        lieu:            dossier?.lieu_disparition || '',
        ville:           dossier?.ville_disparition || '',
        region:          dossier?.region_disparition || '',
        pays:            dossier?.pays_disparition || 'Cameroun',
        circonstances:   dossier?.circonstances || '',
        urgence:         dossier?.niveau_urgence || 'normal',
        typeDisparition: dossier?.type_disparition || 'inconnue',
        statut:          dossier?.statut_dossier || 'en_cours',
        contactNom:      dossier?.contact_famille_principale || '',
        contactTel:      dossier?.telephone_contact || '',
        contactEmail:    dossier?.email_contact || '',
      }
    });
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: '#64748b', marginTop: 10 }}>Chargement du dossier...</Text>
      </View>
    </SafeAreaView>
  );

  const statutStyle = getStatutStyle(dossier?.statut_dossier || '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <Text style={styles.appTitle}>RetrouvonsLes</Text>
        </View>
      </View>

      <View style={styles.topSection}>
        <Text style={styles.headerId}>{dossier?.numero_dossier || dossierId}</Text>
        <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.btnRetourText}>Retour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerInfo}>
          <View style={styles.iconBlueCard}>
            <Ionicons name="document-text" size={24} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Dossier de disparition</Text>
            <Text style={styles.bannerSub} numberOfLines={1}>
              {dossier?.personne
                ? `${dossier.personne.prenom} ${dossier.personne.nom}`
                : 'Personne non renseignée'}
            </Text>
          </View>
        </View>
        <View style={styles.bannerActions}>
          <View style={[styles.badgeStatut, { backgroundColor: statutStyle.bg }]}>
            <Ionicons name="time-outline" size={12} color={statutStyle.text} />
            <Text style={[styles.badgeText, { color: statutStyle.text }]}>
              {dossier?.statut_dossier?.replace(/_/g, ' ') || 'en cours'}
            </Text>
          </View>
          <TouchableOpacity style={styles.btnEditer} onPress={handleEditer}>
            <Ionicons name="pencil" size={14} color="#FFF" />
            <Text style={styles.btnEditerText}>Éditer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.name}
              style={[styles.tabItem, activeTab === tab.name && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.name)}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.name ? '#2563eb' : '#64748b'} />
              <Text style={[styles.tabText, activeTab === tab.name && styles.tabTextActive]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {/* ✅ showMap transmis à TabInformations */}
        <View style={{ flex: 1, display: activeTab === 'Informations' ? 'flex' : 'none' }}>
          <TabInformations dossier={dossier} showMap={showMap} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Photos' ? 'flex' : 'none' }}>
          <TabPhotos dossier={dossier} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Signalements' ? 'flex' : 'none' }}>
          <TabSignalements dossier={dossier} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Localisations' ? 'flex' : 'none' }}>
          <TabLocalisations dossier={dossier} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Filiation' ? 'flex' : 'none' }}>
          <TabFiliation dossier={dossier} />
        </View>
      </View>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES PRINCIPAUX
// =====================================================
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  appHeader:          { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  appHeaderLeft:      { flexDirection: 'row', alignItems: 'center' },
  appTitle:           { fontSize: 18, fontWeight: '800', color: '#1e293b', marginLeft: 10 },
  centerContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topSection:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  headerId:           { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  btnRetour:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignSelf: 'flex-start', elevation: 1 },
  btnRetourText:      { marginLeft: 8, color: '#64748b', fontSize: 13, fontWeight: '600' },
  banner:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  bannerInfo:         { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  iconBlueCard:       { width: 42, height: 42, backgroundColor: '#2563eb', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bannerTitle:        { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  bannerSub:          { fontSize: 12, color: '#94a3b8' },
  bannerActions:      { alignItems: 'flex-end' },
  badgeStatut:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  badgeText:          { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  btnEditer:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  btnEditerText:      { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  tabsContainer:      { backgroundColor: '#FFF', marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabItem:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent', marginRight: 6 },
  tabItemActive:      { borderBottomColor: '#2563eb' },
  tabText:            { marginLeft: 6, fontSize: 12, color: '#64748b', fontWeight: '600' },
  tabTextActive:      { color: '#2563eb' },
  tabCard:            { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  tabCardHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabCardTitle:       { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  infoRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel:          { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', flex: 1 },
  infoValue:          { fontSize: 13, color: '#1e293b', fontWeight: '600', flex: 2, textAlign: 'right' },
  photosGrid:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoWrapper:       { width: (width - 80) / 2, marginBottom: 12 },
  photoItem:          { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#f1f5f9' },
  photoBadge:         { position: 'absolute', top: 6, left: 6, backgroundColor: '#2563eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  photoBadgeText:     { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  photoType:          { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
  itemCard:           { paddingVertical: 14 },
  itemCardBorder:     { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemNumero:         { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  itemBadge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  itemBadgeText:      { fontSize: 10, fontWeight: 'bold' },
  itemDesc:           { fontSize: 13, color: '#334155', marginBottom: 8, lineHeight: 18 },
  itemInfoRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemInfoText:       { marginLeft: 6, fontSize: 11, color: '#64748b' },
  itemDate:           { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  itemAuteur:         { fontSize: 11, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },
  dot:                { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  locIconBox:         { width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fiabiliteBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  fiabiliteText:      { fontSize: 10, fontWeight: 'bold' },
  emptyContainer:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText:          { color: '#64748b', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptySubText:       { color: '#94a3b8', fontSize: 12, marginTop: 6, textAlign: 'center' },
});

// =====================================================
// STYLES ONGLET INFORMATIONS
// =====================================================
const iStyles = StyleSheet.create({
  card:         { width: width * 0.75, backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIconBox:  { width: 28, height: 28, borderRadius: 6, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  cardTitle:    { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  divider:      { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },
  fieldLabel:   { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 2, marginTop: 10, letterSpacing: 0.3 },
  fieldValue:   { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  statBox:      { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  statLabel:    { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', marginTop: 4, marginBottom: 4, textAlign: 'center' },
  statNumber:   { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  statutBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 4 },
  statutText:   { fontSize: 11, fontWeight: 'bold' },
  // ✅ Carte
  mapSection:   { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  mapHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mapTitle:     { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  mapContainer: { height: 250, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
});

// =====================================================
// STYLES FILIATION
// =====================================================
const fStyles = StyleSheet.create({
  card:                  { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  cardHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardHeaderLeft:        { flexDirection: 'row', alignItems: 'center' },
  cardTitle:             { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  btnAjouter:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnAjouterText:        { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  formContainer:         { backgroundColor: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  formTitle:             { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  fieldLabel:            { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  fieldHint:             { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  input:                 { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#FFF', height: 45 },
  textArea:              { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#FFF', height: 80, textAlignVertical: 'top' },
  pickerBtn:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, height: 45, backgroundColor: '#FFF' },
  pickerBtnText:         { fontSize: 13, color: '#1e293b', flex: 1 },
  btnNouveau:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, height: 45 },
  btnNouveauText:        { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  dropdownContainer:     { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 4, elevation: 5, zIndex: 100 },
  dropdownGroupTitle:    { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc', textTransform: 'uppercase' },
  dropdownItem:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemActive:    { backgroundColor: '#eff6ff' },
  dropdownItemText:      { fontSize: 14, color: '#1e293b' },
  dropdownItemTextActive:{ color: '#2563eb', fontWeight: '600' },
  dropdownEmpty:         { padding: 16, color: '#94a3b8', textAlign: 'center' },
  personneItemRow:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  personneAvatar:        { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  personneAvatarText:    { color: '#2563eb', fontWeight: 'bold', fontSize: 12 },
  formActions:           { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  btnAnnuler:            { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 10 },
  btnAnnulerText:        { color: '#64748b', fontWeight: '600' },
  btnEnregistrer:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnEnregistrerText:    { color: '#FFF', fontWeight: 'bold', marginLeft: 6 },
  divider:               { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  lienCard:              { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  lienHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  lienTypeBadge:         { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  lienTypeBadgeText:     { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  btnDelete:             { padding: 6, borderRadius: 6, backgroundColor: '#fee2e2' },
  lienPersonneRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  lienPersonneNom:       { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  lienInfoGrid:          { flexDirection: 'row', flexWrap: 'wrap' },
  lienInfoItem:          { width: '50%', marginBottom: 10 },
  lienInfoLabel:         { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 2 },
  lienInfoValue:         { fontSize: 12, color: '#334155', fontWeight: '600' },
  statutBadge:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  statutText:            { fontSize: 10, fontWeight: 'bold' },
  lienPrecision:         { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 8 },
  emptyContainer:        { alignItems: 'center', paddingVertical: 30 },
  emptyText:             { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  emptySubText:          { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
  modalOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:          { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:            { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  modalInfoBox:          { backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: '#2563eb', padding: 12, borderRadius: 6, marginBottom: 16 },
  modalInfoText:         { fontSize: 13, color: '#1e40af', lineHeight: 18 },
});

export default DetailsDossier;