import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Linking, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from 'react-native-vector-icons/Ionicons';

// IMPORTATION DU SERVICE (Vérifie bien que le chemin vers services/authService est correct)
import { authService } from '../services/authService';

const ProfilUtilisateur = () => {
  const navigation = useNavigation<any>();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [langue, setLangue] = React.useState('fr');

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Se déconnecter", 
          style: "destructive",
          onPress: async () => {
            try {
              // On tente la déconnexion via Supabase
              await authService.logout();
            } catch (e) {
              // On log l'erreur mais on ne bloque pas l'utilisateur
              console.log("Erreur lors de la déconnexion:", e);
            } finally {
              // QUOI QU'IL ARRIVE, on renvoie l'utilisateur au départ
              // 'Onboarding' doit correspondre au nom de la page de tes slides dans App.tsx
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }], 
              });
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <Icon name="notifications-none" size={24} color="#333" />
      </View>

      {/* Section Connexion / Mon Compte */}
      <TouchableOpacity style={styles.connexionSection}>
        <View style={styles.connexionIconContainer}>
          <Icon name="person" size={28} color="#006064" />
        </View>
        <Text style={styles.connexionText}>Mon Compte</Text>
        <Icon name="chevron-right" size={24} color="#CCC" />
      </TouchableOpacity>

      {/* Paramètres généraux */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Paramètres généraux</Text>
        
        <View style={styles.menuItem}>
          <View style={[styles.iconBox, { backgroundColor: '#7B61FF' }]}>
            <Ionicons name="notifications" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Obtenir des notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#767577", true: "#4FCCAE" }}
          />
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('mailto:support@votreapp.com')}>
          <View style={[styles.iconBox, { backgroundColor: '#2196F3' }]}>
            <Icon name="email" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Nous contacter</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setLangue(langue === 'fr' ? 'en' : 'fr')}>
          <View style={[styles.iconBox, { backgroundColor: '#FF4081' }]}>
            <Entypo name="language" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Langue ({langue.toUpperCase()})</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://play.google.com')}>
          <View style={[styles.iconBox, { backgroundColor: '#FFB300' }]}>
            <FontAwesome name="star" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Évaluer cette application</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://votreapp.com/politique')}>
          <View style={[styles.iconBox, { backgroundColor: '#FF5252' }]}>
            <Icon name="lock" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Politique de confidentialité</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Réseaux sociaux */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Réseaux sociaux</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://facebook.com')}>
          <View style={[styles.iconBox, { backgroundColor: '#3b5998' }]}>
            <FontAwesome name="facebook" size={18} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Facebook</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://linkedin.com')}>
          <View style={[styles.iconBox, { backgroundColor: '#0077B5' }]}>
            <FontAwesome name="linkedin" size={18} color="#FFF" />
          </View>
          <Text style={styles.menuText}>LinkedIn</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Bouton Déconnexion */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color="#FFF" style={{marginRight: 10}} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  connexionSection: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    marginHorizontal: 20, marginVertical: 10, backgroundColor: '#F9F9F9', borderRadius: 12
  },
  connexionIconContainer: {
    width: 45, height: 45, borderRadius: 10, backgroundColor: '#E0F2F1',
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  connexionText: { flex: 1, fontSize: 18, fontWeight: '500', color: '#333' },
  sectionContainer: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#888', marginBottom: 10, marginTop: 10 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  menuText: { flex: 1, fontSize: 16, color: '#333' },
  logoutContainer: { padding: 30, alignItems: 'center' },
  logoutBtn: {
    flexDirection: 'row', backgroundColor: '#FF5252', paddingVertical: 12,
    paddingHorizontal: 30, borderRadius: 25, alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2
  },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default ProfilUtilisateur;