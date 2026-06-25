import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Text, Linking, Alert, AppState } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from './src/services/supabase';

// Services & Context
import { AuthProvider } from './src/context/AuthContext';

// --- IMPORT DES ECRANS ---
import SplashScreen from './src/screens/SplashScreen';
import Onboarding from './src/screens/Onboarding';
import Login from './src/screens/Login';
import SignUp from './src/screens/SignUp';
import Home from './src/screens/Home';
import HomeAdmin from './src/screens/HomeAdmin';
import ProfilUtilisateur from './src/screens/ProfilUtilisateur';

// Écrans citoyen
import Alertes from './src/screens/home/citoyen/Alertes';
import Signalement from './src/screens/home/citoyen/Signalement';
import Dossier from './src/screens/home/citoyen/Dossier';
import CartePage from './src/screens/home/citoyen/Carte';
import MotDePasseOublie from './src/screens/MotDePasseOublie';
import PolitiqueConfidentialite from './src/screens/PolitiqueConfidentialite';
import DonsPage from './src/screens/home/citoyen/Dons';
import VoirDossier from './src/screens/home/citoyen/VoirDossier';
import VoirSignalement from './src/screens/home/citoyen/VoirSignalement';
import SOS from './src/screens/home/citoyen/SOS';
import ConversationsList from './src/screens/home/citoyen/ConversationsList';
import ConversationDetail from './src/screens/home/citoyen/ConversationDetail';
import ContactsUrgence from './src/screens/home/citoyen/ContactsUrgence';
import PreDeclarationList from './src/screens/home/citoyen/PreDeclarationList';
import PreDeclarationDetail from './src/screens/home/citoyen/PreDeclarationDetail';
import NouvellePreDeclaration from './src/screens/home/citoyen/NouvellePreDeclaration';

// Écrans pros
import HomePolice from './src/screens/home/homePolice';
import HomeOperateurSaisie from './src/screens/home/homeOperateurSaisie';
import HomeResponsableONG from './src/screens/home/homeResponsableONG';
import HomeModerateur from './src/screens/home/homeModerateur';
import HomeCitoyenVerifieStandard from './src/screens/home/homeCitoyenVerifierStandard';

// Formulaire
import Identite from './src/screens/home/operateur/identite';
import Physique from './src/screens/home/operateur/physique';
import Complements from './src/screens/home/operateur/complements';

// Gestion personnes
import DetailPersonne from './src/screens/home/operateur/DetailPersonne';
import ListePersonnes from './src/screens/home/operateur/ListePersonnes';
import Personne from './src/screens/home/operateur/personne';
import Disparitions from './src/screens/home/operateur/disparition';
import Contact from './src/screens/home/operateur/contact';
import DetailsDossier from './src/screens/home/operateur/DetailsDossier';
import Dossiers from './src/screens/home/operateur/Dossiers';
import ModifierDossier from './src/screens/home/operateur/ModifierDossier';
import SignalementsAttente from './src/screens/home/operateur/SignalementsAttente';
import PhotosAttente from './src/screens/home/operateur/PhotosAttente';

// Modérateur
import ValidationSignalementsPage from './src/screens/home/moderateur/ValidationSignalementsPage';
import ModerationPhotosPage from './src/screens/home/moderateur/ModerationPhotosPage';
import RapportModerationPage from './src/screens/home/moderateur/RapportModerationPage';
import VerificationIdentitePage from './src/screens/home/moderateur/VerificationIdentitePage';
import NotificationsPage from './src/screens/home/moderateur/NotificationsPage';
import VueCartePage from './src/screens/home/moderateur/VueCartePage';
import MonHistoriquePage from './src/screens/home/moderateur/MonHistoriquePage';
import ResultatsIAPage from './src/screens/home/moderateur/ResultatsIAPage';

// Police
import NouveauDossierPersonne from './src/screens/home/police/NouveauDossierPersonne';
import NouveauDossierDisparition from './src/screens/home/police/NouveauDossierDisparition';
import NouveauDossierVerification from './src/screens/home/police/NouveauDossierVerification';
import DetailDossierPage from './src/screens/home/police/DetailDossierPage';
import DossiersPage from './src/screens/home/police/DossiersPage';
import ModifierDossierPage from './src/screens/home/police/ModifierDossierPage';
import GestionAlertesPage from './src/screens/home/police/GestionAlertesPage';
import CreerAlertePage from './src/screens/home/police/CreerAlertePage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────
// NAVIGATION BASSE CITOYENS
// ─────────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#c6c6cd', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#b45f06',
        tabBarInactiveTintColor: '#76777d',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Accueil',
        }}
      />

      <Tab.Screen
        name="Signalements"
        component={Signalement}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'megaphone' : 'megaphone-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Signalement',
        }}
      />
      <Tab.Screen
        name="ConversationsList"
        component={ConversationsList}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Messagerie',
        }}
      />

      <Tab.Screen
        name="Carte"
        component={CartePage}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Carte',
        }}
      />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION PRINCIPALE
// ─────────────────────────────────────────────────────────────
function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [initialParams, setInitialParams] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);
  const navigationRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  // ─── Envoyer une notification push directement (appel Edge Function) ───
  const sendPushNotification = async (notificationData: any) => {
    try {
      console.log('📨 [PUSH] Envoi de la notification push...');
      const { data, error } = await supabase.functions.invoke('notification-fcm-send', {
        body: {
          type: 'INSERT',
          table: 'notification',
          record: notificationData
        }
      });
      
      if (error) {
        console.error('❌ [PUSH] Erreur invocation Edge Function:', error);
      } else {
        console.log('✅ [PUSH] Notification push envoyée:', data);
      }
      return { data, error };
    } catch (error) {
      console.error('❌ [PUSH] Erreur:', error);
      return { data: null, error };
    }
  };

  // ─── Récupérer le nombre de notifications non lues ───
  const fetchBadgeCount = async () => {
    try {
      console.log('📊 [BADGE] Récupération du badge...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📊 [BADGE] Utilisateur non connecté');
        return;
      }
      
      // ✅ Récupérer les notifications non lues
      const { data: notifications, count, error } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: false })
        .eq('id_utilisateur', user.id)
        .eq('lue', false)
        .order('date_creation', { ascending: false });

      if (!error) {
        console.log('📊 [BADGE] Nombre de notifications non lues:', count);
        setBadgeCount(count || 0);
        
        // ✅ Pour chaque notification non envoyée, déclencher l'envoi
        const notificationsNonEnvoyees = (notifications || []).filter(
          n => n.statut_envoi === 'en_attente' || n.statut_envoi === null
        );
        
        if (notificationsNonEnvoyees.length > 0) {
          console.log(`📨 [PUSH] ${notificationsNonEnvoyees.length} notification(s) à envoyer...`);
          
          for (const notif of notificationsNonEnvoyees) {
            console.log(`📨 [PUSH] Envoi de la notification ${notif.id}...`);
            await sendPushNotification(notif);
            
            // ✅ Mettre à jour le statut de la notification
            await supabase
              .from('notification')
              .update({ statut_envoi: 'envoyee' })
              .eq('id', notif.id);
          }
        }
      } else {
        console.log('📊 [BADGE] Erreur:', error);
      }
    } catch (e) {
      console.warn('📊 [BADGE] Erreur:', e);
    }
  };

  // ─── Extraire les IDs depuis clickPath ou clickUrl ───
  const extractIdsFromClickPath = (clickPath: string): { type: string; id: string | null } => {
    console.log('📌 Extraction depuis clickPath:', clickPath);
    
    let match = clickPath.match(/\/alerts\?.*(?:alerte|focus)=([^&]+)/);
    if (match) {
      return { type: 'alerte', id: match[1] };
    }
    
    match = clickPath.match(/\/(?:citizen\/)?dossier\/([^/?]+)/);
    if (match) {
      return { type: 'dossier', id: match[1] };
    }
    
    match = clickPath.match(/\/pre-declarations\/([^/?]+)/);
    if (match) {
      return { type: 'preDeclaration', id: match[1] };
    }
    
    match = clickPath.match(/\/signalements\/([^/?]+)/);
    if (match) {
      return { type: 'signalement', id: match[1] };
    }
    
    if (clickPath.includes('/sos')) {
      match = clickPath.match(/focus=([^&]+)/);
      if (match) {
        return { type: 'sos', id: match[1] };
      }
      return { type: 'sos', id: null };
    }
    
    match = clickPath.match(/\/conversation\/([^/?]+)/);
    if (match) {
      return { type: 'conversation', id: match[1] };
    }
    
    return { type: 'unknown', id: null };
  };

  // ─── Naviguer vers la page appropriée ───
  const navigateTo = (type: string, id: string | null) => {
    console.log('🚀 Navigation vers:', type, 'ID:', id);
    
    switch (type) {
      case 'alerte':
        setInitialRoute('Alertes');
        setInitialParams({ focus: id });
        break;
      case 'dossier':
        if (id) {
          setInitialRoute('VoirDossier');
          setInitialParams({ id: id });
        } else {
          setInitialRoute('Alertes');
        }
        break;
      case 'preDeclaration':
        if (id) {
          setInitialRoute('PreDeclarationDetail');
          setInitialParams({ id: id });
        } else {
          setInitialRoute('PreDeclarationList');
        }
        break;
      case 'signalement':
        if (id) {
          setInitialRoute('VoirSignalement');
          setInitialParams({ id: id });
        } else {
          setInitialRoute('Alertes');
        }
        break;
      case 'sos':
        setInitialRoute('SOS');
        if (id) {
          setInitialParams({ focus: id });
        }
        break;
      case 'conversation':
        if (id) {
          setInitialRoute('ConversationDetail');
          setInitialParams({
            conversationId: id,
            contexteNom: 'Nouveau message',
            contexteReference: '#' + id.slice(-8),
          });
        } else {
          setInitialRoute('ConversationsList');
        }
        break;
      default:
        setInitialRoute('Alertes');
    }
  };

  // ─── Gérer l'ouverture d'une notification ───
  const handleNotificationOpen = (remoteMessage: any) => {
    console.log('🔔 [NOTIFICATION] Ouverte:', JSON.stringify(remoteMessage, null, 2));
    
    const data = remoteMessage?.data || {};
    
    const clickPath = data?.clickPath;
    if (clickPath) {
      const extracted = extractIdsFromClickPath(clickPath);
      if (extracted && extracted.type !== 'unknown') {
        console.log('📊 ID extrait:', extracted);
        navigateTo(extracted.type, extracted.id);
        return;
      }
    }
    
    const clickUrl = data?.clickUrl;
    if (clickUrl) {
      const extracted = extractIdsFromClickPath(clickUrl);
      if (extracted && extracted.type !== 'unknown') {
        console.log('📊 ID extrait depuis clickUrl:', extracted);
        navigateTo(extracted.type, extracted.id);
        return;
      }
    }
    
    const alerteId = data?.alerte_id || data?.alertId || data?.id_alerte || data?.notification_id;
    const dossierId = data?.dossier_id || data?.dossierId || data?.id_dossier;
    const conversationId = data?.conversation_id || data?.conversationId || data?.id_conversation;
    const sosId = data?.sos_id || data?.sosId || data?.id_sos;
    const preDeclarationId = data?.pre_declaration_id || data?.preDeclarationId;
    const signalementId = data?.signalement_id || data?.signalementId;
    const type = data?.type || data?.notification_type || data?.kind;

    console.log('📊 Données extraites (fallback):', { 
      alerteId, dossierId, conversationId, sosId, preDeclarationId, signalementId, type 
    });

    if (alerteId) {
      navigateTo('alerte', alerteId);
    } else if (dossierId) {
      navigateTo('dossier', dossierId);
    } else if (preDeclarationId) {
      navigateTo('preDeclaration', preDeclarationId);
    } else if (signalementId) {
      navigateTo('signalement', signalementId);
    } else if (conversationId) {
      navigateTo('conversation', conversationId);
    } else if (sosId || type === 'sos') {
      navigateTo('sos', sosId || null);
    } else {
      navigateTo('unknown', null);
    }
  };

  // ─── Afficher une notification dans l'application ───
  const showInAppNotification = (remoteMessage: any) => {
    const title = remoteMessage?.notification?.title || '📢 Nouvelle alerte';
    const body = remoteMessage?.notification?.body || '';
    const data = remoteMessage?.data || {};
    const clickPath = data?.clickPath;

    Alert.alert(
      title,
      body,
      [
        {
          text: 'Voir',
          onPress: () => {
            if (clickPath) {
              const extracted = extractIdsFromClickPath(clickPath);
              if (extracted && extracted.type !== 'unknown') {
                switch (extracted.type) {
                  case 'alerte':
                    navigationRef.current?.navigate('Alertes', { focus: extracted.id });
                    break;
                  case 'dossier':
                    if (extracted.id) {
                      navigationRef.current?.navigate('VoirDossier', { id: extracted.id });
                    } else {
                      navigationRef.current?.navigate('Alertes');
                    }
                    break;
                  case 'preDeclaration':
                    if (extracted.id) {
                      navigationRef.current?.navigate('PreDeclarationDetail', { id: extracted.id });
                    } else {
                      navigationRef.current?.navigate('PreDeclarationList');
                    }
                    break;
                  case 'signalement':
                    if (extracted.id) {
                      navigationRef.current?.navigate('VoirSignalement', { id: extracted.id });
                    } else {
                      navigationRef.current?.navigate('Alertes');
                    }
                    break;
                  case 'sos':
                    navigationRef.current?.navigate('SOS');
                    break;
                  case 'conversation':
                    if (extracted.id) {
                      navigationRef.current?.navigate('ConversationDetail', {
                        conversationId: extracted.id,
                        contexteNom: 'Nouveau message',
                        contexteReference: '#' + extracted.id.slice(-8),
                      });
                    } else {
                      navigationRef.current?.navigate('ConversationsList');
                    }
                    break;
                  default:
                    navigationRef.current?.navigate('Alertes');
                }
              } else {
                navigationRef.current?.navigate('Alertes');
              }
            } else {
              navigationRef.current?.navigate('Alertes');
            }
          },
        },
        { text: 'OK', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // ─── SETUP FCM ───
  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;
    let appStateSubscription: any;

    const setupFCM = async () => {
      try {
        console.log('📱 [FCM] 1. setupFCM appelé');
        const messaging = (await import('@react-native-firebase/messaging')).default;

        // ✅ Demander la permission
        const authStatus = await messaging().requestPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('📱 [FCM] 2. Permission:', enabled ? '✅ AUTORISÉE' : '❌ NON AUTORISÉE');

        if (!enabled) {
          console.log('❌ FCM non autorisé');
          return;
        }

        // ✅ Récupérer le token FCM
        const token = await messaging().getToken();
        console.log('📱 [FCM] 3. Token FCM:', token);

        // ✅ Enregistrer le token dans Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('📱 [FCM] 4. Utilisateur ID:', user.id);
            const { error } = await supabase
              .from('utilisateur_fcm_token')
              .upsert({
                id_utilisateur: user.id,
                token: token,
                platform: 'android',
                device_id: 'mobile',
                updated_at: new Date().toISOString(),
              });
            if (error) {
              console.log('❌ [FCM] Erreur enregistrement token:', error);
            } else {
              console.log('✅ [FCM] Token enregistré dans Supabase');
            }
          } else {
            console.log('⚠️ [FCM] Utilisateur non connecté, token non enregistré');
          }
        } catch (e) {
          console.warn('❌ [FCM] Erreur enregistrement token:', e);
        }

        // ✅ Notifications en arrière-plan (app fermée ou en arrière-plan)
        messaging().onNotificationOpenedApp((remoteMessage) => {
          console.log('🔔 [FCM] Notification ouverte (app en arrière-plan):', remoteMessage);
          handleNotificationOpen(remoteMessage);
        });

        // ✅ Notifications au démarrage (app fermée)
        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage) {
          console.log('🔔 [FCM] Notification initiale:', initialMessage);
          handleNotificationOpen(initialMessage);
        }

        // ✅ Notifications en foreground (app ouverte)
        unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
          console.log('📲 [FCM] 5. Notification foreground RECUE !!!!!');
          console.log('📲 [FCM] Titre:', remoteMessage.notification?.title);
          console.log('📲 [FCM] Corps:', remoteMessage.notification?.body);
          console.log('📲 [FCM] Données:', JSON.stringify(remoteMessage.data, null, 2));

          // ✅ Mettre à jour le badge
          await fetchBadgeCount();

          // ✅ Afficher une alerte dans l'app
          showInAppNotification(remoteMessage);
        });

        // ✅ Charger le badge initial
        await fetchBadgeCount();

        // ✅ Écouter les changements de statut de l'app
        appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
          if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            console.log('📱 [FCM] App est revenue au premier plan');
            fetchBadgeCount();
          }
          appState.current = nextAppState;
        });

        console.log('✅ [FCM] 6. Setup FCM terminé avec succès');

      } catch (err) {
        console.log('❌ [FCM] Erreur:', err);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, []);

  // ─── GESTION DES LIENS PROFONDS ───
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      console.log('🔗 Lien profond reçu:', url);

      if (!url) {
        console.log('⚠️ Aucun URL reçu');
        setIsLoading(false);
        return;
      }

      let match = url.match(/retrouvonsles:\/\/dossier\/(.+)/);
      if (match && match[1]) {
        const dossierId = match[1];
        console.log('📁 Navigation vers dossier (deep link personnalisé):', dossierId);
        setInitialRoute('Alertes');
        setInitialParams({ focus: dossierId });
        setIsLoading(false);
        return;
      }

      match = url.match(/retrouvonsles:\/\/alerte\/(.+)/);
      if (match && match[1]) {
        const alerteId = match[1];
        console.log('📢 Navigation vers alerte (deep link personnalisé):', alerteId);
        setInitialRoute('Alertes');
        setInitialParams({ focus: alerteId });
        setIsLoading(false);
        return;
      }

      match = url.match(/retrouvonsles\.te-sea\.com\/\?dossier=([^&]+)/);
      if (match && match[1]) {
        const dossierId = match[1];
        console.log('📁 Navigation vers dossier (lien unique):', dossierId);
        setInitialRoute('Alertes');
        setInitialParams({ focus: dossierId });
        setIsLoading(false);
        return;
      }

      match = url.match(/retrouvonsles\.te-sea\.com\/dossier\/(.+)/);
      if (match && match[1]) {
        const dossierId = match[1];
        console.log('📁 Navigation vers dossier (lien web /dossier/):', dossierId);
        setInitialRoute('Alertes');
        setInitialParams({ focus: dossierId });
        setIsLoading(false);
        return;
      }

      match = url.match(/retrouvonsles\.vercel\.app\/disparition\/(.+)/);
      if (match && match[1]) {
        const dossierId = match[1];
        console.log('📁 Navigation vers dossier (ancien lien vercel):', dossierId);
        setInitialRoute('Alertes');
        setInitialParams({ focus: dossierId });
        setIsLoading(false);
        return;
      }

      match = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (match && match[1]) {
        const dossierId = match[1];
        console.log('📁 UUID extrait (fallback):', dossierId);
        setInitialRoute('Alertes');
        setInitialParams({ focus: dossierId });
        setIsLoading(false);
        return;
      }

      console.log('📢 Redirection par défaut vers Alertes');
      setInitialRoute('Alertes');
      setIsLoading(false);
    };

    Linking.getInitialURL().then((url) => {
      handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9ff' }}>
        <ActivityIndicator size="large" color="#b45f06" />
        <Text style={{ marginTop: 12, color: '#0b1c30', fontSize: 14 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              initialRouteName={initialRoute || 'Splash'}
              screenOptions={{ headerShown: false }}
            >
              {/* Auth */}
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={Onboarding} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="SignUp" component={SignUp} />

              {/* Citoyen */}
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="homeCitoyenVerifieStandard">
                {(props) => <HomeCitoyenVerifieStandard {...props} level={1} />}
              </Stack.Screen>

              {/* Écrans modaux */}
              <Stack.Screen name="MotDePasseOublie" component={MotDePasseOublie} />
              <Stack.Screen name="PolitiqueConfidentialite" component={PolitiqueConfidentialite} />
              <Stack.Screen name="Dons" component={DonsPage} />
              <Stack.Screen name="VoirDossier" component={VoirDossier} initialParams={initialParams} />
              <Stack.Screen name="Alertes" component={Alertes} initialParams={initialParams} />
              <Stack.Screen name="VoirSignalement" component={VoirSignalement} />

              {/* SOS */}
              <Stack.Screen name="SOS" component={SOS} />
              <Stack.Screen name="ContactsUrgence" component={ContactsUrgence} />

              {/* Messagerie */}
              <Stack.Screen name="ConversationsList" component={ConversationsList} />
              <Stack.Screen name="ConversationDetail" component={ConversationDetail} />

              {/* Pré-déclaration */}
              <Stack.Screen name="PreDeclarationList" component={PreDeclarationList} />
              <Stack.Screen name="PreDeclarationDetail" component={PreDeclarationDetail} />
              <Stack.Screen name="NouvellePreDeclaration" component={NouvellePreDeclaration} />

              {/* Pros */}
              <Stack.Screen name="homeAdmin">{(props) => <HomeAdmin {...props} level={6} />}</Stack.Screen>
              <Stack.Screen name="homePolice">{(props) => <HomePolice {...props} level={4} />}</Stack.Screen>
              <Stack.Screen name="homeOperateurSaisie">{(props) => <HomeOperateurSaisie {...props} level={2} />}</Stack.Screen>
              <Stack.Screen name="homeResponsableONG">{(props) => <HomeResponsableONG {...props} level={5} />}</Stack.Screen>
              <Stack.Screen name="homeModerateur">{(props) => <HomeModerateur {...props} level={3} />}</Stack.Screen>

              {/* Formulaire */}
              <Stack.Screen name="Identite" component={Identite} />
              <Stack.Screen name="Physique" component={Physique} />
              <Stack.Screen name="Complements" component={Complements} />

              {/* Gestion dossiers */}
              <Stack.Screen name="personne" component={Personne} />
              <Stack.Screen name="disparitions" component={Disparitions} />
              <Stack.Screen name="contact" component={Contact} />
              <Stack.Screen name="DetailsDossier" component={DetailsDossier} />
              <Stack.Screen name="Dossiers" component={Dossiers} />
              <Stack.Screen name="ModifierDossier" component={ModifierDossier} />
              <Stack.Screen name="SignalementsAttente" component={SignalementsAttente} />
              <Stack.Screen name="PhotosAttente" component={PhotosAttente} />
              <Stack.Screen name="ListePersonnes" component={ListePersonnes} options={{ headerShown: false }} />
              <Stack.Screen name="DetailPersonne" component={DetailPersonne} options={{ headerShown: false, gestureEnabled: false }} />

              {/* Modérateur */}
              <Stack.Screen name="ValidationSignalementsPage" component={ValidationSignalementsPage} />
              <Stack.Screen name="ModerationPhotosPage" component={ModerationPhotosPage} />
              <Stack.Screen name="RapportModerationPage" component={RapportModerationPage} />
              <Stack.Screen name="VerificationIdentitePage" component={VerificationIdentitePage} />
              <Stack.Screen name="VueCartePage" component={VueCartePage} />
              <Stack.Screen name="NotificationsPage" component={NotificationsPage} />
              <Stack.Screen name="MonHistoriquePage" component={MonHistoriquePage} />
              <Stack.Screen name="ResultatsIAPage" component={ResultatsIAPage} />

              {/* Police */}
              <Stack.Screen name="NouveauDossierPersonne" component={NouveauDossierPersonne} />
              <Stack.Screen name="NouveauDossierDisparition" component={NouveauDossierDisparition} />
              <Stack.Screen name="NouveauDossierVerification" component={NouveauDossierVerification} />
              <Stack.Screen name="DetailDossierPage" component={DetailDossierPage} />
              <Stack.Screen name="DossiersPage" component={DossiersPage} />
              <Stack.Screen name="ModifierDossierPage" component={ModifierDossierPage} />
              <Stack.Screen name="GestionAlertesPage" component={GestionAlertesPage} />
              <Stack.Screen name="CreerAlertePage" component={CreerAlertePage} />

              <Stack.Screen name="ProfilUtilisateur" component={ProfilUtilisateur} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default App;