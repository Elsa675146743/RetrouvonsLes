import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Image, Modal, Share, Alert, Linking, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import { supabase } from '../../services/supabase';

const SITE_WEB = 'https://retrouvonsles.te-sea.com';
const { width } = Dimensions.get('window');

type Alerte = {
  id: string;
  id_dossier: string;
  titre: string;
  message_court: string;
  statut_alerte: string;
  date_diffusion: string;
  rayon_km: number;
  personne_nom: string;
  personne_prenom: string;
  personne_age_estime_min: number;
  personne_age_estime_max: number;
  personne_taille_cm: number | null;
  personne_poids_kg: number | null;
  personne_photo_principale: string | null;
  lieu_disparition: string;
  niveau_urgence: string | null;
};

type NotificationItem = {
  id: string;
  titre: string;
  message: string;
  date_creation: string; // ✅ corrigé
  lue: boolean;
  type_notification: string;
  id_dossier?: string;
};

// ─────────────────────────────────────────────────────────────
// MENU PLUS
// ─────────────────────────────────────────────────────────────
function MenuPlus({ visible, onClose, navigation }: any) {
  const items = [
    { icon: 'chatbubbles-outline', label: 'Messagerie', screen: 'ConversationsList', color: '#b45f06' },
    { icon: 'alert-circle-outline', label: 'SOS Urgence', screen: 'SOS', color: '#dc2626' },
      { icon: 'document-text-outline', label: 'Pré-déclaration', screen: 'PreDeclarationList', color: '#3b82f6' }, 
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={menuStyles.container}>
          <View style={menuStyles.handle} />
          <Text style={menuStyles.title}>Actions rapides</Text>
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={menuStyles.item}
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate(item.screen), 200);
              }}
            >
              <View style={[menuStyles.itemIconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={menuStyles.itemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#76777d" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={menuStyles.btnFermer} onPress={onClose}>
            <Text style={menuStyles.btnFermerText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#c6c6cd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 14, fontWeight: '600', color: '#45464d', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#c6c6cd' },
  itemIconBox: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#0b1c30' },
  btnFermer: { backgroundColor: '#e5eeff', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnFermerText: { color: '#000000', fontWeight: '600', fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────
function AppHeader({ alertesCount = 0, initiales = '?', verifie = false, onProfilePress }: any) {
  const navigation = useNavigation<any>();

  return (
    <View style={hS.wrapper}>
      <View style={hS.row}>
        <TouchableOpacity style={hS.profileBtn} onPress={onProfilePress}>
          <View style={hS.avatar}>
            <Text style={hS.avatarText}>{initiales}</Text>
            {verifie && <View style={hS.verifiedDot} />}
          </View>
        </TouchableOpacity>
        <View style={hS.logoContainer}>
          <View style={hS.logoRow}>
            <View style={hS.eyeOuter}>
              <View style={hS.eyeInner} />
            </View>
            <Text style={hS.logoText}>
              Retrouvons<Text style={hS.logoAccent}>Les</Text>
            </Text>
          </View>
          <Text style={hS.tagline}>Ensemble, retrouvons-les</Text>
        </View>
        <TouchableOpacity style={hS.bellBtn} onPress={() => navigation.navigate('Alertes')}>
          <Ionicons name="notifications-outline" size={24} color="#0b1c30" />
          {alertesCount > 0 && (
            <View style={hS.badge}>
              <Text style={hS.badgeText}>{alertesCount > 9 ? '9+' : alertesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={hS.separator} />
    </View>
  );
}

const hS = StyleSheet.create({
  wrapper: { backgroundColor: '#f8f9ff', paddingTop: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  profileBtn: { width: 44, height: 44 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  verifiedDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#16a34a', borderWidth: 2, borderColor: '#f8f9ff' },
  logoContainer: { alignItems: 'center', flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyeOuter: { width: 24, height: 14, borderRadius: 12, borderWidth: 2, borderColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  eyeInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#000000' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#0b1c30', letterSpacing: -0.3 },
  logoAccent: { color: '#b45f06' },
  tagline: { fontSize: 9, color: '#76777d', letterSpacing: 0.5, marginTop: 2 },
  bellBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ba1a1a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#f8f9ff' },
  badgeText: { fontSize: 9, color: '#ffffff', fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#c6c6cd', marginTop: 8 },
});

// ─── SECTION URGENCE ───
function SectionUrgence({ navigation }: any) {
  return (
    <View style={urgenceS.container}>
      <Image
        source={require('../../assets/onboarding/slide2.jpeg')}
        style={urgenceS.bgImage}
      />
      <View style={urgenceS.overlay}>
        <Text style={urgenceS.title}>Vigilance communautaire</Text>
        <Text style={urgenceS.subtitle}>Chaque seconde compte. Aidez-nous à les renforcer chez vous.</Text>
        <Text style={urgenceS.description}>RetrouvonsLes connecte les familles, les autorités et les personnes engagées pour la paix au Cameroun.</Text>
        <TouchableOpacity style={urgenceS.btnPrimary} onPress={() => navigation.navigate('NouveauSignalement')}>
          <Text style={urgenceS.btnPrimaryText}>Signaler une disparition</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const urgenceS = StyleSheet.create({
  container: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, position: 'relative', height: 280 },
  bgImage: { width: '100%', height: '100%', position: 'absolute' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.65)', padding: 20, height: '100%', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#f1f5f9', fontWeight: '600', marginBottom: 6 },
  description: { fontSize: 12, color: '#cbd5e1', lineHeight: 18, marginBottom: 20 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#b45f06', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start' },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

// ─── TYPES D'URGENCE ───
function TypesUrgence() {
  const types = [
    { icon: 'warning-outline', label: 'Enlèvement', color: '#dc2626', bg: '#fee2e2' },
    { icon: 'walk-outline', label: 'Fugue', color: '#f59e0b', bg: '#fef3c7' },
    { icon: 'flash-outline', label: 'Danger Immédiat', color: '#ef4444', bg: '#fef2f2' },
  ];

  return (
    <View style={typesS.container}>
      <Text style={typesS.title}>Signaler par type</Text>
      <View style={typesS.grid}>
        {types.map((type, index) => (
          <TouchableOpacity key={index} style={[typesS.card, { backgroundColor: type.bg }]}>
            <View style={typesS.cardIcon}><Ionicons name={type.icon as any} size={24} color={type.color} /></View>
            <Text style={[typesS.cardLabel, { color: type.color }]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const typesS = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '600' },
});

// ─── STATS SECTION ───
function StatsCles() {
  const [stats, setStats] = useState({ signalements: 0, personnesRetrouvees: 0, tempsMoyen: '--', partenaires: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: signalementsCount } = await supabase.from('signalement').select('*', { count: 'exact', head: true }).eq('statut_validation', 'valide');
        const { count: retrouvesCount } = await supabase.from('dossier_disparition').select('*', { count: 'exact', head: true }).in('statut_dossier', ['retrouve_vivant', 'retrouve_decede']);
        const { count: partenairesCount } = await supabase.from('organisation').select('*', { count: 'exact', head: true }).eq('statut_actif', true);
        setStats({ signalements: signalementsCount || 0, personnesRetrouvees: retrouvesCount || 0, tempsMoyen: '--', partenaires: partenairesCount || 0 });
      } catch (error) { console.error('Erreur chargement stats:', error); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const statsData = [
    { value: loading ? '...' : `${stats.signalements}+`, label: 'Signalements' },
    { value: loading ? '...' : `${stats.personnesRetrouvees}`, label: 'Personnes retrouvées' },
    { value: stats.tempsMoyen, label: 'Temps de réponse moyen' },
    { value: loading ? '...' : `${stats.partenaires}`, label: 'Partenaires' },
  ];

  return (
    <View style={statsClesS.container}>
      <View style={statsClesS.grid}>
        {statsData.map((stat, index) => (
          <View key={index} style={statsClesS.card}>
            <Text style={statsClesS.value}>{stat.value}</Text>
            <Text style={statsClesS.label}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const statsClesS = StyleSheet.create({
  container: { backgroundColor: '#0b1c30', borderRadius: 16, padding: 20, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', alignItems: 'center', paddingVertical: 12 },
  value: { fontSize: 20, fontWeight: '800', color: '#b45f06', marginBottom: 4 },
  label: { fontSize: 11, color: '#cbd5e1', textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────
// ACTIVITÉ RÉCENTE — depuis table notification
// ─────────────────────────────────────────────────────────────
function ActiviteRecente({ navigation }: { navigation: any }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification')
        .select('id, titre, message, date_creation, lue, type_notification, id_dossier') // ✅
        .eq('id_utilisateur', user.id)
        .order('date_creation', { ascending: false }) // ✅
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffJours = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffJours === 0) return "Aujourd'hui";
    if (diffJours === 1) return 'Hier';
    if (diffJours < 7) return `Il y a ${diffJours} j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'message_autorite': return { icon: 'chatbubble', color: '#1d4ed8', bg: '#dbeafe' };
      case 'retrouvaille': return { icon: 'checkmark-circle', color: '#16a34a', bg: '#dcfce7' };
      case 'statut_dossier': return { icon: 'folder-open', color: '#b45f06', bg: '#fefce8' };
      case 'nouvelle_alerte': return { icon: 'notifications', color: '#dc2626', bg: '#fee2e2' };
      default: return { icon: 'information-circle', color: '#64748b', bg: '#f1f5f9' };
    }
  };

  if (loading) {
    return (
      <View style={activiteS.container}>
        <Text style={activiteS.title}>Activité récente</Text>
        <ActivityIndicator size="small" color="#b45f06" style={{ paddingVertical: 20 }} />
      </View>
    );
  }

  if (notifications.length === 0) return null;

  return (
    <View style={activiteS.container}>
      <Text style={activiteS.title}>Activité récente</Text>
      {notifications.map((item) => {
        const { icon, color, bg } = getIconForType(item.type_notification);
        return (
          <TouchableOpacity
            key={item.id}
            style={[activiteS.item, !item.lue && activiteS.itemUnread]}
            onPress={() => {
              if (item.id_dossier) {
                navigation.navigate('VoirDossier', { id: item.id_dossier });
              }
            }}
          >
            <View style={[activiteS.iconBox, { backgroundColor: bg }]}>
              <Ionicons name={icon as any} size={18} color={color} />
            </View>
            <View style={activiteS.content}>
              <Text style={activiteS.itemTitle}>{item.titre}</Text>
              <Text style={activiteS.itemDesc} numberOfLines={2}>{item.message}</Text>
              <Text style={activiteS.itemDate}>{formatDate(item.date_creation)}</Text>         
                 </View>
            {!item.lue && <View style={activiteS.unreadDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const activiteS = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 16, fontWeight: '800', color: '#0b1c30', marginBottom: 14 },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'flex-start' },
  itemUnread: { backgroundColor: '#fafbff' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  content: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 2 },
  itemDesc: { fontSize: 12, color: '#64748b', lineHeight: 16 },
  itemDate: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginTop: 6 },
});

// ─── ALERTES RÉCENTES HEADER ───
function AlertesRecentesHeader() {
  return (
    <View style={alertesHeaderS.container}>
      <Text style={alertesHeaderS.title}>Alertes récentes</Text>
      <Text style={alertesHeaderS.subtitle}>Disparitions signalées ces 30 derniers jours</Text>
    </View>
  );
}

const alertesHeaderS = StyleSheet.create({
  container: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },
  subtitle: { fontSize: 12, color: '#76777d', marginTop: 2 },
});

// ─── MODAL PARTAGE ───
function ModalPartage({ visible, onClose, onWhatsApp, onFacebook, onAutre }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={partageStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={partageStyles.container}>
          <View style={partageStyles.handle} />
          <Text style={partageStyles.title}>Partager l'alerte</Text>
          <Text style={partageStyles.subtitle}>Choisissez comment partager cette alerte de disparition</Text>
          <TouchableOpacity style={partageStyles.option} onPress={onWhatsApp}>
            <View style={[partageStyles.iconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={26} color="#16a34a" />
            </View>
            <View style={partageStyles.optionTexts}>
              <Text style={partageStyles.optionLabel}>WhatsApp</Text>
              <Text style={partageStyles.optionDesc}>Photo + détails + lien dossier</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={partageStyles.option} onPress={onFacebook}>
            <View style={[partageStyles.iconBox, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="logo-facebook" size={26} color="#1d4ed8" />
            </View>
            <View style={partageStyles.optionTexts}>
              <Text style={partageStyles.optionLabel}>Facebook</Text>
              <Text style={partageStyles.optionDesc}>Lien smart (app ou site web)</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={partageStyles.option} onPress={onAutre}>
            <View style={[partageStyles.iconBox, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="share-social-outline" size={26} color="#475569" />
            </View>
            <View style={partageStyles.optionTexts}>
              <Text style={partageStyles.optionLabel}>Autre application</Text>
              <Text style={partageStyles.optionDesc}>SMS, email, Telegram...</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={partageStyles.btnFermer} onPress={onClose}>
            <Text style={partageStyles.btnFermerText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const partageStyles = StyleSheet.create({
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

// ─────────────────────────────────────────────────────────────
// CARTE ALERTE
// ─────────────────────────────────────────────────────────────
function AlerteCard({ alerte, onPress, onReportSeen }: any) {
  const [modalPartageVisible, setModalPartageVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const ageMoyen = alerte.personne_age_estime_min && alerte.personne_age_estime_max
    ? Math.floor((alerte.personne_age_estime_min + alerte.personne_age_estime_max) / 2)
    : alerte.personne_age_estime_min || alerte.personne_age_estime_max || 0;

  const diffHeures = Math.floor((Date.now() - new Date(alerte.date_diffusion).getTime()) / (1000 * 3600));
  const dureeText = diffHeures < 24
    ? `Disparu depuis ${diffHeures} heures`
    : `Disparu depuis ${Math.floor(diffHeures / 24)} jours`;
  const ageText = ageMoyen > 0 ? `${ageMoyen} ans` : 'Âge inconnu';

  const universalLink = `${SITE_WEB}/dossier/${alerte.id_dossier}`;

  const messageTexte =
    `🔴 *ALERTE DISPARITION* 🔴\n\n` +
    `👤 *${alerte.personne_prenom} ${alerte.personne_nom}*\n` +
    `🎂 *Âge :* ${ageMoyen > 0 ? `${ageMoyen} ans` : 'Inconnu'}\n` +
    `📍 *Dernier lieu vu :* ${alerte.lieu_disparition || 'Inconnu'}\n` +
    `📅 *Date :* ${new Date(alerte.date_diffusion).toLocaleDateString('fr-FR')}\n\n` +
    `Si vous avez des informations, cliquez sur le lien ci-dessous :\n` +
    `👉 ${universalLink}\n\n` +
    `_(Ouvre l'application RetrouvonsLes si installée, sinon le site web)_\n\n` +
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
    } catch {
      return null;
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsApp = async () => {
    setModalPartageVisible(false);
    try {
      let fileUri: string | null = null;
      if (alerte.personne_photo_principale) {
        const localPath = await downloadPhoto(alerte.personne_photo_principale);
        if (localPath) {
          fileUri = Platform.OS === 'android' ? `file://${localPath}` : localPath;
        }
      }
      await Share.share(
        Platform.OS === 'android'
          ? { title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte }
          : { title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte, url: fileUri || universalLink }
      );
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ouvrir le partage.");
    }
  };

  const handleFacebook = async () => {
    setModalPartageVisible(false);
    try {
      const fbNative = `fb://share?link=${encodeURIComponent(universalLink)}`;
      const supported = await Linking.canOpenURL(fbNative);
      if (supported) {
        await Linking.openURL(fbNative);
      } else {
        await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(universalLink)}&quote=${encodeURIComponent(`🔴 ALERTE DISPARITION — ${alerte.personne_prenom} ${alerte.personne_nom}`)}`);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir Facebook.");
    }
  };

  const handleAutre = async () => {
    setModalPartageVisible(false);
    try {
      let fileUri: string | null = null;
      if (alerte.personne_photo_principale) {
        const localPath = await downloadPhoto(alerte.personne_photo_principale);
        if (localPath) {
          fileUri = Platform.OS === 'android' ? `file://${localPath}` : localPath;
        }
      }
      await Share.share(
        Platform.OS === 'ios' && fileUri
          ? { title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte, url: fileUri }
          : { title: `Disparition — ${alerte.personne_prenom} ${alerte.personne_nom}`, message: messageTexte }
      );
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  return (
    <View style={cardStyles.card}>
      <TouchableOpacity onPress={onPress}>
        <View style={cardStyles.photoContainer}>
          {alerte.personne_photo_principale ? (
            <Image source={{ uri: alerte.personne_photo_principale }} style={cardStyles.photo} />
          ) : (
            <View style={cardStyles.photoPlaceholder}>
              <Ionicons name="person-outline" size={50} color="#76777d" />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPress}>
        <View style={cardStyles.infoContainer}>
          <Text style={cardStyles.name}>{alerte.personne_prenom} {alerte.personne_nom}</Text>
          <Text style={cardStyles.details}>{ageText}</Text>
          <View style={cardStyles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#76777d" />
            <Text style={cardStyles.location}>{alerte.lieu_disparition || 'Lieu inconnu'}</Text>
          </View>
          <Text style={cardStyles.duration}>{dureeText}</Text>
        </View>
      </TouchableOpacity>
      <View style={cardStyles.buttonRow}>
        <TouchableOpacity style={cardStyles.reportBtn} onPress={onReportSeen}>
          <Text style={cardStyles.reportBtnText}>SIGNALER VU</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.shareBtn} onPress={() => setModalPartageVisible(true)}>
          {downloading
            ? <ActivityIndicator size="small" color="#b45f06" />
            : <Ionicons name="share-social-outline" size={16} color="#b45f06" />}
          <Text style={cardStyles.shareBtnText}>{downloading ? 'CHARGEMENT...' : 'PARTAGER'}</Text>
        </TouchableOpacity>
      </View>
      <ModalPartage
        visible={modalPartageVisible}
        onClose={() => setModalPartageVisible(false)}
        onWhatsApp={handleWhatsApp}
        onFacebook={handleFacebook}
        onAutre={handleAutre}
      />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#c6c6cd' },
  photoContainer: { height: 200, backgroundColor: '#d3e4fe' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5eeff' },
  infoContainer: { padding: 16 },
  name: { fontSize: 20, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  details: { fontSize: 14, color: '#45464d', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  location: { fontSize: 13, color: '#45464d' },
  duration: { fontSize: 12, color: '#76777d', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  reportBtn: { flex: 1, backgroundColor: '#1e3a5f', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  reportBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#b45f06', backgroundColor: '#fff' },
  shareBtnText: { color: '#b45f06', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});

// ─── SECTION PERSONNES DISPARUES ───
function PersonnesDisparues() {
  return (
    <View style={personnesS.container}>
      <Text style={personnesS.title}>Personnes disparues</Text>
      <Text style={personnesS.description}>Vos informations peuvent aider à retrouver vos proches. Votre famille est en danger.</Text>
    </View>
  );
}

const personnesS = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 16, fontWeight: '800', color: '#0b1c30', marginBottom: 8 },
  description: { fontSize: 13, color: '#64748b', lineHeight: 18 },
});

// ─── PRÉVENTION ET BONNES PRATIQUES ───
function SectionPartenaires() {
  const conseils = [
    {
      icon: 'warning-outline',
      title: 'Décrivez précisément ce que vous avez observé',
      description: "Indiquez le lieu exact, l'heure approximative, la direction de déplacement et tout détail distinctif (vêtements, particularités physiques).",
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Protégez votre sécurité',
      description: "Ne tentez pas d'interpeller seul une personne suspecte. Privilégiez l'observation discrète et contactez les autorités compétentes.",
    },
    {
      icon: 'eye-off-outline',
      title: 'Respectez la vie privée',
      description: "Évitez de partager publiquement des informations sensibles sur les réseaux sociaux. Utilisez l'application pour transmettre vos signalements de manière sécurisée.",
    },
  ];

  return (
    <View style={preventionS.container}>
      <Text style={preventionS.title}>Prévention et bonnes pratiques</Text>
      {conseils.map((item, index) => (
        <View key={index} style={preventionS.card}>
          <View style={preventionS.iconBox}>
            <Ionicons name={item.icon as any} size={20} color="#1d4ed8" />
          </View>
          <View style={preventionS.content}>
            <Text style={preventionS.cardTitle}>{item.title}</Text>
            <Text style={preventionS.cardDesc}>{item.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const preventionS = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 16, fontWeight: '800', color: '#0b1c30', marginBottom: 16 },
  card: { flexDirection: 'row', gap: 14, marginBottom: 18, alignItems: 'flex-start' },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  content: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
});

// ─── SECTION RESEAU SOCIAL ───
function SectionReseauSocial({ navigation }: any) {
  return (
    <View style={reseauS.container}>
      <View style={reseauS.iconBox}><Ionicons name="people-outline" size={28} color="#b45f06" /></View>
      <Text style={reseauS.title}>Enrichir la rencontre & les réseaux</Text>
      <Text style={reseauS.description}>Créez votre propre réseau social pour partager vos idées et vos expériences.</Text>
      <TouchableOpacity style={reseauS.btn}><Text style={reseauS.btnText}>Rejoindre le Réseau →</Text></TouchableOpacity>
      <TouchableOpacity style={reseauS.btnDon} onPress={() => navigation.navigate('Dons')}>
        <Ionicons name="heart-outline" size={16} color="#fff" />
        <Text style={reseauS.btnDonText}>Faire un don à notre association</Text>
      </TouchableOpacity>
    </View>
  );
}

const reseauS = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fefce8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#0b1c30', textAlign: 'center', marginBottom: 8 },
  description: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  btn: { marginBottom: 12 },
  btnText: { fontSize: 13, fontWeight: '600', color: '#b45f06' },
  btnDon: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0b1c30', borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20 },
  btnDonText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

// ─── FOOTER ───
function Footer() {
  return (
    <View style={footerS.container}>
      <Text style={footerS.title}>RetrouvonsLes Cameroun</Text>
      <Text style={footerS.description}>Cherchant une solution pour améliorer votre vie quotidienne, nous vous invitons à participer activement à ce projet d'aide sociale.</Text>
      <Text style={footerS.copyright}>© 2024 RetrouvonsLes Cameroun - Tous droits réservés</Text>
    </View>
  );
}

const footerS = StyleSheet.create({
  container: { backgroundColor: '#0b1c30', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 8 },
  description: { fontSize: 12, color: '#cbd5e1', textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  copyright: { fontSize: 10, color: '#94a3b8', textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL HOME
// ─────────────────────────────────────────────────────────────
export default function Home({ navigation: navProp }: any) {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [alertesCount, setAlertesCount] = useState(0);
  const [initiales, setInitiales] = useState('?');
  const [verifie, setVerifie] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const getInitiales = (prenom: string, nom: string): string => {
    const p = (prenom?.trim() || '')[0]?.toUpperCase() || '';
    const n = (nom?.trim() || '')[0]?.toUpperCase() || '';
    return (p + n) || '?';
  };

  const handleReportSeen = (alerte: Alerte) => {
    navigation.navigate('VoirSignalement', {
      dossierId: alerte.id_dossier,
      nomPersonne: alerte.personne_nom,
      prenomPersonne: alerte.personne_prenom,
      modeSignalerVu: true,
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setLoading(false); return; }

      const { data: u, error: profileError } = await supabase
        .from('utilisateur')
        .select('nom, prenom, statut_compte')
        .eq('id', user.id)
        .single();

      if (!profileError && u) {
        setInitiales(getInitiales(u.prenom, u.nom));
        setVerifie(u.statut_compte === 'actif');
      }

      const trente_jours_ago = new Date();
      trente_jours_ago.setDate(trente_jours_ago.getDate() - 30);

      const { data: alertesData, error: alertesError } = await supabase
        .from('alerte')
        .select(`
          id, titre, message_court, statut_alerte, date_diffusion, rayon_km, id_dossier,
          dossier_disparition ( id, lieu_disparition, statut_dossier, personne ( nom, prenom, age_estime_min, age_estime_max, taille_cm, poids_kg, photo_principale ) )
        `)
        .eq('statut_alerte', 'en_cours')
        .eq('validee', true)
        .gte('date_diffusion', trente_jours_ago.toISOString())
        .order('date_diffusion', { ascending: false })
        .limit(5);

      if (!alertesError && alertesData) {
        const formatted: Alerte[] = alertesData
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
              statut_alerte: item.statut_alerte,
              date_diffusion: item.date_diffusion,
              rayon_km: item.rayon_km || 50,
              personne_nom: personne.nom || 'Inconnu',
              personne_prenom: personne.prenom || 'Inconnu',
              personne_age_estime_min: personne.age_estime_min || 0,
              personne_age_estime_max: personne.age_estime_max || 0,
              personne_taille_cm: personne.taille_cm || null,
              personne_poids_kg: personne.poids_kg || null,
              personne_photo_principale: personne.photo_principale || null,
              lieu_disparition: dossier?.lieu_disparition || 'Lieu inconnu',
              niveau_urgence: null,
            };
          });
        setAlertes(formatted);
      } else {
        setAlertes([]);
      }

      const { count: notifCount } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: true })
        .eq('id_utilisateur', user.id)
        .eq('lue', false);
      setAlertesCount(notifCount || 0);

    } catch (err) {
      console.error('Erreur Home:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchData(); }, [fetchData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      <AppHeader
        alertesCount={alertesCount}
        initiales={initiales}
        verifie={verifie}
        onProfilePress={() => navigation.navigate('ProfilUtilisateur')}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            colors={['#b45f06']}
            tintColor="#b45f06"
          />
        }
      >
        <SectionUrgence navigation={navigation} />
        <TypesUrgence />
        <StatsCles />
        <ActiviteRecente navigation={navigation} />
        <AlertesRecentesHeader />
        {loading ? (
          <ActivityIndicator size="large" color="#b45f06" style={{ paddingVertical: 20 }} />
        ) : alertes.length === 0 ? (
          <View style={styles.emptyAlertes}>
            <Text style={styles.emptyAlertesText}>Aucune alerte ces 30 derniers jours</Text>
          </View>
        ) : (
          alertes.map((alerte) => (
            <AlerteCard
              key={alerte.id}
              alerte={alerte}
              onPress={() => navigation.navigate('VoirDossier', { id: alerte.id_dossier })}
              onReportSeen={() => handleReportSeen(alerte)}
            />
          ))
        )}
        <TouchableOpacity
          style={styles.voirToutesBtn}
          onPress={() => navigation.navigate('Alertes')}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={18} color="#0b1c30" />
          <Text style={styles.voirToutesBtnText}>Voir toutes les alertes en cours</Text>
          <Ionicons name="arrow-forward" size={16} color="#0b1c30" />
        </TouchableOpacity>
        <PersonnesDisparues />
        <SectionPartenaires />
        <SectionReseauSocial navigation={navigation} />
        <Footer />
      </ScrollView>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
      <MenuPlus visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9ff' },
  scrollContent: { padding: 16, paddingBottom: 80 },
  floatingButton: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#b45f06', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#b45f06', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, zIndex: 999 },
  emptyAlertes: { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center', marginBottom: 16 },
  emptyAlertesText: { fontSize: 13, color: '#94a3b8' },
  voirToutesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 20, borderWidth: 1.5, borderColor: '#0b1c30' },
  voirToutesBtnText: { fontSize: 14, fontWeight: '700', color: '#0b1c30', flex: 1, textAlign: 'center' },
});