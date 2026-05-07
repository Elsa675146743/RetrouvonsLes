import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Image, Alert as RNAlert, Dimensions, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

// Types pour les notifications (selon le schéma)
type Notification = {
  id: number;
  type_notification: 'nouvelle_alerte' | 'signalement_valide' | 'mise_a_jour_dossier' | 'personne_retrouvee' | 'autre';
  titre: string;
  message: string;
  lue: boolean;
  date_creation: string;  // ← Correction : date_creation au lieu de created_at
  id_dossier: string | null;
  id_alerte: string | null;
};

// ─────────────────────────────────────────────────────────────
// EN-TÊTE
// ─────────────────────────────────────────────────────────────
function Header() {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#0b1c30" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Notifications</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// CARTE NOTIFICATION
// ─────────────────────────────────────────────────────────────
function NotificationCard({ notification, onPress, onMarkAsRead }: any) {
  const getIcon = () => {
    switch (notification.type_notification) {
      case 'nouvelle_alerte':
        return <Ionicons name="notifications" size={24} color="#b45f06" />;
      case 'signalement_valide':
        return <Ionicons name="checkmark-circle" size={24} color="#16a34a" />;
      case 'personne_retrouvee':
        return <Ionicons name="heart" size={24} color="#dc2626" />;
      default:
        return <Ionicons name="information-circle" size={24} color="#64748b" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Date inconnue';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)} h`;
    return `Il y a ${Math.floor(diffMinutes / 1440)} j`;
  };

  return (
    <TouchableOpacity 
      style={[styles.notificationCard, !notification.lue && styles.notificationUnread]} 
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        {getIcon()}
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !notification.lue && styles.notificationTitleUnread]}>
          {notification.titre}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>{getTimeAgo(notification.date_creation)}</Text>
      </View>
      {!notification.lue && (
        <TouchableOpacity 
          style={styles.markReadBtn} 
          onPress={() => onMarkAsRead(notification.id)}
        >
          <Ionicons name="checkmark-done" size={16} color="#b45f06" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL ALERTES (NOTIFICATIONS)
// ─────────────────────────────────────────────────────────────
export default function AlertesPage({ navigation }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Correction : utilisation de 'date_creation' au lieu de 'created_at'
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('id_utilisateur', user.id)
        .order('date_creation', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.lue).length || 0);

    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ lue: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, lue: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification')
        .update({ lue: true })
        .eq('id_utilisateur', user.id)
        .eq('lue', false);

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
        setUnreadCount(0);
        RNAlert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
      }
    } catch (error) {
      console.error('Erreur marquage tout lu:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Marquer comme lue si ce ne l'est pas
    if (!notification.lue) {
      markAsRead(notification.id);
    }

    // Naviguer selon le type de notification
    if (notification.id_dossier) {
      navigation.navigate('VoirDossier', { id: notification.id_dossier });
    } else if (notification.id_alerte) {
      navigation.navigate('VoirAlerte', { id: notification.id_alerte });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <Header />

      {/* Bandeau avec compteur */}
      <View style={styles.counterBanner}>
        <View style={styles.counterLeft}>
          <Ionicons name="notifications-outline" size={20} color="#b45f06" />
          <Text style={styles.counterText}>
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            colors={['#b45f06']}
            tintColor="#b45f06"
          />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.emptyText}>Chargement des notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySubtitle}>
              Vous serez notifié lorsqu'il y aura des alertes près de chez vous
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={handleNotificationPress}
              onMarkAsRead={markAsRead}
            />
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
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },

  counterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  counterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterText: { fontSize: 13, color: '#0b1c30', fontWeight: '600' },
  markAllText: { fontSize: 12, color: '#b45f06', fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notificationUnread: {
    backgroundColor: '#fefce8',
    borderLeftWidth: 3,
    borderLeftColor: '#b45f06',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  notificationTitleUnread: { color: '#0b1c30' },
  notificationMessage: { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 6 },
  notificationTime: { fontSize: 10, color: '#94a3b8' },
  markReadBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0b1c30' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 12 },
});