import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, TextInput, TouchableOpacity, 
  Text, SafeAreaView, Platform, PermissionsAndroid 
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import { Search, Users, Navigation } from 'lucide-react-native';

const CarteDesAlertes = () => {
  const [userCoords, setUserCoords] = useState({ lat: 3.848, lng: 11.502 }); // Yaoundé par défaut
  const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  useEffect(() => {
    requestPermission().then(hasPermission => {
      if (hasPermission) {
        Geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => console.log("Erreur localisation:", err),
          { enableHighAccuracy: true }
        );
      }
    });
  }, []);

  // Le HTML contient le moteur de carte MapLibre (plus léger et gratuit)
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
        <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet" />
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
          .marker-user {
            background-color: #2563eb;
            width: 15px; height: 15px;
            border-radius: 50%; border: 2px solid white;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = new maplibregl.Map({
            container: 'map',
            style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
            center: [${userCoords.lng}, ${userCoords.lat}],
            zoom: 12
          });

          // Ajouter un marqueur pour l'utilisateur
          const el = document.createElement('div');
          el.className = 'marker-user';
          new maplibregl.Marker(el)
            .setLngLat([${userCoords.lng}, ${userCoords.lat}])
            .addTo(map);

          // Fonction pour recentrer (appelable depuis React Native si besoin)
          window.centerMap = (lng, lat) => {
            map.flyTo({ center: [lng, lat], zoom: 14 });
          };
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      {/* Barre de recherche flottante */}
      <View style={styles.headerFloating}>
        <View style={styles.searchBar}>
          <Search color="#64748b" size={20} />
          <TextInput 
            placeholder="Rechercher une alerte..." 
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* La Carte via WebView */}
      <View style={styles.mapContainer}>
        <WebView 
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      {/* Boutons d'actions flottants */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.fab}>
          <Users color="white" size={20} />
          <Text style={styles.fabText}>Alertes proches</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.fab, styles.fabSecondary]}
            onPress={() => {/* Logique pour recentrer */}}
        >
          <Navigation color="#1d4ed8" size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerFloating: {
    position: 'absolute', top: 50, left: 20, right: 20,
    zIndex: 10, elevation: 5,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 30,
    paddingHorizontal: 15, height: 50,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1e293b' },
  mapContainer: { flex: 1 },
  webview: { flex: 1 },
  bottomActions: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  fab: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1d4ed8', paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 25, elevation: 4,
  },
  fabSecondary: {
    backgroundColor: 'white', width: 50, height: 50,
    justifyContent: 'center', paddingHorizontal: 0,
  },
  fabText: { color: 'white', fontWeight: '600', marginLeft: 8 }
});

export default CarteDesAlertes;