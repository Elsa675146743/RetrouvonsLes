import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Modal, Dimensions
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../services/supabase';
import NouveauDossierPersonne from './police/NouveauDossierPersonne';
import DossiersPage      from './police/DossiersPage';
import DetailDossierPage from './police/DetailDossierPage';
import GestionAlertesPage from './police/GestionAlertesPage';


const { width } = Dimensions.get('window');
const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// =====================================================
// STAT CARD
// =====================================================
const StatCard = ({ icon, count, label, sub, subColor, borderColor, loading }: any) => (
  <View style={[dStyles.statCard, { borderLeftColor: borderColor || '#2563eb' }]}>
    <View style={[dStyles.statIconBox, { backgroundColor: (borderColor || '#2563eb') + '15' }]}>
      <Ionicons name={icon} size={20} color={borderColor || '#2563eb'} />
    </View>
    <Text style={[dStyles.statNumber, { color: borderColor || '#1e293b' }]}>
      {loading ? '...' : count}
    </Text>
    <Text style={dStyles.statLabel}>{label}</Text>
    {sub && <Text style={[dStyles.statSub, { color: subColor || '#64748b' }]}>{sub}</Text>}
  </View>
);

// =====================================================
// DASHBOARD POLICE
// =====================================================
const DashboardPolice = ({ navigation, level }: any) => {
  const [stats, setStats] = useState({
    dossiersActifs: 0,
    totalDossiers:  0,
    casUrgents:     0,
    critiques:      0,
    signalements:   0,
    alertesActives: 0,
    casRetrouves:   0,
    tauxResolution: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Officier');

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: u } = await supabase
          .from('utilisateur')
          .select('nom, prenom')
          .eq('id', user.id)
          .single();
        if (u) setUserName(`${u.prenom} ${u.nom}`);
      }

      const { count: dossiersActifs } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .eq('statut_dossier', 'en_cours');

      const { count: totalDossiers } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true });

      const { count: urgents } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .in('niveau_urgence', ['urgent', 'critique'])
        .eq('statut_dossier', 'en_cours');

      const { count: critiques } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .eq('niveau_urgence', 'critique')
        .eq('statut_dossier', 'en_cours');

      const { count: signalements } = await supabase
        .from('signalement')
        .select('*', { count: 'exact', head: true })
        .eq('statut_validation', 'en_attente');

      const { count: alertes } = await supabase
        .from('alerte')
        .select('*', { count: 'exact', head: true })
        .eq('statut_alerte', 'en_cours');

      const { count: retrouves } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .eq('statut_dossier', 'retrouve_vivant');

      const taux = totalDossiers && totalDossiers > 0
        ? Math.round(((retrouves || 0) / totalDossiers) * 100)
        : 0;

      setStats({
        dossiersActifs: dossiersActifs || 0,
        totalDossiers:  totalDossiers  || 0,
        casUrgents:     urgents        || 0,
        critiques:      critiques      || 0,
        signalements:   signalements   || 0,
        alertesActives: alertes        || 0,
        casRetrouves:   retrouves      || 0,
        tauxResolution: taux,
      });
    } catch (err) {
      console.error('Erreur stats police:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const sub = supabase
      .channel('police_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossier_disparition' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signalement' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerte' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // Actions rapides
  const actions = [
    { icon: 'add-circle-outline',       label: 'Nouveau Dossier',      screen: 'NouveauDossier',    color: '#2563eb' },
    { icon: 'checkmark-circle-outline', label: 'Signalements',         screen: 'Signalements',      color: '#10b981' },
    { icon: 'megaphone-outline',        label: 'Gestion des alertes',  screen: 'GestionAlertes',    color: '#ef4444', badge: stats.alertesActives },
    { icon: 'search-outline',           label: 'Investigation',        screen: 'Investigation',     color: '#8b5cf6' },
    { icon: 'bar-chart-outline',        label: 'Statistiques',         screen: 'Statistiques',      color: '#0d9488' },
    { icon: 'people-outline',           label: 'Coordination',         screen: 'Coordination',      color: '#f59e0b' },
  ];

  return (
    <SafeAreaView style={dStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={dStyles.appHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('ProfilUtilisateur')}>
          <Ionicons name="person-circle" size={45} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={dStyles.headerTextContainer}>
          <Text style={dStyles.appName}>
            Retrouvons<Text style={{ color: '#bfdbfe' }}>Les</Text>
          </Text>
          <Text style={dStyles.appSubtitle}>Officier de Police • Tableau de bord</Text>
        </View>
        <TouchableOpacity style={dStyles.btnRefresh} onPress={fetchStats}>
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={dStyles.btnRefreshText}>Rafraîchir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={dStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* NOM UTILISATEUR */}
        <View style={dStyles.welcomeCard}>
          <Text style={dStyles.welcomeTitle}>Bienvenue, {userName}</Text>
          <Text style={dStyles.welcomeSub}>Officier de Police • Tableau de bord</Text>
        </View>

        {/* STATS CARDS */}
        <View style={dStyles.statsGrid}>
          <StatCard
            loading={loading}
            icon="folder-open-outline"
            count={stats.dossiersActifs}
            label="Dossiers actifs"
            sub={`Total dossiers ${stats.totalDossiers}`}
            borderColor="#2563eb"
          />
          <StatCard
            loading={loading}
            icon="warning-outline"
            count={stats.casUrgents}
            label="Cas urgents"
            sub={stats.critiques > 0 ? 'CRITIQUE' : 'URGENT'}
            subColor="#ef4444"
            borderColor="#ef4444"
          />
          <StatCard
            loading={loading}
            icon="document-text-outline"
            count={stats.signalements}
            label="Signalements"
            sub={`${stats.signalements} Géres les signalements reçus`}
            borderColor="#2563eb"
          />
          <StatCard
            loading={loading}
            icon="notifications-outline"
            count={stats.alertesActives}
            label="Alertes actives"
            sub="Alertes actives"
            borderColor="#2563eb"
          />
          <StatCard
            loading={loading}
            icon="checkmark-circle-outline"
            count={stats.casRetrouves}
            label="Cas retrouvés"
            sub={`${stats.tauxResolution}% Taux de résolution`}
            borderColor="#16a34a"
          />
        </View>

        {/* TABLEAU DE BORD AUTORITÉ */}
        <View style={dStyles.sectionCard}>
          <Text style={dStyles.sectionTitle}>Tableau de bord autorité</Text>
          <View style={dStyles.actionsGrid}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={dStyles.actionItem}
                onPress={() => navigation.navigate(a.screen)}
              >
                <View style={[dStyles.actionIconBox, { backgroundColor: a.color + '15' }]}>
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                  {a.badge && a.badge > 0 ? (
                    <View style={dStyles.actionBadge}>
                      <Text style={dStyles.actionBadgeText}>{a.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={dStyles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* GESTION DES DOSSIERS */}
        <View style={dStyles.listSection}>
          <View style={dStyles.listHeader}>
            <View style={dStyles.listHeaderLeft}>
              <Ionicons name="folder-open-outline" size={16} color="#1e293b" />
              <Text style={dStyles.listTitle}>Gestion des Dossiers</Text>
            </View>
            <TouchableOpacity style={dStyles.btnVoir} onPress={() => navigation.navigate('Dossiers')}>
              <Text style={dStyles.btnVoirText}>Voir</Text>
              <Ionicons name="arrow-forward" size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <DossiersRecents navigation={navigation} loading={loading} />
        </View>

        {/* SIGNALEMENTS */}
        <View style={[dStyles.listSection, { marginTop: 12 }]}>
          <View style={dStyles.listHeader}>
            <View style={dStyles.listHeaderLeft}>
              <Ionicons name="document-text-outline" size={16} color="#1e293b" />
              <Text style={dStyles.listTitle}>Signalements</Text>
            </View>
            <TouchableOpacity style={dStyles.btnVoir} onPress={() => navigation.navigate('Signalements')}>
              <Text style={dStyles.btnVoirText}>Voir</Text>
              <Ionicons name="arrow-forward" size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <SignalementsRecents navigation={navigation} loading={loading} />
        </View>

        {/* ALERTES ACTIVES */}
        <View style={[dStyles.listSection, { marginTop: 12 }]}>
          <View style={dStyles.listHeader}>
            <View style={dStyles.listHeaderLeft}>
              <Ionicons name="megaphone-outline" size={16} color="#1e293b" />
              <Text style={dStyles.listTitle}>Alertes actives</Text>
            </View>
            <TouchableOpacity style={dStyles.btnVoir} onPress={() => navigation.navigate('GestionAlertes')}>
              <Text style={dStyles.btnVoirText}>Voir</Text>
              <Ionicons name="arrow-forward" size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <AlertesActives navigation={navigation} loading={loading} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// =====================================================
// DOSSIERS RÉCENTS
// =====================================================
const DossiersRecents = ({ navigation, loading }: any) => {
  const [dossiers, setDossiers] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('dossier_disparition')
      .select('id, numero_dossier, statut_dossier, niveau_urgence, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setDossiers(data || []));
  }, []);

  const getUrgenceStyle = (u: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      critique: { bg: '#fee2e2', text: '#991b1b' },
      urgent:   { bg: '#fff7ed', text: '#9a3412' },
      normal:   { bg: '#fef9c3', text: '#854d0e' },
      faible:   { bg: '#f0fdf4', text: '#166534' },
    };
    return map[u] || { bg: '#f1f5f9', text: '#64748b' };
  };

  if (loading) return null;

  return (
    <View>
      {dossiers.map(d => {
        const us = getUrgenceStyle(d.niveau_urgence);
        return (
          <TouchableOpacity
            key={d.id}
            style={dStyles.listItem}
            onPress={() => navigation.navigate('DetailDossier', { dossierId: d.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={dStyles.listItemTitle}>{d.numero_dossier}</Text>
              <Text style={dStyles.listItemSub}>{d.statut_dossier?.replace('_', ' ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[dStyles.badge, { backgroundColor: us.bg }]}>
                <Text style={[dStyles.badgeText, { color: us.text }]}>
                  {d.niveau_urgence?.toUpperCase()}
                </Text>
              </View>
              <View style={dStyles.dateRow}>
                <Ionicons name="time-outline" size={11} color="#94a3b8" />
                <Text style={dStyles.dateText}>
                  {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '—'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// =====================================================
// SIGNALEMENTS RÉCENTS
// =====================================================
const SignalementsRecents = ({ navigation, loading }: any) => {
  const [signalements, setSignalements] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('signalement')
      .select('id, description, ville_observation, statut_validation, created_at')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setSignalements(data || []));
  }, []);

  const getStatutStyle = (s: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      en_attente:      { bg: '#fef3c7', text: '#92400e' },
      valide:          { bg: '#f0fdf4', text: '#166534' },
      invalide:        { bg: '#fee2e2', text: '#991b1b' },
      en_verification: { bg: '#eff6ff', text: '#1e40af' },
    };
    return map[s] || { bg: '#f1f5f9', text: '#64748b' };
  };

  if (loading) return null;

  return (
    <View>
      {signalements.map(s => {
        const ss = getStatutStyle(s.statut_validation);
        return (
          <TouchableOpacity
            key={s.id}
            style={dStyles.listItem}
            onPress={() => navigation.navigate('ValidationSignalementsPage', { signalementId: s.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={dStyles.listItemTitle}>{s.ville_observation || '—'}</Text>
              <Text style={dStyles.listItemSub} numberOfLines={1}>{s.description || '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[dStyles.badge, { backgroundColor: ss.bg }]}>
                <Text style={[dStyles.badgeText, { color: ss.text }]}>
                  {s.statut_validation?.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
              <View style={dStyles.dateRow}>
                <Ionicons name="time-outline" size={11} color="#94a3b8" />
                <Text style={dStyles.dateText}>
                  {s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '—'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// =====================================================
// ALERTES ACTIVES
// =====================================================
const AlertesActives = ({ navigation, loading }: any) => {
  const [alertes, setAlertes] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('alerte')
      .select('id, titre, message, statut_alerte, date_diffusion')
      .eq('statut_alerte', 'en_cours')
      .order('date_diffusion', { ascending: false })
      .limit(4)
      .then(({ data }) => setAlertes(data || []));
  }, []);

  if (loading) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
        {alertes.map(a => (
          <TouchableOpacity
            key={a.id}
            style={dStyles.alerteCard}
            onPress={() => navigation.navigate('GestionAlertes', { alerteId: a.id })}
          >
            <View style={dStyles.alerteHeader}>
              <Ionicons name="notifications-outline" size={14} color="#92400e" />
              <Text style={dStyles.alerteTitre} numberOfLines={1}>{a.titre}</Text>
              <View style={dStyles.alerteBadge}>
                <Text style={dStyles.alerteBadgeText}>ALERTES ACTIVES</Text>
              </View>
            </View>
            <Text style={dStyles.alerteMessage} numberOfLines={2}>{a.message || '—'}</Text>
            <View style={dStyles.dateRow}>
              <Ionicons name="time-outline" size={11} color="#92400e" />
              <Text style={[dStyles.dateText, { color: '#92400e' }]}>
                {a.date_diffusion ? new Date(a.date_diffusion).toLocaleDateString('fr-FR') : '—'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {alertes.length === 0 && (
          <Text style={{ fontSize: 12, color: '#94a3b8', paddingVertical: 8 }}>
            Aucune alerte active
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

// =====================================================
// PAGES PLACEHOLDER
// =====================================================
function PlaceholderPage({ title, icon, navigation }: { title: string; icon: string; navigation: any }) {
  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={pageStyles.headerTitle}>{title}</Text>
      </View>
      <View style={pageStyles.body}>
        <Ionicons name={icon as any} size={60} color="#2563eb" />
        <Text style={pageStyles.title}>{title}</Text>
        <Text style={pageStyles.sub}>Cette section sera implémentée prochainement.</Text>
      </View>
    </SafeAreaView>
  );
}

const NouveauDossier     = ({ navigation }: any) => <PlaceholderPage title="Nouveau Dossier"      icon="folder-open-outline"    navigation={navigation} />;
const Dossiers           = ({ navigation }: any) => <PlaceholderPage title="Dossiers"             icon="folder-open-outline"    navigation={navigation} />;
const GestionAlertes     = ({ navigation }: any) => <PlaceholderPage title="Gestion des Alertes"  icon="megaphone-outline"      navigation={navigation} />;
const Signalements       = ({ navigation }: any) => <PlaceholderPage title="Signalements"         icon="document-text-outline"  navigation={navigation} />;
const ModerationPhotos   = ({ navigation }: any) => <PlaceholderPage title="Modération Photos"    icon="image-outline"          navigation={navigation} />;
const VueCarte           = ({ navigation }: any) => <PlaceholderPage title="Vue Carte"            icon="map-outline"            navigation={navigation} />;
const Investigation      = ({ navigation }: any) => <PlaceholderPage title="Investigation"        icon="search-outline"         navigation={navigation} />;
const AnalyseIA          = ({ navigation }: any) => <PlaceholderPage title="Analyse IA"           icon="hardware-chip-outline"  navigation={navigation} />;
const Coordination       = ({ navigation }: any) => <PlaceholderPage title="Coordination"         icon="people-outline"         navigation={navigation} />;
const DonsCampagnes      = ({ navigation }: any) => <PlaceholderPage title="Dons & Campagnes"     icon="heart-outline"          navigation={navigation} />;
const Statistiques       = ({ navigation }: any) => <PlaceholderPage title="Statistiques"         icon="bar-chart-outline"      navigation={navigation} />;
const DetailDossier      = ({ navigation }: any) => <PlaceholderPage title="Détail Dossier"       icon="folder-open-outline"    navigation={navigation} />;

// =====================================================
// MENU PLUS
// =====================================================
const MenuPlus = ({ visible, onClose, navigation }: any) => {
  const menuItems = [
    { icon: 'image-outline',         label: 'Modération photos', screen: 'ModerationPhotos'  },
    { icon: 'map-outline',           label: 'Vue Carte',         screen: 'VueCarte'           },
    { icon: 'search-outline',        label: 'Investigation',     screen: 'Investigation'      },
    { icon: 'hardware-chip-outline', label: 'Analyse IA',        screen: 'AnalyseIA'          },
    { icon: 'people-outline',        label: 'Coordination',      screen: 'Coordination'       },
    { icon: 'heart-outline',         label: 'Dons & Campagnes',  screen: 'DonsCampagnes'      },
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
                  <Ionicons name={item.icon as any} size={26} color="#2563eb" />
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
            if (route.name === 'Tableau de bord') return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />;
            if (route.name === 'DossiersTab')     return <Ionicons name={focused ? 'folder-open' : 'folder-open-outline'} size={size} color={color} />;
            if (route.name === 'AlertesTab')      return <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />;
            if (route.name === 'SignalementsTab') return <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />;
            if (route.name === 'PlusTab')         return <View style={{ width: size }} />;
            return <Ionicons name="grid-outline" size={size} color={color} />;
          },
          tabBarActiveTintColor:   '#2563eb',
          tabBarInactiveTintColor: 'gray',
          headerShown:             false,
          tabBarStyle:             { height: 65, paddingBottom: 10 },
        })}
      >
        <Tab.Screen name="Tableau de bord">
          {(props) => <DashboardPolice {...props} level={level} />}
        </Tab.Screen>
        <Tab.Screen
          name="DossiersTab"
          component={DossiersPage}
          options={{ tabBarLabel: 'Dossiers' }}
        />
        <Tab.Screen
          name="PlusTab"
          component={DashboardPolice}
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
        <Tab.Screen
          name="AlertesTab"
          component={GestionAlertesPage}
          options={{ tabBarLabel: 'Alertes' }}
        />
        <Tab.Screen
          name="SignalementsTab"
          component={Signalements}
          options={{ tabBarLabel: 'Signalements' }}
        />
      </Tab.Navigator>

      <MenuPlus
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </>
  );
};

// =====================================================
// STACK NAVIGATOR
// =====================================================
function HomeStack({ level }: { level?: number | null }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="TabHome"
        children={(props) => <TabWithPlusButton {...props} level={level} />}
      />
      <Stack.Screen
        name="NouveauDossier"
        children={(props) => <NouveauDossierPersonne {...props} />}
      />
      
      <Stack.Screen name="Dossiers"         component={DossiersPage}         />
      <Stack.Screen name="DetailDossier"    component={DetailDossierPage}    />
      <Stack.Screen name="GestionAlertes"   component={GestionAlertesPage}   />
      <Stack.Screen name="Signalements"     component={Signalements}     />
      <Stack.Screen name="ModerationPhotos" component={ModerationPhotos} />
      <Stack.Screen name="VueCarte"         component={VueCarte}         />
      <Stack.Screen name="Investigation"    component={Investigation}    />
      <Stack.Screen name="AnalyseIA"        component={AnalyseIA}        />
      <Stack.Screen name="Coordination"     component={Coordination}     />
      <Stack.Screen name="DonsCampagnes"    component={DonsCampagnes}    />
      <Stack.Screen name="Statistiques"     component={Statistiques}     />
    </Stack.Navigator>
  );
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
function HomePolice({ level }: { level?: number | null }) {
  return <HomeStack level={level} />;
}

// =====================================================
// STYLES DASHBOARD
// =====================================================
const dStyles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  appHeader:           { backgroundColor: '#1e3a8a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTextContainer: { flex: 1, marginLeft: 10 },
  appName:             { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  appSubtitle:         { fontSize: 11, color: '#bfdbfe' },
  btnRefresh:          { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnRefreshText:      { fontSize: 11, color: '#FFF', fontWeight: '600' },
  scrollContent:       { padding: 16, paddingBottom: 30 },

  welcomeCard:         { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  welcomeTitle:        { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  welcomeSub:          { fontSize: 12, color: '#64748b', marginTop: 2 },

  statsGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:            { backgroundColor: '#FFF', width: (width - 42) / 2, borderRadius: 10, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  statIconBox:         { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statNumber:          { fontSize: 28, fontWeight: 'bold' },
  statLabel:           { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statSub:             { fontSize: 10, marginTop: 2 },

  sectionCard:         { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle:        { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  actionsGrid:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  actionItem:          { width: (width - 80) / 3, alignItems: 'center' },
  actionIconBox:       { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6, position: 'relative' },
  actionBadge:         { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  actionBadgeText:     { fontSize: 9, color: '#FFF', fontWeight: 'bold' },
  actionLabel:         { fontSize: 10, color: '#1e293b', textAlign: 'center', fontWeight: '600' },

  listSection:         { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  listHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listHeaderLeft:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listTitle:           { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  btnVoir:             { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnVoirText:         { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  listItem:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listItemTitle:       { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  listItemSub:         { fontSize: 11, color: '#64748b', marginTop: 2 },
  badge:               { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:           { fontSize: 9, fontWeight: 'bold' },
  dateRow:             { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateText:            { fontSize: 10, color: '#94a3b8' },

  alerteCard:          { backgroundColor: '#fef9c3', borderRadius: 10, padding: 12, width: 220, borderWidth: 1, borderColor: '#fef08a' },
  alerteHeader:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  alerteTitre:         { fontSize: 12, fontWeight: 'bold', color: '#92400e', flex: 1 },
  alerteBadge:         { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  alerteBadgeText:     { fontSize: 8, color: '#FFF', fontWeight: 'bold' },
  alerteMessage:       { fontSize: 11, color: '#713f12', lineHeight: 15, marginBottom: 6 },
});

const pageStyles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
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
  menuIconBox:   { width: 56, height: 56, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#dbeafe' },
  menuLabel:     { fontSize: 11, color: '#1e293b', textAlign: 'center', fontWeight: '600' },
  btnFermer:     { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnFermerText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
});

const tabStyles = StyleSheet.create({
  plusBtn:      { top: -20, justifyContent: 'center', alignItems: 'center', width: 60 },
  plusBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
});

export default HomePolice;