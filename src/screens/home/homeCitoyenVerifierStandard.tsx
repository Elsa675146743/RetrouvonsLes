import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  ScrollView, 
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Onboarding: undefined;
  Alertes: undefined;
  DossiersEnCours: undefined;
  SOS: undefined;
  HistoriqueAlertes: undefined;
  ProfilUtilisateur: undefined;
};

const HomeCitoyenVerifierStandard = ({ level }: { level: number }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleLogout = async () => {
    try {
      await authService.logout();
      await AsyncStorage.removeItem('hasSeenOnboarding');
      navigation.navigate('Onboarding');
    } catch (error) {
      Alert.alert('Erreur', "Déconnexion impossible");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          {/* Icône de profil à gauche */}
          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={() => navigation.navigate('ProfilUtilisateur')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>

          {/* Nom de l'application */}
          <Text style={styles.appName}>RetrouvonsLes</Text>

          {/* Icône de notification à droite */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Alert.alert('Notifications', 'Pas encore implémenté')}
          >
            <Icon name="bell-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

      

        <View style={styles.content}>
          {/* ===== WELCOME ===== */}
          <Text style={styles.title}>Bienvenue, citoyen</Text>
          <Text style={styles.subtitle}>
            Vérifiez votre compte pour bénéficier de signalements illimités et d'une validation instantanée
          </Text>

          {/* ===== MISSION ===== */}
          <View style={styles.missionBox}>
            <Text style={styles.missionTitle}>Notre mission</Text>
            <Text style={styles.missionText}>
              RetrouvonsLes est une application dédiée à la recherche de personnes disparues au Cameroun et en Afrique. Elle centralise les signalements, mobilise la communauté et utilise l'intelligence artificielle pour maximiser les chances de retrouver les proches.
            </Text>
          </View>

          {/* ===== STATS CARDS ===== */}
          <View style={styles.statsContainer}>
            <StatCard icon="file-chart" value="0" label="Rapports totaux" />
            <StatCard icon="check-circle-outline" value="0" label="Approuvé" />
            <StatCard icon="clock-outline" value="0" label="En révision" />
            <StatCard icon="alert-outline" value="0" label="Alertes" />
          </View>

          {/* ===== ACTION CARDS ===== */}
          <View style={styles.actionsContainer}>
            <ActionCard
              icon="plus"
              title="Nouveau signalement"
              description="Vos signalements seront examinés avant publication"
              primary
            />
            <ActionCard
              icon="eye-outline"
              title="Signalements"
              description="Vos signalements seront examinés avant publication"
            />
            <ActionCard
              icon="bell-outline"
              title="Notifications"
              description="0 Non lues"
            />
            <ActionCard
              icon="map-marker-outline"
              title="Carte des alertes"
              description="Alertes à proximité"
            />
          </View>

          {/* ===== ACTIVITE RECENTE ===== */}
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            <View style={styles.emptyActivity}>
              <Icon name="bell-outline" size={50} color="#C4C4C4" />
              <Text style={styles.emptyText}>Aucune activité récente</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ==============================
// ===== STATS CARD COMPONENT =====
// ==============================
interface StatCardProps {
  icon: string;
  value: string;
  label: string;
}
const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={28} color="#4F6BED" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ==============================
// ===== ACTION CARD COMPONENT =====
// ==============================
interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}
const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, primary = false }) => (
  <TouchableOpacity
    style={[styles.actionCard, primary && styles.primaryCard]}
    activeOpacity={0.8}
  >
    <Icon name={icon} size={32} color={primary ? '#FFF' : '#4F6BED'} style={{ marginBottom: 10 }} />
    <Text style={[styles.actionTitle, primary && { color: '#FFF' }]}>{title}</Text>
    <Text style={[styles.actionDescription, primary && { color: '#E3E8FF' }]}>{description}</Text>
  </TouchableOpacity>
);

// ==============================
// ===== STYLES ==================
// ==============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },

  header: {
    backgroundColor: '#4FCCAE',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  profileIcon: { fontSize: 22, color: '#4FCCAE', fontWeight: 'bold' },
  appName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#4FCCAE',
    justifyContent: 'center',
    alignItems: 'center',
  },
 

  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginTop: 10 },
  subtitle: { marginTop: 5, color: '#6B7280', fontSize: 14 },

  missionBox: {
    backgroundColor: '#FFFDE7',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
  },
  missionTitle: { fontWeight: 'bold', color: '#FFD600', marginBottom: 5, fontSize: 16 },
  missionText: { fontSize: 14, color: '#555', lineHeight: 18 },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  statCard: { width: width * 0.44, backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#6B7280', marginTop: 4 },

  actionsContainer: { marginTop: 10 },
  actionCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2 },
  primaryCard: { backgroundColor: '#2F5BEA' },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  actionDescription: { marginTop: 5, color: '#6B7280', fontSize: 13 },

  activitySection: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  emptyActivity: { alignItems: 'center', marginTop: 20 },
  emptyText: { marginTop: 10, color: '#9CA3AF' },
});

export default HomeCitoyenVerifierStandard;
