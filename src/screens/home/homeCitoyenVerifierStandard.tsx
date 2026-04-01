import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Modal, Dimensions
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');
const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─────────────────────────────────────────────────────────────
// HEADER COMMUN
// ─────────────────────────────────────────────────────────────
function AppHeader({ navigation, titre, alertes = 0 }: any) {
  return (
    <View style={hStyles.header}>
      <View style={hStyles.logoRow}>
        <Ionicons name="search-circle" size={28} color="#1d4ed8" />
        <Text style={hStyles.logoText}>
          Retrouvons<Text style={{ color: '#1d4ed8' }}>Les</Text>
        </Text>
      </View>
      {titre ? <Text style={hStyles.pageTitle}>{titre}</Text> : <View style={{ flex: 1 }} />}
      <View style={hStyles.headerRight}>
        <TouchableOpacity
          style={hStyles.bellBtn}
          onPress={() => navigation.navigate('Alertes')}
        >
          <Ionicons name="notifications-outline" size={22} color="#1e293b" />
          {alertes > 0 && (
            <View style={hStyles.bellBadge}>
              <Text style={hStyles.bellBadgeText}>{alertes}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ProfilUtilisateur')}>
          <View style={hStyles.avatarCircle}>
            <Ionicons name="person" size={18} color="#1d4ed8" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const hStyles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoText:     { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  pageTitle:    { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn:      { position: 'relative' },
  bellBadge:    { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  bellBadgeText:{ fontSize: 9, color: '#FFF', fontWeight: 'bold' },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1d4ed8' },
});

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, count, label, sub, loading }: any) {
  return (
    <View style={sCard.card}>
      <View style={sCard.iconBox}>
        <Ionicons name={icon} size={20} color="#1d4ed8" />
      </View>
      <Text style={sCard.count}>{loading ? '...' : count}</Text>
      <Text style={sCard.label}>{label}</Text>
      {sub && <Text style={sCard.sub}>{sub}</Text>}
    </View>
  );
}

const sCard = StyleSheet.create({
  card:    { backgroundColor: '#FFF', borderRadius: 12, padding: 14, width: (width - 52) / 3, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'flex-start', gap: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  count:   { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  label:   { fontSize: 11, color: '#64748b', fontWeight: '600' },
  sub:     { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────
// ACCUEIL (TABLEAU DE BORD)
// ─────────────────────────────────────────────────────────────
function Accueil({ navigation }: any) {
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('citoyen');
  const [verifie, setVerifie]   = useState(false);
  const [alertesCount, setAlertesCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0, approuves: 0, enRevision: 0,
    alertes: 0, score: 0, nonLues: 0,
  });
  const [activites, setActivites] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: u } = await supabase
        .from('utilisateur')
        .select('nom, prenom, statut_compte, score_fiabilite, nombre_signalements_valides')
        .eq('id', user.id)
        .single();

      if (u) {
        setUserName(`${u.prenom || ''} ${u.nom || ''}`.trim() || 'citoyen');
        setVerifie(u.statut_compte === 'actif');
      }

      const { count: total }     = await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('id_utilisateur', user.id);
      const { count: approuves } = await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('id_utilisateur', user.id).eq('statut_validation', 'valide');
      const { count: enRevision }= await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('id_utilisateur', user.id).eq('statut_validation', 'en_verification');
      const { count: alertes }   = await supabase.from('alerte').select('*', { count: 'exact', head: true }).eq('statut_alerte', 'en_cours');
      const { count: nonLues }   = await supabase.from('notification').select('*', { count: 'exact', head: true }).eq('lue', false);

      setAlertesCount(nonLues || 0);
      setStats({
        total:      total     || 0,
        approuves:  approuves || 0,
        enRevision: enRevision|| 0,
        alertes:    alertes   || 0,
        score:      u?.score_fiabilite || 0,
        nonLues:    nonLues   || 0,
      });

      const { data: acts } = await supabase
        .from('journal_activite')
        .select('id, type_action, action_detaillee, description, date_action')
        .eq('id_utilisateur', user.id)
        .order('date_action', { ascending: false })
        .limit(5);
      setActivites(acts || []);

    } catch (err) {
      console.error('Erreur accueil:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const quickActions = [
    { icon: 'add-circle',      label: 'Nouveau signalement', sub: 'Rapports illimités',   screen: 'NouveauSignalement', bg: '#1d4ed8', textColor: '#FFF', accent: '#FFF' },
    { icon: 'eye-outline',     label: 'Signalements',        sub: 'Validation instantanée', screen: 'Signalements',      bg: '#FFF',    textColor: '#1e293b', accent: '#1d4ed8' },
    { icon: 'notifications-outline', label: 'Notifications', sub: `${stats.nonLues} Non lues`, screen: 'Alertes',        bg: '#FFF',    textColor: '#1e293b', accent: '#1d4ed8' },
    { icon: 'location-outline', label: 'Carte des alertes',  sub: 'Alertes à proximité',  screen: 'Carte',              bg: '#FFF',    textColor: '#1e293b', accent: '#1d4ed8' },
  ];

  const bonnesPratiques = [
    { titre: 'Décrivez précisément ce que vous avez observé', desc: "Indiquez le lieu exact, l'heure approximative, la direction de déplacement et tout détail distinctif (vêtements, particularités physiques)." },
    { titre: 'Protégez votre sécurité',                       desc: "Ne tentez pas d'interpeller seul une personne suspecte. Privilégiez l'observation discrète et contactez les autorités compétentes." },
    { titre: 'Respectez la vie privée',                       desc: "Évitez de partager publiquement des informations sensibles sur les réseaux sociaux. Utilisez l'application pour transmettre vos signalements de manière sécurisée." },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <AppHeader navigation={navigation} alertes={alertesCount} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        {/* BIENVENUE */}
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>
              Bienvenue, {verifie ? 'citoyen vérifié' : userName}
            </Text>
          </View>
          {verifie && (
            <View style={styles.verifiBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            </View>
          )}
        </View>

        {/* STATS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10, paddingRight: 16 }}>
            <StatCard loading={loading} icon="bar-chart-outline"        count={stats.total}      label="Rapports totaux" sub="Mes signalements"           />
            <StatCard loading={loading} icon="checkmark-circle-outline" count={stats.approuves}  label="Approuvé"        sub="Validé"                      />
            <StatCard loading={loading} icon="time-outline"             count={stats.enRevision} label="En révision"     sub="en cours"                    />
            <StatCard loading={loading} icon="warning-outline"          count={stats.alertes}    label="Alertes"         sub={null}                        />
            <StatCard loading={loading} icon="checkmark-circle-outline" count={`${stats.score}%`} label="Score de fiabilité" sub="Basé sur vos signalements validés" />
          </View>
        </ScrollView>

        {/* ACTIONS RAPIDES */}
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionCard, { backgroundColor: a.bg, borderColor: a.bg === '#FFF' ? '#e2e8f0' : a.bg }]}
              onPress={() => navigation.navigate(a.screen)}
            >
              <Ionicons name={a.icon as any} size={32} color={a.accent} />
              <Text style={[styles.actionLabel, { color: a.textColor }]}>{a.label}</Text>
              <Text style={[styles.actionSub, { color: a.bg === '#1d4ed8' ? 'rgba(255,255,255,0.75)' : '#1d4ed8' }]}>
                {a.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ACTIVITÉ RÉCENTE */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#1d4ed8" />
          ) : activites.length === 0 ? (
            <Text style={styles.emptyText}>Aucune activité récente</Text>
          ) : (
            activites.map((a, i) => (
              <View key={i} style={styles.activiteItem}>
                <View style={styles.activiteIconBox}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activiteTitre}>
                    {a.action_detaillee || a.type_action?.replace(/_/g, ' ') || '—'}
                  </Text>
                  {a.description && (
                    <Text style={styles.activiteDesc} numberOfLines={2}>{a.description}</Text>
                  )}
                  <Text style={styles.activiteDate}>
                    {a.date_action ? new Date(a.date_action).toLocaleDateString('fr-FR') : '—'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* PRÉVENTION ET BONNES PRATIQUES */}
        <View style={[styles.sectionCard, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Prévention et bonnes pratiques</Text>
          {bonnesPratiques.map((b, i) => (
            <View key={i} style={styles.pratiqueItem}>
              <Ionicons name="warning-outline" size={20} color="#16a34a" style={{ marginTop: 2, flexShrink: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pratiqueTitre}>{b.titre}</Text>
                <Text style={styles.pratiqueDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGES PLACEHOLDER
// ─────────────────────────────────────────────────────────────
function PlaceholderPage({ title, icon, navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader navigation={navigation} />
      <View style={styles.placeholderBody}>
        <Ionicons name={icon} size={56} color="#cbd5e1" />
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderSub}>Cette section sera disponible prochainement.</Text>
      </View>
    </SafeAreaView>
  );
}

const DossiersPage        = ({ navigation }: any) => <PlaceholderPage title="Dossiers"            icon="folder-open-outline"    navigation={navigation} />;
const CartePage           = ({ navigation }: any) => <PlaceholderPage title="Carte des alertes"   icon="map-outline"            navigation={navigation} />;
const AlertesPage         = ({ navigation }: any) => <PlaceholderPage title="Alertes"             icon="notifications-outline"  navigation={navigation} />;
const SignalementsPage    = ({ navigation }: any) => <PlaceholderPage title="Mes Signalements"    icon="document-text-outline"  navigation={navigation} />;
const NouveauSignalement  = ({ navigation }: any) => <PlaceholderPage title="Nouveau Signalement" icon="add-circle-outline"     navigation={navigation} />;
const DonsPage            = ({ navigation }: any) => <PlaceholderPage title="Dons & Campagnes"    icon="heart-outline"          navigation={navigation} />;

// ─────────────────────────────────────────────────────────────
// MENU PLUS
// ─────────────────────────────────────────────────────────────
function MenuPlus({ visible, onClose, navigation }: any) {
  const items = [
    { icon: 'add-circle-outline', label: 'Nouveau signalement', screen: 'NouveauSignalement', color: '#1d4ed8' },
    { icon: 'heart-outline',      label: 'Dons & Campagnes',    screen: 'Dons',               color: '#ef4444' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={menuStyles.container}>
          <View style={menuStyles.handle} />
          <Text style={menuStyles.title}>Actions</Text>
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={menuStyles.item}
              onPress={() => { onClose(); setTimeout(() => navigation.navigate(item.screen), 200); }}
            >
              <View style={[menuStyles.itemIconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={menuStyles.itemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={menuStyles.btnFermer} onPress={onClose}>
            <Text style={menuStyles.btnFermerText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:   { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:      { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:       { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  item:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemLabel:   { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  btnFermer:   { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnFermerText:{ color: '#64748b', fontWeight: '600', fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────
// TAB NAVIGATOR
// ─────────────────────────────────────────────────────────────
function TabNavigator({ navigation }: any) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor:   '#1d4ed8',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle:             { height: 65, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === 'AccueilTab') return <Ionicons name={focused ? 'home'        : 'home-outline'}        size={size} color={color} />;
            if (route.name === 'DossiersTab') return <Ionicons name={focused ? 'people'      : 'people-outline'}      size={size} color={color} />;
            if (route.name === 'CarteTab')    return <Ionicons name={focused ? 'map'         : 'map-outline'}         size={size} color={color} />;
            if (route.name === 'AlertesTab')  return <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />;
            if (route.name === 'PlusTab')     return <View style={{ width: size }} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="AccueilTab"  component={Accueil}      options={{ tabBarLabel: 'Accueil'   }} />
        <Tab.Screen name="DossiersTab" component={DossiersPage} options={{ tabBarLabel: 'Dossiers'  }} />
        <Tab.Screen
          name="PlusTab"
          component={Accueil}
          options={{
            tabBarLabel: '',
            tabBarButton: () => (
              <TouchableOpacity
                style={tabStyles.plusBtn}
                onPress={() => setMenuVisible(true)}
              >
                <View style={tabStyles.plusBtnInner}>
                  <Ionicons name="add" size={30} color="#FFF" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen name="CarteTab"   component={CartePage}   options={{ tabBarLabel: 'Carte'    }} />
        <Tab.Screen name="AlertesTab" component={AlertesPage} options={{ tabBarLabel: 'Alertes'  }} />
      </Tab.Navigator>

      <MenuPlus
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </>
  );
}

const tabStyles = StyleSheet.create({
  plusBtn:      { top: -20, justifyContent: 'center', alignItems: 'center', width: 60 },
  plusBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
});

// ─────────────────────────────────────────────────────────────
// STACK NAVIGATOR
// ─────────────────────────────────────────────────────────────
function HomeStack({ level }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TabHome" component={TabNavigator} />
      <Stack.Screen name="NouveauSignalement" component={NouveauSignalement} />
      <Stack.Screen name="Signalements"       component={SignalementsPage}   />
      <Stack.Screen name="Dossiers"           component={DossiersPage}       />
      <Stack.Screen name="Carte"              component={CartePage}          />
      <Stack.Screen name="Alertes"            component={AlertesPage}        />
      <Stack.Screen name="Dons"               component={DonsPage}           />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
function HomeCitoyenVerifieStandard({ level }: { level?: number | null }) {
  return <HomeStack level={level} />;
}

// ─────────────────────────────────────────────────────────────
// STYLES PRINCIPAUX
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent:      { padding: 16, paddingBottom: 30 },

  welcomeRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  welcomeTitle:       { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  verifiBadge:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' },

  actionsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard:         { width: (width - 44) / 2, borderRadius: 14, padding: 16, borderWidth: 1, gap: 6 },
  actionLabel:        { fontSize: 14, fontWeight: 'bold' },
  actionSub:          { fontSize: 11 },

  sectionCard:        { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle:       { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 14 },

  activiteItem:       { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  activiteIconBox:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  activiteTitre:      { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  activiteDesc:       { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 16 },
  activiteDate:       { fontSize: 10, color: '#94a3b8', marginTop: 4 },

  pratiqueItem:       { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pratiqueTitre:      { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  pratiqueDesc:       { fontSize: 12, color: '#64748b', lineHeight: 17 },

  emptyText:          { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  placeholderBody:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  placeholderTitle:   { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  placeholderSub:     { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40 },
});

export default HomeCitoyenVerifieStandard;