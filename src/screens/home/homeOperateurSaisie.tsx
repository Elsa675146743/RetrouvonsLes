import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// --- COMPOSANTS ÉCRANS (À REMPLACER PAR TES FICHIERS RÉELS) ---
const Placeholder = ({ name }: { name: string }) => (
  <View style={styles.center}><Text>{name}</Text></View>
);

const Tab = createBottomTabNavigator();

// --- CONTENU DU TABLEAU DE BORD (DASHBOARD) ---
const DashboardContent = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>Tableau de bord opérateur</Text>

        {/* SECTION STATISTIQUES (HAUT) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="document-text" size={20} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Total dossiers</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#fffbe6' }]}>
              <Ionicons name="time" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </View>
          </View>
        </View>

        {/* ACTIONS RAPIDES (Redirection vers le footer) */}
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.grid}>
          
          {/* Carte bleue : Créer un dossier */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#2563eb' }]}
            onPress={() => navigation.navigate('Dossiers')}
          >
            <MaterialCommunityIcons name="folder-plus" size={32} color="white" />
            <Text style={styles.actionTitleWhite}>Créer un dossier</Text>
            <Text style={styles.actionSubWhite}>Nouveau dossier de disparition</Text>
          </TouchableOpacity>

          {/* Carte Personne */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Personnes')}
          >
            <MaterialCommunityIcons name="account-plus-outline" size={32} color="#8b5cf6" />
            <Text style={styles.actionTitle}>Créer une personne</Text>
            <Text style={styles.actionSub}>Ajouter un nouveau profil</Text>
          </TouchableOpacity>

          {/* Carte Signalements */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Signalements')}
          >
            <Ionicons name="alert-circle-outline" size={32} color="#f59e0b" />
            <Text style={styles.actionTitle}>Signalements</Text>
            <Text style={styles.actionSub}>Attente de validation</Text>
          </TouchableOpacity>

          {/* Carte Photos */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Signalements')} // Redirige vers le même onglet de suivi
          >
            <Ionicons name="image-outline" size={32} color="#ec4899" />
            <Text style={styles.actionTitle}>Photos</Text>
            <Text style={styles.actionSub}>Valider les images</Text>
          </TouchableOpacity>
        </View>

        {/* DOSSIERS RÉCENTS */}
        <Text style={styles.sectionTitle}>Dossiers récents</Text>
        <View style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentID}>DOS-20260202-7759</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>en_cours</Text></View>
          </View>
          <Text style={styles.recentDate}>📅 Créé: 02/02/2026</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// --- NAVIGATION PRINCIPALE AVEC FOOTER (ONGLETS) ---
const HomeOperateurSaisie = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Tableau de bord') iconName = 'grid-outline';
          else if (route.name === 'Dossiers') iconName = 'folder-outline';
          else if (route.name === 'Personnes') iconName = 'people-outline';
          else if (route.name === 'Signalements') iconName = 'notifications-outline';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 5 }
      })}
    >
      <Tab.Screen name="Tableau de bord" component={DashboardContent} />
      <Tab.Screen name="Dossiers">{(p) => <Placeholder name="Gestion des Dossiers" />}</Tab.Screen>
      <Tab.Screen name="Personnes">{(p) => <Placeholder name="Gestion des Personnes" />}</Tab.Screen>
      <Tab.Screen name="Signalements">{(p) => <Placeholder name="Suivi des Signalements" />}</Tab.Screen>
    </Tab.Navigator>
  );
};



// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 25, marginBottom: 15 },
  
  // Statistiques du haut
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { 
    backgroundColor: '#fff', width: '48%', padding: 15, borderRadius: 12, 
    flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1 
  },
  iconCircle: { padding: 8, borderRadius: 10, marginRight: 12 },
  statNumber: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#64748b' },

  // Grille d'actions rapides
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { 
    backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 16, 
    marginBottom: 15, alignItems: 'center', elevation: 3, shadowOpacity: 0.1 
  },
  actionTitle: { fontSize: 13, fontWeight: 'bold', marginTop: 10, color: '#1e293b', textAlign: 'center' },
  actionTitleWhite: { fontSize: 13, fontWeight: 'bold', marginTop: 10, color: '#fff', textAlign: 'center' },
  actionSub: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
  actionSubWhite: { fontSize: 10, color: '#dbeafe', marginTop: 4, textAlign: 'center' },

  // Dossiers récents
  recentCard: { 
    backgroundColor: '#fff', padding: 16, borderRadius: 12, 
    borderLeftWidth: 5, borderLeftColor: '#f59e0b', elevation: 1 
  },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentID: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  badge: { backgroundColor: '#fffbe6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#d97706', fontSize: 11, fontWeight: 'bold' },
  recentDate: { fontSize: 12, color: '#94a3b8', marginTop: 10 }
});
export default HomeOperateurSaisie;