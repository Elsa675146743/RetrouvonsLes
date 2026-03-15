import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ScrollView, SafeAreaView, Modal, Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import DateTimePicker from '@react-native-community/datetimepicker';

// =====================================================
// PICKER MODAL
// =====================================================
const CustomPickerModal = ({ visible, data, onSelect, onClose }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalContent}>
        <Text style={styles.modalHeaderTitle}>Sélectionner une option</Text>
        {data.map((item: string) => (
          <TouchableOpacity key={item} style={styles.modalItem} onPress={() => onSelect(item)}>
            <Text style={styles.modalItemText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
const Disparition = ({ navigation, route }: any) => {
  const { personData }          = route.params || {};
  const existingData            = route.params?.dataDisparition || {};

  // ✅ Ref WebView correcte
  const webViewRef = useRef<any>(null);

  const [showMap, setShowMap]               = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalUrgence, setModalUrgence]     = useState(false);
  const [modalType, setModalType]           = useState(false);

  const [dateObj, setDateObj]               = useState(new Date());
  const [dateLabel, setDateLabel]           = useState(existingData.dateLabel || '');
  const [lieu, setLieu]                     = useState(existingData.lieu || '');
  const [ville, setVille]                   = useState(existingData.ville || '');
  const [region, setRegion]                 = useState(existingData.region || '');
  const [circonstances, setCirconstances]   = useState(existingData.circonstances || '');
  const [urgence, setUrgence]               = useState(existingData.urgence || 'Normal');
  const [typeDisparition, setTypeDisparition] = useState(existingData.typeDisparition || 'Inconnue');

  // ✅ Coordonnées GPS
  const [selectedLat, setSelectedLat]   = useState<number | null>(existingData.latitude  || null);
  const [selectedLng, setSelectedLng]   = useState<number | null>(existingData.longitude || null);
  const [searchQuery, setSearchQuery]   = useState('');

  const urgences = ['Faible', 'Normal', 'Urgent', 'Critique'];
  const types    = [
    'Inconnue', 'Fugue', 'Enlèvement présumé',
    'Accident', 'Disparition volontaire', 'Autre',
  ];

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      const d = selectedDate;
      setDateLabel(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
    }
  };

  // ✅ Reçoit les messages du WebView
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
        if (msg.region)    setRegion(msg.region);
      }

      if (msg.type === 'GEOCODE_ERROR') {
        Alert.alert('Recherche', msg.message || 'Aucun résultat trouvé.');
      }
    } catch (e) {
      console.error('Erreur message WebView:', e);
    }
  };

  // ✅ Envoie la recherche vers la carte
  const handleSearchOnMap = () => {
    if (!searchQuery.trim()) return;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        searchPlace(${JSON.stringify(searchQuery.trim())});
        true;
      `);
    }
  };

  const handleNext = () => {
    if (!dateLabel || !lieu || !circonstances) {
      Alert.alert('Champs manquants', 'Veuillez remplir la date, le lieu et les circonstances.');
      return;
    }
    navigation.navigate('contact', {
      personData,
      dataDisparition: {
        dateLabel,
        lieu,
        ville,
        region,
        circonstances,
        urgence,
        typeDisparition,
        latitude:  selectedLat,
        longitude: selectedLng,
      },
    });
  };

  const handleBack = () => {
    navigation.navigate('personne', { personData });
  };

  const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

  // ✅ Marqueur initial si coords déjà connues
  const initMarkerJS = (selectedLat && selectedLng)
    ? `
      setTimeout(function() {
        marker = new maplibregl.Marker({ color: '#ef4444', draggable: true })
          .setLngLat([${selectedLng}, ${selectedLat}])
          .addTo(map);
        map.flyTo({ center: [${selectedLng}, ${selectedLat}], zoom: 14 });
        showCoordsPanel(${selectedLat}, ${selectedLng});
        marker.on('dragend', function() {
          var ll = marker.getLngLat();
          updateCoords(ll.lat, ll.lng);
        });
      }, 1000);
    `
    : '';

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
        <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: sans-serif; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
          #coordsPanel {
            display: none;
            position: absolute;
            bottom: 10px; left: 10px; right: 10px;
            background: rgba(255,255,255,0.95);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 12px;
            color: #1e293b;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          #coordsPanel .title { font-weight: bold; color: #2563eb; margin-bottom: 3px; }
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
          var MAPTILER_KEY = '${MAPTILER_KEY}';

          var map = new maplibregl.Map({
            container: 'map',
            style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY,
            center: [11.502, 3.848],
            zoom: 11
          });

          map.addControl(new maplibregl.NavigationControl(), 'top-right');
          map.addControl(new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false
          }), 'top-right');

          // ✅ Clic sur la carte
          map.on('click', function(e) {
            var lat = e.lngLat.lat;
            var lng = e.lngLat.lng;
            placeMarker(lng, lat);
          });

          function placeMarker(lng, lat) {
            if (marker) marker.remove();
            marker = new maplibregl.Marker({ color: '#ef4444', draggable: true })
              .setLngLat([lng, lat])
              .addTo(map);
            marker.on('dragend', function() {
              var ll = marker.getLngLat();
              updateCoords(ll.lat, ll.lng);
            });
            updateCoords(lat, lng);
          }

          function showCoordsPanel(lat, lng) {
            document.getElementById('coordsPanel').style.display = 'block';
            document.getElementById('coordsText').innerHTML =
              'Lat: <b>' + lat.toFixed(6) + '</b> &nbsp; Lng: <b>' + lng.toFixed(6) + '</b>';
          }

          function updateCoords(lat, lng) {
            showCoordsPanel(lat, lng);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_CLICK',
              lat: lat,
              lng: lng
            }));
          }

          // ✅ Recherche d'un lieu
          async function searchPlace(query) {
            try {
              var url = 'https://api.maptiler.com/geocoding/' +
                encodeURIComponent(query) +
                '.json?key=' + MAPTILER_KEY + '&language=fr&limit=1';

              var resp = await fetch(url);
              var json = await resp.json();

              if (json.features && json.features.length > 0) {
                var feature   = json.features[0];
                var coords    = feature.geometry.coordinates;
                var placeName = feature.place_name_fr || feature.place_name || query;
                var city      = '';
                var region    = '';

                if (feature.context) {
                  feature.context.forEach(function(c) {
                    if (c.id && c.id.indexOf('place')  === 0) city   = c.text_fr || c.text || '';
                    if (c.id && c.id.indexOf('region') === 0) region = c.text_fr || c.text || '';
                  });
                }

                map.flyTo({ center: coords, zoom: 14, speed: 1.5 });
                placeMarker(coords[0], coords[1]);

                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type:      'GEOCODE_RESULT',
                  lat:       coords[1],
                  lng:       coords[0],
                  placeName: placeName,
                  city:      city,
                  region:    region
                }));

              } else {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type:    'GEOCODE_ERROR',
                  message: 'Aucun résultat pour : ' + query
                }));
              }
            } catch(err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type:    'GEOCODE_ERROR',
                message: 'Erreur de recherche'
              }));
            }
          }

          // Marqueur initial si coords déjà disponibles
          ${initMarkerJS}
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>

      {/* STEPPER */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepIcon, styles.stepDone]}>
            <Ionicons name="checkmark" size={16} color="#FFF" />
          </View>
          <Text style={styles.stepLabelDone}>Personne</Text>
        </View>
        <View style={styles.stepLineActive} />
        <View style={styles.stepItem}>
          <View style={[styles.stepIcon, styles.stepActive]}>
            <Ionicons name="location" size={16} color="#FFF" />
          </View>
          <Text style={styles.stepLabelActive}>Disparition</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Ionicons name="call-outline" size={16} color="#64748b" />
          </View>
          <Text style={styles.stepLabel}>Contacts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* EN-TÊTE SECTION */}
        <View style={styles.sectionHeader}>
          <View style={styles.blueIcon}>
            <Ionicons name="location-outline" size={20} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Informations sur la disparition</Text>
            <Text style={styles.sectionSub}>Lieu, date et circonstances</Text>
          </View>
        </View>

        {/* DATE + URGENCE */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>
              Date de disparition <Text style={{ color: 'red' }}>*</Text>
            </Text>
            <TouchableOpacity style={styles.inputWithIcon} onPress={() => setShowDatePicker(true)}>
              <Text style={[
                styles.textInputStyle,
                { color: dateLabel ? '#1e293b' : '#94a3b8', paddingTop: 10 }
              ]}>
                {dateLabel || 'Choisir une date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.innerIcon} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Niveau d'urgence</Text>
            <TouchableOpacity style={styles.fakePicker} onPress={() => setModalUrgence(true)}>
              <Text style={{ fontSize: 13, color: '#1e293b' }}>{urgence}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LIEU */}
        <Text style={styles.label}>
          Lieu de disparition <Text style={{ color: 'red' }}>*</Text>
        </Text>
        <TextInput
          style={styles.inputFull}
          placeholder="Adresse ou lieu précis"
          value={lieu}
          onChangeText={setLieu}
          placeholderTextColor="#94a3b8"
        />

        {/* VILLE + RÉGION */}
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={styles.inputBox}
              placeholder="Ex: Yaoundé"
              value={ville}
              onChangeText={setVille}
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Région</Text>
            <TextInput
              style={styles.inputBox}
              placeholder="Ex: Centre"
              value={region}
              onChangeText={setRegion}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* BOUTON AFFICHER/MASQUER CARTE */}
        <TouchableOpacity style={styles.mapToggleButton} onPress={() => setShowMap(!showMap)}>
          <Ionicons name={showMap ? 'eye-off-outline' : 'map-outline'} size={18} color="#64748b" />
          <Text style={styles.mapToggleText}>
            {showMap ? 'Masquer la carte' : 'Afficher la carte'}
          </Text>
        </TouchableOpacity>

        {/* ✅ BADGE COORDONNÉES SÉLECTIONNÉES */}
        {selectedLat !== null && selectedLng !== null && (
          <View style={styles.coordsBox}>
            <Ionicons name="location" size={14} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.coordsText}>
              {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </Text>
            <TouchableOpacity
              onPress={() => { setSelectedLat(null); setSelectedLng(null); }}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* ✅ CARTE + BARRE DE RECHERCHE */}
        {showMap && (
          <View style={styles.mapWrapper}>

            {/* Barre de recherche */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un lieu..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchOnMap}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearchOnMap}>
                <Text style={styles.searchBtnText}>OK</Text>
              </TouchableOpacity>
            </View>

            {/* WebView Carte */}
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
              💡 Recherchez un lieu ou cliquez sur la carte pour localiser la disparition
            </Text>
          </View>
        )}

        {/* TYPE DISPARITION */}
        <Text style={styles.label}>Type de disparition</Text>
        <TouchableOpacity style={styles.fakePickerFull} onPress={() => setModalType(true)}>
          <Text style={{ fontSize: 13, color: '#1e293b' }}>{typeDisparition}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>

        {/* CIRCONSTANCES */}
        <Text style={styles.label}>
          Circonstances <Text style={{ color: 'red' }}>*</Text>
        </Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Décrivez les détails..."
          value={circonstances}
          onChangeText={setCirconstances}
          placeholderTextColor="#94a3b8"
        />

        {/* MODALS */}
        <CustomPickerModal
          visible={modalUrgence}
          data={urgences}
          onSelect={(v: string) => { setUrgence(v); setModalUrgence(false); }}
          onClose={() => setModalUrgence(false)}
        />
        <CustomPickerModal
          visible={modalType}
          data={types}
          onSelect={(v: string) => { setTypeDisparition(v); setModalType(false); }}
          onClose={() => setModalType(false)}
        />

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrecedent} onPress={handleBack}>
          <Ionicons name="arrow-back" size={18} color="#64748b" />
          <Text style={styles.btnPrecedentText}>Précédent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSuivant} onPress={handleNext}>
          <Text style={styles.btnSuivantText}>Suivant</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#fcfdfe' },
  stepperContainer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  stepItem:           { alignItems: 'center', width: 60 },
  stepIcon:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepActive:         { backgroundColor: '#2563eb' },
  stepDone:           { backgroundColor: '#10b981' },
  stepLineActive:     { width: 40, height: 2, backgroundColor: '#10b981', marginBottom: 15 },
  stepLine:           { width: 40, height: 2, backgroundColor: '#f1f5f9', marginBottom: 15 },
  stepLabelActive:    { fontSize: 9, color: '#2563eb', fontWeight: 'bold' },
  stepLabelDone:      { fontSize: 9, color: '#10b981' },
  stepLabel:          { fontSize: 9, color: '#64748b' },
  content:            { padding: 20 },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  blueIcon:           { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle:       { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  sectionSub:         { fontSize: 11, color: '#64748b' },
  label:              { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  row:                { flexDirection: 'row', marginBottom: 5 },
  flexItem:           { flex: 1, marginRight: 8 },
  inputBox:           { height: 40, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, fontSize: 13, color: '#1e293b' },
  inputFull:          { height: 40, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, fontSize: 13, color: '#1e293b' },
  inputWithIcon:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, height: 40 },
  textInputStyle:     { flex: 1, paddingHorizontal: 10, fontSize: 13 },
  innerIcon:          { marginRight: 10 },
  fakePicker:         { height: 40, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fakePickerFull:     { height: 40, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  textArea:           { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, height: 80, textAlignVertical: 'top', color: '#1e293b' },
  mapToggleButton:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, alignSelf: 'flex-end', marginTop: 10 },
  mapToggleText:      { fontSize: 11, color: '#64748b', marginLeft: 5 },

  // Coordonnées
  coordsBox:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#dbeafe' },
  coordsText:         { fontSize: 12, color: '#2563eb', fontWeight: '600', flex: 1 },

  // Carte
  mapWrapper:         { marginTop: 10 },
  searchBar:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, height: 42, marginBottom: 8 },
  searchInput:        { flex: 1, fontSize: 13, color: '#1e293b' },
  searchBtn:          { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  searchBtnText:      { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  mapContainer:       { height: 300, backgroundColor: '#f1f5f9', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1' },
  mapHint:            { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 6, fontStyle: 'italic' },

  footer:             { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnPrecedent:       { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, width: '45%', justifyContent: 'center' },
  btnPrecedentText:   { marginLeft: 8, color: '#64748b', fontWeight: 'bold' },
  btnSuivant:         { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#2563eb', borderRadius: 8, width: '45%', justifyContent: 'center' },
  btnSuivantText:     { marginRight: 8, color: '#FFF', fontWeight: 'bold' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent:       { backgroundColor: '#FFF', width: '80%', borderRadius: 12, padding: 10, maxHeight: '50%' },
  modalHeaderTitle:   { fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingVertical: 10, color: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItem:          { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  modalItemText:      { fontSize: 14, color: '#1e293b' },
});

export default Disparition;