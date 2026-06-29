import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  envoyerSOS,
  annulerSOS,
  getHistoriqueSOS,
  getCurrentPosition,
  requestLocationPermission,
  supprimerHistoriqueSOS,
  SosEvent,
} from '../../../services/sosApi';
import SOSCountdown from '../../../components/SOSCountdown';
import { supabase } from '../../../services/supabase';

const COUNTDOWN_SECONDS = 15;

export default function SOS({ navigation }: any) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [messageUrgence, setMessageUrgence] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [precisionMeters, setPrecisionMeters] = useState<number | null>(null);
  const [sansPosition, setSansPosition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historique, setHistorique] = useState<SosEvent[]>([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [contactsCount, setContactsCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [history, contacts] = await Promise.all([
        getHistoriqueSOS(20),
        supabase
          .from('contact_urgence')
          .select('id', { count: 'exact', head: true })
          .eq('id_utilisateur', (await supabase.auth.getUser()).data.user?.id || ''),
      ]);
      setHistorique(history);
      setContactsCount(contacts.count || 0);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const demarrerSOS = useCallback(async () => {
    setRateLimitError(false);
    setIsActive(true);
    setCountdown(COUNTDOWN_SECONDS);

    const coords = await getCurrentPosition();
    if (coords) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setPrecisionMeters(coords.precision);
      setSansPosition(false);
    } else {
      setSansPosition(true);
      setLatitude(null);
      setLongitude(null);
      setPrecisionMeters(null);
    }
  }, []);

  const annuler = useCallback(async () => {
    setIsActive(false);
    setCountdown(null);

    try {
      setLoading(true);
      const result = await annulerSOS();
      console.log('SOS annulé (trace):', result);
      Alert.alert('Procédure annulée', "L'alerte n'a pas été envoyée. Une trace interne a été conservée.");
      await fetchData();
    } catch (error: any) {
      console.error('Erreur annulation:', error);
      Alert.alert('Erreur', error.message || "Impossible d'annuler la procédure");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const envoyer = useCallback(async () => {
    setIsActive(false);
    setCountdown(null);

    try {
      setLoading(true);

      let finalLat = latitude;
      let finalLng = longitude;
      let finalPrecision = precisionMeters;
      let finalSansPosition = sansPosition;

      if (!finalLat && !finalLng && !finalSansPosition) {
        const coords = await getCurrentPosition();
        if (coords) {
          finalLat = coords.latitude;
          finalLng = coords.longitude;
          finalPrecision = coords.precision;
          finalSansPosition = false;
        } else {
          finalSansPosition = true;
        }
      }

      await envoyerSOS({
        message: messageUrgence || undefined,
        latitude: finalLat,
        longitude: finalLng,
        precisionMeters: finalPrecision,
      });

      Alert.alert(
        '✅ Alerte envoyée',
        finalSansPosition
          ? 'SOS envoyé (sans position GPS précise). Les autorités et vos contacts sont notifiés.'
          : 'SOS envoyé avec votre position. Les autorités et vos contacts sont notifiés.'
      );

      setLatitude(null);
      setLongitude(null);
      setPrecisionMeters(null);
      setSansPosition(false);
      setMessageUrgence('');
      setRateLimitError(false);
      await fetchData();
    } catch (error: any) {
      console.error('Erreur envoi SOS:', error);
      if (error.message?.includes('Trop de demandes SOS récentes')) {
        setRateLimitError(true);
        Alert.alert('Limite atteinte', "Vous avez déjà envoyé 3 SOS dans l'heure. Réessayez plus tard.");
      } else {
        Alert.alert('Erreur', error.message || "Impossible d'envoyer l'alerte");
      }
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, precisionMeters, sansPosition, messageUrgence, fetchData]);

  const supprimerHistorique = useCallback(() => {
    Alert.alert(
      'Supprimer l\'historique',
      'Voulez-vous supprimer tout l\'historique des alertes ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await supprimerHistoriqueSOS();
              await fetchData();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || "Impossible de supprimer l'historique");
            }
          },
        },
      ]
    );
  }, [fetchData]);

  const isSosDisabled = rateLimitError || loading;

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Urgence</Text>
        <TouchableOpacity
          style={styles.contactsBtn}
          onPress={() => navigation.navigate('ContactsUrgence')}
        >
          <Ionicons name="people-outline" size={22} color="#b45f06" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {rateLimitError && (
          <View style={styles.rateLimitBox}>
            <Ionicons name="timer-outline" size={20} color="#dc2626" />
            <Text style={styles.rateLimitText}>
              Limite de 3 SOS par heure atteinte. Réessayez plus tard.
            </Text>
          </View>
        )}

        {isActive ? (
          <SOSCountdown
            seconds={COUNTDOWN_SECONDS}
            onComplete={envoyer}
            onCancel={annuler}
            loading={loading}
          />
        ) : (
          <TouchableOpacity
            style={[styles.sosButton, isSosDisabled && styles.sosButtonDisabled]}
            onPress={demarrerSOS}
            disabled={isSosDisabled}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Ionicons name="alert-circle" size={40} color="#fff" />
                <Text style={styles.sosButtonText}>LANCER LE SOS</Text>
                <Text style={styles.sosSubText}>{COUNTDOWN_SECONDS} secondes pour annuler</Text>
              </>
            )}
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
            editable={!isActive && !loading}
            maxLength={2000}
          />
          {latitude && longitude && (
            <Text style={styles.coordsText}>
              📍 Position: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              {precisionMeters && ` (±${Math.round(precisionMeters)}m)`}
            </Text>
          )}
          {sansPosition && !isActive && (
            <Text style={styles.coordsText}>
              ⚠️ Position non disponible – alerte envoyée sans localisation précise
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.contactsCard}
          onPress={() => navigation.navigate('ContactsUrgence')}
        >
          <View style={styles.contactsCardLeft}>
            <Ionicons name="people-outline" size={24} color="#b45f06" />
            <View>
              <Text style={styles.contactsCardTitle}>Contacts d'urgence</Text>
              <Text style={styles.contactsCardSubtitle}>
                {contactsCount > 0
                  ? `${contactsCount} contact${contactsCount > 1 ? 's' : ''} enregistré${contactsCount > 1 ? 's' : ''}`
                  : 'Aucun contact enregistré'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TouchableOpacity
              style={styles.cardHeaderLeft}
              onPress={() => setShowHistorique(!showHistorique)}
            >
              <Text style={styles.cardTitle}>📋 Historique des alertes</Text>
            </TouchableOpacity>
            <View style={styles.cardHeaderRight}>
              {historique.length > 0 && (
                <TouchableOpacity onPress={supprimerHistorique} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowHistorique(!showHistorique)}>
                <Ionicons
                  name={showHistorique ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          {showHistorique &&
            (historique.length === 0 ? (
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
                      <Text style={styles.historiqueMessage} numberOfLines={2}>
                        {event.message}
                      </Text>
                    )}
                    {event.sans_position && (
                      <Text style={styles.historiqueMessage}>⚠️ Sans position GPS</Text>
                    )}
                    {event.statut === 'traite' && event.handled_at && (
                      <Text style={styles.historiqueHandled}>
                        ✅ Pris en charge le {new Date(event.handled_at).toLocaleString('fr-FR')}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },
  contactsBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  rateLimitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  rateLimitText: { flex: 1, fontSize: 12, color: '#dc2626' },
  sosButton: {
    backgroundColor: '#cc5500',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#cc5500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sosButtonDisabled: { opacity: 0.5 },
  sosButtonText: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 12 },
  sosSubText: { fontSize: 12, color: '#fecaca', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: { flex: 1 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  messageInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 80,
    marginTop: 8,
  },
  coordsText: { fontSize: 11, color: '#64748b', marginTop: 8 },
  contactsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactsCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contactsCardTitle: { fontSize: 15, fontWeight: '600', color: '#0b1c30' },
  contactsCardSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  historiqueItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  historiqueDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  historiqueContent: { flex: 1 },
  historiqueDate: { fontSize: 11, color: '#94a3b8' },
  historiqueStatut: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  historiqueMessage: { fontSize: 12, color: '#64748b', marginTop: 4 },
  historiqueHandled: { fontSize: 11, color: '#16a34a', marginTop: 4 },
});