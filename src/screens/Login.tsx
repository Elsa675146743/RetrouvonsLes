

import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserRole } from '../types/auth'; // Import des rôles
import { ACCESS_LEVELS } from '../constants/roles'; // Import des niveaux d'accès
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/authService';

const Login = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez entrer votre email et mot de passe.");
      return;
    }

    setLoading(true);

    try {
      console.log("Tentative de connexion pour :", email);

      // 1. Appel API Login Supabase
      const { user } = await authService.login(email.trim(), password);

      if (!user) {
        throw new Error("Erreur lors de la récupération de l'utilisateur.");
      }

      // 2. Récupération du profil utilisateur (et de son rôle réel)
      const { role, level } = await authService.getUserRole(user.id);
      console.log(`Connecté en tant que: ${role} (Niveau ${level})`);

      // 3. Redirection conditionnelle basée sur le rôle
      // Si c'est un simple citoyen (Niveau 0 ou 1)
      if (level <= 1) {
        // Vers l'accueil Citoyen
          navigation.replace('MainTabs', { role, accessLevel: level });
      } else {
        // Vers l'accueil Pro/Admin
          navigation.replace('MainTabs', { role, accessLevel: level });
        Alert.alert("Espace Pro", `Bienvenue dans l'espace ${role}`);
      }

    } catch (error: any) {
      console.log("Erreur de connexion:", error.message);
      let message = "Une erreur est survenue.";
  if (error.message.includes("Invalid login credentials")) {
    message = "E-mail ou mot de passe incorrect.";
  }
     Alert.alert("Connexion échouée", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.contentBox}>
          <View style={styles.header}>
            <Text style={styles.logoText}>Retrouvons<Text style={{ color: '#4FCCAE' }}>Les</Text></Text>
            <Text style={styles.subtitle}>Connectez-vous pour continuer les recherches et aider la communauté.</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Adresse Email"
              placeholder="exemple@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIconName="email-outline"
            />

            <Input
              label="Mot de passe"
              placeholder="********"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              isPassword
              leftIconName="lock-outline"
            />

            <TouchableOpacity style={styles.forgotPass}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button
              title="SE CONNECTER"
              onPress={handleLogin}
              loading={loading}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>Ou continuer avec</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Icon name="google" size={24} color="#DB4437" />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon name="facebook" size={24} color="#4267B2" />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text>Pas de compte ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signUpText}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContainer: {
    padding: 25,
    justifyContent: 'center',
    flexGrow: 1
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: -15
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10
  },
  form: {
    width: '100%'
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 20
  },
  forgotText: {
    color: '#1E99D5',
    fontWeight: 'bold'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25
  },
  signUpText: {
    color: '#4FCCAE',
    fontWeight: 'bold'
  },
  dividerContainer: {
     flexDirection: 'row', 
     alignItems: 'center',
      marginVertical: 25
     },
  line: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#E0E0E0' 
  },
  dividerText: {
     marginHorizontal: 10, 
     color: '#888' 
    },
  socialContainer: {
     flexDirection: 'row', 
     justifyContent: 'space-between' 
     
     
    },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 5
  },
  socialText: { marginLeft: 10, fontWeight: 'bold', color: '#333' },
  contentBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFF',
    borderRadius: 10,
    padding: 24,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 4,
  }
});

export default Login;
