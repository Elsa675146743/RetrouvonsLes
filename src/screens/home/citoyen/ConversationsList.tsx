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
import { getConversations, ConversationWithDetails } from '../../../services/messagingApi';

export default function ConversationsList({ navigation }: any) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ouverte': return '#16a34a';
      case 'en_attente': return '#f59e0b';
      case 'traitee': return '#3b82f6';
      case 'fermee': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'ouverte': return 'En cours';
      case 'en_attente': return 'En attente';
      case 'traitee': return 'Traitée';
      case 'fermee': return 'Fermée';
      default: return statut;
    }
  };

  const openConversation = (conversation: ConversationWithDetails) => {
    navigation.navigate('ConversationDetail', {
      conversationId: conversation.id,
      contexteNom: conversation.contexte_nom,
      contexteReference: conversation.contexte_reference,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const jours = Math.floor(diff / 86400000);

    if (jours === 0) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `Aujourd'hui ${hours}:${minutes}`;
    }
    if (jours === 1) return 'Hier';
    if (jours < 7) return `Il y a ${jours} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messagerie</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.loadingText}>Chargement des messages...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyText}>
              Vous n'avez encore aucune discussion. Les autorités vous contacteront ici.
            </Text>
          </View>
        ) : (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.conversationItem, conv.non_lus > 0 && styles.conversationUnread]}
              onPress={() => openConversation(conv)}
            >
              <View style={styles.avatarBox}>
                <View
                  style={[styles.statusDot, { backgroundColor: getStatutColor(conv.statut) }]}
                />
                <Ionicons name="chatbubble-outline" size={28} color="#b45f06" />
              </View>

              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text
                    style={[
                      styles.conversationName,
                      conv.non_lus > 0 && styles.conversationNameUnread,
                    ]}
                  >
                    {conv.contexte_nom}
                  </Text>
                  <Text style={styles.conversationDate}>
                    {conv.dernier_message
                      ? formatDate(conv.dernier_message.created_at)
                      : formatDate(conv.created_at)}
                  </Text>
                </View>

                <Text style={styles.conversationRef}>{conv.contexte_reference}</Text>

                <Text
                  style={[
                    styles.lastMessage,
                    conv.non_lus > 0 && styles.lastMessageUnread,
                  ]}
                  numberOfLines={1}
                >
                  {conv.dernier_message?.corps || 'Aucun message'}
                </Text>

                <View style={styles.conversationFooter}>
                  <Text style={styles.conversationStatut}>
                    {getStatutLabel(conv.statut)}
                  </Text>
                  {conv.non_lus > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{conv.non_lus}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
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

  scrollContent: { padding: 16, paddingBottom: 40 },

  loadingContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0b1c30' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conversationUnread: {
    backgroundColor: '#fefce8',
    borderLeftWidth: 3,
    borderLeftColor: '#b45f06',
  },

  avatarBox: { position: 'relative', marginRight: 14 },
  statusDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1,
  },

  conversationInfo: { flex: 1 },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  conversationNameUnread: { color: '#0b1c30' },
  conversationDate: { fontSize: 11, color: '#94a3b8' },
  conversationRef: { fontSize: 11, color: '#b45f06', marginBottom: 4 },
  lastMessage: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  lastMessageUnread: { color: '#0b1c30', fontWeight: '500' },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationStatut: { fontSize: 11, color: '#94a3b8' },
  unreadBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});