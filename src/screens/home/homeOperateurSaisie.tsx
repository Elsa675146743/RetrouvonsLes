import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../services/supabase';

import ListePersonnes from '../home/operateur/ListePersonnes';
import Dossiers from './operateur/Dossiers';

interface HomeProps {
  level?: number | null;
  navigation?: any;
}

const Tab = createBottomTabNavigator();

// =====================================================
// DASHBOARD CONTENT
// =====================================================
const DashboardContent = ({ navigation, level }: any) => {

  const [stats, setStats] = useState({
    total:     0,
    enCours:   0,
    retrouves: 0,
    personnes: 0,
  });
  const [dernierDossier, setDernierDossier] = useState<any>(null);
  const [loading, setLoading]               = useState(true);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const { count: total } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true });

      const { count: enCours } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .eq('statut_dossier', 'en_cours');

      const { count: retrouvesVivants } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .eq('statut_dossier', 'retrouve_vivant');

      const { count: retrouvesDecedes } = await supabase
        .from('dossier_disparition')
        .select('*', { count: 'exact', head: true })
        .eq('statut_dossier', 'retrouve_decede');

      const { count: personnes } = await supabase
        .from('personne')
        .select('*', { count: 'exact', head: true });

      setStats({
        total:     total     || 0,
        enCours:   enCours   || 0,
        retrouves: (retrouvesVivants || 0) + (retrouvesDecedes || 0),
        personnes: personnes || 0,
      });

      const { data } = await supabase
        .from('dossier_disparition')
        .select(`
          id,
          numero_dossier,
          statut_dossier,
          niveau_urgence,
          ville_disparition,
          date_disparition,
          created_at,
          personne:id_personne (
            nom,
            prenom
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) setDernierDossier(data[0]);

    } catch (error) {
      console.error('Erreur dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const sub = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'dossier_disparition',
      }, fetchAllData)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'personne',
      }, fetchAllData)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  const getUrgenceColor = (urgence: string) => {
    const map: Record<string, string> = {
      critique: '#991b1b',
      urgent:   '#f59e0b',
      normal:   '#2563eb',
      faible:   '#10b981',
    };
    return map[urgence] || '#64748b';
  };

  const getStatutColor = (statut: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      en_cours:        { bg: '#fef3c7', text: '#92400e' },
      retrouve_vivant: { bg: '#f0fdf4', text: '#166534' },
      retrouve_decede: { bg: '#fee2e2', text: '#991b1b' },
      suspendu:        { bg: '#f1f5f9', text: '#64748b' },
    };
    return map[statut] || { bg: '#f1f5f9', text: '#64748b' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('ProfilUtilisateur')}>
          <Ionicons name="person-circle" size={45} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.appName}>
            Retrouvons<Text style={{ color: '#4FCCAE' }}>Les</Text>
          </Text>
          <Text style={styles.appSubtitle}>Opérateur ID: Paul Nkomo</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Lvl {level}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.mainTitle}>Tableau de bord opérateur</Text>

        {/* STATS DOSSIERS */}
        <Text style={styles.sectionTitle}>Statistiques dossiers</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="document-text" size={20} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>{loading ? '...' : stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#fffbe6' }]}>
              <Ionicons name="time" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.statNumber}>{loading ? '...' : stats.enCours}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#4FCCAE" />
            </View>
            <Text style={styles.statNumber}>{loading ? '...' : stats.retrouves}</Text>
            <Text style={styles.statLabel}>Retrouvés</Text>
          </View>
        </View>

        {/* STAT PERSONNES */}
        <View style={styles.personneStatCard}>
          <View style={styles.personneStatLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="people" size={20} color="#8b5cf6" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.statLabel}>Personnes enregistrées</Text>
              <Text style={styles.statNumberLarge}>
                {loading ? '...' : stats.personnes}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.btnVoirPersonnes}
            onPress={() => navigation.navigate('Personnes')}
          >
            <Text style={styles.btnVoirPersonnesText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {/* ACTIONS RAPIDES */}
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#2563eb' }]}
            onPress={() => navigation.navigate('personne')}
          >
            <MaterialCommunityIcons name="folder-plus" size={28} color="white" />
            <Text style={styles.actionTitleWhite}>Créer un dossier</Text>
            <Text style={styles.actionSubWhite}>Nouveau dossier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Identite')}
          >
            <MaterialCommunityIcons name="account-plus-outline" size={28} color="#8b5cf6" />
            <Text style={styles.actionTitle}>Créer une personne</Text>
            <Text style={styles.actionSub}>Nouveau profil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('PhotosAttente')}
          >
            <Ionicons name="people-outline" size={28} color="#10b981" />
            <Text style={styles.actionTitle}>Photos</Text>
            <Text style={styles.actionSub}>Voir les profils</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SignalementsAttente')}
          >
            <Ionicons name="alert-circle-outline" size={28} color="#f59e0b" />
            <Text style={styles.actionTitle}>Signalements</Text>
            <Text style={styles.actionSub}>En attente</Text>
          </TouchableOpacity>
        </View>

        {/* DERNIER DOSSIER */}
        <Text style={styles.sectionTitle}>Dernière activité</Text>
        {loading ? (
          <View style={styles.recentCard}>
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : dernierDossier ? (
          <TouchableOpacity
            style={styles.recentCard}
            onPress={() => navigation.navigate('DetailsDossier', {
              dossierId:     dernierDossier.numero_dossier,
              dossierIdReal: dernierDossier.id,
              personData:    dernierDossier.personne,
              dataDisparition: {
                dateLabel: dernierDossier.date_disparition
                  ? new Date(dernierDossier.date_disparition).toLocaleDateString('fr-FR')
                  : '',
                ville: dernierDossier.ville_disparition,
              },
            })}
          >
            <View style={styles.recentHeader}>
              <Text style={styles.recentID}>
                {dernierDossier.numero_dossier || 'DOS-NO-REF'}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatutColor(dernierDossier.statut_dossier).bg }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatutColor(dernierDossier.statut_dossier).text }
                ]}>
                  {dernierDossier.statut_dossier?.replace(/_/g, ' ') || 'en cours'}
                </Text>
              </View>
            </View>

            {dernierDossier.personne && (
              <Text style={styles.recentPersonne}>
                👤 {dernierDossier.personne.prenom} {dernierDossier.personne.nom}
              </Text>
            )}

            {dernierDossier.ville_disparition && (
              <Text style={styles.recentDate}>
                📍 {dernierDossier.ville_disparition}
              </Text>
            )}

            <Text style={styles.recentDate}>
              📅 Créé le : {new Date(dernierDossier.created_at).toLocaleDateString('fr-FR')}
            </Text>

            <View style={styles.urgenceRow}>
              <View style={[
                styles.urgenceDot,
                { backgroundColor: getUrgenceColor(dernierDossier.niveau_urgence) }
              ]} />
              <Text style={styles.urgenceText}>
                Urgence : {dernierDossier.niveau_urgence || 'normal'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.recentCard}>
            <Text style={styles.emptyText}>
              Aucun dossier enregistré pour le moment.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// =====================================================
// ✅ PAGE DONS
// =====================================================
const DonsContent = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.donsHeader}>
        <View style={styles.appHeaderLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <Text style={styles.donsHeaderTitle}>RetrouvonsLes</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.donsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.donsHero}>
          <View style={styles.donsHeartCircle}>
            <Ionicons name="heart" size={48} color="#ef4444" />
          </View>
          <Text style={styles.donsHeroTitle}>Soutenez notre mission</Text>
          <Text style={styles.donsHeroSub}>
            Chaque don aide à retrouver des personnes disparues
            et à soutenir leurs familles dans cette épreuve.
          </Text>
        </View>

        {/* IMPACT */}
        <Text style={styles.donsSectionTitle}>Votre impact</Text>
        <View style={styles.donsImpactRow}>
          <View style={styles.donsImpactCard}>
            <Text style={styles.donsImpactEmoji}>👨‍👩‍👧</Text>
            <Text style={styles.donsImpactNumber}>+120</Text>
            <Text style={styles.donsImpactLabel}>Familles aidées</Text>
          </View>
          <View style={styles.donsImpactCard}>
            <Text style={styles.donsImpactEmoji}>🔍</Text>
            <Text style={styles.donsImpactNumber}>+45</Text>
            <Text style={styles.donsImpactLabel}>Personnes retrouvées</Text>
          </View>
          <View style={styles.donsImpactCard}>
            <Text style={styles.donsImpactEmoji}>📱</Text>
            <Text style={styles.donsImpactNumber}>24/7</Text>
            <Text style={styles.donsImpactLabel}>Disponibilité</Text>
          </View>
        </View>

        {/* MONTANTS SUGGÉRÉS */}
        <Text style={styles.donsSectionTitle}>Choisir un montant</Text>
        <View style={styles.donsMontantsGrid}>
          {[500, 1000, 2500, 5000, 10000, 25000].map((montant) => (
            <TouchableOpacity
              key={montant}
              style={styles.donsMontantCard}
              onPress={() => {}}
            >
              <Text style={styles.donsMontantText}>
                {montant.toLocaleString('fr-FR')} FCFA
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MONTANT LIBRE */}
        <Text style={styles.donsLabel}>Ou entrez un montant libre</Text>
        <View style={styles.donsInputRow}>
          <View style={styles.donsInput}>
            <TextInput
              placeholder="Ex: 3000"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              style={styles.donsInputText}
            />
          </View>
          <Text style={styles.donsCurrency}>FCFA</Text>
        </View>

        {/* BOUTON FAIRE UN DON */}
        <TouchableOpacity style={styles.donsBtnPrincipal}>
          <Ionicons name="heart" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.donsBtnPrincipalText}>Faire un don</Text>
        </TouchableOpacity>

        {/* NOTE SECURITE */}
        <View style={styles.donsSecuriteBox}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
          <Text style={styles.donsSecuriteText}>
            Paiement sécurisé — Vos données sont protégées
          </Text>
        </View>

        {/* COMMENT ÇA MARCHE */}
        <Text style={styles.donsSectionTitle}>Comment ça marche ?</Text>
        {[
          { icon: 'card-outline',         title: 'Choisissez un montant',     sub: 'Sélectionnez ou entrez le montant souhaité' },
          { icon: 'phone-portrait-outline',title: 'Payez via Mobile Money',    sub: 'MTN Money, Orange Money ou carte bancaire' },
          { icon: 'checkmark-circle-outline', title: 'Confirmation immédiate', sub: 'Vous recevez un reçu par SMS' },
        ].map((step, i) => (
          <View key={i} style={styles.donsStepCard}>
            <View style={styles.donsStepIconBox}>
              <Ionicons name={step.icon} size={22} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.donsStepTitle}>{step.title}</Text>
              <Text style={styles.donsStepSub}>{step.sub}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
};

// Import TextInput pour la page Dons
import { TextInput } from 'react-native';

// =====================================================
// NAVIGATION PRINCIPALE AVEC ONGLETS
// =====================================================
const homeOperateurSaisie: React.FC<HomeProps> = ({ level }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          // ✅ Icônes pour chaque onglet
          if (route.name === 'Tableau de bord') {
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />;
          }
          if (route.name === 'Dossiers') {
            return <Ionicons name={focused ? 'folder' : 'folder-outline'} size={size} color={color} />;
          }
          if (route.name === 'Personnes') {
            return <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />;
          }
          if (route.name === 'Dons') {
            // ✅ Icône cœur pour l'onglet Dons
            return <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />;
          }
          return <Ionicons name="grid-outline" size={size} color={color} />;
        },
        tabBarActiveTintColor:   '#ef4444', // ✅ Rouge pour le cœur actif
        tabBarInactiveTintColor: 'gray',
        headerShown:             false,
        tabBarStyle:             { height: 65, paddingBottom: 10 },
        // ✅ Couleur active différente selon l'onglet
        tabBarItemStyle:         {},
      })}
    >
      <Tab.Screen
        name="Tableau de bord"
        options={{ tabBarActiveTintColor: '#2563eb' }}
      >
        {(props) => <DashboardContent {...props} level={level} />}
      </Tab.Screen>

      <Tab.Screen
        name="Dossiers"
        component={Dossiers}
        options={{ tabBarActiveTintColor: '#2563eb' }}
      />

      <Tab.Screen
        name="Personnes"
        component={ListePersonnes}
        options={{ tabBarActiveTintColor: '#2563eb' }}
      />

      {/* ✅ ONGLET DONS avec icône cœur rouge */}
      <Tab.Screen
        name="Dons"
        component={DonsContent}
        options={{
          tabBarActiveTintColor: '#ef4444',
          tabBarLabel: 'Dons',
        }}
      />
    </Tab.Navigator>
  );
};

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f8fafc' },
  appHeader:            { backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTextContainer:  { flex: 1, marginLeft: 10 },
  appName:              { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  appSubtitle:          { fontSize: 11, color: '#94a3b8' },
  levelBadge:           { backgroundColor: '#4FCCAE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelBadgeText:       { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  scrollContent:        { padding: 20 },
  mainTitle:            { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  sectionTitle:         { fontSize: 17, fontWeight: '700', color: '#334155', marginTop: 15, marginBottom: 15 },

  // Stats dossiers
  statsRow:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard:             { backgroundColor: '#fff', width: '31%', padding: 12, borderRadius: 12, elevation: 2, alignItems: 'center' },
  iconBox:              { padding: 8, borderRadius: 8, marginBottom: 5 },
  statNumber:           { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  statLabel:            { fontSize: 9, color: '#64748b', textAlign: 'center' },

  // Stat personnes
  personneStatCard:     { backgroundColor: '#FFF', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, marginBottom: 5 },
  personneStatLeft:     { flexDirection: 'row', alignItems: 'center' },
  statNumberLarge:      { fontSize: 22, fontWeight: 'bold', color: '#8b5cf6' },
  btnVoirPersonnes:     { backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnVoirPersonnesText: { color: '#8b5cf6', fontWeight: 'bold', fontSize: 12 },

  // Actions
  grid:                 { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard:           { backgroundColor: '#fff', width: '48%', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3, minHeight: 110, justifyContent: 'center' },
  actionTitle:          { fontSize: 12, fontWeight: 'bold', marginTop: 8, color: '#1e293b' },
  actionTitleWhite:     { fontSize: 12, fontWeight: 'bold', marginTop: 8, color: '#fff' },
  actionSub:            { fontSize: 9, color: '#64748b', marginTop: 4 },
  actionSubWhite:       { fontSize: 9, color: '#dbeafe', marginTop: 4 },

  // Dernier dossier
  recentCard:           { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 1, borderLeftWidth: 5, borderLeftColor: '#f59e0b' },
  recentHeader:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recentID:             { fontWeight: 'bold', color: '#1e293b', fontSize: 13 },
  statusBadge:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  statusText:           { fontSize: 10, fontWeight: 'bold' },
  recentPersonne:       { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 4 },
  recentDate:           { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  urgenceRow:           { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  urgenceDot:           { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  urgenceText:          { fontSize: 11, color: '#64748b' },
  emptyText:            { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  // ✅ STYLES PAGE DONS
  donsHeader:           { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  appHeaderLeft:        { flexDirection: 'row', alignItems: 'center' },
  donsHeaderTitle:      { fontSize: 18, fontWeight: '800', color: '#1e293b', marginLeft: 10 },
  donsScrollContent:    { padding: 16, paddingBottom: 40 },

  // Hero
  donsHero:             { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 28, marginBottom: 24, elevation: 2, borderWidth: 1, borderColor: '#fee2e2' },
  donsHeartCircle:      { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  donsHeroTitle:        { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  donsHeroSub:          { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  // Impact
  donsSectionTitle:     { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 14, marginTop: 8 },
  donsImpactRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  donsImpactCard:       { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center', marginHorizontal: 4, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  donsImpactEmoji:      { fontSize: 22, marginBottom: 6 },
  donsImpactNumber:     { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  donsImpactLabel:      { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 },

  // Montants
  donsMontantsGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  donsMontantCard:      { width: '31%', backgroundColor: '#FFF', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: '#e2e8f0', elevation: 1 },
  donsMontantText:      { fontSize: 12, fontWeight: '700', color: '#1e293b' },

  // Input montant libre
  donsLabel:            { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 8 },
  donsInputRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  donsInput:            { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, height: 48, marginRight: 10 },
  donsInputText:        { fontSize: 16, color: '#1e293b' },
  donsCurrency:         { fontSize: 14, fontWeight: 'bold', color: '#64748b' },

  // Bouton principal
  donsBtnPrincipal:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 16, marginBottom: 16, elevation: 3 },
  donsBtnPrincipalText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Sécurité
  donsSecuriteBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: '#bbf7d0' },
  donsSecuriteText:     { fontSize: 12, color: '#166534', flex: 1 },

  // Étapes
  donsStepCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  donsStepIconBox:      { width: 44, height: 44, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  donsStepTitle:        { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 3 },
  donsStepSub:          { fontSize: 11, color: '#64748b' },
});

export default homeOperateurSaisie;