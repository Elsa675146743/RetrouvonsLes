
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/authService';

export default function HomeOperateurSaisie({ level, navigation }: { level: number; navigation: any }) {
  // Diagnostic : afficher le niveau et la présence de navigation
  if (!navigation) {
    return (
      <View style={styles.container}>
        <Text style={{color: 'red', margin: 20}}>Erreur : prop navigation manquante !</Text>
        <Text>Vérifiez que vous passez bien la prop navigation depuis Home.tsx</Text>
      </View>
    );
  }

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
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: '#FF9800' }]}> 
        <Text style={styles.title}>Bureau de Saisie</Text>
        <Text style={{color: '#FFF', marginTop: 10}}>Niveau reçu : {level}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.button}><Text>📝 Enregistrer une nouvelle fiche</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button}><Text>📂 Gérer les dossiers en cours</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  button: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF5252',
    marginTop: 30,
  },
  logoutText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});