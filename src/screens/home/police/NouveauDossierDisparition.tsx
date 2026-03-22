import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, Alert, Switch
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';

const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

function Stepper({ etape }: { etape: number }) {
  const etapes = [
    { num: 1, label: 'Personne'     },
    { num: 2, label: 'Disparition'  },
    { num: 3, label: 'Vérification' },
  ];
  return (
    <View style={sStyles.container}>
      {etapes.map((e, i) => (
        <React.Fragment key={e.num}>
          <View style={sStyles.item}>
            <View style={[sStyles.circle, etape >= e.num && sStyles.circleActive]}>
              <Text style={[sStyles.circleText, etape >= e.num && sStyles.circleTextActive]}>{e.num}</Text>
            </View>
            <Text style={[sStyles.label, etape >= e.num && sStyles.labelActive]}>{e.label}</Text>
          </View>
          {i < etapes.length - 1 && (
            <View style={[sStyles.line, etape > e.num && sStyles.lineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const sStyles = StyleSheet.create({
  container:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  item:             { alignItems: 'center', gap: 6 },
  circle:           { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  circleActive:     { backgroundColor: '#2563eb' },
  circleText:       { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  circleTextActive: { color: '#FFF' },
  label:            { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  labelActive:      { color: '#2563eb' },
  line:             { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginBottom: 16, marginHorizontal: 4 },
  lineActive:       { backgroundColor: '#2563eb' },
});

export default function NouveauDossierDisparition({ navigation, route }: any) {
  const { personData } = route.params || {};
  const webViewRef = useRef<any>(null);

  const [urgence, setUrgence]                   = useState('normal');
  const [dateDisparition, setDateDisparition]   = useState('');
  const [lieu, setLieu]                         = useState('');
  const [ville, setVille]                       = useState('');
  const [pays, setPays]                         = useState('Cameroun');
  const [circonstances, setCirconstances]       = useState('');
  const [vetements, setVetements]               = useState('');
  const [objets, setObjets]                     = useState('');
  const [derniereActivite, setDerniereActivite] = useState('');
  const [contactNom, setContactNom]             = useState('');
  const [contactTel, setContactTel]             = useState('');
  const [contactEmail, setContactEmail]         = useState('');
  const [visiblePublic, setVisiblePublic]       = useState(true);
  const [diffusionAutorisee, setDiffusionAutorisee] = useState(true);
  const [showMap, setShowMap]                   = useState(false);
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedLat, setSelectedLat]           = useState<number | null>(null);
  const [selectedLng, setSelectedLng]           = useState<number | null>(null);

  const urgenceOptions = [
    { label: 'FAIBLE',   value: 'faible',   color: '#16a34a' },
    { label: 'NORMAL',   value: 'normal',   color: '#f59e0b' },
    { label: 'URGENT',   value: 'urgent',   color: '#f97316' },
    { label: 'CRITIQUE', value: 'critique', color: '#dc2626' },
  ];

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_CLICK') {
        setSelectedLat(msg.lat);
        setSelectedLng(msg.lng);
        if (!lieu) setLieu(`${msg.lat.toFixed(5)}, ${msg.lng.toFixed(5)}`);
      }
      if (msg.type === 'GEOCODE_RESULT') {
        setSelectedLat(msg.lat);
        setSelectedLng(msg.lng);
        if (msg.placeName) setLieu(msg.placeName);
        if (msg.city)      setVille(msg.city);
      }
      if (msg.type === 'GEOCODE_ERROR') {
        Alert.alert('Recherche', msg.message || 'Aucun résultat.');
      }
    } catch (e) { console.error(e); }
  };

  const handleSearchOnMap = () => {
    if (!searchQuery.trim()) return;
    webViewRef.current?.injectJavaScript(`searchPlace(${JSON.stringify(searchQuery.trim())}); true;`);
  };

  const mapHtml = `
    <!DOCTYPE html><html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
      <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet" />
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:sans-serif; }
        #map { position:absolute; top:0; bottom:0; width:100%; height:100%; }
        #coordsPanel { display:none; position:absolute; bottom:10px; left:10px; right:10px;
          background:rgba(255,255,255,0.95); border-radius:8px; padding:8px 12px;
          font-size:12px; color:#1e293b; z-index:10; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
        #coordsPanel .title { font-weight:bold; color:#2563eb; margin-bottom:3px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="coordsPanel">
        <div class="title">📍 Point sélectionné</div>
        <div id="coordsText"></div>
      </div>
      <script>
        var marker = null;
        var map = new maplibregl.Map({
          container:'map',
          style:'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
          center:[11.502,3.848], zoom:7
        });
        map.addControl(new maplibregl.NavigationControl(),'top-right');
        map.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:false}),'top-right');
        map.on('click',function(e){ placeMarker(e.lngLat.lng,e.lngLat.lat); });
        function placeMarker(lng,lat){
          if(marker) marker.remove();
          marker=new maplibregl.Marker({color:'#ef4444',draggable:true}).setLngLat([lng,lat]).addTo(map);
          marker.on('dragend',function(){ var ll=marker.getLngLat(); updateCoords(ll.lat,ll.lng); });
          updateCoords(lat,lng);
        }
        function showCoordsPanel(lat,lng){
          document.getElementById('coordsPanel').style.display='block';
          document.getElementById('coordsText').innerHTML='Lat: <b>'+lat.toFixed(6)+'</b> &nbsp; Lng: <b>'+lng.toFixed(6)+'</b>';
        }
        function updateCoords(lat,lng){
          showCoordsPanel(lat,lng);
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_CLICK',lat:lat,lng:lng}));
        }
        async function searchPlace(query){
          try{
            var url='https://api.maptiler.com/geocoding/'+encodeURIComponent(query)+'.json?key=${MAPTILER_KEY}&language=fr&limit=1';
            var resp=await fetch(url); var json=await resp.json();
            if(json.features&&json.features.length>0){
              var f=json.features[0]; var coords=f.geometry.coordinates;
              var placeName=f.place_name_fr||f.place_name||query;
              var city='',region='';
              if(f.context) f.context.forEach(function(c){
                if(c.id&&c.id.indexOf('place')===0) city=c.text_fr||c.text||'';
                if(c.id&&c.id.indexOf('region')===0) region=c.text_fr||c.text||'';
              });
              map.flyTo({center:coords,zoom:14,speed:1.5});
              placeMarker(coords[0],coords[1]);
              window.ReactNativeWebView.postMessage(JSON.stringify({type:'GEOCODE_RESULT',lat:coords[1],lng:coords[0],placeName:placeName,city:city,region:region}));
            } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({type:'GEOCODE_ERROR',message:'Aucun résultat pour : '+query}));
            }
          }catch(err){
            window.ReactNativeWebView.postMessage(JSON.stringify({type:'GEOCODE_ERROR',message:'Erreur réseau'}));
          }
        }
      </script>
    </body></html>
  `;

  const handleSuivant = () => {
    if (!dateDisparition || !lieu || !circonstances) {
      Alert.alert('Champs requis', 'La date, le lieu et les circonstances sont obligatoires.');
      return;
    }
    navigation.navigate('NouveauDossierVerification', {
      personData,
      disparitionData: {
        urgence, dateDisparition, lieu, ville, pays,
        latitude: selectedLat, longitude: selectedLng,
        circonstances, vetements, objets, derniereActivite,
        contactNom, contactTel, contactEmail,
        visiblePublic, diffusionAutorisee,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Créer un Nouveau Dossier</Text>
          <Text style={styles.headerSub}>Étape 2 sur 3 - Détails Disparition</Text>
        </View>
      </View>

      <Stepper etape={2} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Détails de la Disparition</Text>
          </View>

          {/* URGENCE */}
          <View style={styles.field}>
            <Text style={styles.label}>Niveau d'urgence <Text style={styles.required}>*</Text></Text>
            <View style={styles.urgenceRow}>
              {urgenceOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.urgenceBtn, urgence === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                  onPress={() => setUrgence(opt.value)}
                >
                  <Text style={[styles.urgenceBtnText, urgence === opt.value && styles.urgenceBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DATE */}
          <View style={styles.field}>
            <Text style={styles.label}>Date de disparition <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="JJ/MM/AAAA" placeholderTextColor="#94a3b8" value={dateDisparition} onChangeText={setDateDisparition} keyboardType="numeric" />
          </View>

          {/* LIEU + VILLE */}
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Lieu de disparition <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Adresse ou description du lieu" placeholderTextColor="#94a3b8" value={lieu} onChangeText={setLieu} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Ville</Text>
              <TextInput style={styles.input} placeholder="ex: Yaoundé" placeholderTextColor="#94a3b8" value={ville} onChangeText={setVille} />
            </View>
          </View>

          {/* PAYS */}
          <View style={styles.field}>
            <Text style={styles.label}>Pays</Text>
            <TextInput style={styles.input} value={pays} onChangeText={setPays} placeholderTextColor="#94a3b8" />
          </View>

          {/* CARTE */}
          <View style={styles.field}>
            <View style={styles.carteHeaderRow}>
              <Text style={styles.label}>Localisation sur la carte</Text>
              <TouchableOpacity style={styles.btnToggleCarte} onPress={() => setShowMap(!showMap)}>
                <Text style={styles.btnToggleCarteText}>{showMap ? 'Masquer la carte' : 'Afficher la carte'}</Text>
              </TouchableOpacity>
            </View>

            {selectedLat !== null && selectedLng !== null && (
              <View style={styles.coordsBadge}>
                <Ionicons name="location" size={14} color="#2563eb" />
                <Text style={styles.coordsText}>{selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}</Text>
                <TouchableOpacity onPress={() => { setSelectedLat(null); setSelectedLng(null); }}>
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            {showMap && (
              <View style={styles.mapWrapper}>
                <View style={styles.mapSearchBar}>
                  <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.mapSearchInput}
                    placeholder="Rechercher un lieu (ex: Bonanjo, Douala)"
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchOnMap}
                    returnKeyType="search"
                  />
                </View>
                <View style={styles.mapContainer}>
                  <WebView
                    ref={webViewRef}
                    originWhitelist={['*']}
                    source={{ html: mapHtml }}
                    style={{ flex: 1 }}
                    javaScriptEnabled
                    onMessage={handleWebViewMessage}
                  />
                </View>
                <Text style={styles.mapHint}>
                  Astuce: recherchez un lieu puis cliquez sur la carte pour ajuster précisément.
                </Text>
              </View>
            )}
          </View>

          {/* CIRCONSTANCES */}
          <View style={styles.field}>
            <Text style={styles.label}>Circonstances</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Décrivez les circonstances de la disparition..." placeholderTextColor="#94a3b8" value={circonstances} onChangeText={setCirconstances} multiline numberOfLines={4} textAlignVertical="top" />
          </View>

          {/* VÊTEMENTS + OBJETS */}
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Vêtements portés</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Description des vêtements..." placeholderTextColor="#94a3b8" value={vetements} onChangeText={setVetements} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Objets personnels</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Téléphone, sac, bijoux..." placeholderTextColor="#94a3b8" value={objets} onChangeText={setObjets} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
          </View>

          {/* DERNIÈRE ACTIVITÉ */}
          <View style={styles.field}>
            <Text style={styles.label}>Dernière activité connue</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Qu'était en train de faire la personne avant sa disparition..." placeholderTextColor="#94a3b8" value={derniereActivite} onChangeText={setDerniereActivite} multiline numberOfLines={3} textAlignVertical="top" />
          </View>
        </View>

        {/* CONTACT FAMILLE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Contact de la Famille</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Nom du contact</Text>
              <TextInput style={styles.input} placeholder="Nom complet" placeholderTextColor="#94a3b8" value={contactNom} onChangeText={setContactNom} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput style={styles.input} placeholder="+237..." placeholderTextColor="#94a3b8" value={contactTel} onChangeText={setContactTel} keyboardType="phone-pad" />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="email@example.com" placeholderTextColor="#94a3b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" />
          </View>
        </View>

        {/* OPTIONS DIFFUSION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="megaphone-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Options de Diffusion</Text>
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Visible au public</Text>
            <Switch value={visiblePublic} onValueChange={setVisiblePublic} trackColor={{ true: '#2563eb', false: '#e2e8f0' }} thumbColor="#FFF" />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Diffusion autorisée (alertes)</Text>
            <Switch value={diffusionAutorisee} onValueChange={setDiffusionAutorisee} trackColor={{ true: '#2563eb', false: '#e2e8f0' }} thumbColor="#FFF" />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.btnRetourText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSuivant} onPress={handleSuivant}>
          <Text style={styles.btnSuivantText}>Suivant →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f8fafc' },
  header:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle:          { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  headerSub:            { fontSize: 11, color: '#64748b', marginTop: 1 },
  scrollContent:        { padding: 16, paddingBottom: 20 },
  sectionCard:          { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionTitle:         { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  row:                  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldHalf:            { flex: 1 },
  field:                { marginBottom: 12 },
  label:                { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required:             { color: '#ef4444' },
  input:                { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1e293b' },
  textArea:             { height: 80, paddingTop: 10 },
  urgenceRow:           { flexDirection: 'row', gap: 6 },
  urgenceBtn:           { flex: 1, height: 40, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  urgenceBtnText:       { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  urgenceBtnTextActive: { color: '#FFF' },
  carteHeaderRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  btnToggleCarte:       { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnToggleCarteText:   { fontSize: 12, color: '#64748b', fontWeight: '600' },
  coordsBadge:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#dbeafe' },
  coordsText:           { fontSize: 12, color: '#2563eb', fontWeight: '600', flex: 1 },
  mapWrapper:           { marginBottom: 8 },
  mapSearchBar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  mapSearchInput:       { flex: 1, fontSize: 13, color: '#1e293b' },
  mapContainer:         { height: 280, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#d1d5db' },
  mapHint:              { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  switchRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  switchLabel:          { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  footer:               { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnRetour:            { backgroundColor: '#64748b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnRetourText:        { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnSuivant:           { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnSuivantText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
});