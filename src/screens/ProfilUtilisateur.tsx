import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Linking,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

// ─── LISTE DES LANGUES ───────────────────────────────────────
const LANGUES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  { code: 'es', label: 'Espagnol' },
  { code: 'pt', label: 'Portugais' },
  { code: 'ar', label: 'Arabe' },
  { code: 'zh', label: 'Chinois' },
  { code: 'ru', label: 'Russe' },
  { code: 'de', label: 'Allemand' },
  { code: 'it', label: 'Italien' },
  { code: 'ja', label: 'Japonais' },
  { code: 'ko', label: 'Coréen' },
  { code: 'hi', label: 'Hindi' },
  { code: 'sw', label: 'Swahili' },
  { code: 'ha', label: 'Haoussa' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'am', label: 'Amharique' },
  { code: 'wo', label: 'Wolof' },
  { code: 'bm', label: 'Bambara' },
  { code: 'ln', label: 'Lingala' },
];

// ─── COMPOSANT ÉTOILE ────────────────────────────────────────
function StarRating({ rating, onRate }: { rating: number; onRate: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRate(star)}>
          <FontAwesome
            name={star <= rating ? 'star' : 'star-o'}
            size={36}
            color={star <= rating ? '#FFB300' : '#CCC'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
const ProfilUtilisateur = () => {
  const navigation = useNavigation<any>();

  // ── État utilisateur ──
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ── Notifications ──
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // ── Langue ──
  const [langue, setLangue] = useState('fr');
  const [langueLabel, setLangueLabel] = useState('Français');
  const [modalLangueVisible, setModalLangueVisible] = useState(false);

  // ── Évaluation ──
  const [modalEvalVisible, setModalEvalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // ── Upload avatar ──
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ─── Chargement du profil ────────────────────────────────
  const loadProfil = useCallback(async () => {
    try {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('utilisateur')
        .select('nom, prenom, email, photo_profil, notifications_actives, langue_preferee')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('Erreur chargement profil:', error);
        return;
      }

      if (data) {
        const fullName = `${data.prenom ?? ''} ${data.nom ?? ''}`.trim();
        setUserName(fullName || user.email || '');
        setUserEmail(data.email || user.email || '');
        setPhotoUrl(data.photo_profil || null);
        setNotificationsEnabled(data.notifications_actives ?? false);
        if (data.langue_preferee) {
          setLangue(data.langue_preferee);
          const found = LANGUES.find((l) => l.code === data.langue_preferee);
          setLangueLabel(found ? found.label : data.langue_preferee);
        }
      }
    } catch (e) {
      console.log('Erreur loadProfil:', e);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfil();
    }, [loadProfil])
  );

  // ─── Initiale de l'avatar ────────────────────────────────
  const getInitiale = () => {
    if (userName && userName.length > 0) return userName[0].toUpperCase();
    if (userEmail && userEmail.length > 0) return userEmail[0].toUpperCase();
    return '?';
  };

  // ─── Toggle notifications ────────────────────────────────
  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!userId) return;
    try {
      await supabase
        .from('utilisateur')
        .update({ notifications_actives: value })
        .eq('id', userId);
    } catch (e) {
      console.log('Erreur sauvegarde notifications:', e);
    }
  };

  // ─── Choix de langue ─────────────────────────────────────
  const handleChoixLangue = async (code: string, label: string) => {
    setLangue(code);
    setLangueLabel(label);
    setModalLangueVisible(false);
    if (!userId) return;
    try {
      await supabase
        .from('utilisateur')
        .update({ langue_preferee: code })
        .eq('id', userId);
    } catch (e) {
      console.log('Erreur sauvegarde langue:', e);
    }
  };

  // ─── Upload photo de profil ──────────────────────────────
  const uploadAvatar = async (uri: string) => {
    if (!userId) return;
    try {
      setUploadingAvatar(true);
      const base64 = await RNFS.readFile(uri, 'base64');
      const buffer = Buffer.from(base64, 'base64');
      const filePath = `avatars/${userId}/profil.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.log('Erreur upload avatar:', uploadError);
        Alert.alert('Erreur', "Impossible d'uploader la photo.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      if (publicUrl) {
        await supabase
          .from('utilisateur')
          .update({ photo_profil: publicUrl })
          .eq('id', userId);
        setPhotoUrl(publicUrl + '?t=' + Date.now());
      }
    } catch (e) {
      console.log('Erreur uploadAvatar:', e);
      Alert.alert('Erreur', "Une erreur est survenue lors de l'upload.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une source',
      [
        {
          text: 'Appareil photo',
          onPress: () => {
            launchCamera(
              { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
              (response) => {
                if (response.didCancel || response.errorCode) return;
                const asset = response.assets?.[0];
                if (asset?.uri) uploadAvatar(asset.uri);
              }
            );
          },
        },
        {
          text: 'Galerie',
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', quality: 0.8 },
              (response) => {
                if (response.didCancel || response.errorCode) return;
                const asset = response.assets?.[0];
                if (asset?.uri) uploadAvatar(asset.uri);
              }
            );
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  // ─── Évaluation ──────────────────────────────────────────
  const handleSubmitEval = async () => {
    if (rating === 0) {
      Alert.alert('Note requise', 'Veuillez sélectionner une note avant de confirmer.');
      return;
    }
    setSubmittingEval(true);
    try {
      if (rating >= 4) {
        setModalEvalVisible(false);
        setRating(0);
        setFeedback('');
        await Linking.openURL(
          'https://play.google.com/store/apps/details?id=com.retrouvonsles'
        );
      } else {
        // Sauvegarder le feedback (try/catch silencieux si table absente)
        try {
          await supabase.from('feedback_app').insert([
            {
              id_utilisateur: userId,
              note: rating,
              commentaire: feedback.trim() || null,
            },
          ]);
        } catch (_) {
          // Table absente ou autre erreur — on ignore silencieusement
        }
        Alert.alert(
          'Merci pour votre retour',
          'Votre avis nous aide à améliorer l\'application.',
          [{ text: 'OK' }]
        );
        setModalEvalVisible(false);
        setRating(0);
        setFeedback('');
      }
    } catch (e) {
      console.log('Erreur évaluation:', e);
    } finally {
      setSubmittingEval(false);
    }
  };

  // ─── Déconnexion ─────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
            } catch (e) {
              console.log('Erreur lors de la déconnexion:', e);
            } finally {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            }
          },
        },
      ]
    );
  };

  // ─── RENDU ───────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Header avec avatar ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarWrapper} activeOpacity={0.8}>
          {uploadingAvatar ? (
            <View style={styles.avatarCircle}>
              <ActivityIndicator color="#FFF" size="small" />
            </View>
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{getInitiale()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Icon name="camera-alt" size={12} color="#FFF" />
          </View>
        </TouchableOpacity>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Nom et email ── */}
      <View style={styles.userInfoContainer}>
        {loadingUser ? (
          <ActivityIndicator color="#0b1c30" size="small" />
        ) : (
          <>
            <Text style={styles.userName}>{userName || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </>
        )}
      </View>

      {/* ── Paramètres généraux ── */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Paramètres généraux</Text>

        {/* Notifications */}
        <View style={styles.menuItem}>
          <View style={[styles.iconBox, { backgroundColor: '#7B61FF' }]}>
            <Ionicons name="notifications" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Obtenir des notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#767577', true: '#4FCCAE' }}
            thumbColor={notificationsEnabled ? '#FFF' : '#f4f3f4'}
          />
        </View>

        {/* Nous contacter */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL('mailto:support@retrouvonsles.com')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#2196F3' }]}>
            <Icon name="email" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Nous contacter</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        {/* Langue */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setModalLangueVisible(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FF4081' }]}>
            <Entypo name="language" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Langue</Text>
          <Text style={styles.menuValueText}>{langueLabel}</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        {/* Évaluer */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setRating(0);
            setFeedback('');
            setModalEvalVisible(true);
          }}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FFB300' }]}>
            <FontAwesome name="star" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Évaluer cette application</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        {/* Politique de confidentialité */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PolitiqueConfidentialite')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FF5252' }]}>
            <Icon name="lock" size={20} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Politique de confidentialité</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* ── Réseaux sociaux ── */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Réseaux sociaux</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL('https://facebook.com')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#3b5998' }]}>
            <FontAwesome name="facebook" size={18} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Facebook</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL('https://linkedin.com')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#0077B5' }]}>
            <FontAwesome name="linkedin" size={18} color="#FFF" />
          </View>
          <Text style={styles.menuText}>LinkedIn</Text>
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* ── Déconnexion ── */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════════
          MODAL — CHOIX DE LANGUE
      ════════════════════════════════════════════════════ */}
      <Modal
        visible={modalLangueVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalLangueVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalLangueVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choisir une langue</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {LANGUES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.langueItem,
                    langue === item.code && styles.langueItemSelected,
                  ]}
                  onPress={() => handleChoixLangue(item.code, item.label)}
                >
                  <Text
                    style={[
                      styles.langueItemText,
                      langue === item.code && styles.langueItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {langue === item.code && (
                    <Icon name="check" size={20} color="#b45f06" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalBtnFermer}
              onPress={() => setModalLangueVisible(false)}
            >
              <Text style={styles.modalBtnFermerText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ════════════════════════════════════════════════════
          MODAL — ÉVALUATION
      ════════════════════════════════════════════════════ */}
      <Modal
        visible={modalEvalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEvalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalEvalVisible(false)}
        >
          <View style={[styles.modalSheet, { paddingBottom: 30 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Évaluer l'application</Text>
            <Text style={styles.modalSubtitle}>
              Votre avis nous aide à améliorer RetrouvonsLes
            </Text>

            <StarRating rating={rating} onRate={setRating} />

            {/* Formulaire feedback si note < 4 et note > 0 */}
            {rating > 0 && rating < 4 && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackLabel}>
                  Dites-nous comment nous améliorer :
                </Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Votre commentaire..."
                  placeholderTextColor="#AAA"
                  multiline
                  numberOfLines={4}
                  value={feedback}
                  onChangeText={setFeedback}
                  textAlignVertical="top"
                />
              </View>
            )}

            {rating >= 4 && (
              <Text style={styles.evalPositifText}>
                Merci ! Vous allez être redirigé vers le Play Store 🎉
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.evalConfirmBtn,
                rating === 0 && { opacity: 0.5 },
              ]}
              onPress={handleSubmitEval}
              disabled={rating === 0 || submittingEval}
            >
              {submittingEval ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.evalConfirmBtnText}>Confirmer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtnFermer}
              onPress={() => setModalEvalVisible(false)}
            >
              <Text style={styles.modalBtnFermerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
};

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0b1c30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#b45f06',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#b45f06',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#b45f06',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  // Infos utilisateur
  userInfoContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b1c30',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#76777d',
  },

  // Sections
  sectionContainer: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Items de menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: { flex: 1, fontSize: 15, color: '#333' },
  menuValueText: {
    fontSize: 14,
    color: '#b45f06',
    fontWeight: '600',
    marginRight: 4,
  },

  // Déconnexion
  logoutContainer: { padding: 30, alignItems: 'center' },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF5252',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Modals communs
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#C6C6CD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b1c30',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#76777d',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalBtnFermer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  modalBtnFermerText: {
    color: '#0b1c30',
    fontWeight: '600',
    fontSize: 14,
  },

  // Modal langue
  langueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  langueItemSelected: {
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
  },
  langueItemText: {
    fontSize: 16,
    color: '#333',
  },
  langueItemTextSelected: {
    color: '#b45f06',
    fontWeight: '700',
  },

  // Modal évaluation
  evalPositifText: {
    textAlign: 'center',
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  evalConfirmBtn: {
    backgroundColor: '#0b1c30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  evalConfirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  feedbackContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  feedbackLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    backgroundColor: '#FAFAFA',
  },
});

export default ProfilUtilisateur;
