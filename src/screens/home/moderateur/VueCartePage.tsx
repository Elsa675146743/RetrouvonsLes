import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Modal, TextInput, Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width, height } = Dimensions.get('window');
const MAPTILER_KEY = 'QC2faDaY0B4wB6W510Cu';

// =====================================================
// ✅ PICKER MODAL
// =====================================================
function PickerModal({ visible, onClose, options, selected, onSelect, title }: {
  visible: boolean;
  onClose: () => void;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (val: string) => void;
  title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={pStyles.container}>
          <Text style={pStyles.title}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[pStyles.item, selected === opt.value && pStyles.itemActive]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <Text style={[pStyles.itemText, selected === opt.value && pStyles.itemTextActive]}>
                {opt.label}
              </Text>
              {selected === opt.value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =====================================================
// ✅ COMPOSANT PRINCIPAL
// =====================================================
function VueCartePage({ navigation }: { navigation: any }) {

  const webViewRef = useRef<any>(null);

  const [signalements, setSignalements] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [modeVue, setModeVue]           = useState<'carte' | 'liste'>('carte');
  const [showFilters, setShowFilters]   = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [mapReady, setMapReady]         = useState(false);

  const [filtreStatut, setFiltreStatut]   = useState('tous');
  const [filtrePeriode, setFiltrePeriode] = useState('toutes');
  const [filtreScore, setFiltreScore]     = useState('tous');

  const [showStatutPicker, setShowStatutPicker]   = useState(false);
  const [showPeriodePicker, setShowPeriodePicker] = useState(false);
  const [showScorePicker, setShowScorePicker]     = useState(false);

  const [stats, setStats] = useState({
    total: 0, geoLocalises: 0, enAttente: 0, valides: 0, alertes: 0
  });

  // ── OPTIONS ──────────────────────────────────────────────────
  const statutOptions = [
    { label: 'Tous',       value: 'tous'            },
    { label: 'En attente', value: 'en_attente'      },
    { label: 'En cours',   value: 'en_verification' },
    { label: 'Validé',     value: 'valide'          },
    { label: 'Rejeté',     value: 'invalide'        },
  ];

  const periodeOptions = [
    { label: 'Toutes',            value: 'toutes' },
    { label: '7 derniers jours',  value: '7j'     },
    { label: '30 derniers jours', value: '30j'    },
  ];

  const scoreOptions = [
    { label: 'Tous',  value: 'tous' },
    { label: '> 50%', value: '50'   },
    { label: '> 75%', value: '75'   },
    { label: '> 85%', value: '85'   },
  ];

  const getLabelStatut  = () => statutOptions.find(o => o.value === filtreStatut)?.label  || 'Tous';
  const getLabelPeriode = () => periodeOptions.find(o => o.value === filtrePeriode)?.label || 'Toutes';
  const getLabelScore   = () => scoreOptions.find(o => o.value === filtreScore)?.label     || 'Tous';

  // ── CHARGEMENT ────────────────────────────────────────────────
  const fetchSignalements = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('signalement')
        .select(`
          id, numero_signalement, description,
          date_observation, lieu_observation, ville_observation,
          latitude_observation, longitude_observation,
          statut_validation, score_pertinence, created_at,
          dossier:id_dossier ( id, numero_dossier, personne:id_personne ( nom, prenom ) )
        `)
        .order('created_at', { ascending: false });

      if (filtreStatut !== 'tous')    query = query.eq('statut_validation', filtreStatut);
      if (filtrePeriode !== 'toutes') {
        const jours = filtrePeriode === '7j' ? 7 : 30;
        const d = new Date();
        d.setDate(d.getDate() - jours);
        query = query.gte('created_at', d.toISOString());
      }
      if (filtreScore !== 'tous') query = query.gte('score_pertinence', parseInt(filtreScore));

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];
      setSignalements(list);
      setStats({
        total:        list.length,
        geoLocalises: list.filter((s: any) => s.latitude_observation && s.longitude_observation).length,
        enAttente:    list.filter((s: any) => s.statut_validation === 'en_attente').length,
        valides:      list.filter((s: any) => s.statut_validation === 'valide').length,
        alertes:      0,
      });

      if (mapReady) envoyerMarqueurs(list);

    } catch (err) {
      console.error('Erreur signalements carte:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtreStatut, filtrePeriode, filtreScore, mapReady]);

  useEffect(() => { fetchSignalements(); }, [fetchSignalements]);

  // ── ENVOYER MARQUEURS VERS LA CARTE ──────────────────────────
  const envoyerMarqueurs = (list: any[]) => {
    const sigGeo = list.filter((s: any) => s.latitude_observation && s.longitude_observation);
    const marqueurs = sigGeo.map((s: any) => ({
      id:    s.id,
      lat:   parseFloat(s.latitude_observation),
      lng:   parseFloat(s.longitude_observation),
      titre: s.ville_observation || s.lieu_observation || '—',
      desc:  (s.description || '—').substring(0, 60),
      statut: s.statut_validation,
      color: getStatutColor(s.statut_validation),
    }));

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        ajouterMarqueurs(${JSON.stringify(marqueurs)});
        true;
      `);
    }
  };

  // ── MESSAGES WEBVIEW ─────────────────────────────────────────
  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_READY') {
        setMapReady(true);
        envoyerMarqueurs(signalements);
      }
      if (msg.type === 'MARKER_CLICK') {
        navigation.navigate('ValidationSignalementsPage', { signalementId: msg.id });
      }
      if (msg.type === 'GEOCODE_ERROR') {
        Alert.alert('Recherche', msg.message || 'Aucun résultat trouvé.');
      }
    } catch (e) {
      console.error('Erreur WebView:', e);
    }
  };

  // ── RECHERCHE SUR CARTE ───────────────────────────────────────
  const handleSearchOnMap = () => {
    if (!searchQuery.trim()) return;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        searchPlace(${JSON.stringify(searchQuery.trim())});
        true;
      `);
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────
  const getStatutColor = (statut: string) => {
    const map: Record<string, string> = {
      en_attente:      '#f59e0b',
      en_verification: '#2563eb',
      valide:          '#16a34a',
      invalide:        '#dc2626',
    };
    return map[statut] || '#94a3b8';
  };

  const getStatutStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      en_attente:      { bg: '#fef3c7', text: '#92400e', label: 'EN ATTENTE' },
      en_verification: { bg: '#eff6ff', text: '#1e40af', label: 'EN COURS'   },
      valide:          { bg: '#f0fdf4', text: '#166534', label: 'VALIDÉS'    },
      invalide:        { bg: '#fee2e2', text: '#991b1b', label: 'REJETÉ'     },
    };
    return map[statut] || { bg: '#f1f5f9', text: '#64748b', label: statut };
  };

  // ── HTML CARTE MAPLIBRE ───────────────────────────────────────
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <script src="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.js"></script>
        <link href="https://cdn.maptiler.com/maplibre-gl-js/v2.4.0/maplibre-gl.css" rel="stylesheet" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }

          .popup-titre { font-weight: bold; font-size: 13px; color: #1e293b; margin-bottom: 4px; }
          .popup-desc  { font-size: 11px; color: #64748b; margin-bottom: 8px; line-height: 1.4; }
          .popup-btn   {
            background: #2563eb; color: #FFF; border: none;
            border-radius: 6px; padding: 6px 10px;
            font-size: 12px; cursor: pointer; width: 100%; font-weight: bold;
          }

          #legend {
            position: absolute; bottom: 10px; left: 10px;
            background: rgba(255,255,255,0.95);
            border-radius: 8px; padding: 8px 12px;
            font-size: 11px; z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            pointer-events: none;
          }
          .leg-title { font-weight: bold; margin-bottom: 5px; color: #1e293b; font-size: 12px; }
          .leg-item  { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
          .leg-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="legend">
          <div class="leg-title">Statuts</div>
          <div class="leg-item"><div class="leg-dot" style="background:#f59e0b"></div>En attente</div>
          <div class="leg-item"><div class="leg-dot" style="background:#2563eb"></div>En cours</div>
          <div class="leg-item"><div class="leg-dot" style="background:#16a34a"></div>Validé</div>
          <div class="leg-item"><div class="leg-dot" style="background:#dc2626"></div>Rejeté</div>
        </div>

        <script>
          var MAPTILER_KEY = '${MAPTILER_KEY}';
          var markers      = [];

          var map = new maplibregl.Map({
            container: 'map',
            style:     'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY,
            center:    [11.502, 3.848],
            zoom:      6
          });

          map.addControl(new maplibregl.NavigationControl(), 'top-right');
          map.addControl(new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false
          }), 'top-right');

          map.on('load', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          });

          function ajouterMarqueurs(liste) {
            markers.forEach(function(m) { m.remove(); });
            markers = [];

            liste.forEach(function(item) {
              var el = document.createElement('div');
              el.style.cssText = [
                'width:16px',
                'height:16px',
                'border-radius:50%',
                'background:' + item.color,
                'border:2.5px solid #FFF',
                'box-shadow:0 2px 6px rgba(0,0,0,0.35)',
                'cursor:pointer',
                'transition:transform 0.15s'
              ].join(';');
              el.onmouseover = function() { el.style.transform = 'scale(1.3)'; };
              el.onmouseout  = function() { el.style.transform = 'scale(1)'; };

              var popup = new maplibregl.Popup({ offset: 16, maxWidth: '220px' })
                .setHTML(
                  '<div class="popup-titre">' + item.titre + '</div>' +
                  '<div class="popup-desc">'  + item.desc  + '</div>' +
                  '<button class="popup-btn" onclick="clickMarker(\'' + item.id + '\')">👁 Afficher</button>'
                );

              var m = new maplibregl.Marker({ element: el })
                .setLngLat([item.lng, item.lat])
                .setPopup(popup)
                .addTo(map);

              markers.push(m);
            });

            if (liste.length === 1) {
              map.flyTo({ center: [liste[0].lng, liste[0].lat], zoom: 13, speed: 1.5 });
            } else if (liste.length > 1) {
              var bounds = new maplibregl.LngLatBounds();
              liste.forEach(function(item) { bounds.extend([item.lng, item.lat]); });
              map.fitBounds(bounds, { padding: 60, maxZoom: 14, animate: true });
            }
          }

          function clickMarker(id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MARKER_CLICK',
              id:   id
            }));
          }

          async function searchPlace(query) {
            try {
              var url = 'https://api.maptiler.com/geocoding/' +
                encodeURIComponent(query) +
                '.json?key=' + MAPTILER_KEY + '&language=fr&limit=1';
              var resp = await fetch(url);
              var json = await resp.json();
              if (json.features && json.features.length > 0) {
                var coords = json.features[0].geometry.coordinates;
                map.flyTo({ center: coords, zoom: 13, speed: 1.5 });
              } else {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'GEOCODE_ERROR', message: 'Aucun résultat pour : ' + query
                }));
              }
            } catch(err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'GEOCODE_ERROR', message: 'Erreur de recherche'
              }));
            }
          }
        </script>
      </body>
    </html>
  `;

  // ── VUE CARTE ─────────────────────────────────────────────────
  const renderCarte = () => (
    <View style={{ flex: 1 }}>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un lieu sur la carte..."
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

      {/* ✅ WebView hauteur fixe */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.carteMap}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleWebViewMessage}
      />

      {/* Panneau bas horizontal */}
      <View style={styles.carteSidebar}>
        <Text style={styles.carteSidebarTitle}>
          Sur la carte ({stats.geoLocalises})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
            {signalements
              .filter((s: any) => s.latitude_observation)
              .slice(0, 15)
              .map((s: any) => {
                const statStyle = getStatutStyle(s.statut_validation);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.carteSidebarItem}
                    onPress={() => {
                      if (webViewRef.current) {
                        webViewRef.current.injectJavaScript(`
                          map.flyTo({
                            center: [${parseFloat(s.longitude_observation)}, ${parseFloat(s.latitude_observation)}],
                            zoom: 14, speed: 1.5
                          });
                          true;
                        `);
                      }
                    }}
                  >
                    <View style={[styles.sidebarDot, { backgroundColor: getStatutColor(s.statut_validation) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sidebarLieu} numberOfLines={1}>
                        {s.ville_observation || s.lieu_observation || '—'}
                      </Text>
                      <Text style={styles.sidebarCoords}>
                        {parseFloat(s.latitude_observation).toFixed(4)},
                        {parseFloat(s.longitude_observation).toFixed(4)}
                      </Text>
                    </View>
                    <View style={[styles.sidebarBadge, { backgroundColor: statStyle.bg }]}>
                      <Text style={[styles.sidebarBadgeText, { color: statStyle.text }]}>
                        {statStyle.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            {signalements.filter((s: any) => s.latitude_observation).length === 0 && (
              <Text style={styles.sidebarEmpty}>Aucun signalement géolocalisé</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // ── VUE LISTE ─────────────────────────────────────────────────
  const renderListe = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchSignalements(); }}
        />
      }
    >
      {signalements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={52} color="#cbd5e1" />
          <Text style={styles.emptyText}>Aucun signalement trouvé</Text>
        </View>
      ) : (
        signalements.map((s: any) => {
          const statStyle = getStatutStyle(s.statut_validation);
          return (
            <View key={s.id} style={styles.listeCard}>
              <View style={styles.listeCardLeft}>
                <View style={styles.listeIconBox}>
                  <Ionicons name="location-outline" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listeVille} numberOfLines={1}>
                    {s.ville_observation || s.lieu_observation || '—'}
                  </Text>
                  <Text style={styles.listeDesc} numberOfLines={2}>{s.description || '—'}</Text>
                  <View style={styles.listeFooter}>
                    <Ionicons name="time-outline" size={11} color="#94a3b8" />
                    <Text style={styles.listeDate}>
                      {s.date_observation
                        ? new Date(s.date_observation).toLocaleDateString('fr-FR') : '—'}
                    </Text>
                    {s.latitude_observation && (
                      <Text style={styles.listeCoords}>
                        {parseFloat(s.latitude_observation).toFixed(4)},
                        {parseFloat(s.longitude_observation).toFixed(4)}
                      </Text>
                    )}
                    {s.score_pertinence != null && (
                      <Text style={styles.listeScore}>Score: {s.score_pertinence}%</Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.listeCardRight}>
                <View style={[styles.statutBadge, { backgroundColor: statStyle.bg }]}>
                  <Text style={[styles.statutBadgeText, { color: statStyle.text }]}>
                    {statStyle.label}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnAfficher}
                  onPress={() =>
                    navigation.navigate('ValidationSignalementsPage', { signalementId: s.id })
                  }
                >
                  <Ionicons name="eye-outline" size={13} color="#2563eb" />
                  <Text style={styles.btnAfficherText}>Afficher</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="location-outline" size={20} color="#FFF" />
          <Text style={styles.headerTitle}>Vue Carte des Signalements</Text>
        </View>
        <Text style={styles.headerSub}>
          Visualisez les signalements géolocalisés sur une carte interactive.
        </Text>

        <View style={styles.headerControls}>
          <View style={styles.vueToggle}>
            <TouchableOpacity
              style={[styles.vueBtn, modeVue === 'carte' && styles.vueBtnActive]}
              onPress={() => setModeVue('carte')}
            >
              <Ionicons name="map-outline" size={14} color={modeVue === 'carte' ? '#2563eb' : '#FFF'} />
              <Text style={[styles.vueBtnText, modeVue === 'carte' && styles.vueBtnTextActive]}>Carte</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vueBtn, modeVue === 'liste' && styles.vueBtnActive]}
              onPress={() => setModeVue('liste')}
            >
              <Ionicons name="list-outline" size={14} color={modeVue === 'liste' ? '#2563eb' : '#FFF'} />
              <Text style={[styles.vueBtnText, modeVue === 'liste' && styles.vueBtnTextActive]}>Liste</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnFilters, showFilters && styles.btnFiltersActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter-outline" size={14} color="#FFF" />
            <Text style={styles.btnFiltersText}>Filtres</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnRefresh} onPress={() => fetchSignalements()}>
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtresZone}>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Statut</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowStatutPicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelStatut()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Période</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowPeriodePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelPeriode()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={styles.filtreGroup}>
              <Text style={styles.filtreLabel}>Score minimum</Text>
              <TouchableOpacity style={styles.filtrePicker} onPress={() => setShowScorePicker(true)}>
                <Text style={styles.filtrePickerText} numberOfLines={1}>{getLabelScore()}</Text>
                <Ionicons name="chevron-down" size={13} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* BARRE STATS */}
      <View style={styles.statsBar}>
        {[
          { icon: 'location-outline',         label: `${stats.total} signalements total`,  color: '#2563eb' },
          { icon: 'map-outline',              label: `${stats.geoLocalises} géolocalisés`, color: '#2563eb' },
          { icon: 'time-outline',             label: `${stats.enAttente} En attente`,      color: '#f59e0b' },
          { icon: 'checkmark-circle-outline', label: `${stats.valides} Validés`,           color: '#16a34a' },
          { icon: 'notifications-outline',    label: `${stats.alertes} Alertes`,           color: '#64748b' },
        ].map((s, i) => (
          <View key={i} style={styles.statsBarItem}>
            <Ionicons name={s.icon as any} size={12} color={s.color} />
            <Text style={styles.statsBarText}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* CONTENU */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        modeVue === 'carte' ? renderCarte() : renderListe()
      )}

      {/* PICKERS */}
      <PickerModal visible={showStatutPicker}  onClose={() => setShowStatutPicker(false)}  options={statutOptions}  selected={filtreStatut}  onSelect={setFiltreStatut}  title="Statut" />
      <PickerModal visible={showPeriodePicker} onClose={() => setShowPeriodePicker(false)} options={periodeOptions} selected={filtrePeriode} onSelect={setFiltrePeriode} title="Période" />
      <PickerModal visible={showScorePicker}   onClose={() => setShowScorePicker(false)}   options={scoreOptions}   selected={filtreScore}   onSelect={setFiltreScore}   title="Score minimum" />

    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f1f5f9' },
  header:            { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  btnBack:           { marginBottom: 8 },
  headerTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle:       { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  headerSub:         { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  headerControls:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vueToggle:         { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 2 },
  vueBtn:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6 },
  vueBtnActive:      { backgroundColor: '#FFF' },
  vueBtnText:        { fontSize: 12, color: '#FFF', fontWeight: '600' },
  vueBtnTextActive:  { color: '#2563eb' },
  btnFilters:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnFiltersActive:  { backgroundColor: 'rgba(255,255,255,0.2)' },
  btnFiltersText:    { fontSize: 12, color: '#FFF', fontWeight: '600' },
  btnRefresh:        { width: 38, height: 38, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  filtresZone:       { flexDirection: 'row', gap: 8, marginTop: 14 },
  filtreGroup:       { flex: 1 },
  filtreLabel:       { fontSize: 9, color: '#bfdbfe', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  filtrePicker:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, height: 36 },
  filtrePickerText:  { fontSize: 11, color: '#1e293b', flex: 1 },
  statsBar:          { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statsBarItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsBarText:      { fontSize: 11, color: '#64748b', fontWeight: '500' },
  loadingContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Barre recherche
  searchBar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 12, height: 46, gap: 8 },
  searchInput:       { flex: 1, fontSize: 13, color: '#1e293b' },
  searchBtn:         { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  searchBtnText:     { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  // ✅ Carte WebView — hauteur fixe
  carteMap:          { height: height - 380, backgroundColor: '#e8f4fd' },

  // Panneau bas
  carteSidebar:      { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 10, maxHeight: 110 },
  carteSidebarTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  carteSidebarItem:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 160, maxWidth: 200 },
  sidebarDot:        { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  sidebarLieu:       { fontSize: 11, fontWeight: '600', color: '#1e293b' },
  sidebarCoords:     { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  sidebarBadge:      { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' as any },
  sidebarBadgeText:  { fontSize: 8, fontWeight: 'bold' },
  sidebarEmpty:      { fontSize: 11, color: '#94a3b8', paddingVertical: 10 },

  // Liste
  emptyContainer:    { alignItems: 'center', paddingTop: 60 },
  emptyText:         { color: '#94a3b8', fontSize: 13, marginTop: 10 },
  listeCard:         { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  listeCardLeft:     { flexDirection: 'row', gap: 10, flex: 1 },
  listeIconBox:      { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  listeVille:        { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  listeDesc:         { fontSize: 11, color: '#64748b', lineHeight: 15, marginBottom: 5 },
  listeFooter:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  listeDate:         { fontSize: 10, color: '#94a3b8' },
  listeCoords:       { fontSize: 10, color: '#94a3b8' },
  listeScore:        { fontSize: 10, color: '#2563eb', fontWeight: '600' },
  listeCardRight:    { alignItems: 'flex-end', gap: 8, justifyContent: 'center' },
  statutBadge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  statutBadgeText:   { fontSize: 8, fontWeight: 'bold' },
  btnAfficher:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnAfficherText:   { fontSize: 11, color: '#2563eb', fontWeight: '600' },
});

const pStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '80%' },
  title:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  item:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemActive:     { backgroundColor: '#eff6ff' },
  itemText:       { fontSize: 14, color: '#1e293b' },
  itemTextActive: { color: '#2563eb', fontWeight: '600' },
});

export default VueCartePage;