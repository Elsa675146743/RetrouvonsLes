import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator,
  Platform, Alert, Image, Modal, PermissionsAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { WebView } from 'react-native-webview';
import { supabase } from '../../../services/supabase';

const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

interface PhotoItem { uri: string; name: string; type: string; }

interface FormData {
  prenom: string; nom: string; age: string; genre: string;
  description_physique: string; vetements: string;
  date_disparition: string; heure_disparition: string;
  lieu_disparition: string;
  latitude: number | null; longitude: number | null;
  photos: PhotoItem[];
  type_urgence: 'critique' | 'urgent' | 'normal';
}

const TYPES_DISPARITION = [
  { key: 'critique', label: 'Kidnapping / Enlèvement',   alerteImmediate: true  },
  { key: 'urgent',   label: 'Viol / Agression sexuelle', alerteImmediate: true  },
  { key: 'normal',   label: 'Disparition simple',        alerteImmediate: false },
];

const GENRES = [
  { key: 'masculin',    label: 'Homme'      },
  { key: 'feminin',     label: 'Femme'      },
  { key: 'non_precise', label: 'Non précisé' },
];

// ─── HAVERSINE ───
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, RAD = Math.PI / 180;
  const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*RAD)*Math.cos(lat2*RAD)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── MAP HTML ───
function buildMapHTML(latitude: number | null, longitude: number | null): string {
  const markerJS = latitude && longitude ? `
    var marker = new maplibregl.Marker({ color: '#1d4ed8', draggable: true })
      .setLngLat([${longitude}, ${latitude}]).addTo(map);
    marker.on('dragend', function() {
      var ll = marker.getLngLat();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_move', lat: ll.lat, lng: ll.lng }));
    });
    map.flyTo({ center: [${longitude}, ${latitude}], zoom: 14 });
  ` : '';

  return `<!DOCTYPE html><html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
      <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
      <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet"/>
      <style>* { margin:0; padding:0; box-sizing:border-box; } html,body,#map { width:100%; height:100%; }</style>
    </head>
    <body><div id="map"></div>
    <script>
      var marker = null;
      var map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
        center: [11.5021, 3.8480], zoom: 11,
      });
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.on('load', function() { ${markerJS} });
      map.on('click', function(e) {
        var lat = e.lngLat.lat, lng = e.lngLat.lng;
        if (marker) { marker.setLngLat([lng, lat]); }
        else {
          marker = new maplibregl.Marker({ color: '#1d4ed8', draggable: true })
            .setLngLat([lng, lat]).addTo(map);
          marker.on('dragend', function() {
            var ll = marker.getLngLat();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_move', lat: ll.lat, lng: ll.lng }));
          });
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_click', lat: lat, lng: lng }));
      });
    </script></body></html>`;
}

// ─── BANDEAU URGENCE ───
function BandeauUrgence() {
  return (
    <View style={urgS.wrapper}>
      <View style={urgS.left}>
        <Ionicons name="warning-outline" size={18} color="#b45309" />
        <View>
          <Text style={urgS.titre}>URGENCE IMMÉDIATE :</Text>
          <Text style={urgS.sub}>Contactez les autorités</Text>
        </View>
      </View>
      <TouchableOpacity style={urgS.btn} activeOpacity={0.85}>
        <Ionicons name="call" size={15} color="#fff" />
        <Text style={urgS.btnTxt}>APPELER{'\n'}LE 17</Text>
      </TouchableOpacity>
    </View>
  );
}
const urgS = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fefce8', borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: '#fde68a' },
  left:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  titre:   { fontSize: 12, fontWeight: '800', color: '#92400e' },
  sub:     { fontSize: 11, color: '#b45309', marginTop: 1 },
  btn:     { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt:  { color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },
});

// ─── SECTION HEADER ───
function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
      <Ionicons name={icon as any} size={13} color="#64748b" />
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.9, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

// ─── CHAMP INPUT ───
function ChampInput({ label, placeholder, value, onChangeText, multiline, keyboardType, icon, style: ext }: any) {
  return (
    <View style={[inS.wrapper, ext]}>
      {label ? <Text style={inS.label}>{label}</Text> : null}
      <View style={[inS.box, multiline && { height: 90, alignItems: 'flex-start' }]}>
        {icon && <Ionicons name={icon} size={14} color="#94a3b8" style={{ marginRight: 8 }} />}
        <TextInput
          style={[inS.input, multiline && { height: 80, textAlignVertical: 'top' }]}
          placeholder={placeholder} placeholderTextColor="#cbd5e1"
          value={value} onChangeText={onChangeText}
          multiline={multiline} keyboardType={keyboardType ?? 'default'} autoCorrect={false}
        />
      </View>
    </View>
  );
}
const inS = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  label:   { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 5 },
  box:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  input:   { flex: 1, fontSize: 13, color: '#1e293b', padding: 0 },
});

// ─── SÉLECTEUR GENRE ───
function SelecteurGenre({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = GENRES.find(g => g.key === value);
  return (
    <View style={{ flex: 1, marginBottom: 10 }}>
      <Text style={inS.label}>Genre</Text>
      <TouchableOpacity style={[inS.box, { justifyContent: 'space-between' }]} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={{ fontSize: 13, color: current ? '#1e293b' : '#cbd5e1' }}>{current?.label ?? 'Sélectionner'}</Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e3a5f', marginBottom: 12 }}>Genre</Text>
            {GENRES.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', ...(value === g.key && { backgroundColor: '#eff6ff', marginHorizontal: -24, paddingHorizontal: 24 }) }}
                onPress={() => { onChange(g.key); setOpen(false); }}
              >
                <Text style={{ fontSize: 14, color: value === g.key ? '#1d4ed8' : '#475569', fontWeight: value === g.key ? '700' : '400' }}>{g.label}</Text>
                {value === g.key && <Ionicons name="checkmark" size={18} color="#1d4ed8" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── SÉLECTEUR TYPE DISPARITION ───
function SelecteurTypeDisparition({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = TYPES_DISPARITION.find(t => t.key === value);
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={[inS.label, { fontWeight: '700' }]}>Type de disparition *</Text>
      <TouchableOpacity style={[inS.box, { justifyContent: 'space-between' }]} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={{ fontSize: 13, color: current ? '#1e293b' : '#94a3b8' }}>{current?.label ?? 'Sélectionner le type'}</Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0b1c30', marginBottom: 16 }}>Type de disparition</Text>
            {TYPES_DISPARITION.map(t => (
              <TouchableOpacity
                key={t.key}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: value === t.key ? '#f0fdf4' : 'transparent', marginHorizontal: -24, paddingHorizontal: 24 }}
                onPress={() => { onChange(t.key); setOpen(false); }}
              >
                <Text style={{ fontSize: 14, fontWeight: value === t.key ? '600' : '400', color: value === t.key ? '#166534' : '#475569' }}>{t.label}</Text>
                {value === t.key && <Ionicons name="checkmark" size={18} color="#166534" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── UPLOAD PHOTOS ───
function UploadPhotos({ photos, onAdd, onRemove }: {
  photos: PhotoItem[];
  onAdd: (p: PhotoItem) => void;
  onRemove: (i: number) => void;
}) {
  const handlePick = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 5 });
    if (result.assets) {
      result.assets.forEach(asset => {
        if (asset.uri) onAdd({ uri: asset.uri, name: asset.fileName ?? `photo_${Date.now()}.jpg`, type: asset.type ?? 'image/jpeg' });
      });
    }
  };
  return (
    <View>
      <TouchableOpacity style={upS.zone} onPress={handlePick} activeOpacity={0.8}>
        <Ionicons name="camera-outline" size={38} color="#94a3b8" />
        <Text style={upS.zoneTxt}>Ajouter des photos</Text>
      </TouchableOpacity>
      <View style={upS.thumbsRow}>
        {photos.map((p, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <Image source={{ uri: p.uri }} style={upS.thumbImg} />
            <TouchableOpacity style={upS.remove} onPress={() => onRemove(i)}>
              <Ionicons name="close-circle" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
        {Array.from({ length: Math.max(0, 3 - photos.length) }).map((_, i) => (
          <TouchableOpacity key={`e${i}`} style={upS.emptyThumb} onPress={handlePick} />
        ))}
      </View>
      <Text style={upS.hint}>Privilégiez des photos récentes et claires du visage.</Text>
    </View>
  );
}
const upS = StyleSheet.create({
  zone:       { height: 130, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f8fafc', marginBottom: 12 },
  zoneTxt:    { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  thumbsRow:  { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  thumbImg:   { width: 72, height: 72, borderRadius: 8, resizeMode: 'cover' },
  remove:     { position: 'absolute', top: -6, right: -6, backgroundColor: 'white', borderRadius: 10 },
  emptyThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  hint:       { fontSize: 11, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' },
});

// ─── CARTE ───
function CarteLocalisation({ latitude, longitude, onPress, onGeolocate, loading }: {
  latitude: number | null; longitude: number | null;
  onPress: (lat: number, lng: number) => void;
  onGeolocate: () => void; loading: boolean;
}) {
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'map_click' || data.type === 'marker_move') onPress(data.lat, data.lng);
    } catch (e) {}
  };
  return (
    <View>
      <View style={mapS.wrapper}>
        <WebView
          key={`map-${latitude}-${longitude}`}
          originWhitelist={['*']}
          source={{ html: buildMapHTML(latitude, longitude) }}
          style={{ flex: 1 }}
          javaScriptEnabled
          onMessage={handleMessage}
        />
        {!latitude && (
          <TouchableOpacity style={mapS.centerBtn} onPress={onGeolocate} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="location" size={15} color="#fff" /><Text style={mapS.centerBtnTxt}>Cliquer pour localiser</Text></>
            }
          </TouchableOpacity>
        )}
      </View>
      {latitude && <Text style={mapS.coords}>📍 {latitude.toFixed(5)}, {longitude?.toFixed(5)}</Text>}
    </View>
  );
}
const mapS = StyleSheet.create({
  wrapper:      { height: 200, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6, position: 'relative' },
  centerBtn:    { position: 'absolute', top: '38%', alignSelf: 'center', left: '50%', transform: [{ translateX: -80 }], flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, elevation: 4 },
  centerBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  coords:       { fontSize: 11, color: '#1d4ed8', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
});

// ─── ÉCRAN PRINCIPAL ───
export default function NouveauSignalement({ navigation, route }: any) {
  const dossierId = route?.params?.dossierId ?? route?.params?.dossier?.id;

  const [form, setForm] = useState<FormData>({
    prenom: '', nom: '', age: '', genre: 'non_precise',
    description_physique: '', vetements: '',
    date_disparition:  new Date().toLocaleDateString('fr-FR'),
    heure_disparition: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    lieu_disparition: '', latitude: null, longitude: null,
    photos: [], type_urgence: 'normal',
  });

  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const set = (key: keyof FormData, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  // ── GÉOLOCALISATION ──
  const handleGeolocate = async () => {
    setGeoLoading(true);
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: 'Permission de localisation', message: "L'application a besoin de votre position.", buttonNeutral: 'Plus tard', buttonNegative: 'Annuler', buttonPositive: 'OK' }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission refusée', 'Activez la localisation dans les paramètres.');
          setGeoLoading(false); return;
        }
      } catch (err) { setGeoLoading(false); return; }
    }
    navigation.geolocation.getCurrentPosition(
      (pos: any) => { set('latitude', pos.coords.latitude); set('longitude', pos.coords.longitude); setGeoLoading(false); },
      (err: any) => {
        setGeoLoading(false);
        const msgs: Record<number, string> = { 1: 'Permission refusée.', 2: 'Position indisponible.', 3: 'Délai dépassé.' };
        Alert.alert('Géolocalisation', msgs[err.code] ?? 'Impossible de récupérer votre position.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  // ── VALIDATION ──
  const valider = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.prenom.trim()) e.prenom = 'Le prénom est obligatoire';
    if (!form.nom.trim())    e.nom    = 'Le nom est obligatoire';
    if (!form.latitude || !form.longitude) e.localisation = 'Veuillez sélectionner un emplacement sur la carte';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── NOTIFICATIONS GÉOLOCALISÉES ──
  const envoyerNotifications = async (
    dossierIdParam: string, userId: string,
    lat: number, lng: number,
    prenom: string, nom: string,
  ) => {
    try {
      const { data: utilisateurs } = await supabase
        .from('utilisateur')
        .select('id, latitude_actuelle, longitude_actuelle')
        .neq('id', userId);

      if (!utilisateurs?.length) return;

      const proches: string[] = [], lointains: string[] = [];
      for (const u of utilisateurs) {
        if (u.latitude_actuelle && u.longitude_actuelle) {
          haversineKm(lat, lng, u.latitude_actuelle, u.longitude_actuelle) <= 50
            ? proches.push(u.id)
            : lointains.push(u.id);
        } else {
          lointains.push(u.id);
        }
      }

      const notifs = [...proches, ...lointains].map(uid => ({
        id_utilisateur:    uid,
        type_notification: 'nouvelle_alerte',
        titre:             `Disparition signalée - ${prenom} ${nom}`,
        message:           `Un signalement a été soumis pour ${prenom} ${nom}. Restez vigilant.`,
        canal:             'in_app',
        lue:               false,
        priorite:          proches.includes(uid) ? 'haute' : 'moyenne',
        id_dossier:        dossierIdParam,
      }));

      for (let i = 0; i < notifs.length; i += 100) {
        const { error } = await supabase.from('notification').insert(notifs.slice(i, i + 100));
        if (error) console.warn('Erreur insert notifications:', error.message);
      }
    } catch (err) {
      console.warn('Erreur notifications:', err);
    }
  };

  // ── SOUMISSION ──
  const handleSubmit = async () => {
    if (!valider()) { Alert.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires.'); return; }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Non connecté', 'Vous devez être connecté.'); return; }

      const typeInfo  = TYPES_DISPARITION.find(t => t.key === form.type_urgence);
      const estUrgent = typeInfo?.alerteImmediate ?? false;

      // 1. Créer la personne
      const { data: personne, error: errPersonne } = await supabase
        .from('personne')
        .insert({
          nom:                       form.nom,
          prenom:                    form.prenom,
          age_estime_min:            form.age ? parseInt(form.age) : null,
          age_estime_max:            form.age ? parseInt(form.age) : null,
          sexe:                      form.genre,
          description_physique:      form.description_physique,
          derniers_vetements_portes: form.vetements,
        })
        .select('id')
        .single();

      if (errPersonne) { Alert.alert('Erreur', errPersonne.message); return; }

      // 2. Créer le dossier
      const [jour, mois, annee] = form.date_disparition.split('/');
      const dateISO = new Date(`${annee}-${mois}-${jour}T${form.heure_disparition}:00`).toISOString();

      const { data: dossier, error: errDossier } = await supabase
        .from('dossier_disparition')
        .insert({
          id_personne:             personne.id,
          lieu_disparition:        form.lieu_disparition,
          latitude_disparition:    form.latitude,
          longitude_disparition:   form.longitude,
          date_disparition:        dateISO,
          circonstances:           `${form.description_physique}${form.vetements ? `\nVêtements: ${form.vetements}` : ''}`,
          type_disparition:        estUrgent ? 'enlevement_presume' : 'inconnue',
          niveau_urgence:          form.type_urgence,
          statut_dossier:          'en_cours',
          id_utilisateur_createur: user.id,
        })
        .select('id')
        .single();

      if (errDossier) { Alert.alert('Erreur', errDossier.message); return; }

      // 3. Créer le signalement
      const { data: signalement, error: errSignal } = await supabase
        .from('signalement')
        .insert({
          description:           `${form.description_physique}${form.vetements ? '\nVêtements: ' + form.vetements : ''}`,
          date_observation:      dateISO,
          lieu_observation:      form.lieu_disparition || null,
          latitude_observation:  form.latitude,
          longitude_observation: form.longitude,
          niveau_certitude:      'probable',
          statut_validation:     estUrgent ? 'valide' : 'en_attente',
          source_signalement:    'application_mobile',
          id_utilisateur:        user.id,
          id_dossier:            dossier.id,
        })
        .select('id')
        .single();

      if (errSignal) { Alert.alert('Erreur', errSignal.message); return; }

      // 4. Upload photos ── photo_principale mise à jour AVANT l'alerte ──
      let premierePhotoUrl: string | null = null;

      for (const [idx, photo] of form.photos.entries()) {
        try {
          const ext      = photo.name.split('.').pop() ?? 'jpg';
          // ✅ Utilise personne.id dans le path — toujours disponible
          const fileName = `personnes/${personne.id}/${Date.now()}_${idx}.${ext}`;
          const blob     = await (await fetch(photo.uri)).blob();

          const { error: errUp } = await supabase.storage
            .from('photos')
            .upload(fileName, blob, { contentType: photo.type, cacheControl: '3600' });

          if (errUp) { console.warn('Upload error:', errUp.message); continue; }

          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

          // ✅ URL sauvegardée AVANT l'insert dans photo
          if (idx === 0) premierePhotoUrl = urlData.publicUrl;

          await supabase.from('photo').insert({
            url_cloudinary: urlData.publicUrl,
            id_signalement: signalement.id,
            id_personne:    personne.id,  // ✅ lié à la personne
            uploadee_par:   user.id,
            approuvee:      false,        // le modérateur approuvera
            visible_public: false,        // sera rendu visible par modérateur
            type_photo:     'portrait',
            est_principale: idx === 0,
          });

        } catch (e) { console.warn('Erreur photo:', e); }
      }

      // 5. ✅ Mettre à jour photo_principale sur personne
      // Quand le modérateur créera l'alerte, la photo sera déjà disponible
      if (premierePhotoUrl) {
        const { error: errPhotoUpdate } = await supabase
          .from('personne')
          .update({ photo_principale: premierePhotoUrl })
          .eq('id', personne.id);

        if (errPhotoUpdate) {
          console.warn('⚠️ Erreur update photo_principale:', errPhotoUpdate.message);
        } else {
          console.log('✅ photo_principale mise à jour:', premierePhotoUrl);
        }
      } else {
        console.warn('⚠️ Aucune photo — photo_principale reste null');
      }

      // 6. Si urgent → créer l'alerte immédiatement
      // Si normal → le modérateur créera l'alerte depuis le dashboard
      if (estUrgent && form.latitude && form.longitude) {
        const { error: errAlerte } = await supabase
          .from('alerte')
          .insert({
            id_dossier:              dossier.id,
            titre:                   `Disparition - ${form.prenom} ${form.nom}`,
            message:                 `Une disparition a été signalée à ${form.lieu_disparition || 'localisation inconnue'}.`,
            message_court:           `${form.prenom} ${form.nom} - Disparition signalée`,
            type_alerte:             form.type_urgence === 'critique'
                                       ? 'amber_alert'
                                       : 'disparition_adulte_vulnerable',
            latitude_centre:         form.latitude,
            longitude_centre:        form.longitude,
            rayon_km:                100,
            date_diffusion:          new Date().toISOString(),
            statut_alerte:           'en_cours',
            validee:                 true,
            id_utilisateur_createur: user.id,
          });

        if (errAlerte) console.warn('Erreur création alerte:', errAlerte.message);
      }

      // 7. Notifications géolocalisées
      if (form.latitude && form.longitude) {
        await envoyerNotifications(
          dossier.id, user.id,
          form.latitude, form.longitude,
          form.prenom, form.nom,
        );
      }

      Alert.alert(
        estUrgent ? '🚨 Alerte déclenchée' : '✅ Signalement envoyé',
        estUrgent
          ? 'L\'alerte a été diffusée aux autorités et aux citoyens à proximité.'
          : 'Votre signalement a été transmis. Il sera examiné par notre équipe.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (err: any) {
      console.error('Erreur handleSubmit:', err);
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const isUrgent = TYPES_DISPARITION.find(t => t.key === form.type_urgence)?.alerteImmediate ?? false;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* NAVBAR */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.eyeOuter}><View style={styles.eyeInner} /></View>
            <Text style={styles.logoTxt}>Retrouvons<Text style={styles.logoAccent}>Les</Text></Text>
          </View>
        </View>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <BandeauUrgence />
        <Text style={styles.pageTitle}>Signaler une disparition</Text>
        <Text style={styles.pageSub}>Remplissez ces informations avec le plus de précision possible pour faciliter les recherches.</Text>

        {/* TYPE DISPARITION */}
        <View style={styles.card}>
          <SelecteurTypeDisparition value={form.type_urgence} onChange={(v) => set('type_urgence', v as any)} />
        </View>

        {/* PHOTOS */}
        <View style={styles.card}>
          <SectionHeader icon="camera-outline" label="Photos" />
          <UploadPhotos
            photos={form.photos}
            onAdd={(p) => set('photos', [...form.photos, p])}
            onRemove={(i) => set('photos', form.photos.filter((_, idx) => idx !== i))}
          />
        </View>

        {/* IDENTITÉ */}
        <View style={styles.card}>
          <SectionHeader icon="person-outline" label="Identité" />
          <View style={styles.row}>
            <ChampInput label="Prénom" placeholder="Ex: Jean" value={form.prenom} onChangeText={(v: string) => set('prenom', v)} style={{ flex: 1, marginRight: 8 }} />
            <ChampInput label="Nom" placeholder="Ex: Dupont" value={form.nom} onChangeText={(v: string) => set('nom', v)} style={{ flex: 1 }} />
          </View>
          {(errors.prenom || errors.nom) && <Text style={styles.errTxt}>{errors.prenom || errors.nom}</Text>}
          <View style={styles.row}>
            <ChampInput label="Âge" placeholder="Âge estimé" value={form.age} onChangeText={(v: string) => set('age', v)} keyboardType="numeric" style={{ flex: 1, marginRight: 8 }} />
            <SelecteurGenre value={form.genre} onChange={(v) => set('genre', v)} />
          </View>
        </View>

        {/* DERNIÈRE APPARITION */}
        <View style={styles.card}>
          <SectionHeader icon="location-outline" label="Dernière Apparition" />
          <ChampInput label="Lieu précis" placeholder="Ville, quartier, rue..." value={form.lieu_disparition} onChangeText={(v: string) => set('lieu_disparition', v)} icon="map-outline" />

          <Text style={inS.label}>Date et heure</Text>
          <View style={[styles.row, { marginBottom: 10, gap: 8 }]}>
            <View style={[inS.box, { flex: 1 }]}>
              <Ionicons name="calendar-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput style={inS.input} placeholder="JJ/MM/AAAA" value={form.date_disparition} onChangeText={(v) => set('date_disparition', v)} />
            </View>
            <View style={[inS.box, { flex: 1 }]}>
              <Ionicons name="time-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput style={inS.input} placeholder="HH:MM" value={form.heure_disparition} onChangeText={(v) => set('heure_disparition', v)} />
            </View>
          </View>

          <CarteLocalisation
            latitude={form.latitude} longitude={form.longitude}
            onPress={(lat, lng) => { set('latitude', lat); set('longitude', lng); }}
            onGeolocate={handleGeolocate} loading={geoLoading}
          />
          {errors.localisation && <Text style={styles.errTxt}>{errors.localisation}</Text>}

          <TouchableOpacity style={styles.geoButton} onPress={handleGeolocate} activeOpacity={0.8}>
            <Ionicons name="locate-outline" size={18} color="#1d4ed8" />
            <Text style={styles.geoButtonText}>Utiliser ma position actuelle</Text>
            {geoLoading && <ActivityIndicator size="small" color="#1d4ed8" />}
          </TouchableOpacity>
        </View>

        {/* DESCRIPTION PHYSIQUE */}
        <View style={styles.card}>
          <SectionHeader icon="eye-outline" label="Description Physique" />
          <ChampInput placeholder="Taille, couleur des yeux, cheveux, signes particuliers (tatouages, cicatrices)..." value={form.description_physique} onChangeText={(v: string) => set('description_physique', v)} multiline />
        </View>

        {/* VÊTEMENTS */}
        <View style={styles.card}>
          <SectionHeader icon="shirt-outline" label="Vêtements Portés" />
          <ChampInput placeholder="Haut, pantalon, chaussures, sac, accessoires au moment de la disparition..." value={form.vetements} onChangeText={(v: string) => set('vetements', v)} multiline />
        </View>

        {/* BOUTON */}
        <TouchableOpacity
          style={[styles.btnPublier, isUrgent && styles.btnUrgent, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.btnPublierTxt}>{isUrgent ? "DÉCLENCHER L'ALERTE" : 'PUBLIER LE SIGNALEMENT'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc' },
  content:       { padding: 16, paddingBottom: 40 },
  navBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 40 : 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  navBtn:        { width: 36, height: 36, justifyContent: 'center' },
  navCenter:     { flex: 1, alignItems: 'center' },
  eyeOuter:      { width: 20, height: 12, borderRadius: 10, borderWidth: 2, borderColor: '#0b1c30', justifyContent: 'center', alignItems: 'center' },
  eyeInner:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0b1c30' },
  logoTxt:       { fontSize: 16, fontWeight: '800', color: '#0b1c30', letterSpacing: -0.3 },
  logoAccent:    { color: '#b45f06' },
  pageTitle:     { fontSize: 18, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  pageSub:       { fontSize: 13, color: '#45464d', lineHeight: 19, marginBottom: 16 },
  card:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  row:           { flexDirection: 'row', alignItems: 'flex-start' },
  errTxt:        { fontSize: 11, color: '#ef4444', marginTop: -6, marginBottom: 8 },
  btnPublier:    { backgroundColor: '#0b1c30', borderRadius: 12, paddingVertical: 16, marginTop: 4, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  btnUrgent:     { backgroundColor: '#dc2626' },
  btnPublierTxt: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  geoButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginTop: 8, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  geoButtonText: { fontSize: 13, color: '#1d4ed8', fontWeight: '500' },
});