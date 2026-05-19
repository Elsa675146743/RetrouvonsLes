import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Image, Alert as RNAlert, Platform,
  Modal, Share, Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import { supabase } from '../../../services/supabase';

const SITE_WEB = 'https://retrouvonsles.vercel.app';

// ─── TYPES ───
type AlerteItem = {
  id: string;
  id_dossier: string;
  titre: string;
  message_court: string;
  date_diffusion: string;
  personne_nom: string;
  personne_prenom: string;
  personne_age_estime_min: number;
  personne_age_estime_max: number;
  personne_photo_principale: string | null;
  lieu_disparition: string;
  niveau_urgence: string | null;
};

// ─── HELPERS ───
function getDureeTexte(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHeures = Math.floor(diffMs / (1000 * 3600));
  if (diffHeures < 1) return "Il y a moins d'une heure";
  if (diffHeures < 24) return `Disparu depuis ${diffHeures} heure${diffHeures > 1 ? 's' : ''}`;
  const diffJours = Math.floor(diffHeures / 24);
  return `Disparu depuis ${diffJours} jour${diffJours > 1 ? 's' : ''}`;
}

function getAgeTexte(min: number, max: number): string {
  if (min && max) return `${Math.floor((min + max) / 2)} ans`;
  if (min) return `${min} ans`;
  if (max) return `${max} ans`;
  return 'Âge inconnu';
}

// ─── BADGE URGENCE ───
function BadgeUrgence({ niveau }: { niveau: string | null }) {
  if (!niveau) return null;
  const map: Record<string, { label: string; bg: string; color: string }> = {
    critique: { label: '🔴 CRITIQUE', bg: '#fee2e2', color: '#dc2626' },
    urgent:   { label: '🟠 URGENT',   bg: '#ffedd5', color: '#ea580c' },
    normal:   { label: 'NORMAL',      bg: '#fef3c7', color: '#d97706' },
  };
  const u = map[niveau] ?? { label: niveau.toUpperCase(), bg: '#f1f5f9', color: '#64748b' };
  return (
    <View style={[badgeS.badge, { backgroundColor: u.bg }]}>
      <Text style={[badgeS.text, { color: u.color }]}>{u.label}</Text>
    </View>
  );
}
const badgeS = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 6 },
  text:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});

// ─── MODAL PARTAGE ───
function ModalPartage({ visible, onClose, onWhatsApp, onFacebook, onAutre }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={mS.overlay} activeOpacity={1} onPress={onClose}>
        <View style={mS.container}>
          <View style={mS.handle} />
          <Text style={mS.title}>Partager l'alerte</Text>
          <Text style={mS.subtitle}>Choisissez comment partager cette alerte de disparition</Text>

          <TouchableOpacity style={mS.option} onPress={onWhatsApp} activeOpacity={0.8}>
            <View style={[mS.iconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={26} color="#16a34a" />
            </View>
            <View style={mS.optionTexts}>
              <Text style={mS.optionLabel}>WhatsApp</Text>
              <Text style={mS.optionDesc}>Partager le message + lien vers le dossier</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={mS.option} onPress={onFacebook} activeOpacity={0.8}>
            <View style={[mS.iconBox, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="logo-facebook" size={26} color="#1d4ed8" />
            </View>
            <View style={mS.optionTexts}>
              <Text style={mS.optionLabel}>Facebook</Text>
              <Text style={mS.optionDesc}>Partager le lien du dossier sur Facebook</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={mS.option} onPress={onAutre} activeOpacity={0.8}>
            <View style={[mS.iconBox, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="share-social-outline" size={26} color="#475569" />
            </View>
            <View style={mS.optionTexts}>
              <Text style={mS.optionLabel}>Autre application</Text>
              <Text style={mS.optionDesc}>SMS, email, Telegram...</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={mS.btnFermer} onPress={onClose}>
            <Text style={mS.btnFermerText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const mS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  handle: { width: 40, height: 4, backgroundColor: '#c6c6cd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#0b1c30', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#76777d', marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionTexts: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: '#0b1c30' },
  optionDesc: { fontSize: 12, color: '#76777d', marginTop: 2 },
  btnFermer: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnFermerText: { color: '#0b1c30', fontWeight: '600', fontSize: 14 },
});

// ─── CARTE ALERTE ───
function AlerteCard({ alerte, navigation }: { alerte: AlerteItem; navigation: any }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const dureeText = getDureeTexte(alerte.date_diffusion);
  const ageText = getAgeTexte(alerte.personne_age_estime_min, alerte.personne_age_estime_max);
  const lienDossier = `${SITE_WEB}/dossier/${alerte.id_dossier}`;

  const messageTexte =
    `🔴 *ALERTE DISPARITION* 🔴\n\n` +
    `👤 *${alerte.personne_prenom} ${alerte.personne_nom}*\n` +
    `🎂 *Âge :* ${ageText}\n` +
    `📍 *Dernier lieu vu :* ${alerte.lieu_disparition || 'Inconnu'}\n` +
    `📅 *Disparu(e) le :* ${new Date(alerte.date_diffusion).toLocaleDateString('fr-FR')}\n\n` +
    `🔗 *Voir le dossier complet et signaler une information :*\n${lienDossier}\n\n` +
    `🤝 _RetrouvonsLes — Ensemble, retrouvons-les_`;

  const downloadPhoto = async (url: string): Promise<string | null> => {
    try {
      setDownloading(true);
      const ext = url.split('?')[0].split('.').pop() ?? 'jpg';
      const localPath = `${RNFS.CachesDirectoryPath}/alerte_${alerte.id_dossier}.${ext}`;
      const exists = await RNFS.exists(localPath);
      if (!exists) {
        await RNFS.downloadFile({ fromUrl: url, toFile: localPath }).promise;
      }
      return localPath;
    } catch (err) {
      console.warn('Erreur téléchargement photo:', err);
      return null;
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsApp = async () => {
    setModalVisible(false);
    try {
      if (alerte.personne_photo_principale) {
        const localPath = await downloadPhoto(alerte.personne_photo_principale);
        if (localPath) {
          const fileUri = Platform.OS === 'android' ? `file://${localPath}` : localPath;
          await Share.share({ title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte, url: fileUri });
          return;
        }
      }
      const url = `whatsapp://send?text=${encodeURIComponent(messageTexte)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(messageTexte)}`);
      }
    } catch {
      RNAlert.alert('Erreur', "Impossible d'ouvrir WhatsApp.");
    }
  };

  const handleFacebook = async () => {
    setModalVisible(false);
    try {
      const urlNative = `fb://share?link=${encodeURIComponent(lienDossier)}`;
      const supported = await Linking.canOpenURL(urlNative);
      if (supported) {
        await Linking.openURL(urlNative);
      } else {
        await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lienDossier)}&quote=${encodeURIComponent(`🔴 ALERTE DISPARITION — ${alerte.personne_prenom} ${alerte.personne_nom}`)}`);
      }
    } catch {
      RNAlert.alert('Erreur', "Impossible d'ouvrir Facebook.");
    }
  };

  const handleAutre = async () => {
    setModalVisible(false);
    try {
      if (alerte.personne_photo_principale) {
        const localPath = await downloadPhoto(alerte.personne_photo_principale);
        if (localPath) {
          const fileUri = Platform.OS === 'android' ? `file://${localPath}` : localPath;
          await Share.share({ title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte, url: fileUri });
          return;
        }
      }
      await Share.share({ title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte, url: lienDossier });
    } catch (err) {
      console.error('Erreur partage:', err);
    }
  };

  // ── Signaler vu : redirige vers NouveauSignalement avec protection identité ──
  const handleSignalerVu = () => {
    navigation.navigate('NouveauSignalement', {
      dossierId: alerte.id_dossier,
      nomPersonne: alerte.personne_nom,
      prenomPersonne: alerte.personne_prenom,
      modeSignalerVu: true,
      // identiteProtegee: true → visible_public=false, seules les autorités voient le signaleur
    });
  };

  return (
    <View style={cardS.card}>
      {/* Badge urgence */}
      {alerte.niveau_urgence && alerte.niveau_urgence !== 'normal' && (
        <View style={cardS.urgenceBanner}>
          <BadgeUrgence niveau={alerte.niveau_urgence} />
        </View>
      )}

      {/* Photo */}
      <TouchableOpacity onPress={() => navigation.navigate('VoirDossier', { id: alerte.id_dossier })} activeOpacity={0.9}>
        <View style={cardS.photoContainer}>
          {alerte.personne_photo_principale ? (
            <Image source={{ uri: alerte.personne_photo_principale }} style={cardS.photo} resizeMode="cover" />
          ) : (
            <View style={cardS.photoPlaceholder}>
              <Ionicons name="person-outline" size={50} color="#76777d" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Infos */}
      <TouchableOpacity onPress={() => navigation.navigate('VoirDossier', { id: alerte.id_dossier })} activeOpacity={0.7}>
        <View style={cardS.infoContainer}>
          <Text style={cardS.name}>{alerte.personne_prenom} {alerte.personne_nom}</Text>
          <Text style={cardS.details}>{ageText}</Text>
          <View style={cardS.locationRow}>
            <Ionicons name="location-outline" size={14} color="#76777d" />
            <Text style={cardS.location}>{alerte.lieu_disparition || 'Lieu inconnu'}</Text>
          </View>
          <Text style={cardS.duration}>{dureeText}</Text>
        </View>
      </TouchableOpacity>

      {/* Boutons */}
      <View style={cardS.buttonRow}>
        <TouchableOpacity style={cardS.reportBtn} onPress={handleSignalerVu} activeOpacity={0.85}>
          <Ionicons name="eye-outline" size={14} color="#fff" />
          <Text style={cardS.reportBtnText}>SIGNALER VU</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardS.shareBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          {downloading
            ? <ActivityIndicator size="small" color="#b45f06" />
            : <Ionicons name="share-social-outline" size={16} color="#b45f06" />
          }
          <Text style={cardS.shareBtnText}>{downloading ? 'CHARGEMENT...' : 'PARTAGER'}</Text>
        </TouchableOpacity>
      </View>

      <ModalPartage
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onWhatsApp={handleWhatsApp}
        onFacebook={handleFacebook}
        onAutre={handleAutre}
      />
    </View>
  );
}

const cardS = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  urgenceBanner: { paddingHorizontal: 16, paddingTop: 10 },
  photoContainer: { height: 200, backgroundColor: '#e5eeff' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5eeff' },
  infoContainer: { padding: 16 },
  name: { fontSize: 20, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  details: { fontSize: 14, color: '#45464d', marginBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  location: { fontSize: 13, color: '#45464d', flex: 1 },
  duration: { fontSize: 12, color: '#76777d', marginBottom: 4 },
  buttonRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  reportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1e3a5f', paddingVertical: 10, borderRadius: 6 },
  reportBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#b45f06', backgroundColor: '#fff' },
  shareBtnText: { color: '#b45f06', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});

// ─── ÉCRAN PRINCIPAL — TOUTES LES ALERTES EN COURS ───
export default function AlertesPage({ navigation }: any) {
  const [alertes, setAlertes] = useState<AlerteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── FETCH : toutes les alertes en cours, sans limite de date ───
  const fetchAlertes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('alerte')
        .select(`
          id, titre, message_court, statut_alerte, date_diffusion, rayon_km, id_dossier,
          dossier_disparition (
            id, lieu_disparition, statut_dossier, niveau_urgence,
            personne ( nom, prenom, age_estime_min, age_estime_max, photo_principale )
          )
        `)
        .eq('statut_alerte', 'en_cours')
        .eq('validee', true)
        .order('date_diffusion', { ascending: false });

      if (error) throw error;

      const formatted: AlerteItem[] = (data || [])
        // Masquer les personnes déjà retrouvées
        .filter((item: any) => {
          const statut = item.dossier_disparition?.statut_dossier;
          return statut !== 'retrouve_vivant' && statut !== 'retrouve_decede';
        })
        .map((item: any) => {
          const dossier = item.dossier_disparition;
          const personne = dossier?.personne || {};
          return {
            id: item.id,
            id_dossier: dossier?.id || item.id_dossier,
            titre: item.titre || '',
            message_court: item.message_court || '',
            date_diffusion: item.date_diffusion,
            personne_nom: personne.nom || 'Inconnu',
            personne_prenom: personne.prenom || 'Inconnu',
            personne_age_estime_min: personne.age_estime_min || 0,
            personne_age_estime_max: personne.age_estime_max || 0,
            personne_photo_principale: personne.photo_principale || null,
            lieu_disparition: dossier?.lieu_disparition || 'Lieu inconnu',
            niveau_urgence: dossier?.niveau_urgence || null,
          };
        });

      setAlertes(formatted);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ─── Marquer toutes les notifications comme lues à l'ouverture ───
  const marquerNotificationsLues = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('notification')
        .update({ lue: true })
        .eq('id_utilisateur', user.id)
        .eq('lue', false);
    } catch (e) {
      console.warn('Erreur marquage notifications:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAlertes();
      marquerNotificationsLues();
    }, [fetchAlertes, marquerNotificationsLues])
  );

  // Compteurs
  const alertesCritiques = alertes.filter(a => a.niveau_urgence === 'critique').length;
  const alertesUrgentes  = alertes.filter(a => a.niveau_urgence === 'urgent').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Alertes en cours</Text>
          <Text style={styles.headerDate}>Toutes les disparitions actives</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* BANDEAU COMPTEUR */}
      <View style={styles.counterBanner}>
        <View style={styles.counterLeft}>
          <Ionicons name="notifications-outline" size={20} color="#b45f06" />
          <Text style={styles.counterText}>
            {loading ? '...' : `${alertes.length} alerte${alertes.length > 1 ? 's' : ''} active${alertes.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={styles.counterRight}>
          {alertesCritiques > 0 && (
            <View style={styles.badgeCritique}>
              <Text style={styles.badgeCritiqueText}>{alertesCritiques} critique{alertesCritiques > 1 ? 's' : ''}</Text>
            </View>
          )}
          {alertesUrgentes > 0 && (
            <View style={styles.badgeUrgent}>
              <Text style={styles.badgeUrgentText}>{alertesUrgentes} urgent{alertesUrgentes > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      </View>

      {/* NOTE CONFIDENTIALITÉ */}
      <View style={styles.confidentialiteBanner}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#16a34a" />
        <Text style={styles.confidentialiteText}>
          Vos signalements sont transmis uniquement aux autorités. Votre identité reste confidentielle.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAlertes(); }}
            colors={['#b45f06']}
            tintColor="#b45f06"
          />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.emptyText}>Chargement des alertes...</Text>
          </View>
        ) : alertes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucune alerte active</Text>
            <Text style={styles.emptySubtitle}>
              Il n'y a actuellement aucune alerte de disparition en cours.
            </Text>
          </View>
        ) : (
          alertes.map((alerte) => (
            <AlerteCard key={alerte.id} alerte={alerte} navigation={navigation} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },
  headerDate: { fontSize: 11, color: '#76777d', marginTop: 2 },

  counterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  counterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterText: { fontSize: 13, color: '#0b1c30', fontWeight: '600' },
  counterRight: { flexDirection: 'row', gap: 6 },
  badgeCritique: { backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeCritiqueText: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  badgeUrgent: { backgroundColor: '#ffedd5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeUrgentText: { fontSize: 10, fontWeight: '700', color: '#ea580c' },

  confidentialiteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  confidentialiteText: { flex: 1, fontSize: 11, color: '#166534', lineHeight: 15 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0b1c30' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 12 },
});
