import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator, Image, Dimensions,
  TextInput, Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

function buildMapHTML(latitude: number | null, longitude: number | null): string {
  const centerLat = latitude ?? 3.8480;
  const centerLng = longitude ?? 11.5021;
  const zoom = latitude && longitude ? 14 : 11;

  const markerJS = latitude && longitude ? `
    new maplibregl.Marker({ color: '#b45f06', draggable: true })
      .setLngLat([${longitude}, ${latitude}])
      .addTo(map);
  ` : '';

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
      <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
      <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet"/>
      <style>*{margin:0;padding:0;box-sizing:border-box;}html,body,#map{width:100%;height:100%;}</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = new maplibregl.Map({
          container: 'map',
          style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
          center: [${centerLng}, ${centerLat}],
          zoom: ${zoom},
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }), 'top-right');
        
        ${markerJS}
        
        map.on('click', function(e) {
          var lat = e.lngLat.lat;
          var lng = e.lngLat.lng;
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
        });
      </script>
    </body>
  </html>`;
}

export default function NouveauSignalement({ navigation, route }: any) {
  const dossierId = route?.params?.dossierId || route?.params?.dossier?.id;

  const [description, setDescription] = useState('');
  const [dateObservation, setDateObservation] = useState('');
  const [heureObservation, setHeureObservation] = useState('');
  const [lieuObservation, setLieuObservation] = useState('');
  const [ville, setVille] = useState('');
  const [region, setRegion] = useState('');
  const [niveauCertitude, setNiveauCertitude] = useState('probable');
  const [contexte, setContexte] = useState('');
  const [directionDeplacement, setDirectionDeplacement] = useState('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const certitudeOptions = [
    { value: 'certain', label: 'Certain' },
    { value: 'tres_probable', label: 'Très probable' },
    { value: 'probable', label: 'Probable' },
    { value: 'incertain', label: 'Incertain' },
  ];

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cm&limit=10`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'RetrouvonsLes/1.0' } }
      );
      const data = await response.json();
      const results = Array.isArray(data) ? data : [];
      setSearchResults(results);
      setShowResults(results.length > 0);
    } catch (error) {
      console.warn('Erreur recherche:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setLatitude(lat);
    setLongitude(lng);
    const lieuNom = item.display_name.split(',')[0];
    setLieuObservation(lieuNom);
    setSearchQuery(lieuNom);
    setShowResults(false);
    setMapKey(prev => prev + 1);
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat && data.lng) {
        setLatitude(data.lat);
        setLongitude(data.lng);
      }
    } catch (e) {}
  };

  const handlePickPhotos = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 5 });
    if (result.assets) {
      const newPhotos = result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || `photo_${Date.now()}.jpg`, type: asset.type || 'image/jpeg' }));
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const dateTimeISO = dateObservation && heureObservation
        ? new Date(`${dateObservation.split('/').reverse().join('-')}T${heureObservation}`).toISOString()
        : new Date().toISOString();

      const { data: signalement, error } = await supabase
        .from('signalement')
        .insert({
          description: description.trim(),
          lieu_observation: lieuObservation.trim() || null,
          ville_observation: ville.trim() || null,
          region_observation: region.trim() || null,
          latitude_observation: latitude,
          longitude_observation: longitude,
          date_observation: dateTimeISO,
          niveau_certitude: niveauCertitude,
          contexte_observation: contexte.trim() || null,
          direction_deplacement: directionDeplacement.trim() || null,
          statut_validation: 'en_attente',
          source_signalement: 'application_mobile',
          id_utilisateur: user.id,
          id_dossier: dossierId,
          temoin_anonyme: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      for (const [idx, photo] of photos.entries()) {
        try {
          const ext = photo.name.split('.').pop() ?? 'jpg';
          const fileName = `signalements/${signalement.id}/${Date.now()}_${idx}.${ext}`;
          const blob = await (await fetch(photo.uri)).blob();
          await supabase.storage.from('photos').upload(fileName, blob, { contentType: photo.type });
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
          await supabase.from('photo').insert({
            url_cloudinary: urlData.publicUrl,
            id_signalement: signalement.id,
            uploadee_par: user.id,
            approuvee: false,
            visible_public: false,
            type_photo: 'signalement',
            est_principale: idx === 0,
          });
        } catch (e) { console.warn(e); }
      }

      Alert.alert('Succès', 'Signalement envoyé');
      navigation.goBack();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    setDateObservation(now.toLocaleDateString('fr-FR'));
    setHeureObservation(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery) searchLocation(searchQuery);
      else { setSearchResults([]); setShowResults(false); }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau signalement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>Description *</Text>
          <TextInput style={styles.textArea} placeholder="Décrivez ce que vous avez observé..." value={description} onChangeText={setDescription} multiline numberOfLines={5} />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.halfCard, { marginRight: 8 }]}>
            <Text style={styles.label}>Date *</Text>
            <TextInput style={styles.input} placeholder="JJ/MM/AAAA" value={dateObservation} onChangeText={setDateObservation} />
          </View>
          <View style={[styles.halfCard, { marginLeft: 8 }]}>
            <Text style={styles.label}>Heure</Text>
            <TextInput style={styles.input} placeholder="HH:MM" value={heureObservation} onChangeText={setHeureObservation} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Localisation</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un lieu (Yaoundé, Douala...)"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {showResults && searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.resultItem} onPress={() => selectLocation(item)}>
                  <Ionicons name="location-outline" size={16} color="#b45f06" />
                  <View>
                    <Text style={styles.resultText}>{item.display_name.split(',')[0]}</Text>
                    <Text style={styles.resultSubText}>{item.display_name.split(',').slice(1, 3).join(',')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <View style={styles.mapContainer}>
            <WebView key={mapKey} originWhitelist={['*']} source={{ html: buildMapHTML(latitude, longitude) }} style={{ flex: 1 }} onMessage={handleMapMessage} />
          </View>
          {latitude && longitude && <Text style={styles.coordsText}>📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Lieu précis</Text>
          <TextInput style={styles.input} placeholder="Quartier, rue..." value={lieuObservation} onChangeText={setLieuObservation} />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.halfCard, { marginRight: 8 }]}><Text style={styles.label}>Ville</Text><TextInput style={styles.input} placeholder="Yaoundé..." value={ville} onChangeText={setVille} /></View>
          <View style={[styles.halfCard, { marginLeft: 8 }]}><Text style={styles.label}>Région</Text><TextInput style={styles.input} placeholder="Centre..." value={region} onChangeText={setRegion} /></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Niveau de certitude</Text>
          <View style={styles.optionsRow}>
            {certitudeOptions.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.optionChip, niveauCertitude === opt.value && styles.optionChipActive]} onPress={() => setNiveauCertitude(opt.value)}>
                <Text style={[styles.optionChipText, niveauCertitude === opt.value && styles.optionChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Contexte</Text>
          <TextInput style={styles.textAreaSmall} placeholder="Contexte de l'observation..." value={contexte} onChangeText={setContexte} multiline numberOfLines={3} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Direction de déplacement</Text>
          <TextInput style={styles.input} placeholder="Direction..." value={directionDeplacement} onChangeText={setDirectionDeplacement} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Photos</Text>
          <TouchableOpacity style={styles.uploadZone} onPress={handlePickPhotos}>
            <Ionicons name="camera-outline" size={32} color="#94a3b8" />
            <Text style={styles.uploadText}>Ajouter des photos</Text>
            <Text style={styles.uploadHint}>JPG, PNG, WEBP - Max 10MB</Text>
          </TouchableOpacity>
          {photos.length > 0 && (
            <ScrollView horizontal style={styles.photosPreview}>
              {photos.map((photo, i) => (
                <View key={i} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Soumettre</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 8 },
  textArea: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, borderWidth: 1, borderColor: '#e2e8f0', textAlignVertical: 'top' },
  textAreaSmall: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, borderWidth: 1, borderColor: '#e2e8f0', textAlignVertical: 'top' },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  rowContainer: { flexDirection: 'row', marginBottom: 16, gap: 16 },
  halfCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: '#0b1c30', padding: 0 },
  searchResults: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', maxHeight: 200, zIndex: 10, elevation: 5 },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1e293b' },
  resultSubText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  coordsText: { fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 8 },
  optionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  optionChipActive: { backgroundColor: '#b45f06', borderColor: '#b45f06' },
  optionChipText: { fontSize: 13, color: '#64748b' },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  uploadZone: { borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', gap: 8, backgroundColor: '#f8fafc' },
  uploadText: { fontSize: 13, color: '#64748b' },
  uploadHint: { fontSize: 11, color: '#94a3b8' },
  photosPreview: { flexDirection: 'row', marginTop: 12, gap: 10 },
  photoItem: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  submitBtn: { flex: 1, backgroundColor: '#b45f06', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});