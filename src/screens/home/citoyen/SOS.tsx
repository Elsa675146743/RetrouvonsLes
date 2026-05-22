import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  TextInput, Alert, PermissionsAndroid, Platform,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from '../../../services/supabase';

// Supprimez la déclaration 'declare const navigator: any;'
// Plus besoin car on utilise Geolocation directement

interface SosEvent {
  id: string;
  statut: 'annule' | 'envoye' | 'traite';
  latitude: number | null;
  longitude: number | null;
  sans_position: boolean;
  message: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  id_organisation_assignee: string | null;
}

export default function SOS({ navigation }: any) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [messageUrgence, setMessageUrgence] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [sansPosition, setSansPosition] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [historique, setHistorique] = useState<SosEvent[]>([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const timerRef = useRef<any>(null);

  const fetchHistorique = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sos_event')
        .select('*')
        .eq('id_utilisateur', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistorique(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // ✅ VERSION CORRIGÉE avec @react-native-community/geolocation
  const getLocationSilently = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      // Vérifier si Geolocation est disponible
      if (!Geolocation) {
        console.warn('Geolocation non disponible');
        resolve(null);
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Position obtenue:', position.coords);
          resolve({ 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          });
        },
        (error) => {
          console.warn('Erreur GPS détaillée:', error.code, error.message);
          // Codes erreur: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
          if (error.code === 1) {
            Alert.alert('Permission refusée', 'Activez la localisation dans les paramètres');
          }
          resolve(null);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 10000  // Accepte une position vieille de 10s max
        }
      );
    });
  };

  const demarrerSOS = () => {
    setRateLimitError(false);
    setIsActive(true);
    setCountdown(5);
    
    // On lance la géolocalisation immédiatement
    getLocationSilently().then((coords) => {
      if (coords) {
        setLatitude(coords.lat);
        setLongitude(coords.lng);
        setSansPosition(false);
        console.log('✅ Position sauvegardée pour le SOS');
      } else {
        setSansPosition(true);
        console.log('⚠️ SOS sans position');
      }
    }).catch(err => {
      console.error('Erreur inattendue:', err);
      setSansPosition(true);
    });
    
    // Démarrer le compte à rebours
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        const current = prev ?? 30;
        if (current === 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          envoyerSOS();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const annulerSOS = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setCountdown(null);
    Alert.alert('Procédure annulée', 'Aucune alerte n\'a été envoyée.');
  };

  const envoyerSOS = async () => {
    setIsActive(false);
    setCountdown(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      let finalLat = latitude;
      let finalLng = longitude;
      let finalSansPosition = sansPosition;
      
      // Si on n'a pas encore de position, on essaie une dernière fois
      if (!finalLat && !finalLng && !finalSansPosition) {
        const coords = await getLocationSilently();
        if (coords) {
          finalLat = coords.lat;
          finalLng = coords.lng;
          finalSansPosition = false;
          console.log('📍 Position obtenue in extremis');
        } else {
          finalSansPosition = true;
          console.log('⚠️ Envoi SOS sans position');
        }
      }

      // Appel à votre backend (à décommenter quand prêt)
      console.log('🚨 SOS envoyé:', { 
        message: messageUrgence, 
        latitude: finalLat, 
        longitude: finalLng,
        sans_position: finalSansPosition 
      });
      
      
       const { error } = await supabase.functions.invoke('sos-dispatch', {
         body: { message: messageUrgence, latitude: finalLat, longitude: finalLng, sans_position: finalSansPosition }
      });
      
      Alert.alert(
        '✅ Alerte envoyée', 
        finalSansPosition 
          ? 'SOS envoyé (position approximative). Les autorités sont notifiées.'
          : 'SOS envoyé avec votre position. Les autorités sont notifiées.'
      );
      
      // Réinitialiser
      setLatitude(null);
      setLongitude(null);
      setSansPosition(false);
      setMessageUrgence('');
      fetchHistorique();
      
    } catch (error: any) {
      console.error('Erreur envoi SOS:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'alerte');
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'envoye': return '📤 Envoyé';
      case 'traite': return '✅ Pris en charge';
      case 'annule': return '❌ Annulé';
      default: return statut;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'envoye': return '#f59e0b';
      case 'traite': return '#16a34a';
      case 'annule': return '#ef4444';
      default: return '#64748b';
    }
  };

  // ✅ Demande de permission améliorée
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Permission de localisation",
              message: "L'application a besoin d'accéder à votre position pour envoyer des alertes SOS",
              buttonNeutral: "Demander plus tard",
              buttonNegative: "Annuler",
              buttonPositive: "OK"
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("✅ Permission de localisation accordée");
            // Tester la géolocalisation
            Geolocation.getCurrentPosition(
              (pos) => console.log("GPS fonctionne:", pos.coords),
              (err) => console.warn("GPS error:", err)
            );
          } else {
            console.log("⚠️ Permission de localisation refusée");
            Alert.alert(
              "Localisation nécessaire",
              "Pour une alerte SOS efficace, veuillez activer la localisation"
            );
          }
        } catch (err) {
          console.warn("Erreur permission:", err);
        }
      }
    };
    
    requestLocationPermission();
    fetchHistorique();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Urgence</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { fetchHistorique(); }} />
        }
      >

        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={24} color="#dc2626" />
          <Text style={styles.warningText}>
            En cas de danger immédiat, contactez d'abord les secours : Police 17, Pompiers 18, SAMU 15.
            Le bouton SOS est une aide complémentaire.
          </Text>
        </View>

        {rateLimitError && (
          <View style={styles.rateLimitBox}>
            <Ionicons name="timer-outline" size={20} color="#dc2626" />
            <Text style={styles.rateLimitText}>Limite de 3 SOS par heure atteinte. Réessayez plus tard.</Text>
          </View>
        )}

        {isActive ? (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownText}>secondes avant envoi</Text>
            <TouchableOpacity style={styles.annulerBtn} onPress={annulerSOS}>
              <Text style={styles.annulerBtnText}>ANNULER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.sosButton, rateLimitError && styles.sosButtonDisabled]}
            onPress={demarrerSOS}
            disabled={rateLimitError}
          >
            <Ionicons name="alert-circle" size={40} color="#fff" />
            <Text style={styles.sosButtonText}>DÉMARRER LA PROCÉDURE</Text>
            <Text style={styles.sosSubText}>30 secondes pour annuler</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Message d'urgence (optionnel)</Text>
          <TextInput
            style={styles.messageInput}
            multiline
            numberOfLines={3}
            value={messageUrgence}
            onChangeText={setMessageUrgence}
            placeholder="Décrivez votre situation (ex: je suis coincé, besoin de secours)..."
            placeholderTextColor="#94a3b8"
            editable={!isActive}
          />
          {latitude && longitude && (
            <Text style={styles.coordsText}>
              📍 Position: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          )}
          {sansPosition && !isActive && (
            <Text style={styles.coordsText}>
              ⚠️ Position non disponible - alerte envoyée sans localisation précise
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.cardHeader}
            onPress={() => setShowHistorique(!showHistorique)}
          >
            <Text style={styles.cardTitle}>📋 Historique des alertes</Text>
            <Ionicons name={showHistorique ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
          </TouchableOpacity>
          
          {showHistorique && (
            historique.length === 0 ? (
              <Text style={styles.emptyText}>Aucune alerte envoyée</Text>
            ) : (
              historique.map((event) => (
                <View key={event.id} style={styles.historiqueItem}>
                  <View style={[styles.historiqueDot, { backgroundColor: getStatutColor(event.statut) }]} />
                  <View style={styles.historiqueContent}>
                    <Text style={styles.historiqueDate}>
                      {new Date(event.created_at).toLocaleString('fr-FR')}
                    </Text>
                    <Text style={[styles.historiqueStatut, { color: getStatutColor(event.statut) }]}>
                      {getStatutLabel(event.statut)}
                    </Text>
                    {event.message && (
                      <Text style={styles.historiqueMessage} numberOfLines={2}>{event.message}</Text>
                    )}
                    {event.sans_position && (
                      <Text style={styles.historiqueMessage}>⚠️ Sans position GPS</Text>
                    )}
                  </View>
                </View>
              ))
            )
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  warningText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 16 },

  rateLimitBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 16 },
  rateLimitText: { flex: 1, fontSize: 12, color: '#dc2626' },

  countdownContainer: { alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 20, padding: 30, marginBottom: 20 },
  countdownNumber: { fontSize: 64, fontWeight: '800', color: '#fff' },
  countdownText: { fontSize: 16, color: '#fff', marginTop: 8 },
  annulerBtn: { marginTop: 20, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 30 },
  annulerBtnText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },

  sosButton: { backgroundColor: '#dc2626', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 20 },
  sosButtonDisabled: { opacity: 0.5 },
  sosButtonText: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 12 },
  sosSubText: { fontSize: 12, color: '#fecaca', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  messageInput: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 14, color: '#1e293b', textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', minHeight: 80 },
  coordsText: { fontSize: 11, color: '#64748b', marginTop: 8 },

  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },

  historiqueItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  historiqueDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  historiqueContent: { flex: 1 },
  historiqueDate: { fontSize: 11, color: '#94a3b8' },
  historiqueStatut: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  historiqueMessage: { fontSize: 12, color: '#64748b', marginTop: 4 },
});