import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserRole } from '../types/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/authService';

const Login = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // TEST TEMPORAIRE RÉSEAU
    try {
      const response = await fetch('https://yvzxebrudijuwygzpvnf.supabase.co');
      console.log('FETCH OK:', response.status);
    } catch (e: any) {
      console.log('FETCH FAILED:', e.message);
    }

    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez entrer votre email et mot de passe.");
      return;
    }

    setLoading(true);

    try {
      console.log("Tentative de connexion pour :", email);
      const { user } = await authService.login(email.trim(), password);

      if (!user) {
        throw new Error("Erreur lors de la récupération de l'utilisateur.");
      }

      const { role, level } = await authService.getUserRole(user.id);
      console.log(`Rôle détecté: ${role} (Niveau d'accès: ${level})`);

      let targetRoute = '';

      switch (role) {
        case UserRole.SUPER_ADMIN:
        case UserRole.ADMIN:
        case UserRole.ADMIN_ORGANISATION:
          targetRoute = 'homeAdmin';
          break;
        case UserRole.POLICE:
        case UserRole.OFFICIER_POLICE:
        case UserRole.GENDARMERIE:
        case UserRole.AGENT_GENDARMERIE:
          targetRoute = 'homePolice';
          break;
        case UserRole.MODERATEUR:
          targetRoute = 'homeModerateur';
          break;
        case UserRole.OPERATEUR_SAISIE:
          targetRoute = 'homeOperateurSaisie';
          break;
        case UserRole.ONG:
        case UserRole.RESPONSABLE_ONG:
          targetRoute = 'homeResponsableONG';
          break;
        case UserRole.CITOYEN:
        case UserRole.CITOYEN_STANDARD:
        case UserRole.CITOYEN_VERIFIE:
          targetRoute = 'MainTabs';
          break;
        default:
          console.log("Rôle non reconnu, redirection vers interface standard");
          targetRoute = 'MainTabs';
          break;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: targetRoute, params: { role, accessLevel: level } }],
      });

      if (targetRoute !== 'MainTabs') {
        Alert.alert("Accès Professionnel", `Bienvenue dans l'espace ${role.replace('_', ' ')}`);
      }

    } catch (error: any) {
      console.log("Erreur de connexion:", error.message);
      let message = "Une erreur est survenue.";

      if (error.message.includes("Invalid login credentials")) {
        message = "E-mail ou mot de passe incorrect.";
      } else if (error.message.includes("network")) {
        message = "Problème de connexion réseau.";
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
            <Text style={styles.subtitle}>Portail de connexion sécurisé</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Adresse Email"
              placeholder="votre@email.com"
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

            <TouchableOpacity style={styles.forgotPass} onPress={() => navigation.navigate('MotDePasseOublie')}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button
              title="SE CONNECTER"
              onPress={handleLogin}
              loading={loading}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>Ou</Text>
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
              <Text>Nouveau sur la plateforme ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signUpText}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { padding: 25, justifyContent: 'center', flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10, textAlign: 'center' },
  form: { width: '100%' },
  forgotPass: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#1E99D5', fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  signUpText: { color: '#4FCCAE', fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 10, color: '#888' },
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  socialButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 10, padding: 10, marginHorizontal: 5
  },
  socialText: { marginLeft: 10, fontWeight: 'bold', color: '#333' },
  contentBox: {
    width: '100%', borderRadius: 15, padding: 24, backgroundColor: '#FFF',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  }
});

export default Login;