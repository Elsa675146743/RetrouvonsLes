import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, FlatList, SafeAreaView,
  ActivityIndicator, Dimensions, Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

type OngletKey = 'personnes' | 'observations' | 'alertes';

interface DossierDisparition {
  id: string;
  latitude_disparition: number;
  longitude_disparition: number;
  statut_dossier: string;
  date_disparition: string;
  ville_disparition?: string;
  niveau_urgence?: string;
  nom?: string;
  prenom?: string;
}

interface Signalement {
  id: string;
  latitude_observation: number;
  longitude_observation: number;
  statut_validation: string;
  description?: string;
  ville_observation?: string;
}

interface Alerte {
  id: string;
  latitude_centre: number;
  longitude_centre: number;
  titre?: string;
  message_court?: string;
  statut_alerte?: string;
  date_diffusion?: string;
}

const ONGLETS = [
  { key: 'personnes' as OngletKey, label: 'Personnes disparues', icon: 'person-outline' },
  { key: 'observations' as OngletKey, label: 'Observations', icon: 'eye-outline' },
  { key: 'alertes' as OngletKey, label: 'Alertes', icon: 'notifications-outline' },
];

const STATUTS = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'retrouve_vivant', label: 'Retrouvé vivant' },
  { value: 'retrouve_decede', label: 'Retrouvé décédé' },
];

function buildMapHTML(
  dossiers: DossierDisparition[],
  signalements: Signalement[],
  alertes: Alerte[],
  onglet: OngletKey,
  recherchePoint: { lat: number; lng: number; nom: string } | null
): string {
  let markersJS = '';

  // Centrer la carte sur le point recherché ou sur le Cameroun
  let centerLat = 3.8480;
  let centerLng = 11.5021;
  let zoom = 11;

  if (recherchePoint) {
    centerLat = recherchePoint.lat;
    centerLng = recherchePoint.lng;
    zoom = 14;
    // Ajouter un marqueur spécial pour le résultat de recherche
    markersJS += `
      new maplibregl.Marker({ color: '#10B981' })
        .setLngLat([${recherchePoint.lng}, ${recherchePoint.lat}])
        .setPopup(new maplibregl.Popup().setHTML(
          '<b>📍 ${recherchePoint.nom}</b><br/>Résultat de recherche'
        ))
        .addTo(map);
    `;
  }

  if (onglet === 'personnes') {
    dossiers.forEach((d) => {
      if (!d.latitude_disparition || !d.longitude_disparition) return;
      const nom = `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() || 'Personne disparue';
      const ville = d.ville_disparition ?? '';
      const statut = d.statut_dossier ?? '';
      const date = d.date_disparition ? new Date(d.date_disparition).toLocaleDateString('fr-FR') : 'N/A';
      markersJS += `
        new maplibregl.Marker({ color: '#F59E0B' })
          .setLngLat([${d.longitude_disparition}, ${d.latitude_disparition}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>👤 ${nom}</b><br/>📍 ${ville}<br/>📌 ${statut}<br/>📅 ${date}'
          ))
          .addTo(map);
      `;
    });
  }

  if (onglet === 'observations') {
    signalements.forEach((s) => {
      if (!s.latitude_observation || !s.longitude_observation) return;
      const desc = (s.description ?? '').substring(0, 100).replace(/'/g, "\\'");
      const ville = s.ville_observation ?? '';
      markersJS += `
        new maplibregl.Marker({ color: '#3B82F6' })
          .setLngLat([${s.longitude_observation}, ${s.latitude_observation}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>👁️ Observation</b><br/>📍 ${ville}<br/>📝 ${desc}'
          ))
          .addTo(map);
      `;
    });
  }

  if (onglet === 'alertes') {
    alertes.forEach((a) => {
      if (!a.latitude_centre || !a.longitude_centre) return;
      const titre = a.titre ?? 'Alerte';
      const msg = (a.message_court ?? '').substring(0, 80).replace(/'/g, "\\'");
      markersJS += `
        new maplibregl.Marker({ color: '#EF4444' })
          .setLngLat([${a.longitude_centre}, ${a.latitude_centre}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>🔔 ${titre}</b><br/>${msg}'
          ))
          .addTo(map);
      `;
    });
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
      <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
      </style>
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
          showUserLocation: true,
        }), 'top-right');
        map.on('load', function () {
          ${markersJS}
        });
      </script>
    </body>
    </html>
  `;
}

export default function Carte({ navigation }: any) {
  const [ongletActif, setOngletActif] = useState<OngletKey>('personnes');
  const [statut, setStatut] = useState(STATUTS[0]);
  const [modalStatutVisible, setModalStatutVisible] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recherchePoint, setRecherchePoint] = useState<{ lat: number; lng: number; nom: string } | null>(null);

  const [dossiers, setDossiers] = useState<DossierDisparition[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapKey, setMapKey] = useState(0);

  // Recherche de lieux via Nominatim (OpenStreetMap)
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cm&limit=10`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectLocation = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setRecherchePoint({ lat, lng, nom: item.display_name.split(',')[0] });
    setRecherche(item.display_name.split(',')[0]);
    setShowResults(false);
    Keyboard.dismiss();
    setMapKey(prev => prev + 1);
  };

  const fetchDossiers = useCallback(async () => {
    let query = supabase
      .from('dossier_disparition')
      .select(`
        id,
        latitude_disparition,
        longitude_disparition,
        statut_dossier,
        date_disparition,
        ville_disparition,
        niveau_urgence,
        personne ( nom, prenom )
      `)
      .not('latitude_disparition', 'is', null)
      .not('longitude_disparition', 'is', null);
    if (statut.value !== 'tous') query = query.eq('statut_dossier', statut.value);
    const { data, error } = await query;
    if (!error && data) {
      const formatted = (data as any[]).map(d => ({
        ...d,
        nom: d.personne?.nom,
        prenom: d.personne?.prenom,
      }));
      setDossiers(formatted as DossierDisparition[]);
    }
  }, [statut]);

  const fetchSignalements = useCallback(async () => {
    let query = supabase
      .from('signalement')
      .select(`
        id,
        latitude_observation,
        longitude_observation,
        statut_validation,
        description,
        ville_observation
      `)
      .not('latitude_observation', 'is', null)
      .not('longitude_observation', 'is', null);
    if (statut.value !== 'tous') query = query.eq('statut_validation', statut.value);
    const { data, error } = await query;
    if (!error) setSignalements(data ?? []);
  }, [statut]);

  const fetchAlertes = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerte')
      .select(`id, latitude_centre, longitude_centre, titre, message_court, statut_alerte, date_diffusion`)
      .not('latitude_centre', 'is', null)
      .not('longitude_centre', 'is', null)
      .eq('statut_alerte', 'en_cours');
    if (!error) setAlertes(data ?? []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchDossiers(), fetchSignalements(), fetchAlertes()]);
    setLoading(false);
  }, [fetchDossiers, fetchSignalements, fetchAlertes]);

  useEffect(() => {
    fetchAll();
  }, [statut, ongletActif]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (recherche) searchLocation(recherche);
      else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [recherche]);

  const mapHTML = buildMapHTML(dossiers, signalements, alertes, ongletActif, recherchePoint);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER comme dans l'image */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.eyeOuter}>
            <View style={styles.eyeInner} />
          </View>
          <Text style={styles.logoTxt}>Retrouvons<Text style={styles.logoAccent}>Les</Text></Text>
        </View>
      </View>

      {/* BARRE DE RECHERCHE avec résultats */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lieu, une alerte..."
            placeholderTextColor="#94a3b8"
            value={recherche}
            onChangeText={setRecherche}
            returnKeyType="search"
            onSubmitEditing={() => recherche && searchLocation(recherche)}
          />
          {searchLoading && <ActivityIndicator size="small" color="#b45f06" />}
          {recherche.length > 0 && !searchLoading && (
            <TouchableOpacity onPress={() => { setRecherche(''); setSearchResults([]); setShowResults(false); setRecherchePoint(null); }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Résultats de recherche */}
        {showResults && searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => selectLocation(item)}>
                  <Ionicons name="location-outline" size={16} color="#b45f06" />
                  <Text style={styles.resultText} numberOfLines={1}>
                    {item.display_name.split(',')[0]}, {item.display_name.split(',')[1]}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* ONGLETS + FILTRES */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ongletsScroll}>
          {ONGLETS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[styles.onglet, ongletActif === o.key && styles.ongletActif]}
              onPress={() => setOngletActif(o.key)}
            >
              <Ionicons name={o.icon as any} size={14} color={ongletActif === o.key ? '#fff' : '#64748b'} />
              <Text style={[styles.ongletLabel, ongletActif === o.key && styles.ongletLabelActif]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalStatutVisible(true)}>
          <Ionicons name="options-outline" size={16} color="#b45f06" />
          <Text style={styles.filterBtnText}>{statut.label}</Text>
        </TouchableOpacity>
      </View>

      {/* CARTE */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.loaderText}>Chargement de la carte...</Text>
          </View>
        ) : (
          <WebView
            key={`${ongletActif}-${statut.value}-${mapKey}`}
            originWhitelist={['*']}
            source={{ html: mapHTML }}
            style={{ flex: 1 }}
            javaScriptEnabled
          />
        )}
      </View>

      {/* BOUTON FLOATING POUR LOCALISATION */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          // Forcer le rechargement de la carte avec géolocalisation
          setMapKey(prev => prev + 1);
        }}
      >
        <Ionicons name="locate-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal Statuts */}
      <Modal visible={modalStatutVisible} transparent animationType="fade" onRequestClose={() => setModalStatutVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalStatutVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitre}>Filtrer par statut</Text>
            <FlatList
              data={STATUTS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, statut.value === item.value && styles.optionActive]}
                  onPress={() => { setStatut(item); setModalStatutVisible(false); }}
                >
                  <Text style={[styles.optionText, statut.value === item.value && styles.optionTextActive]}>
                    {item.label}
                  </Text>
                  {statut.value === item.value && <Ionicons name="checkmark" size={16} color="#b45f06" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyeOuter: { width: 24, height: 14, borderRadius: 12, borderWidth: 2, borderColor: '#0b1c30', justifyContent: 'center', alignItems: 'center' },
  eyeInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0b1c30' },
  logoTxt: { fontSize: 18, fontWeight: '800', color: '#0b1c30', letterSpacing: -0.3 },
  logoAccent: { color: '#b45f06' },

  searchWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, position: 'relative', zIndex: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0b1c30', padding: 0 },

  searchResults: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 200,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultText: { flex: 1, fontSize: 13, color: '#1e293b' },

  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  ongletsScroll: { flex: 1, flexGrow: 1 },
  onglet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  ongletActif: { backgroundColor: '#0b1c30' },
  ongletLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  ongletLabelActif: { color: '#fff' },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnText: { fontSize: 11, fontWeight: '600', color: '#b45f06' },

  mapContainer: { flex: 1, borderRadius: 12, overflow: 'hidden', marginHorizontal: 12, marginBottom: 12 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94a3b8' },

  locationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0b1c30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, width: width - 80, paddingVertical: 12, elevation: 8, maxHeight: '60%' },
  modalTitre: { fontSize: 15, fontWeight: '700', color: '#0b1c30', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  optionActive: { backgroundColor: '#fefce8' },
  optionText: { fontSize: 14, color: '#475569' },
  optionTextActive: { color: '#b45f06', fontWeight: '600' },
});