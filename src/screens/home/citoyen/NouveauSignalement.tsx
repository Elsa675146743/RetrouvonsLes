import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator,
  Platform, Alert, Image, Modal, Dimensions, PermissionsAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { WebView } from 'react-native-webview';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

// ─── TYPES ───
interface PhotoItem {
  uri: string;
  name: string;
  type: string;
}

interface FormData {
  description:           string;
  date_observation:      string;
  heure_observation:     string;
  lieu_observation:      string;
  ville_observation:     string;
  region_observation:    string;
  latitude:              number | null;
  longitude:             number | null;
  niveau_certitude:      string;
  contexte_observation:  string;
  direction_deplacement: string;
  photos:                PhotoItem[];
}

const CERTITUDES = [
  { key: 'certain',       label: 'Certain'       },
  { key: 'tres_probable', label: 'Très probable' },
  { key: 'probable',      label: 'Probable'      },
  { key: 'incertain',     label: 'Incertain'     },
  { key: 'doute',         label: 'Doute'         },
];

// ─── MAPTILER HTML ───
function buildMapHTML(latitude: number | null, longitude: number | null): string {
  const markerJS = latitude && longitude ? `
    var marker = new maplibregl.Marker({ color: '#1d4ed8', draggable: true })
      .setLngLat([${longitude}, ${latitude}])
      .addTo(map);
    marker.on('dragend', function() {
      var ll = marker.getLngLat();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_move', lat: ll.lat, lng: ll.lng }));
    });
    map.flyTo({ center: [${longitude}, ${latitude}], zoom: 14 });
  ` : '';

  return `
    <!DOCTYPE html><html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
      <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
      <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet"/>
      <style>* { margin:0; padding:0; box-sizing:border-box; } html,body,#map { width:100%; height:100%; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var marker = null;
        var map = new maplibregl.Map({
          container: 'map',
          style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
          center: [11.5021, 3.8480],
          zoom: 11,
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }), 'top-right');
        map.on('load', function() { ${markerJS} });
        map.on('click', function(e) {
          var lat = e.lngLat.lat, lng = e.lngLat.lng;
          if (marker) {
            marker.setLngLat([lng, lat]);
          } else {
            marker = new maplibregl.Marker({ color: '#1d4ed8', draggable: true })
              .setLngLat([lng, lat]).addTo(map);
            marker.on('dragend', function() {
              var ll = marker.getLngLat();
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_move', lat: ll.lat, lng: ll.lng }));
            });
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_click', lat: lat, lng: lng }));
        });
      </script>
    </body></html>
  `;
}

// ─── HEADER ───
function Header({ navigation, titre }: any) {
  return (
    <View style={hS.wrapper}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={hS.back} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
      </TouchableOpacity>
      <View style={hS.center}>
        <Text style={hS.title} numberOfLines={1}>{titre ?? 'Nouveau signalement'}</Text>
        <Text style={hS.sub}>Déclarez votre observation</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

const hS = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  back:   { width: 40, height: 40, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  title:  { fontSize: 15, fontWeight: '800', color: '#1e3a5f' },
  sub:    { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
});

// ─── CHAMP LABEL ───
function ChampLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={fS.label}>
      {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
    </Text>
  );
}

// ─── CHAMP INPUT ───
function ChampInput({ label, required, placeholder, value, onChangeText, multiline, keyboardType, icon }: any) {
  return (
    <View style={fS.champ}>
      <ChampLabel label={label} required={required} />
      <View style={[fS.inputWrapper, multiline && { height: 100, alignItems: 'flex-start' }]}>
        {icon && <Ionicons name={icon} size={16} color="#94a3b8" style={fS.inputIcon} />}
        <TextInput
          style={[fS.input, multiline && { height: 90, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType ?? 'default'}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const fS = StyleSheet.create({
  champ:        { marginBottom: 20 },
  label:        { fontSize: 13, fontWeight: '700', color: '#1e3a5f', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 11, minHeight: 48,
  },
  inputIcon: { marginRight: 8 },
  input:     { flex: 1, fontSize: 14, color: '#1e3a5f', padding: 0 },
});

// ─── SÉLECTEUR CERTITUDE ───
function SelecteurCertitude({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = CERTITUDES.find(c => c.key === value);

  return (
    <View style={fS.champ}>
      <ChampLabel label="Niveau de certitude" />
      <TouchableOpacity style={selS.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={selS.triggerTxt}>{current?.label ?? 'Sélectionner...'}</Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={selS.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={selS.sheet}>
            <View style={selS.handle} />
            <Text style={selS.sheetTitle}>Niveau de certitude</Text>
            {CERTITUDES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[selS.option, value === c.key && selS.optionActive]}
                onPress={() => { onChange(c.key); setOpen(false); }}
              >
                <Text style={[selS.optionTxt, value === c.key && selS.optionTxtActive]}>{c.label}</Text>
                {value === c.key && <Ionicons name="checkmark" size={18} color="#1d4ed8" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const selS = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  triggerTxt:      { fontSize: 14, color: '#1e3a5f' },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:          { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:      { fontSize: 15, fontWeight: '700', color: '#1e3a5f', marginBottom: 16 },
  option:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionActive:    { backgroundColor: '#eff6ff', marginHorizontal: -24, paddingHorizontal: 24 },
  optionTxt:       { fontSize: 14, color: '#475569' },
  optionTxtActive: { color: '#1d4ed8', fontWeight: '700' },
});

// ─── CARTE MAPTILER ───
function CarteLocalisation({
  latitude, longitude, onPress, onGeolocate, loading,
}: {
  latitude: number | null;
  longitude: number | null;
  onPress: (lat: number, lng: number) => void;
  onGeolocate: () => void;
  loading: boolean;
}) {
  const mapHTML = buildMapHTML(latitude, longitude);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'map_click' || data.type === 'marker_move') {
        onPress(data.lat, data.lng);
      }
    } catch (e) {
      console.warn('Message carte:', e);
    }
  };

  return (
    <View style={mapS.wrapper}>
      <WebView
        key={`map-${latitude}-${longitude}`}
        originWhitelist={['*']}
        source={{ html: mapHTML }}
        style={{ flex: 1 }}
        javaScriptEnabled
        onMessage={handleMessage}
      />

      {/* Bouton géolocalisation React Native */}
      <TouchableOpacity style={mapS.geoBtn} onPress={onGeolocate} activeOpacity={0.85}>
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="navigate" size={18} color="#fff" />
        }
      </TouchableOpacity>

      {/* Hint si pas encore de position */}
      {!latitude && (
        <View style={mapS.hint}>
          <Text style={mapS.hintTxt}>Appuyez sur la carte pour définir l'emplacement</Text>
        </View>
      )}
    </View>
  );
}

const mapS = StyleSheet.create({
  wrapper: {
    height: 220, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6,
  },
  geoBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  hint: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  hintTxt: { color: '#fff', fontSize: 11 },
});

// ─── UPLOAD PHOTOS ───
function UploadPhotos({ photos, onAdd, onRemove }: {
  photos: PhotoItem[];
  onAdd: (p: PhotoItem) => void;
  onRemove: (i: number) => void;
}) {
  const handlePick = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 5,
    });
    if (result.assets) {
      result.assets.forEach(asset => {
        if (asset.uri) {
          onAdd({
            uri:  asset.uri,
            name: asset.fileName ?? `photo_${Date.now()}.jpg`,
            type: asset.type ?? 'image/jpeg',
          });
        }
      });
    }
  };

  return (
    <View style={upS.wrapper}>
      <ChampLabel label="Joindre des photos" />
      <TouchableOpacity style={upS.dropzone} onPress={handlePick} activeOpacity={0.8}>
        <Ionicons name="cloud-upload-outline" size={32} color="#1d4ed8" />
        <Text style={upS.dropText}>Cliquez pour ajouter des fichiers</Text>
        <Text style={upS.dropSub}>JPG, PNG, WEBP — Max 10 Mo</Text>
      </TouchableOpacity>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {photos.map((p, i) => (
              <View key={i} style={upS.thumb}>
                <Image source={{ uri: p.uri }} style={upS.thumbImg} />
                <TouchableOpacity style={upS.thumbRemove} onPress={() => onRemove(i)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const upS = StyleSheet.create({
  wrapper:     { marginBottom: 20 },
  dropzone: {
    borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed',
    borderRadius: 14, padding: 28, alignItems: 'center', gap: 8,
    backgroundColor: '#f8fafc',
  },
  dropText:    { fontSize: 14, fontWeight: '600', color: '#1e3a5f' },
  dropSub:     { fontSize: 11, color: '#94a3b8' },
  thumb:       { position: 'relative' },
  thumbImg:    { width: 80, height: 80, borderRadius: 10, resizeMode: 'cover' },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
});

// ─── ÉCRAN PRINCIPAL ───
export default function NouveauSignalement({ navigation, route }: any) {
  const dossierParam = route?.params?.dossier;
  const dossierId    = route?.params?.dossierId ?? dossierParam?.id;

  const [form, setForm] = useState<FormData>({
    description:           '',
    date_observation:      new Date().toLocaleDateString('fr-FR'),
    heure_observation:     new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    lieu_observation:      '',
    ville_observation:     '',
    region_observation:    '',
    latitude:              null,
    longitude:             null,
    niveau_certitude:      'probable',
    contexte_observation:  '',
    direction_deplacement: '',
    photos:                [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const set = (key: keyof FormData, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ─── GÉOLOCALISATION ───
  const handleGeolocate = async () => {
    setGeoLoading(true);

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission refusée', 'Activez la localisation dans les paramètres.');
        setGeoLoading(false);
        return;
      }
    }

    navigation.geolocation.getCurrentPosition(
      (pos: { coords: { latitude: any; longitude: any; }; }) => {
        set('latitude',  pos.coords.latitude);
        set('longitude', pos.coords.longitude);
        setGeoLoading(false);
      },
      (err: { message: any; }) => {
        console.warn('Géoloc:', err.message);
        setGeoLoading(false);
        Alert.alert('Géolocalisation', 'Impossible de récupérer votre position.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ─── VALIDATION ───
  const valider = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.description.trim())       e.description  = 'La description est obligatoire';
    if (!form.date_observation.trim())  e.date         = 'La date est obligatoire';
    if (!form.latitude || !form.longitude) e.localisation = 'Veuillez sélectionner un emplacement sur la carte';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── SOUMISSION ───
  const handleSubmit = async () => {
    if (!valider()) {
      Alert.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Non connecté', 'Vous devez être connecté pour signaler.');
        return;
      }

      // Construire la date ISO
      const [jour, mois, annee] = form.date_observation.split('/');
      const dateISO = new Date(
        `${annee}-${mois}-${jour}T${form.heure_observation}:00`
      ).toISOString();

      // Insertion signalement
      const { data: signalement, error: errSignal } = await supabase
        .from('signalement')
        .insert({
          description:           form.description.trim(),
          date_observation:      dateISO,
          lieu_observation:      form.lieu_observation.trim()      || null,
          ville_observation:     form.ville_observation.trim()     || null,
          region_observation:    form.region_observation.trim()    || null,
          latitude_observation:  form.latitude,
          longitude_observation: form.longitude,
          contexte_observation:  form.contexte_observation.trim()  || null,
          direction_deplacement: form.direction_deplacement.trim() || null,
          niveau_certitude:      form.niveau_certitude,
          statut_validation:     'en_attente',
          source_signalement:    'application_mobile',
          id_utilisateur:        user.id,
          id_dossier:            dossierId ?? null,
        })
        .select('id')
        .single();

      if (errSignal) {
        console.error('Erreur signalement:', errSignal.message);
        Alert.alert('Erreur', `Impossible de soumettre : ${errSignal.message}`);
        return;
      }

      // Upload photos
      if (form.photos.length > 0 && signalement?.id) {
        for (const photo of form.photos) {
          try {
            const ext      = photo.name.split('.').pop() ?? 'jpg';
            const fileName = `signalements/${signalement.id}/${Date.now()}.${ext}`;
            const response = await fetch(photo.uri);
            const blob     = await response.blob();

            const { error: errUpload } = await supabase.storage
              .from('photos')
              .upload(fileName, blob, { contentType: photo.type });

            if (errUpload) { console.warn('Upload photo:', errUpload.message); continue; }

            const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

            await supabase.from('photo').insert({
              url_cloudinary: urlData.publicUrl,
              id_signalement: signalement.id,
              uploadee_par:   user.id,
              approuvee:      false,
              visible_public: false,
              type_photo:     'signalement',
            });
          } catch (photoErr) {
            console.warn('Erreur photo:', photoErr);
          }
        }
      }

      Alert.alert(
        'Signalement envoyé ✓',
        'Votre témoignage a été transmis et sera examiné par notre équipe. Merci pour votre contribution.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (err: any) {
      console.error('handleSubmit:', err);
      Alert.alert('Erreur', `Une erreur est survenue : ${err?.message ?? 'inconnue'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header
        navigation={navigation}
        titre={dossierParam
          ? `Signaler : ${dossierParam.prenom ?? ''} ${dossierParam.nom ?? ''}`
          : 'Nouveau signalement'}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Bandeau dossier lié */}
        {dossierParam && (
          <View style={styles.dossierBadge}>
            <Ionicons name="folder-outline" size={16} color="#1d4ed8" />
            <Text style={styles.dossierBadgeTxt}>
              Signalement lié à :{' '}
              <Text style={{ fontWeight: '800' }}>
                {dossierParam.prenom} {dossierParam.nom}
              </Text>
            </Text>
          </View>
        )}

        {/* ── DESCRIPTION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <ChampInput
            label="Description" required
            placeholder="Décrivez ce que vous avez observé..."
            value={form.description}
            onChangeText={(v: string) => set('description', v)}
            multiline
          />
          {errors.description && <Text style={styles.errTxt}>{errors.description}</Text>}
        </View>

        {/* ── DATE & HEURE ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Date & Heure</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ChampInput
                label="Date d'observation" required
                placeholder="JJ/MM/AAAA"
                value={form.date_observation}
                onChangeText={(v: string) => set('date_observation', v)}
                icon="calendar-outline"
                keyboardType="numeric"
              />
              {errors.date && <Text style={styles.errTxt}>{errors.date}</Text>}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <ChampInput
                label="Heure d'observation"
                placeholder="HH:MM"
                value={form.heure_observation}
                onChangeText={(v: string) => set('heure_observation', v)}
                icon="time-outline"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* ── LOCALISATION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Localisation</Text>
          </View>
          <Text style={styles.sectionHint}>
            Recherchez un lieu, utilisez votre position ou cliquez sur la carte.
          </Text>

          <View style={{ marginBottom: 14 }}>
            <CarteLocalisation
              latitude={form.latitude}
              longitude={form.longitude}
              onPress={(lat, lng) => { set('latitude', lat); set('longitude', lng); }}
              onGeolocate={handleGeolocate}
              loading={geoLoading}
            />
            {form.latitude && (
              <Text style={styles.coordsTxt}>
                📍 {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
              </Text>
            )}
            {errors.localisation && <Text style={styles.errTxt}>{errors.localisation}</Text>}
          </View>

          <ChampInput
            label="Lieu de l'observation"
            placeholder="Lieu de l'observation (ou laissez vide si vous avez choisi sur la carte)"
            value={form.lieu_observation}
            onChangeText={(v: string) => set('lieu_observation', v)}
            icon="pin-outline"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ChampInput
                label="Ville" placeholder="Yaoundé, Douala..."
                value={form.ville_observation}
                onChangeText={(v: string) => set('ville_observation', v)}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <ChampInput
                label="Région" placeholder="Centre, Littoral..."
                value={form.region_observation}
                onChangeText={(v: string) => set('region_observation', v)}
              />
            </View>
          </View>
        </View>

        {/* ── DÉTAILS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Détails de l'observation</Text>
          </View>

          <SelecteurCertitude
            value={form.niveau_certitude}
            onChange={(v) => set('niveau_certitude', v)}
          />

          <ChampInput
            label="Contexte"
            placeholder="Contexte de l'observation"
            value={form.contexte_observation}
            onChangeText={(v: string) => set('contexte_observation', v)}
            multiline
          />

          <ChampInput
            label="Direction de déplacement"
            placeholder="Ex : vers le nord, direction marché central..."
            value={form.direction_deplacement}
            onChangeText={(v: string) => set('direction_deplacement', v)}
            icon="navigate-outline"
          />
        </View>

        {/* ── PHOTOS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Photos</Text>
          </View>
          <UploadPhotos
            photos={form.photos}
            onAdd={(p) => set('photos', [...form.photos, p])}
            onRemove={(i) => set('photos', form.photos.filter((_, idx) => idx !== i))}
          />
        </View>

        {/* ── BOUTONS ── */}
        <View style={styles.btnsRow}>
          <TouchableOpacity
            style={styles.btnAnnuler}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.btnAnnulerTxt}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSoumettre, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={styles.btnSoumettreText}>Soumettre</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content:   { padding: 16, paddingBottom: 60 },

  dossierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  dossierBadgeTxt: { fontSize: 13, color: '#1d4ed8', flex: 1 },

  section: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: '#1e3a5f' },
  sectionHint:   { fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 17 },

  row:       { flexDirection: 'row' },
  coordsTxt: { fontSize: 11, color: '#1d4ed8', marginTop: 6, fontWeight: '600' },
  errTxt:    { fontSize: 11, color: '#ef4444', marginTop: -12, marginBottom: 8 },

  btnsRow: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 20 },
  btnAnnuler: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  btnAnnulerTxt: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  btnSoumettre: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#1d4ed8',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    elevation: 3, shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  btnSoumettreText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});