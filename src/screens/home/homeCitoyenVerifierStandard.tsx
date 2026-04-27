import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Image, Modal, Share,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../services/supabase';

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

// ─────────────────────────────────────────────────────────────
// MENU PLUS
// ─────────────────────────────────────────────────────────────
function MenuPlus({ visible, onClose, navigation }: any) {
  const items = [
    { icon: 'add-circle-outline', label: 'Nouveau signalement', screen: 'NouveauSignalement', color: '#000000' },
    { icon: 'heart-outline', label: 'Dons & Campagnes', screen: 'Dons', color: '#b45f06' },
    { icon: 'person-outline', label: 'Profil disparition', screen: 'ProfilDisparition', color: '#000000' },
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
          <Ionicons name="notifications-outline" size={24} color="#1e3a5f" />
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

// ─────────────────────────────────────────────────────────────
// CARTE ALERTE
// ─────────────────────────────────────────────────────────────
function AlerteCard({ alerte, onPress, onReportSeen }: { alerte: Alerte; onPress: () => void; onReportSeen: () => void }) {

  const handleShare = async () => {
    try {
      const ageMoyen = alerte.personne_age_estime_min && alerte.personne_age_estime_max
        ? Math.floor((alerte.personne_age_estime_min + alerte.personne_age_estime_max) / 2)
        : alerte.personne_age_estime_min || alerte.personne_age_estime_max || 0;

      await Share.share({
        title: `Disparition - ${alerte.personne_prenom} ${alerte.personne_nom}`,
        message:
          `🔍 ALERTE DISPARITION\n\n` +
          `Nom: ${alerte.personne_prenom} ${alerte.personne_nom}\n` +
          `Âge: ${ageMoyen > 0 ? ageMoyen : 'Inconnu'} ans\n` +
          `Lieu: ${alerte.lieu_disparition}\n` +
          `Date: ${new Date(alerte.date_diffusion).toLocaleDateString('fr-FR')}\n\n` +
          `📢 Partager pour aider à retrouver cette personne !\nVia l'application RetrouvonsLes`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const diffHeures = Math.floor((Date.now() - new Date(alerte.date_diffusion).getTime()) / (1000 * 3600));
  const dureeText = diffHeures < 24
    ? `Disparu depuis ${diffHeures} heures`
    : `Disparu depuis ${Math.floor(diffHeures / 24)} jours`;

  const ageMoyen = alerte.personne_age_estime_min && alerte.personne_age_estime_max
    ? Math.floor((alerte.personne_age_estime_min + alerte.personne_age_estime_max) / 2)
    : alerte.personne_age_estime_min || alerte.personne_age_estime_max || 0;

  const ageText = ageMoyen > 0 ? `${ageMoyen} ans` : 'Âge inconnu';
  const taillePoids = [
    alerte.personne_taille_cm ? `${alerte.personne_taille_cm} cm` : null,
    alerte.personne_poids_kg ? `${alerte.personne_poids_kg} kg` : null,
  ].filter(Boolean);
  const detailsText = taillePoids.length > 0 ? `${ageText} · ${taillePoids.join(' · ')}` : ageText;

  return (
    <View style={cardStyles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={cardStyles.photoContainer}>
          {alerte.personne_photo_principale ? (
            <Image 
              source={{ uri: alerte.personne_photo_principale }} 
              style={cardStyles.photo} 
              resizeMode="cover"
              onError={(e) => console.log('Erreur chargement image:', e.nativeEvent.error)}
            />
          ) : (
            <View style={cardStyles.photoPlaceholder}>
              <Ionicons name="person-outline" size={50} color="#76777d" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={cardStyles.infoContainer}>
          <Text style={cardStyles.name}>{alerte.personne_prenom} {alerte.personne_nom}</Text>
          <Text style={cardStyles.details}>{detailsText}</Text>
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
        <TouchableOpacity style={cardStyles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color="#3b82f6" />
          <Text style={cardStyles.shareBtnText}>PARTAGER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#c6c6cd' },
  photoContainer: { position: 'relative', height: 200, backgroundColor: '#d3e4fe' },
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
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  shareBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────
function StatsSection({ stats, loading }: { stats: any; loading: boolean }) {
  return (
    <View style={statsStyles.container}>
      <Text style={statsStyles.title}>Communauté Vigilance</Text>
      <View style={statsStyles.grid}>
        <View style={statsStyles.card}>
          <Text style={statsStyles.number}>{loading ? '—' : stats.totalAlertes}</Text>
          <Text style={statsStyles.label}>Alertes</Text>
        </View>
        <View style={statsStyles.card}>
          <Text style={statsStyles.number}>{loading ? '—' : stats.alertesActives}</Text>
          <Text style={statsStyles.label}>En cours</Text>
        </View>
        <View style={statsStyles.card}>
          <Text style={statsStyles.number}>{loading ? '—' : stats.dossiersResolus}</Text>
          <Text style={statsStyles.label}>Résolus</Text>
        </View>
      </View>
      <Text style={statsStyles.footer}>Ensemble, mobilisons-nous pour les retrouver</Text>
    </View>
  );
}

const statsStyles = StyleSheet.create({
  container: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginTop: 24, marginBottom: 30, borderWidth: 1, borderColor: '#c6c6cd' },
  title: { fontSize: 14, fontWeight: '600', color: '#000000', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  card: { alignItems: 'center' },
  number: { fontSize: 28, fontWeight: '800', color: '#0b1c30' },
  label: { fontSize: 12, color: '#76777d', marginTop: 4 },
  footer: { fontSize: 11, color: '#45464d', textAlign: 'center', fontStyle: 'italic' },
});

// ─────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
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
  const [stats, setStats] = useState({ totalAlertes: 0, alertesActives: 0, dossiersResolus: 0 });

  const getInitiales = (prenom: string, nom: string): string => {
    const p = (prenom?.trim() || '')[0]?.toUpperCase() || '';
    const n = (nom?.trim() || '')[0]?.toUpperCase() || '';
    return (p + n) || '?';
  };

  const handleReportSeen = (alerte: Alerte) => {
    navigation.navigate('NouveauSignalement', {
      dossierId: alerte.id_dossier,
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoading(false);
        return;
      }

      // Profil utilisateur
      const { data: u, error: profileError } = await supabase
        .from('utilisateur')
        .select('nom, prenom, statut_compte')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Erreur profil:', profileError);
      } else if (u) {
        setInitiales(getInitiales(u.prenom, u.nom));
        setVerifie(u.statut_compte === 'actif');
      }

      // Récupérer les alertes avec les infos personne et dossier
      const { data: alertesData, error: alertesError } = await supabase
        .from('alerte')
        .select(`
          id,
          titre,
          message_court,
          statut_alerte,
          date_diffusion,
          rayon_km,
          id_dossier,
          dossier_disparition (
            id,
            lieu_disparition,
            personne (
              nom,
              prenom,
              age_estime_min,
              age_estime_max,
              taille_cm,
              poids_kg,
              photo_principale
            )
          )
        `)
        .eq('statut_alerte', 'en_cours')
        .eq('validee', true)
        .order('date_diffusion', { ascending: false });

      if (alertesError) {
        console.error('Erreur alertes:', alertesError.message);
      } else if (alertesData && alertesData.length > 0) {
        const formatted: Alerte[] = alertesData.map((item: any) => {
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

      // Nombre de notifications non lues
      const { count: notifCount, error: notifError } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: true })
        .eq('id_utilisateur', user.id)
        .eq('lue', false);

      if (notifError) {
        console.error('Erreur notifications:', notifError);
      } else {
        setAlertesCount(notifCount || 0);
      }

      // Statistiques
      const { count: totalAlertes } = await supabase.from('alerte').select('*', { count: 'exact', head: true });
      const { count: alertesActives } = await supabase.from('alerte').select('*', { count: 'exact', head: true }).eq('statut_alerte', 'en_cours');
      const { count: dossiersResolus } = await supabase.from('dossier_disparition').select('*', { count: 'exact', head: true }).in('statut_dossier', ['retrouve_vivant', 'retrouve_decede']);

      setStats({
        totalAlertes: totalAlertes || 0,
        alertesActives: alertesActives || 0,
        dossiersResolus: dossiersResolus || 0,
      });

    } catch (err) {
      console.error('Erreur Home:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
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
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Alertes actives</Text>
          <Text style={styles.subTitle}>
            {alertes.length} alerte{alertes.length > 1 ? 's' : ''} en cours
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#b45f06" style={{ paddingVertical: 40 }} />
        ) : alertes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#c6c6cd" />
            <Text style={styles.emptyText}>Aucune alerte active</Text>
          </View>
        ) : (
          alertes.map((alerte) => (
            <AlerteCard
              key={alerte.id}
              alerte={alerte}
              onPress={() => navigation.navigate('ProfilDisparition', { id: alerte.id_dossier })}
              onReportSeen={() => handleReportSeen(alerte)}
            />
          ))
        )}

        <StatsSection stats={stats} loading={loading} />
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
  headerSection: { marginBottom: 20 },
  mainTitle: { fontSize: 24, fontWeight: '700', color: '#0b1c30', marginBottom: 4, letterSpacing: -0.5 },
  subTitle: { fontSize: 14, color: '#45464d', marginBottom: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#76777d', textAlign: 'center' },
  floatingButton: {
    position: 'absolute', bottom: 30, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#b45f06',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#b45f06',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, zIndex: 999,
  },
});