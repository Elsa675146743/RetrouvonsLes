import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Modal, Dimensions
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase }                    from '../../services/supabase';
import ValidationSignalementsPage      from './moderateur/ValidationSignalementsPage';
import ModerationPhotosPage            from './moderateur/ModerationPhotosPage';
import RapportModerationPage           from './moderateur/RapportModerationPage';
import VerificationIdentitePage        from './moderateur/VerificationIdentitePage';
import NotificationsPage               from './moderateur/NotificationsPage';
import VueCartePage                    from './moderateur/VueCartePage';
import MonHistoriquePage from './moderateur/MonHistoriquePage';

const { width } = Dimensions.get('window');
const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// =====================================================
// STAT CARD
// =====================================================
const StatCard = ({ icon, count, label, sub, subColor, loading }: any) => (
  <View style={dStyles.statCard}>
    <View style={dStyles.statIconBox}>
      <Ionicons name={icon} size={14} color="#10b981" />
    </View>
    <Text style={dStyles.statNumber}>{loading ? '...' : count}</Text>
    <Text style={dStyles.statLabel}>{label}</Text>
    {sub && (
      <Text style={[dStyles.statSub, { color: subColor || '#10b981' }]}>
        {sub}
      </Text>
    )}
  </View>
);

// =====================================================
// DASHBOARD MODÉRATEUR
// =====================================================
const DashboardModerateur = ({ navigation, level }: any) => {
  const [stats, setStats] = useState({
    totalSignalements:  0,
    enAttente:          0,
    approuves:          0,
    rejetes:            0,
    photosAModerer:     0,
    identitesAVerifier: 0,
  });
  const [performances, setPerformances] = useState({
    aujourdhui:     0,
    semaine:        0,
    validations:    0,
    rejets:         0,
    photosModerees: 0,
    idVerifiees:    0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { count: total }     = await supabase.from('signalement').select('*', { count: 'exact', head: true });
      const { count: enAttente } = await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('statut_validation', 'en_attente');
      const { count: approuves } = await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('statut_validation', 'valide');
      const { count: rejetes }   = await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('statut_validation', 'invalide');
      const { count: photos }    = await supabase.from('photo').select('*', { count: 'exact', head: true }).eq('approuvee', false).not('id_signalement', 'is', null);

      setStats({
        totalSignalements:  total     || 0,
        enAttente:          enAttente || 0,
        approuves:          approuves || 0,
        rejetes:            rejetes   || 0,
        photosAModerer:     photos    || 0,
        identitesAVerifier: 0,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: aujourdhui } = await supabase.from('signalement').select('*', { count: 'exact', head: true }).neq('statut_validation', 'en_attente').gte('updated_at', today.toISOString());

      const semaineDeb = new Date();
      semaineDeb.setDate(semaineDeb.getDate() - 7);
      const { count: semaine } = await supabase.from('signalement').select('*', { count: 'exact', head: true }).neq('statut_validation', 'en_attente').gte('updated_at', semaineDeb.toISOString());

      setPerformances({
        aujourdhui:     aujourdhui || 0,
        semaine:        semaine    || 0,
        validations:    approuves  || 0,
        rejets:         rejetes    || 0,
        photosModerees: photos     || 0,
        idVerifiees:    0,
      });
    } catch (err) {
      console.error('Erreur stats modérateur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const sub = supabase
      .channel('moderateur_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signalement' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photo' },       fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const perfItems = [
    { icon: 'trending-up-outline',      count: performances.aujourdhui,    label: "Aujourd'hui",     color: '#10b981' },
    { icon: 'bar-chart-outline',        count: performances.semaine,        label: 'Cette semaine',   color: '#2563eb' },
    { icon: 'checkmark-circle-outline', count: performances.validations,    label: 'Validations',     color: '#10b981' },
    { icon: 'close-circle-outline',     count: performances.rejets,         label: 'Rejets',          color: '#ef4444' },
    { icon: 'image-outline',            count: performances.photosModerees, label: 'Photos modérées', color: '#f59e0b' },
    { icon: 'person-outline',           count: performances.idVerifiees,    label: 'ID vérifiées',    color: '#8b5cf6' },
  ];

  return (
    <SafeAreaView style={dStyles.container}>
      <StatusBar barStyle="light-content" />

      <View style={dStyles.appHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('ProfilUtilisateur')}>
          <Ionicons name="person-circle" size={45} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={dStyles.headerTextContainer}>
          <Text style={dStyles.appName}>
            Retrouvons<Text style={{ color: '#a7f3d0' }}>Les</Text>
          </Text>
          <Text style={dStyles.appSubtitle}>Modérateur</Text>
        </View>
        <View style={dStyles.levelBadge}>
          <Text style={dStyles.levelBadgeText}>Lvl {level ?? 3}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={dStyles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={dStyles.heroBanner}>
          <Text style={dStyles.heroTitle}>Bienvenue, Modérateur</Text>
          <Text style={dStyles.heroSub}>Gérez les signalements et modérez le contenu sur la plateforme</Text>
        </View>

        <View style={dStyles.statsGrid}>
          <StatCard loading={loading} icon="bar-chart-outline"        count={stats.totalSignalements}  label="Total signalements"    sub="Aucune activité sur 7 jours"          subColor="#10b981" />
          <StatCard loading={loading} icon="time-outline"             count={stats.enAttente}          label="En attente d'examen"   sub="à examiner"                           subColor="#64748b" />
          <StatCard loading={loading} icon="checkmark-circle-outline" count={stats.approuves}          label="Approuvés"             sub="signalements validés"                 subColor="#10b981" />
          <StatCard loading={loading} icon="close-circle-outline"     count={stats.rejetes}            label="Rejetés"               sub="signalements rejetés"                 subColor="#ef4444" />
          <StatCard loading={loading} icon="image-outline"            count={stats.photosAModerer}     label="Photos à modérer"      sub={`${stats.photosAModerer} En attente`} subColor="#f59e0b" />
          <StatCard loading={loading} icon="person-outline"           count={stats.identitesAVerifier} label="Identités à vérifier"  sub="Aucune en attente"                    subColor="#64748b" />
        </View>

        <View style={dStyles.performancesCard}>
          <View style={dStyles.performancesHeader}>
            <View style={dStyles.perfHeaderLeft}>
              <Ionicons name="trophy-outline" size={18} color="#1e293b" />
              <Text style={dStyles.performancesTitle}>Mes Performances</Text>
            </View>
            <TouchableOpacity style={dStyles.btnHistorique}          
             onPress={() => navigation.navigate('MonHistoriquePage')}
>
              <Ionicons name="time-outline" size={14} color="#64748b" />
              <Text style={dStyles.btnHistoriqueText}>Voir historique</Text>
            </TouchableOpacity>
          </View>
          <View style={dStyles.perfGrid}>
            {perfItems.map((item, i) => (
              <View key={i} style={dStyles.perfCard}>
                <View style={[dStyles.perfIconBox, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[dStyles.perfCount, { color: item.color }]}>
                  {loading ? '...' : item.count}
                </Text>
                <Text style={dStyles.perfLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={dStyles.actionsSectionTitle}>Actions rapides</Text>

        <TouchableOpacity
          style={dStyles.actionBig}
          onPress={() => navigation.navigate('ValidationSignalementsPage')}
        >
          <View style={dStyles.actionBigLeft}>
            <View style={dStyles.actionBigIconBox}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dStyles.actionBigTitle}>Valider les signalements</Text>
              <Text style={dStyles.actionBigSub}>Examinez et validez les signalements en attente</Text>
            </View>
          </View>
          <View style={dStyles.actionBadge}>
            <Text style={dStyles.actionBadgeText}>{stats.enAttente}</Text>
            <Text style={dStyles.actionBadgeLabel}>en attente</Text>
          </View>
        </TouchableOpacity>

        <View style={dStyles.actionsRow}>
          <TouchableOpacity
            style={dStyles.actionSmall}
            onPress={() => navigation.navigate('ModerationPhotosPage')}
          >
            <View style={dStyles.actionSmallIconBox}>
              <Ionicons name="image-outline" size={18} color="#10b981" />
            </View>
            <Text style={dStyles.actionSmallTitle}>Modération des photos</Text>
            <Text style={dStyles.actionSmallSub}>Approuvez les photos des signalements</Text>
            <View style={dStyles.actionBadgeGreen}>
              <Text style={dStyles.actionBadgeGreenText}>{stats.photosAModerer}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={dStyles.actionSmall}
            onPress={() => navigation.navigate('RapportModerationPage')}
          >
            <View style={dStyles.actionSmallIconBox}>
              <Ionicons name="bar-chart-outline" size={18} color="#10b981" />
            </View>
            <Text style={dStyles.actionSmallTitle}>Rapports</Text>
            <Text style={dStyles.actionSmallSub}>Statistiques et analyses</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// =====================================================
// RÉSULTATS IA
// =====================================================
const ResultatsIA = ({ navigation }: any) => (
  <SafeAreaView style={pageStyles.container}>
    <View style={pageStyles.header}>
      <Ionicons name="shield-checkmark" size={22} color="#10b981" />
      <Text style={pageStyles.headerTitle}>RetrouvonsLes</Text>
    </View>
    <View style={pageStyles.body}>
      <Ionicons name="hardware-chip-outline" size={60} color="#10b981" />
      <Text style={pageStyles.title}>Résultats IA</Text>
      <Text style={pageStyles.sub}>Analyse intelligente des signalements.</Text>
    </View>
  </SafeAreaView>
);

// =====================================================
// PAGES PLACEHOLDER RESTANTES
// =====================================================
const MonHistorique = () => (
  <SafeAreaView style={pageStyles.container}>
    <View style={pageStyles.header}>
      <Ionicons name="shield-checkmark" size={22} color="#10b981" />
      <Text style={pageStyles.headerTitle}>RetrouvonsLes</Text>
    </View>
    <View style={pageStyles.body}>
      <Ionicons name="time-outline" size={60} color="#10b981" />
      <Text style={pageStyles.title}>Mon Historique</Text>
      <Text style={pageStyles.sub}>Consultez votre historique d'activité.</Text>
    </View>
  </SafeAreaView>
);

const DonsPage = () => (
  <SafeAreaView style={pageStyles.container}>
    <View style={pageStyles.header}>
      <Ionicons name="shield-checkmark" size={22} color="#10b981" />
      <Text style={pageStyles.headerTitle}>RetrouvonsLes</Text>
    </View>
    <View style={pageStyles.body}>
      <Ionicons name="heart-outline" size={60} color="#ef4444" />
      <Text style={pageStyles.title}>Dons</Text>
      <Text style={pageStyles.sub}>Soutenez notre mission.</Text>
    </View>
  </SafeAreaView>
);

// =====================================================
// ✅ MENU PLUS — tous les boutons pointent vers les vraies pages
// =====================================================
const MenuPlus = ({ visible, onClose, navigation }: any) => {
  const menuItems = [
    { icon: 'person-outline',        label: "Vérification d'identité", screen: 'VerificationIdentite'  },
    { icon: 'map-outline',           label: 'Vue Carte',                screen: 'VueCarte'              },
    { icon: 'notifications-outline', label: 'Notifications',            screen: 'NotificationsPage'     },
    { icon: 'time-outline',          label: 'Mon Historique',           screen: 'MonHistorique'         },
    { icon: 'bar-chart-outline',     label: 'Rapports',                 screen: 'RapportModerationPage' },
    { icon: 'heart-outline',         label: 'Dons',                     screen: 'DonsPage'              },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={menuStyles.container}>
          <View style={menuStyles.handle} />
          <Text style={menuStyles.menuTitle}>Plus d'options</Text>
          <View style={menuStyles.grid}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={menuStyles.menuItem}
                onPress={() => {
                  onClose();
                  setTimeout(() => navigation.navigate(item.screen), 200);
                }}
              >
                <View style={menuStyles.menuIconBox}>
                  <Ionicons name={item.icon as any} size={26} color="#10b981" />
                </View>
                <Text style={menuStyles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={menuStyles.btnFermer} onPress={onClose}>
            <Text style={menuStyles.btnFermerText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// =====================================================
// TAB NAVIGATOR
// =====================================================
const TabWithPlusButton = ({ navigation, level }: any) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === 'Tableau de bord')    return <Ionicons name={focused ? 'grid'              : 'grid-outline'}              size={size} color={color} />;
            if (route.name === 'Validation')          return <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={size} color={color} />;
            if (route.name === 'ModerationPhotosTab') return <Ionicons name={focused ? 'image'            : 'image-outline'}            size={size} color={color} />;
            if (route.name === 'ResultatsIATab')      return <Ionicons name={focused ? 'hardware-chip'    : 'hardware-chip-outline'}    size={size} color={color} />;
            if (route.name === 'PlusTab')             return <View style={{ width: size }} />;
            return <Ionicons name="grid-outline" size={size} color={color} />;
          },
          tabBarActiveTintColor:   '#10b981',
          tabBarInactiveTintColor: 'gray',
          headerShown:             false,
          tabBarStyle:             { height: 65, paddingBottom: 10 },
        })}
      >
        <Tab.Screen name="Tableau de bord">
          {(props) => <DashboardModerateur {...props} level={level} />}
        </Tab.Screen>
        <Tab.Screen name="Validation" component={ValidationSignalementsPage} />
        <Tab.Screen
          name="PlusTab"
          component={DashboardModerateur}
          options={{
            tabBarLabel: '',
            tabBarButton: () => (
              <TouchableOpacity style={tabStyles.plusBtn} onPress={() => setMenuVisible(true)}>
                <View style={tabStyles.plusBtnInner}>
                  <Ionicons name="add" size={30} color="#FFF" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen name="ModerationPhotosTab" component={ModerationPhotosPage} />
        <Tab.Screen name="ResultatsIATab" component={ResultatsIA} options={{ tabBarLabel: 'Résultats IA' }} />
      </Tab.Navigator>

      <MenuPlus visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </>
  );
};

// =====================================================
// ✅ STACK NAVIGATOR — toutes les pages enregistrées
// =====================================================
const HomeStack = ({ level }: any) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TabHome">
      {(props) => <TabWithPlusButton {...props} level={level} />}
    </Stack.Screen>

    {/* ✅ Pages navigables depuis le dashboard */}
    <Stack.Screen name="ValidationSignalementsPage" component={ValidationSignalementsPage}  />
    <Stack.Screen name="ModerationPhotosPage"       component={ModerationPhotosPage}        />
    <Stack.Screen name="RapportModerationPage"      component={RapportModerationPage}       />

    {/* ✅ Pages navigables depuis le bouton + */}
    <Stack.Screen name="VerificationIdentite"       component={VerificationIdentitePage}    />
    <Stack.Screen name="VueCarte"                   component={VueCartePage}                />
    <Stack.Screen name="NotificationsPage"          component={NotificationsPage}           />
    <Stack.Screen name="MonHistorique"              component={MonHistoriquePage}               />
    <Stack.Screen name="DonsPage"                   component={DonsPage}                    />
  </Stack.Navigator>
);

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
const HomeModerateur: React.FC<{ level?: number | null; navigation?: any; route?: any }> = ({ level }) => {
  return <HomeStack level={level} />;
};

// =====================================================
// STYLES DASHBOARD
// =====================================================
const dStyles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f0fdf4' },
  appHeader:            { backgroundColor: '#065f46', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTextContainer:  { flex: 1, marginLeft: 10 },
  appName:              { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  appSubtitle:          { fontSize: 11, color: '#a7f3d0' },
  levelBadge:           { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelBadgeText:       { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  scrollContent:        { padding: 16, paddingBottom: 30 },
  heroBanner:           { backgroundColor: '#065f46', borderRadius: 16, padding: 20, marginBottom: 20 },
  heroTitle:            { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 6 },
  heroSub:              { fontSize: 13, color: '#a7f3d0', lineHeight: 18 },
  statsGrid:            { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard:             { backgroundColor: '#FFF', width: '31%', borderRadius: 10, padding: 8, marginBottom: 10, elevation: 1, alignItems: 'flex-start', borderWidth: 1, borderColor: '#d1fae5' },
  statIconBox:          { width: 26, height: 26, borderRadius: 6, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statNumber:           { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  statLabel:            { fontSize: 9, color: '#64748b', marginTop: 1 },
  statSub:              { fontSize: 8, marginTop: 2, fontWeight: '600' },
  performancesCard:     { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: '#d1fae5' },
  performancesHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  perfHeaderLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  performancesTitle:    { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  btnHistorique:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  btnHistoriqueText:    { fontSize: 11, color: '#64748b' },
  perfGrid:             { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  perfCard:             { width: '31%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  perfIconBox:          { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  perfCount:            { fontSize: 18, fontWeight: 'bold' },
  perfLabel:            { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 3 },
  actionsSectionTitle:  { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 12 },
  actionBig:            { backgroundColor: '#065f46', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, elevation: 2 },
  actionBigLeft:        { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  actionBigIconBox:     { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  actionBigTitle:       { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  actionBigSub:         { fontSize: 10, color: '#a7f3d0', marginTop: 2 },
  actionBadge:          { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 50 },
  actionBadgeText:      { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  actionBadgeLabel:     { fontSize: 8, color: '#a7f3d0', marginTop: 1 },
  actionsRow:           { flexDirection: 'row', gap: 10 },
  actionSmall:          { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#d1fae5', elevation: 1 },
  actionSmallIconBox:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionSmallTitle:     { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 3 },
  actionSmallSub:       { fontSize: 10, color: '#64748b', lineHeight: 14 },
  actionBadgeGreen:     { marginTop: 8, backgroundColor: '#d1fae5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  actionBadgeGreenText: { fontSize: 11, fontWeight: 'bold', color: '#065f46' },
});

const pageStyles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginLeft: 10 },
  body:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  title:       { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 16, textAlign: 'center' },
  sub:         { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },
});

const menuStyles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:     { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:        { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle:     { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, textAlign: 'center' },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuItem:      { width: '30%', alignItems: 'center', marginBottom: 24 },
  menuIconBox:   { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#d1fae5' },
  menuLabel:     { fontSize: 11, color: '#1e293b', textAlign: 'center', fontWeight: '600' },
  btnFermer:     { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnFermerText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
});

const tabStyles = StyleSheet.create({
  plusBtn:      { top: -20, justifyContent: 'center', alignItems: 'center', width: 60 },
  plusBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#065f46', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
});

export default HomeModerateur;