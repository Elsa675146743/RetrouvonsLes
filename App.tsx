import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Services & Context
import { AuthProvider } from './src/context/AuthContext'; // ✅ CORRIGÉ

// --- IMPORT DES ECRANS ---
import SplashScreen from './src/screens/SplashScreen';
import Onboarding from './src/screens/Onboarding';
import Login from './src/screens/Login';
import SignUp from './src/screens/SignUp';
import Home from './src/screens/Home';
import HomeAdmin from './src/screens/HomeAdmin';
import ProfilUtilisateur from './src/screens/ProfilUtilisateur';
import ProfilDisparition from './src/screens/home/citoyen/ProfilDisparition';

// Écrans citoyen
import Alertes from './src/screens/home/citoyen/Alertes';
import Signalement from './src/screens/home/citoyen/Signalement';
import Dossier from './src/screens/home/citoyen/Dossier';
import CartePage from './src/screens/home/citoyen/Carte';
import NouveauSignalement from './src/screens/home/citoyen/NouveauSignalement';
import DonsPage from './src/screens/home/citoyen/Dons';
import VoirDossier from './src/screens/home/citoyen/VoirDossier';
import VoirSignalement from './src/screens/home/citoyen/VoirSignalement';

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
// NAVIGATION BASSE CITOYENS (4 onglets, SANS bouton +)
// ─────────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#c6c6cd', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#b45f06', // ORANGE SOMBRE
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
        name="DossiersEnCours"
        component={Dossier}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'folder' : 'folder-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Dossiers',
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
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
              <Stack.Screen name="NouveauSignalement" component={NouveauSignalement} />
              <Stack.Screen name="Dons" component={DonsPage} />
              <Stack.Screen name="VoirDossier" component={VoirDossier} />
              <Stack.Screen name="Alertes" component={Alertes} />
              <Stack.Screen name="VoirSignalement" component={VoirSignalement} />
              <Stack.Screen name="ProfilDisparition" component={ProfilDisparition} />

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