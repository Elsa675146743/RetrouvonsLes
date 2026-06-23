import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getPreDeclarationById, PreDeclaration } from '../../../services/preDeclarationApi';
import { getConversationByContext } from '../../../services/messagingApi';

export default function PreDeclarationDetail({ route, navigation }: any) {
  const { id } = route.params;
  const [preDeclaration, setPreDeclaration] = useState<PreDeclaration | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPreDeclarationById(id);
      setPreDeclaration(data);

      if (data) {
        // Récupérer la conversation associée
        const conv = await getConversationByContext({ id_pre_declaration: data.id });
        setConversationId(conv?.id || null);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'soumise': return '📤 Soumise';
      case 'en_examen': return '🔍 En examen';
      case 'convertie': return '✅ Convertie en dossier';
      case 'rejetee': return '❌ Rejetée';
      default: return statut;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'soumise': return '#f59e0b';
      case 'en_examen': return '#3b82f6';
      case 'convertie': return '#16a34a';
      case 'rejetee': return '#ef4444';
      default: return '#64748b';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const goToMessagerie = () => {
    if (conversationId) {
      navigation.navigate('ConversationDetail', {
        conversationId: conversationId,
        contexteNom: `${preDeclaration?.prenom_personne} ${preDeclaration?.nom_personne}`,
        contexteReference: `Pré-déclaration #${preDeclaration?.id?.slice(-8)}`,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b45f06" />
        </View>
      </SafeAreaView>
    );
  }

  if (!preDeclaration) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0b1c30" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pré-déclaration</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Pré-déclaration introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pré-déclaration</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
      >
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: getStatutColor(preDeclaration.statut) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatutColor(preDeclaration.statut) }]}>
            {getStatutLabel(preDeclaration.statut)}
          </Text>
        </View>

        {/* Personne */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Personne disparue</Text>
          <Text style={styles.cardName}>
            {preDeclaration.prenom_personne} {preDeclaration.nom_personne}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Sexe:</Text>
            <Text style={styles.cardValue}>{preDeclaration.sexe}</Text>
          </View>
          {preDeclaration.date_naissance && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Date de naissance:</Text>
              <Text style={styles.cardValue}>{formatDate(preDeclaration.date_naissance)}</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Nationalité:</Text>
            <Text style={styles.cardValue}>{preDeclaration.nationalite}</Text>
          </View>
        </View>

        {/* Disparition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Disparition</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Date:</Text>
            <Text style={styles.cardValue}>{formatDate(preDeclaration.date_disparition)}</Text>
          </View>
          {preDeclaration.lieu_disparition && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Lieu:</Text>
              <Text style={styles.cardValue}>{preDeclaration.lieu_disparition}</Text>
            </View>
          )}
          {preDeclaration.ville_disparition && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Ville:</Text>
              <Text style={styles.cardValue}>{preDeclaration.ville_disparition}</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Type:</Text>
            <Text style={styles.cardValue}>{preDeclaration.type_disparition}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Urgence:</Text>
            <Text style={styles.cardValue}>{preDeclaration.niveau_urgence}</Text>
          </View>
        </View>

        {/* Circonstances */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Circonstances</Text>
          <Text style={styles.cardText}>{preDeclaration.circonstances}</Text>
          {preDeclaration.infos_complementaires && (
            <Text style={styles.cardTextComplement}>
              {preDeclaration.infos_complementaires}
            </Text>
          )}
        </View>

        {/* Contact */}
        {(preDeclaration.contact_nom || preDeclaration.contact_telephone || preDeclaration.contact_email) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📞 Contact</Text>
            {preDeclaration.contact_nom && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Nom:</Text>
                <Text style={styles.cardValue}>{preDeclaration.contact_nom}</Text>
              </View>
            )}
            {preDeclaration.contact_telephone && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Téléphone:</Text>
                <Text style={styles.cardValue}>{preDeclaration.contact_telephone}</Text>
              </View>
            )}
            {preDeclaration.contact_email && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Email:</Text>
                <Text style={styles.cardValue}>{preDeclaration.contact_email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Organisation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏛️ Organisation destinataire</Text>
          <Text style={styles.cardName}>{preDeclaration.organisation?.nom || 'Inconnue'}</Text>
          <Text style={styles.cardSubtext}>
            Type: {preDeclaration.organisation?.type_organisation || 'Inconnu'}
          </Text>
        </View>

        {/* Rejet */}
        {preDeclaration.statut === 'rejetee' && preDeclaration.motif_rejet && (
          <View style={[styles.card, styles.rejetCard]}>
            <Text style={styles.cardTitle}>❌ Motif du rejet</Text>
            <Text style={styles.cardText}>{preDeclaration.motif_rejet}</Text>
          </View>
        )}

        {/* Bouton Messagerie */}
        {conversationId && (
          <TouchableOpacity style={styles.messagerieBtn} onPress={goToMessagerie}>
            <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
            <Text style={styles.messagerieBtnText}>Voir la conversation</Text>
          </TouchableOpacity>
        )}
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

  scrollContent: { padding: 16, paddingBottom: 40 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  notFoundText: { fontSize: 16, color: '#94a3b8' },

  statusBanner: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: { fontSize: 14, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 8 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  cardSubtext: { fontSize: 13, color: '#64748b', marginTop: 4 },
  cardRow: { flexDirection: 'row', marginBottom: 4 },
  cardLabel: { fontSize: 13, color: '#94a3b8', width: 120 },
  cardValue: { fontSize: 13, color: '#0b1c30', flex: 1 },
  cardText: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  cardTextComplement: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rejetCard: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },

  messagerieBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#b45f06',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  messagerieBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});