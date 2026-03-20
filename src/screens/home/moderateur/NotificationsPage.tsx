import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

function NotificationsPage({ navigation }: { navigation: any }) {

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [filtreActif, setFiltreActif]     = useState('toutes');
  const [stats, setStats]                 = useState({ total: 0, nonLues: 0, signalements: 0, ia: 0 });

  const filtres = [
    { label: 'Toutes',       value: 'toutes',      icon: 'filter-outline'        },
    { label: 'Non lues (0)', value: 'non_lues',    icon: 'notifications-outline' },
    { label: 'Signalements', value: 'signalement', icon: 'warning-outline'       },
    { label: 'IA',           value: 'ia',          icon: 'hardware-chip-outline' },
    { label: 'Photos',       value: 'photo',       icon: 'image-outline'         },
  ];

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('notification')
        .select('id, type_notification, titre, message, lue, canal, priorite, date_creation, id_dossier, id_alerte')
        .order('date_creation', { ascending: false })
        .limit(50);

      if (filtreActif === 'non_lues')    query = query.eq('lue', false);
      if (filtreActif === 'signalement') query = query.eq('type_notification', 'signalement_valide');
      if (filtreActif === 'ia')          query = query.eq('type_notification', 'correspondance_ia');
      if (filtreActif === 'photo')       query = query.eq('type_notification', 'mise_a_jour_dossier');

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];
      setNotifications(list);
      setStats({
        total:        list.length,
        nonLues:      list.filter((n: any) => !n.lue).length,
        signalements: list.filter((n: any) => n.type_notification === 'signalement_valide').length,
        ia:           list.filter((n: any) => n.type_notification === 'correspondance_ia').length,
      });
    } catch (err) {
      console.error('Erreur notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtreActif]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const marquerToutLu = async () => {
    try {
      await supabase.from('notification').update({ lue: true, date_lecture: new Date().toISOString() }).eq('lue', false);
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const marquerLu = async (id: number) => {
    try {
      await supabase.from('notification').update({ lue: true, date_lecture: new Date().toISOString() }).eq('id', id);
      setNotifications(prev => prev.map((n: any) => n.id === id ? { ...n, lue: true } : n));
      setStats(prev => ({ ...prev, nonLues: Math.max(0, prev.nonLues - 1) }));
    } catch (err) { console.error(err); }
  };

  const getNotifIcon = (type: string) => {
    const map: Record<string, { icon: string; color: string }> = {
      nouvelle_alerte:     { icon: 'alert-circle-outline',     color: '#ef4444' },
      signalement_valide:  { icon: 'warning-outline',          color: '#f59e0b' },
      mise_a_jour_dossier: { icon: 'document-text-outline',    color: '#2563eb' },
      personne_retrouvee:  { icon: 'checkmark-circle-outline', color: '#16a34a' },
      correspondance_ia:   { icon: 'hardware-chip-outline',    color: '#8b5cf6' },
      message_autorite:    { icon: 'mail-outline',             color: '#0d9488' },
    };
    return map[type] || { icon: 'notifications-outline', color: '#64748b' };
  };

  const getPrioriteColor = (p: string) =>
    p === 'haute' ? '#dc2626' : p === 'moyenne' ? '#f59e0b' : '#64748b';

  const formatDate = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <Text style={styles.headerSub}>Gérez les signalements et modérez le contenu sur la plateforme</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtresScroll}>
          <View style={styles.filtresRow}>
            {filtres.map(f => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filtreChip, filtreActif === f.value && styles.filtreChipActive]}
                onPress={() => setFiltreActif(f.value)}
              >
                <Ionicons name={f.icon as any} size={13} color={filtreActif === f.value ? '#16a34a' : '#FFF'} />
                <Text style={[styles.filtreChipText, filtreActif === f.value && styles.filtreChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnHeaderAction} onPress={() => fetchNotifications()}>
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnHeaderAction} onPress={marquerToutLu}>
            <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { icon: 'notifications-outline',    count: stats.total,        label: 'Total',        color: '#2563eb' },
          { icon: 'alert-circle-outline',     count: stats.nonLues,      label: 'Non lues',     color: '#ef4444' },
          { icon: 'checkmark-circle-outline', count: stats.signalements, label: 'Signalements', color: '#2563eb' },
          { icon: 'hardware-chip-outline',    count: stats.ia,           label: 'Alertes IA',   color: '#8b5cf6' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={22} color={s.color} />
            <Text style={styles.statNumber}>{loading ? '...' : s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>Vous n'avez pas encore de notifications.</Text>
            </View>
          ) : (
            notifications.map((n: any) => {
              const { icon, color } = getNotifIcon(n.type_notification);
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifCard, !n.lue && styles.notifCardUnread]}
                  onPress={() => marquerLu(n.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.notifIconBox, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon as any} size={20} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.notifHeaderRow}>
                      <Text style={styles.notifTitre} numberOfLines={1}>{n.titre || '—'}</Text>
                      {!n.lue && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={2}>{n.message || '—'}</Text>
                    <View style={styles.notifFooter}>
                      <Text style={styles.notifDate}>{formatDate(n.date_creation)}</Text>
                      {n.priorite && (
                        <View style={[styles.prioriteBadge, { backgroundColor: getPrioriteColor(n.priorite) + '20' }]}>
                          <Text style={[styles.prioriteText, { color: getPrioriteColor(n.priorite) }]}>
                            {n.priorite}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f1f5f9' },
  header:              { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  btnBack:             { marginBottom: 8 },
  headerTitleRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle:         { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSub:           { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  filtresScroll:       { marginBottom: 10 },
  filtresRow:          { flexDirection: 'row', gap: 8 },
  filtreChip:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  filtreChipActive:    { backgroundColor: '#FFF', borderColor: '#FFF' },
  filtreChipText:      { fontSize: 12, color: '#FFF', fontWeight: '600' },
  filtreChipTextActive:{ color: '#16a34a' },
  headerActions:       { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  btnHeaderAction:     { width: 36, height: 36, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  statsRow:            { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statCard:            { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  statNumber:          { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  statLabel:           { fontSize: 9, color: '#64748b', textAlign: 'center' },
  loadingContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer:      { alignItems: 'center', paddingTop: 80 },
  emptyTitle:          { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 14 },
  emptySub:            { fontSize: 13, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  notifCard:           { flexDirection: 'row', gap: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notifCardUnread:     { borderLeftWidth: 3, borderLeftColor: '#16a34a', backgroundColor: '#f0fdf4' },
  notifIconBox:        { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  notifHeaderRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notifTitre:          { fontSize: 13, fontWeight: '700', color: '#1e293b', flex: 1 },
  unreadDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginLeft: 6 },
  notifMessage:        { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 6 },
  notifFooter:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifDate:           { fontSize: 10, color: '#94a3b8' },
  prioriteBadge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  prioriteText:        { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
});

export default NotificationsPage;