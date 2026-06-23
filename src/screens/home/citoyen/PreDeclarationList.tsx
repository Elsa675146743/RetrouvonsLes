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
import { getMesPreDeclarations, PreDeclaration } from '../../../services/preDeclarationApi';

export default function PreDeclarationList({ navigation }: any) {
  const [preDeclarations, setPreDeclarations] = useState<PreDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMesPreDeclarations();
      setPreDeclarations(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const getStatutBgColor = (statut: string) => {
    switch (statut) {
      case 'soumise': return '#fef3c7';
      case 'en_examen': return '#dbeafe';
      case 'convertie': return '#dcfce7';
      case 'rejetee': return '#fee2e2';
      default: return '#f1f5f9';
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes pré-déclarations</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('NouvellePreDeclaration')}
        >
          <Ionicons name="add" size={28} color="#b45f06" />
        </TouchableOpacity>
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : preDeclarations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucune pré-déclaration</Text>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore fait de pré-déclaration.
              Cliquez sur le bouton "+" pour en faire une.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('NouvellePreDeclaration')}
            >
              <Text style={styles.emptyBtnText}>Faire une pré-déclaration</Text>
            </TouchableOpacity>
          </View>
        ) : (
          preDeclarations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigation.navigate('PreDeclarationDetail', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>
                  {item.prenom_personne} {item.nom_personne}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatutBgColor(item.statut) },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatutColor(item.statut) }]}>
                    {getStatutLabel(item.statut)}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardOrg}>
                {item.organisation?.nom || 'Organisation inconnue'}
              </Text>

              <View style={styles.cardRow}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.cardDate}>
                  Disparition le {formatDate(item.date_disparition)}
                </Text>
              </View>

              {item.lieu_disparition && (
                <View style={styles.cardRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.cardDate}>{item.lieu_disparition}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.cardCreated}>
                  Créé le {formatDate(item.created_at)}
                </Text>
                {item.conversation && (
                  <View style={styles.conversationBadge}>
                    <Ionicons name="chatbubble-outline" size={12} color="#b45f06" />
                    <Text style={styles.conversationBadgeText}>Messagerie</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
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
  addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  loadingContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0b1c30' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#b45f06',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  cardOrg: { fontSize: 13, color: '#64748b', marginBottom: 8 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#64748b' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardCreated: { fontSize: 11, color: '#94a3b8' },
  conversationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fefce8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  conversationBadgeText: { fontSize: 10, color: '#b45f06', fontWeight: '600' },
});