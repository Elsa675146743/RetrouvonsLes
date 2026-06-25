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

type DossierActif = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  age: number | null;
  sexe: string | null;
  dernier_lieu: string | null;
  ville: string | null;
  date_disparition: string | null;
  description: string | null;
  statut: string;
  niveau_urgence: string | null;
  photo_url: string | null;
  nb_vues: number;
  nombre_signalements: number;
};

type NotificationItem = {
  id: string;
  titre: string;
  message: string;
  date_creation: string;
  lue: boolean;
  type_notification: string;
  id_dossier?: string;
};

// ─────────────────────────────────────────────────────────────
// MENU PLUS
// ─────────────────────────────────────────────────────────────
function MenuPlus({ visible, onClose, navigation }: any) {
  const items = [
    { icon: 'alert-circle-outline', label: 'SOS Urgence', screen: 'SOS', color: '#dc2626' },
      { icon: 'document-text-outline', label: 'Pré-déclaration', screen: 'PreDeclarationList', color: '#3b82f6' }, // ✅ AJOUTÉ

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

// ─── CARTE DOSSIER ACTIF (HORIZONTAL) ───
function CarteDossierActif({ dossier, onPress }: { dossier: DossierActif; onPress: () => void }) {
  const age = dossier.age ? `${dossier.age} ans` : 'Âge inconnu';
  const lieu = dossier.dernier_lieu || dossier.ville || 'Lieu inconnu';
  const formattedDate = dossier.date_disparition
    ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).replace('.', '').replace(/\b(\w{3})/, (m) => m.charAt(0).toUpperCase() + m.slice(1))
    : 'Date inconnue';

  return (
    <TouchableOpacity style={carteDossierS.card} onPress={onPress} activeOpacity={0.8}>
      <View style={carteDossierS.photoBox}>
        {dossier.photo_url ? (
          <Image source={{ uri: dossier.photo_url }} style={carteDossierS.photo} />
        ) : (
          <View style={carteDossierS.photoPlaceholder}>
            <Ionicons name="person-outline" size={30} color="#cbd5e1" />
          </View>
        )}
      </View>
      <View style={carteDossierS.infoBox}>
        <Text style={carteDossierS.name} numberOfLines={1}>
          {dossier.prenom} {dossier.nom}
        </Text>
        <Text style={carteDossierS.age}>{age}</Text>
        <View style={carteDossierS.locationRow}>
          <Ionicons name="location-outline" size={10} color="#76777d" />
          <Text style={carteDossierS.location} numberOfLines={1}>{lieu}</Text>
        </View>
        <Text style={carteDossierS.date}>{formattedDate}</Text>
      </View>
    </TouchableOpacity>
  );
}

const carteDossierS = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  photoBox: {
    width: '100%',
    height: 140,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  infoBox: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0b1c30',
    marginBottom: 2,
  },
  age: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  location: {
    fontSize: 10,
    color: '#76777d',
    flex: 1,
  },
  date: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
});

// ─── SECTION DOSSIERS ACTIFS (HORIZONTAL) ───
function SectionDossiersActifs({ navigation }: { navigation: any }) {
  const [dossiers, setDossiers] = useState<DossierActif[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDossiersActifs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dossier_disparition')
        .select(`
          id,
          numero_dossier,
          date_disparition,
          lieu_disparition,
          ville_disparition,
          statut_dossier,
          niveau_urgence,
          nombre_signalements,
          nombre_vues_fiche,
          id_personne
        `)
        .not('statut_dossier', 'in', '("retrouve_vivant","retrouve_decede")')
        .order('date_disparition', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) {
        setDossiers([]);
        return;
      }

      const personneIds = [...new Set(data.map((d: any) => d.id_personne).filter(Boolean))];
      let personnesMap: Record<string, any> = {};

      if (personneIds.length > 0) {
        const { data: dataPersonnes } = await supabase
          .from('personne')
          .select(`id, nom, prenom, age_estime_min, age_estime_max, sexe, photo_principale`)
          .in('id', personneIds);

        if (dataPersonnes) {
          (dataPersonnes ?? []).forEach((p: any) => { personnesMap[p.id] = p; });
        }

        const { data: dataPhotos } = await supabase
          .from('photo')
          .select(`id, url_cloudinary, est_principale, approuvee, id_personne`)
          .in('id_personne', personneIds)
          .eq('approuvee', true);

        (dataPhotos ?? []).forEach((ph: any) => {
          if (personnesMap[ph.id_personne]) {
            if (!personnesMap[ph.id_personne]._photos) personnesMap[ph.id_personne]._photos = [];
            personnesMap[ph.id_personne]._photos.push(ph);
          }
        });
      }

      const mapped: DossierActif[] = data.map((d: any) => {
        const personne = personnesMap[d.id_personne] ?? null;
        const photos: any[] = personne?._photos ?? [];
        const photoUrl = personne?.photo_principale ??
          photos.find((p: any) => p.est_principale)?.url_cloudinary ??
          photos[0]?.url_cloudinary ??
          null;
        const age = personne?.age_estime_min ?? personne?.age_estime_max ?? null;

        return {
          id: d.id,
          numero_dossier: d.numero_dossier ?? '',
          nom: personne?.nom ?? '',
          prenom: personne?.prenom ?? '',
          age,
          sexe: personne?.sexe ?? null,
          dernier_lieu: d.lieu_disparition ?? null,
          ville: d.ville_disparition ?? null,
          date_disparition: d.date_disparition ?? null,
          description: null,
          statut: d.statut_dossier ?? 'en_cours',
          niveau_urgence: d.niveau_urgence ?? null,
          photo_url: photoUrl,
          nb_vues: d.nombre_vues_fiche ?? 0,
          nombre_signalements: d.nombre_signalements ?? 0,
        };
      });

      setDossiers(mapped);
    } catch (error) {
      console.error('Erreur chargement dossiers actifs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDossiersActifs();
    }, [fetchDossiersActifs])
  );

  if (loading) {
    return (
      <View style={dossiersActifsS.loadingContainer}>
        <ActivityIndicator size="small" color="#b45f06" />
        <Text style={dossiersActifsS.loadingText}>Chargement des alertes...</Text>
      </View>
    );
  }

  if (dossiers.length === 0) {
    return null;
  }

  return (
    <View style={dossiersActifsS.container}>
      <View style={dossiersActifsS.header}>
        <Text style={dossiersActifsS.title}>Alertes en cours</Text>
        <Text style={dossiersActifsS.subtitle}>Disparitions actives</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dossiersActifsS.scrollContent}
      >
        {dossiers.map((dossier) => (
          <CarteDossierActif
            key={dossier.id}
            dossier={dossier}
            onPress={() => navigation.navigate('VoirDossier', { id: dossier.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const dossiersActifsS = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b1c30',
  },
  subtitle: {
    fontSize: 12,
    color: '#76777d',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
});

// ─── ACTIVITÉ RÉCENTE ───
function ActiviteRecente({ navigation }: { navigation: any }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification')
        .select('id, titre, message, date_creation, lue, type_notification, id_dossier')
        .eq('id_utilisateur', user.id)
        .order('date_creation', { ascending: false })
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

// ─── BOUTON DON (hors bloc) ───
function BoutonDon({ navigation }: { navigation: any }) {
  return (
    <TouchableOpacity style={donS.btnDon} onPress={() => navigation.navigate('Dons')}>
      <Ionicons name="heart-outline" size={18} color="#fff" />
      <Text style={donS.btnDonText}>Faire un don à notre association</Text>
    </TouchableOpacity>
  );
}

const donS = StyleSheet.create({
  btnDon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#b45f06',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  btnDonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── BLOC UNIQUE : RETROUVONSLES CAMEROUN (fusion vigilance + footer) ───
function BlocRetrouvonsLesCameroun() {
  return (
    <View style={blocS.container}>
      <Image
        source={require('../../assets/onboarding/slide2.jpeg')}
        style={blocS.bgImage}
      />
      <View style={blocS.overlay}>
        {/* Titre unique */}
        <Text style={blocS.mainTitle}>RetrouvonsLes Cameroun</Text>

        {/* Texte vigilance */}
        <Text style={blocS.vigilanceSubtitle}>Chaque seconde compte. Aidez-nous à les renforcer chez vous.</Text>
        <Text style={blocS.vigilanceDescription}>
          RetrouvonsLes connecte les familles, les autorités et les personnes engagées pour la paix au Cameroun.
        </Text>

        {/* Séparateur */}
        <View style={blocS.separator} />

        {/* Texte association */}
        <Text style={blocS.associationText}>
          Cherchant une solution pour améliorer votre vie quotidienne, nous vous invitons à participer activement à ce projet d'aide sociale.
        </Text>

        {/* Copyright */}
        <Text style={blocS.copyright}>© 2024 RetrouvonsLes Cameroun - Tous droits réservés</Text>
      </View>
    </View>
  );
}

const blocS = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 20,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  vigilanceSubtitle: {
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  vigilanceDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  associationText: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  copyright: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

// ─── SECTION PRÉVENTION ET BONNES PRATIQUES ───
function SectionPrevention() {
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

// ─────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL HOME
// ─────────────────────────────────────────────────────────────
export default function Home({ navigation: navProp }: any) {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertesCount, setAlertesCount] = useState(0);
  const [initiales, setInitiales] = useState('?');
  const [verifie, setVerifie] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const getInitiales = (prenom: string, nom: string): string => {
    const p = (prenom?.trim() || '')[0]?.toUpperCase() || '';
    const n = (nom?.trim() || '')[0]?.toUpperCase() || '';
    return (p + n) || '?';
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
        {/* Dossiers actifs en haut */}
        <SectionDossiersActifs navigation={navigation} />

        {/* Bouton Don (hors bloc) */}
        <BoutonDon navigation={navigation} />

        {/* Activité récente (une seule fois) */}
        <ActiviteRecente navigation={navigation} />

        {/* Prévention et bonnes pratiques */}
        <SectionPrevention />

        {/* Bloc unique RetrouvonsLes Cameroun (fusion vigilance + footer) */}
        <BlocRetrouvonsLesCameroun />
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
});