import React, { useState } from 'react';
import {
  StyleSheet, View, Text, KeyboardAvoidingView,
  Platform, ScrollView, Alert, TouchableOpacity
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { authService } from '../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SignUp = ({ navigation }: any) => {
  const [email, setEmail]                   = useState('');
  const [nom, setNom]                       = useState('');
  const [prenom, setPrenom]                 = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]               = useState(false);

  const handleSignUp = async () => {
    if (!email || !nom || !prenom || !password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      await authService.register(email.trim(), password, {
        nom: nom.trim(),
        prenom: prenom.trim(),
      });
      navigation.replace('Login');
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Cet e-mail est déjà utilisé.");
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
            <Text style={styles.title}>
              Rejoignez la <Text style={{ color: '#4FCCAE' }}>Solidarité</Text>
            </Text>
            <Text style={styles.subtitle}>
              Créez votre compte citoyen pour aider la communauté.
            </Text>
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
              label="Nom"
              placeholder="Votre nom de famille"
              value={nom}
              onChangeText={setNom}
              autoCapitalize="words"
              leftIconName="account-outline"
            />
            <Input
              label="Prénom"
              placeholder="Votre prénom"
              value={prenom}
              onChangeText={setPrenom}
              autoCapitalize="words"
              leftIconName="account-outline"
            />
            <Input
              label="Mot de passe"
              placeholder="Minimum 6 caractères"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              isPassword
              leftIconName="lock-outline"
            />
            <Input
              label="Confirmer le mot de passe"
              placeholder="Répétez le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              isPassword
              leftIconName="lock-check-outline"
            />

            <Button
              title="CRÉER MON COMPTE"
              onPress={handleSignUp}
              loading={loading}
              style={{ marginTop: 10 }}
              iconName="account-plus"
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

            <Button
              title="Déjà un compte ? Se connecter"
              variant="outline"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: 15, borderWidth: 0 }}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { padding: 25, flexGrow: 1, justifyContent: 'center' },
  contentBox: {
    width: '100%', borderWidth: 1, borderColor: '#FFF',
    borderRadius: 20, padding: 24, backgroundColor: '#FFF',
    shadowOpacity: 0.08, shadowRadius: 2, elevation: 4,
  },
  header: { marginBottom: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 8 },
  form: { width: '100%' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 10, color: '#888' },
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  socialButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 10,
    padding: 12, marginHorizontal: 5,
  },
  socialText: { marginLeft: 10, fontWeight: 'bold', color: '#333' },
});

export default SignUp;