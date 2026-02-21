import React, { useState, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Platform, StyleSheet, View, TextInput, TouchableOpacity, Text, SafeAreaView, Dimensions, PermissionsAndroid } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { Search, Users, Eye, Crosshair, RefreshCcw } from 'lucide-react-native';
// @ts-ignore
import Config from 'react-native-config';

const { width, height } = Dimensions.get('window');

const CarteDesAlertes = () => {
  const [region, setRegion] = useState({
    latitude: 3.848,
    longitude: 11.502,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Fonction de permission Android corrigée
  const requestAndroidPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn("Erreur permission:", err);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    let watchId: number | null = null;

    const startTracking = async () => {
      const hasPermission = await requestAndroidPermission();
      
      if (Platform.OS === 'ios') {
        Geolocation.requestAuthorization('whenInUse');
      }

      if (hasPermission || Platform.OS === 'ios') {
        watchId = Geolocation.watchPosition(
          position => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            setRegion(prev => ({
              ...prev,
              latitude,
              longitude,
            }));
          },
          error => console.log("Erreur Géo:", error.message),
          { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
        );
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // --- SÉCURISATION DE L'URL ---
  // On vérifie si la clé existe, sinon on utilise OpenStreetMap pour éviter le crash
  const MAPTILER_KEY = Config?.REACT_APP_MAPTILER_API_KEY;
  
  const tileUrl = MAPTILER_KEY 
    ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search color="#9ca3af" size={20} style={{ marginRight: 8 }} />
          <TextInput placeholder="Recherche..." style={styles.input} />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.blueButton}>
          <Users color="white" size={18} />
          <Text style={styles.buttonText}>Personnes disparues</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.blueButton, { backgroundColor: '#2563eb' }]}> 
          <Eye color="white" size={18} />
          <Text style={styles.buttonText}>Observations</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          initialRegion={region}
          // "none" empêche Android de chercher une clé Google Maps payante
          mapType={Platform.OS === 'android' ? "none" : "standard"}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          <UrlTile 
            urlTemplate={tileUrl} 
            maximumZ={19} 
            zIndex={1} 
          />
          
          {userLocation && (
            <Marker coordinate={userLocation} zIndex={2}>
              <View style={styles.eyeMarker}>
                <Eye color="white" size={14} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 15, backgroundColor: 'white' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 25, paddingHorizontal: 15, height: 45 },
  input: { flex: 1, fontSize: 16 },
  filterContainer: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: 'white' },
  blueButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 6 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 12 },
  mapWrapper: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  eyeMarker: { backgroundColor: '#8b5cf6', padding: 5, borderRadius: 20, borderWidth: 2, borderColor: 'white' }
});

export default CarteDesAlertes;