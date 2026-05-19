import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { Input } from '../components/Input';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../services/supabase';

const MotDePasseOublie = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const handleEnvoyer = async () => {
    if (!email.trim()) {
      Alert.alert('Champ requis', 'Veuillez entrer votre adresse email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          // L'URL de redirection après reset (deep link ou web)
          redirectTo: 'https://retrouvonsles.vercel.app/reset-password',
        }
      );

      if (error) {
        // Supabase renvoie une erreur générique pour ne pas révéler
        // si l'email existe ou non (sécurité)
        console.warn('Reset password error:', error.message);
      }

      // On affiche toujours le succès pour ne pas révéler
      // si l'email est enregistré (bonne pratique sécurité)
      setEnvoye(true);
    } catch (err: any) {
      Alert.alert('Erreur', 'Une erreur est survenue. Réessayez.');
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

        {/* Bouton retour */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0b1c30" />
        </TouchableOpacity>

        <View style={styles.contentBox}>

          {/* Icône */}
          <View style={styles.iconBox}>
            <Ionicons name="lock-open-outline" size={40} color="#b45f06" />
          </View>

          {!envoye ? (
            <>
              <Text style={styles.titre}>Mot de passe oublié ?</Text>
              <Text style={styles.sousTitre}>
                Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </Text>

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

                <TouchableOpacity
                  style={[styles.btnEnvoyer, loading && styles.btnDisabled]}
                  onPress={handleEnvoyer}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnEnvoyerText}>Envoyer le lien</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnRetour}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.btnRetourText}>Retour à la connexion</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* ── État succès ── */
            <>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={56} color="#16a34a" />
              </View>
              <Text style={styles.titre}>Email envoyé !</Text>
              <Text style={styles.sousTitre}>
                Si un compte existe avec l'adresse{' '}
                <Text style={styles.emailHighlight}>{email}</Text>, vous recevrez
                un lien de réinitialisation dans quelques minutes.
              </Text>
              <Text style={styles.conseil}>
                Vérifiez aussi votre dossier spam si vous ne voyez pas l'email.
              </Text>

              <TouchableOpacity
                style={styles.btnEnvoyer}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.btnEnvoyerText}>Retour à la connexion</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnRetour}
                onPress={() => { setEnvoye(false); setEmail(''); }}
              >
                <Text style={styles.btnRetourText}>Renvoyer l'email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },

  contentBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff7ed',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1, borderColor: '#fed7aa',
  },

  successBox: { marginBottom: 16 },

  titre: {
    fontSize: 22, fontWeight: '800', color: '#0b1c30',
    textAlign: 'center', marginBottom: 10,
  },
  sousTitre: {
    fontSize: 14, color: '#64748b', textAlign: 'center',
    lineHeight: 20, marginBottom: 8,
  },
  emailHighlight: { fontWeight: '700', color: '#0b1c30' },
  conseil: {
    fontSize: 12, color: '#94a3b8', textAlign: 'center',
    marginBottom: 24, fontStyle: 'italic',
  },

  form: { width: '100%', marginTop: 16 },

  btnEnvoyer: {
    backgroundColor: '#0b1c30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  btnDisabled: { opacity: 0.6 },
  btnEnvoyerText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  btnRetour: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnRetourText: { color: '#b45f06', fontWeight: '600', fontSize: 14 },
});

export default MotDePasseOublie;
