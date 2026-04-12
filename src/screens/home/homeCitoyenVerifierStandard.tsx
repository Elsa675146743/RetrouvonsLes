import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase }                    from '../../services/supabase';

const { width } = Dimensions.get('window');



// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────
function AppHeader({ navigation, alertes = 0, initiales = '?', verifie = false }: any) {
  return (
    <View style={hS.wrapper}>
      <View style={hS.row}>

        {/* ── GAUCHE : Avatar ── */}
       <TouchableOpacity
          style={hS.avatar} // On utilise le style hS.avatar qui est déjà rond et bleu
          onPress={() => navigation.navigate('ProfilUtilisateur')}
        >
          <Text style={hS.avatarText}>{initiales}</Text>
          
          {/* Petit point vert si le compte est vérifié */}
          {verifie && (
            <View style={hS.verifiedDot} />
          )}
        </TouchableOpacity>

        {/* ── CENTRE : Logo ── */}
        <View style={hS.center}>
          <View style={hS.logoRow}>
            <View style={hS.eyeOuter}>
              <View style={hS.eyeInner} />
            </View>
            <Text style={hS.appName}>
              Retrouvons<Text style={hS.appNameAccent}>Les</Text>
            </Text>
          </View>
          <Text style={hS.tagline}>Ensemble, retrouvons les </Text>
        </View>

        {/* ── DROITE : Cloche ── */}
              <TouchableOpacity
          style={hS.bellBtn}
          onPress={() => navigation.navigate('Alertes')} // Redirige vers la liste des notifications
        >
          <View style={hS.bellWrap}>
            <Ionicons name="notifications-outline" size={24} color="#1e3a5f" />
            {alertes > 0 && (
              <View style={hS.badge}>
                <Text style={hS.badgeText}>{alertes > 9 ? '9+' : alertes}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

      </View>
      <View style={hS.separator} />
    </View>
  );
}
const hS = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Avatar
  avatarBtn: { width: 44, height: 44, position: 'relative' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#93c5fd',
    elevation: 2, shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  verifiedDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#16a34a',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  // Centre
  center: { alignItems: 'center', flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyeOuter: {
    width: 26, height: 16, borderRadius: 13,
    borderWidth: 2, borderColor: '#1d4ed8',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  eyeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8' },
  appName: { fontSize: 18, fontWeight: '800', color: '#1e3a5f', letterSpacing: -0.3 },
  appNameAccent: { color: '#1d4ed8' },
  tagline: {
    fontSize: 9, color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase',
    fontWeight: '500', marginTop: 3,
  },
  // Cloche
  bellBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  bellWrap: { position: 'relative' },
  badge: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  separator: { height: 1, backgroundColor: '#e2e8f0' },
});

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, count, label, sub, loading, color = '#1d4ed8' }: any) {
  return (
    <View style={sCard.card}>
      <View style={[sCard.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[sCard.count, { color }]}>{loading ? '—' : count}</Text>
      <Text style={sCard.label}>{label}</Text>
      {sub && <Text style={[sCard.sub, { color }]}>{sub}</Text>}
    </View>
  );
}

const sCard = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    width: (width - 52) / 3,
    borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'flex-start', gap: 4,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  count: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  sub:   { fontSize: 10, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Home({ navigation: navProp }: any) {
  const navigation = useNavigation<StackNavigationProp<any>>();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [initiales, setInitiales]       = useState('?');
  const [verifie, setVerifie]           = useState(false);
  const [alertesCount, setAlertesCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0, approuves: 0, enRevision: 0,
    alertesActives: 0, score: 0, nonLues: 0,
  });
  const [activites, setActivites] = useState<any[]>([]);
  

  // Calcul initiales depuis prénom + nom
  const getInitiales = (prenom: string, nom: string): string => {
    const p = (prenom?.trim() || '')[0]?.toUpperCase() || '';
    const n = (nom?.trim() || '')[0]?.toUpperCase() || '';
    return (p + n) || '?';
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Session utilisateur
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('Pas de session:', authError?.message);
        setLoading(false);
        return;
      }

      // 2. Profil depuis la table utilisateur
      const { data: u, error: profilError } = await supabase
        .from('utilisateur')
        .select('nom, prenom, statut_compte, score_fiabilite')
        .eq('id', user.id)
        .single();

      if (profilError) {
        console.warn('Erreur profil:', profilError.message);
      } else if (u) {
        setInitiales(getInitiales(u.prenom, u.nom));
        setVerifie(u.statut_compte === 'actif');
      }

      // 3. Toutes les stats en parallèle
      const [
        resTotal,
        resApprouves,
        resEnRevision,
        resAlertes,
        resNonLues,
      ] = await Promise.all([

        // Tous mes signalements
        supabase
          .from('signalement')
          .select('*', { count: 'exact', head: true })
          .eq('id_utilisateur', user.id),

        // Mes signalements validés
        supabase
          .from('signalement')
          .select('*', { count: 'exact', head: true })
          .eq('id_utilisateur', user.id)
          .eq('statut_validation', 'valide'),

        // Mes signalements en vérification
        supabase
          .from('signalement')
          .select('*', { count: 'exact', head: true })
          .eq('id_utilisateur', user.id)
          .eq('statut_validation', 'en_verification'),

        // Alertes actives globales (toutes, pas seulement les miennes)
        supabase
          .from('alerte')
          .select('*', { count: 'exact', head: true })
          .eq('statut_alerte', 'en_cours'),

        // Mes notifications non lues (filtrées par user)
        supabase
          .from('notification')
          .select('*', { count: 'exact', head: true })
          .eq('id_utilisateur', user.id)
          .eq('lue', false),
      ]);

      // Logs d'erreur individuels pour débogage
      if (resTotal.error)      console.warn('signalements total:', resTotal.error.message);
      if (resApprouves.error)  console.warn('signalements approuves:', resApprouves.error.message);
      if (resEnRevision.error) console.warn('signalements revision:', resEnRevision.error.message);
      if (resAlertes.error)    console.warn('alertes actives:', resAlertes.error.message);
      if (resNonLues.error)    console.warn('notifications nonLues:', resNonLues.error.message);

      const nonLues = resNonLues.count ?? 0;
      setAlertesCount(nonLues);
      setStats({
        total:          resTotal.count      ?? 0,
        approuves:      resApprouves.count  ?? 0,
        enRevision:     resEnRevision.count ?? 0,
        alertesActives: resAlertes.count    ?? 0,
        score:          u?.score_fiabilite  ?? 0,
        nonLues,
      });

      // 4. Activité récente
      const { data: acts, error: actsError } = await supabase
        .from('journal_activite')
        .select('id, type_action, action_detaillee, description, date_action')
        .eq('id_utilisateur', user.id)
        .order('date_action', { ascending: false })
        .limit(5);

      if (actsError) console.warn('activites:', actsError.message);
      setActivites(acts ?? []);

    } catch (err) {
      console.error('Erreur Home fetchData:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const quickActions = [
    {
      icon: 'add-circle', label: 'Nouveau signalement',
      sub: 'Déclarer une disparition', screen: 'NouveauSignalement',
      bg: '#1d4ed8', textColor: '#fff', accent: '#fff',
    },
    {
      icon: 'eye-outline', label: 'Mes signalements',
      sub: 'Suivre mes déclarations', screen: 'Signalements',
      bg: '#fff', textColor: '#1e3a5f', accent: '#1d4ed8',
    },
    {
      icon: 'notifications-outline', label: 'Notifications',
      sub: `${stats.nonLues} non lue${stats.nonLues > 1 ? 's' : ''}`,
      screen: 'Alertes',
      bg: '#fff', textColor: '#1e3a5f', accent: '#1d4ed8',
    },
    {
      icon: 'map-outline', label: 'Carte des alertes',
      sub: 'Voir à proximité', screen: 'Carte',
      bg: '#fff', textColor: '#1e3a5f', accent: '#1d4ed8',
    },
  ];

  const bonnesPratiques = [
    {
      titre: 'Décrivez précisément ce que vous avez observé',
      desc: "Indiquez le lieu exact, l'heure approximative, la direction de déplacement et tout détail distinctif.",
    },
    {
      titre: 'Protégez votre sécurité',
      desc: "Ne tentez pas d'interpeller seul une personne suspecte. Contactez les autorités compétentes.",
    },
    {
      titre: 'Respectez la vie privée',
      desc: "Utilisez l'application pour transmettre vos signalements de façon sécurisée. Évitez les réseaux sociaux.",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <AppHeader
        navigation={navigation}
        alertes={alertesCount}
        initiales={initiales}
        verifie={verifie}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            colors={['#1d4ed8']}
            tintColor="#1d4ed8"
          />
        }
      >
        {/* STATS */}
        <Text style={styles.sectionLabel}>Tableau de bord</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10, paddingRight: 16 }}>
            <StatCard
              loading={loading} icon="document-text-outline"
              count={stats.total} label="Signalements" sub="Total"
              color="#1d4ed8"
            />
            <StatCard
              loading={loading} icon="checkmark-circle-outline"
              count={stats.approuves} label="Approuvés" sub="Validés"
              color="#16a34a"
            />
            <StatCard
              loading={loading} icon="time-outline"
              count={stats.enRevision} label="En révision" sub="En cours"
              color="#d97706"
            />
            <StatCard
              loading={loading} icon="warning-outline"
              count={stats.alertesActives} label="Alertes" sub="Actives"
              color="#ef4444"
            />
            <StatCard
              loading={loading} icon="star-outline"
              count={`${stats.score}%`} label="Fiabilité" sub="Mon score"
              color="#7c3aed"
            />
          </View>
        </ScrollView>

        {/* ACTIONS RAPIDES */}
        <Text style={styles.sectionLabel}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.actionCard,
                { backgroundColor: a.bg, borderColor: a.bg === '#fff' ? '#e2e8f0' : a.bg },
              ]}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.8}
            >
              <Ionicons name={a.icon as any} size={28} color={a.accent} />
              <Text style={[styles.actionLabel, { color: a.textColor }]}>{a.label}</Text>
              <Text style={[
                styles.actionSub,
                { color: a.bg === '#1d4ed8' ? 'rgba(255,255,255,0.75)' : '#1d4ed8' },
              ]}>
                {a.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ACTIVITÉ RÉCENTE */}
        <Text style={styles.sectionLabel}>Activité récente</Text>
        <View style={styles.sectionCard}>
          {loading ? (
            <ActivityIndicator size="small" color="#1d4ed8" style={{ paddingVertical: 20 }} />
          ) : activites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucune activité récente</Text>
            </View>
          ) : (
            activites.map((a, i) => (
              <View
                key={a.id ?? i}
                style={[
                  styles.activiteItem,
                  i === activites.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.activiteIconBox}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activiteTitre}>
                    {a.action_detaillee || a.type_action?.replace(/_/g, ' ') || '—'}
                  </Text>
                  {a.description ? (
                    <Text style={styles.activiteDesc} numberOfLines={2}>{a.description}</Text>
                  ) : null}
                  <Text style={styles.activiteDate}>
                    {a.date_action
                      ? new Date(a.date_action).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* BONNES PRATIQUES */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Prévention & bonnes pratiques</Text>
        <View style={styles.sectionCard}>
          {bonnesPratiques.map((b, i) => (
            <View
              key={i}
              style={[
                styles.pratiqueItem,
                i === bonnesPratiques.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.pratiqueDot}>
                <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pratiqueTitre}>{b.titre}</Text>
                <Text style={styles.pratiqueDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 50 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  profileIcon: { 
    fontSize: 22, 
    color: '#4FCCAE', // La couleur turquoise de ton app
    fontWeight: 'bold' 
  },
  profileIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    // Pour donner un peu de relief comme sur ton ancienne version
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: {
    width: (width - 44) / 2, borderRadius: 14, padding: 16,
    borderWidth: 1, gap: 6,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  actionSub:   { fontSize: 11 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
    marginBottom: 4,
  },

  emptyContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText:      { fontSize: 13, color: '#94a3b8' },

  activiteItem: {
    flexDirection: 'row', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  activiteIconBox: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  activiteTitre: { fontSize: 13, fontWeight: '700', color: '#1e3a5f' },
  activiteDesc:  { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 16 },
  activiteDate:  { fontSize: 10, color: '#94a3b8', marginTop: 4 },

  pratiqueItem: {
    flexDirection: 'row', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  pratiqueDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 2,
  },
  pratiqueTitre: { fontSize: 13, fontWeight: '700', color: '#1e3a5f', marginBottom: 3 },
  pratiqueDesc:  { fontSize: 12, color: '#64748b', lineHeight: 17 },
});