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
  id_dossier: string;
  latitude: number;
  longitude: number;
  titre?: string;
  message_court?: string;
  statut_alerte?: string;
  date_diffusion?: string;
  lieu_disparition?: string;
}

const ONGLETS = [
  { key: 'personnes' as OngletKey, label: 'Personnes disparues', icon: 'person-outline' },
  { key: 'observations' as OngletKey, label: 'Observations', icon: 'eye-outline' },
  { key: 'alertes' as OngletKey, label: 'Alertes', icon: 'notifications-outline' },
];

// ─── TYPE RÉSULTAT DE RECHERCHE UNIFIÉ ───
type SearchResult =
  | { type: 'lieu'; display_name: string; lat: string; lon: string }
  | { type: 'personne'; id_dossier: string; nom: string; prenom: string; lat: number; lng: number; lieu: string; date: string };

const STATUTS = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'classe_sans_suite', label: 'Classé sans suite' },
];

function buildMapHTML(
  dossiers: DossierDisparition[],
  signalements: Signalement[],
  alertes: Alerte[],
  onglet: OngletKey,
  recherchePoint: { lat: number; lng: number; nom: string; type?: 'lieu' | 'personne'; id_dossier?: string } | null
): string {
  let markersJS = '';

  let centerLat = 3.8480;
  let centerLng = 11.5021;
  let zoom = 11;

  if (recherchePoint) {
    centerLat = recherchePoint.lat;
    centerLng = recherchePoint.lng;
    zoom = 14;

    const nomEscaped = recherchePoint.nom.replace(/'/g, "\\'");

    if (recherchePoint.type === 'personne') {
      // Marqueur rouge pulsant pour une personne disparue trouvée
      markersJS += `
        new maplibregl.Marker({ color: '#EF4444' })
          .setLngLat([${recherchePoint.lng}, ${recherchePoint.lat}])
          .setPopup(new maplibregl.Popup({ closeOnClick: false }).setHTML(
            '<b>🔴 ${nomEscaped}</b><br/>Lieu de disparition'
          ).addTo(map))
          .addTo(map);
      `;
    } else {
      // Marqueur vert pour un lieu géographique
      markersJS += `
        new maplibregl.Marker({ color: '#10B981' })
          .setLngLat([${recherchePoint.lng}, ${recherchePoint.lat}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>📍 ${nomEscaped}</b><br/>Résultat de recherche'
          ))
          .addTo(map);
      `;
    }
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
      if (!a.latitude || !a.longitude) return;
      const titre = (a.titre ?? 'Alerte').replace(/'/g, "\\'");
      const msg = (a.message_court ?? '').substring(0, 80).replace(/'/g, "\\'");
      const lieu = (a.lieu_disparition ?? '').replace(/'/g, "\\'");
      markersJS += `
        new maplibregl.Marker({ color: '#EF4444' })
          .setLngLat([${a.longitude}, ${a.latitude}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>🔔 ${titre}</b><br/>📍 ${lieu}<br/>${msg}'
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recherchePoint, setRecherchePoint] = useState<{ lat: number; lng: number; nom: string; type?: 'lieu' | 'personne'; id_dossier?: string } | null>(null);

  const [dossiers, setDossiers] = useState<DossierDisparition[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapKey, setMapKey] = useState(0);

  // ─── RECHERCHE COMBINÉE : lieux (Nominatim) + personnes disparues (Supabase) ───
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      // Lancer les deux recherches en parallèle
      const [lieuxResult, personnesResult] = await Promise.allSettled([
        // 1. Recherche de lieux via Nominatim
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cm&limit=5`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'RetrouvonsLes/1.0 (contact@retrouvonsles.vercel.app)' } }
        ).then(async (res) => {
          const ct = res.headers.get('content-type') ?? '';
          if (!res.ok || !ct.includes('application/json')) return [];
          const data = await res.json();
          return (Array.isArray(data) ? data : []).map((item: any) => ({
            type: 'lieu' as const,
            display_name: item.display_name,
            lat: item.lat,
            lon: item.lon,
          }));
        }),

        // 2. Recherche de personnes disparues dans Supabase
        supabase
          .from('dossier_disparition')
          .select(`
            id,
            lieu_disparition,
            date_disparition,
            latitude_disparition,
            longitude_disparition,
            statut_dossier,
            personne ( nom, prenom )
          `)
          .not('latitude_disparition', 'is', null)
          .not('longitude_disparition', 'is', null)
          .not('statut_dossier', 'in', '("retrouve_vivant","retrouve_decede")')
          .or(`personne.nom.ilike.%${query.trim()}%,personne.prenom.ilike.%${query.trim()}%`)
          .limit(5)
          .then(({ data }) =>
            (data ?? []).map((d: any) => ({
              type: 'personne' as const,
              id_dossier: d.id,
              nom: d.personne?.nom ?? '',
              prenom: d.personne?.prenom ?? '',
              lat: d.latitude_disparition,
              lng: d.longitude_disparition,
              lieu: d.lieu_disparition ?? 'Lieu inconnu',
              date: d.date_disparition
                ? new Date(d.date_disparition).toLocaleDateString('fr-FR')
                : 'Date inconnue',
            }))
          ),
      ]);

      const lieux: SearchResult[] = lieuxResult.status === 'fulfilled' ? lieuxResult.value : [];
      const personnes: SearchResult[] = personnesResult.status === 'fulfilled' ? personnesResult.value : [];

      // Personnes en premier, puis lieux
      const combined = [...personnes, ...lieux];
      setSearchResults(combined);
      setShowResults(combined.length > 0);
    } catch (error) {
      console.warn('Erreur recherche:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectResult = (item: SearchResult) => {
    if (item.type === 'personne') {
      setRecherchePoint({
        lat: item.lat,
        lng: item.lng,
        nom: `${item.prenom} ${item.nom}`,
        type: 'personne',
        id_dossier: item.id_dossier,
      });
      setRecherche(`${item.prenom} ${item.nom}`);
      // Basculer sur l'onglet personnes
      setOngletActif('personnes');
    } else {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      setRecherchePoint({ lat, lng, nom: item.display_name.split(',')[0], type: 'lieu' });
      setRecherche(item.display_name.split(',')[0]);
    }
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
      .not('longitude_disparition', 'is', null)
      // Masquer les personnes retrouvées (sauf si filtre explicite)
      .not('statut_dossier', 'in', '("retrouve_vivant","retrouve_decede")');

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
    // On récupère les coordonnées depuis dossier_disparition car
    // la table alerte n'a pas forcément latitude_centre/longitude_centre
    const { data, error } = await supabase
      .from('alerte')
      .select(`
        id, titre, message_court, statut_alerte, date_diffusion, id_dossier,
        dossier_disparition (
          id, latitude_disparition, longitude_disparition, lieu_disparition,
          statut_dossier
        )
      `)
      .eq('statut_alerte', 'en_cours')
      .eq('validee', true);

    if (!error && data) {
      const formatted: Alerte[] = (data as any[])
        .filter((a) => {
          const d = a.dossier_disparition;
          // Garder seulement si coordonnées disponibles et personne non retrouvée
          return (
            d?.latitude_disparition &&
            d?.longitude_disparition &&
            d?.statut_dossier !== 'retrouve_vivant' &&
            d?.statut_dossier !== 'retrouve_decede'
          );
        })
        .map((a) => ({
          id: a.id,
          id_dossier: a.id_dossier,
          latitude: a.dossier_disparition.latitude_disparition,
          longitude: a.dossier_disparition.longitude_disparition,
          titre: a.titre,
          message_court: a.message_court,
          statut_alerte: a.statut_alerte,
          date_diffusion: a.date_diffusion,
          lieu_disparition: a.dossier_disparition.lieu_disparition,
        }));
      setAlertes(formatted);
    }
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
              keyExtractor={(item, index) => `${item.type}-${index}`}
              renderItem={({ item }) => {
                if (item.type === 'personne') {
                  return (
                    <TouchableOpacity style={styles.resultItem} onPress={() => selectResult(item)}>
                      <View style={styles.resultIconPerson}>
                        <Ionicons name="person" size={14} color="#fff" />
                      </View>
                      <View style={styles.resultTexts}>
                        <Text style={styles.resultName}>{item.prenom} {item.nom}</Text>
                        <Text style={styles.resultSub} numberOfLines={1}>
                          Disparu à {item.lieu} · {item.date}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity style={styles.resultItem} onPress={() => selectResult(item)}>
                    <Ionicons name="location-outline" size={16} color="#b45f06" />
                    <View style={styles.resultTexts}>
                      <Text style={styles.resultText} numberOfLines={1}>
                        {item.display_name.split(',')[0]}
                      </Text>
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {item.display_name.split(',').slice(1, 3).join(',')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListHeaderComponent={
                searchResults.some(r => r.type === 'personne') ? (
                  <View style={styles.resultSectionHeader}>
                    <Text style={styles.resultSectionTitle}>Personnes disparues</Text>
                  </View>
                ) : null
              }
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
  resultTexts: { flex: 1 },
  resultText: { flex: 1, fontSize: 13, color: '#1e293b' },
  resultName: { fontSize: 13, fontWeight: '700', color: '#0b1c30' },
  resultSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  resultIconPerson: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
  },
  resultSectionHeader: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  resultSectionTitle: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },

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