import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, FlatList, SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../../services/supabase';

const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

type OngletKey = 'personnes' | 'observations' | 'alertes';
interface StatutOption { value: string; label: string; }

interface DossierDisparition {
  id: string;
  latitude_disparition: number;
  longitude_disparition: number;
  statut_dossier: string;
  date_disparition: string;
  ville_disparition?: string;
  niveau_urgence?: string;
  personne?: { nom?: string; prenom?: string; } | null;
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
}

const ONGLETS = [
  { key: 'personnes' as OngletKey, label: 'Personnes disparues', icon: '👤' },
  { key: 'observations' as OngletKey, label: 'Observations', icon: '👁️' },
  { key: 'alertes' as OngletKey, label: 'Alertes', icon: '🔔' },
];

const STATUTS: StatutOption[] = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'retrouve_vivant', label: 'Retrouvé vivant' },
  { value: 'retrouve_decede', label: 'Retrouvé décédé' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'classe_sans_suite', label: 'Classé sans suite' },
  { value: 'transfere', label: 'Transféré' },
];

function buildMapHTML(
  dossiers: DossierDisparition[],
  signalements: Signalement[],
  alertes: Alerte[],
  onglet: OngletKey,
): string {
  let markersJS = '';

  if (onglet === 'personnes') {
    dossiers.forEach((d) => {
      if (!d.latitude_disparition || !d.longitude_disparition) return;
      const nom = d.personne
        ? `${d.personne.prenom ?? ''} ${d.personne.nom ?? ''}`.trim()
        : 'Personne disparue';
      const ville = d.ville_disparition ?? '';
      const statut = d.statut_dossier ?? '';
      const date = d.date_disparition ? new Date(d.date_disparition).toLocaleDateString('fr-FR') : 'N/A';
      markersJS += `
        new maplibregl.Marker({ color: '#F59E0B' })
          .setLngLat([${d.longitude_disparition}, ${d.latitude_disparition}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>${nom}</b><br/>Ville : ${ville}<br/>Statut : ${statut}<br/>Disparu(e) le : ${date}'
          ))
          .addTo(map);
      `;
    });
  }

  if (onglet === 'observations') {
    signalements.forEach((s) => {
      if (!s.latitude_observation || !s.longitude_observation) return;
      const desc = (s.description ?? '').replace(/'/g, "\\'");
      const ville = s.ville_observation ?? '';
      markersJS += `
        new maplibregl.Marker({ color: '#3B82F6' })
          .setLngLat([${s.longitude_observation}, ${s.latitude_observation}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>Observation</b><br/>${ville}<br/>${desc}'
          ))
          .addTo(map);
      `;
    });
  }

  if (onglet === 'alertes') {
    alertes.forEach((a) => {
      if (!a.latitude_centre || !a.longitude_centre) return;
      const titre = a.titre ?? 'Alerte';
      const msg = (a.message_court ?? '').replace(/'/g, "\\'");
      markersJS += `
        new maplibregl.Marker({ color: '#EF4444' })
          .setLngLat([${a.longitude_centre}, ${a.latitude_centre}])
          .setPopup(new maplibregl.Popup().setHTML(
            '<b>${titre}</b><br/>${msg}'
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
          center: [11.5021, 3.8480],
          zoom: 11,
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }), 'top-right');
        map.on('load', function () {
          ${markersJS}
        });
      </script>
    </body>
    </html>
  `;
}

function Carte() {
  const [ongletActif, setOngletActif] = useState<OngletKey>('personnes');
  const [statut, setStatut] = useState<StatutOption>(STATUTS[0]);
  const [modalStatutVisible, setModalStatutVisible] = useState(false);
  const [modalRegionVisible, setModalRegionVisible] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [region, setRegion] = useState('Centre, Littoral');

  const [dossiers, setDossiers] = useState<DossierDisparition[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDossiers = useCallback(async (statutFiltre: string) => {
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
    if (statutFiltre !== 'tous') query = query.eq('statut_dossier', statutFiltre);
    const { data, error } = await query;
    if (error) console.error('Erreur dossiers:', error.message);
    else setDossiers((data ?? []) as DossierDisparition[]);
  }, []);

  const fetchSignalements = useCallback(async (statutFiltre: string) => {
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
    if (statutFiltre !== 'tous') query = query.eq('statut_validation', statutFiltre);
    const { data, error } = await query;
    if (error) console.error('Erreur signalements:', error.message);
    else setSignalements(data ?? []);
  }, []);

  const fetchAlertes = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerte')
      .select(`id, latitude_centre, longitude_centre, titre, message_court, statut_alerte`)
      .not('latitude_centre', 'is', null)
      .not('longitude_centre', 'is', null);
    if (error) console.error('Erreur alertes:', error.message);
    else setAlertes(data ?? []);
  }, []);

  const fetchAll = useCallback(async (statutFiltre: string) => {
    setLoading(true);
    await Promise.all([fetchDossiers(statutFiltre), fetchSignalements(statutFiltre), fetchAlertes()]);
    setLoading(false);
  }, [fetchDossiers, fetchSignalements, fetchAlertes]);

  useEffect(() => { fetchAll(statut.value); }, [statut]);

  const mapHTML = buildMapHTML(dossiers, signalements, alertes, ongletActif);

  return (
    <SafeAreaView style={styles.container}>

      {/* ── LIGNE 1 : Recherche + Actualiser ── */}
      <View style={styles.ligne1}>
        <View style={styles.barreRecherche}>
          <Text style={styles.iconRecherche}>🔍</Text>
          <TextInput
            style={styles.inputRecherche}
            placeholder="Rechercher sur la carte..."
            placeholderTextColor="#9CA3AF"
            value={recherche}
            onChangeText={setRecherche}
          />
        </View>
        <TouchableOpacity style={styles.btnActualiser} onPress={() => fetchAll(statut.value)}>
          <Text style={styles.btnActualiserText}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* ── LIGNE 2 : Onglets + Statut + Région ── */}
      <View style={styles.ligne2}>
        {ONGLETS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.onglet, ongletActif === o.key && styles.ongletActif]}
            onPress={() => setOngletActif(o.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.ongletIcon}>{o.icon}</Text>
            <Text style={[styles.ongletLabel, ongletActif === o.key && styles.ongletLabelActif]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Dropdown Statut */}
        <TouchableOpacity style={styles.dropdown} onPress={() => setModalStatutVisible(true)} activeOpacity={0.8}>
          <Text style={styles.dropdownText} numberOfLines={1}>{statut.label}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>

        {/* Dropdown Région */}
        <TouchableOpacity style={styles.dropdown} onPress={() => setModalRegionVisible(true)} activeOpacity={0.8}>
          <Text style={styles.dropdownText} numberOfLines={1}>{region}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── CARTE ── */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1D4ED8" />
            <Text style={styles.loaderText}>Chargement de la carte...</Text>
          </View>
        ) : (
          <WebView
            key={`${ongletActif}-${statut.value}`}
            originWhitelist={['*']}
            source={{ html: mapHTML }}
            style={{ flex: 1 }}
            javaScriptEnabled
          />
        )}
      </View>

      {/* ── Modal Statuts ── */}
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
                  {statut.value === item.value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal Régions ── */}
      <Modal visible={modalRegionVisible} transparent animationType="fade" onRequestClose={() => setModalRegionVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalRegionVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitre}>Sélectionner une région</Text>
            <FlatList
              data={[
                'Toutes les régions', 'Adamaoua', 'Centre', 'Est',
                'Extrême-Nord', 'Littoral', 'Nord', 'Nord-Ouest',
                'Ouest', 'Sud', 'Sud-Ouest',
              ]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, region === item && styles.optionActive]}
                  onPress={() => { setRegion(item); setModalRegionVisible(false); }}
                >
                  <Text style={[styles.optionText, region === item && styles.optionTextActive]}>
                    {item}
                  </Text>
                  {region === item && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const BLEU = '#1D4ED8';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Ligne 1
  ligne1: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8,
  },
  barreRecherche: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 40,
  },
  iconRecherche: { fontSize: 14, marginRight: 8 },
  inputRecherche: { flex: 1, fontSize: 14, color: '#111827' },
  btnActualiser: {
    width: 40, height: 40, borderRadius: 8,
    borderWidth: 1, borderColor: '#D1D5DB',
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  btnActualiserText: { fontSize: 20, color: '#1D4ED8' },

  // Ligne 2
  ligne2: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 6,
  },
  onglet: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BLEU, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  ongletActif: { backgroundColor: '#1E40AF' },
  ongletIcon: { fontSize: 12, color: '#fff' },
  ongletLabel: { fontSize: 11, color: '#fff', fontWeight: '600' },
  ongletLabelActif: { color: '#fff' },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 8, paddingVertical: 7, gap: 4,
  },
  dropdownText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  chevron: { fontSize: 11, color: '#6B7280' },

  // Carte
  mapContainer: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: '#6B7280' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 14, width: 260, paddingVertical: 12, elevation: 8, maxHeight: '60%' },
  modalTitre: {
    fontSize: 14, fontWeight: '700', color: '#111827',
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  optionActive: { backgroundColor: '#EFF6FF' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextActive: { color: BLEU, fontWeight: '600' },
  check: { fontSize: 14, color: BLEU, fontWeight: '700' },
});

export default Carte;