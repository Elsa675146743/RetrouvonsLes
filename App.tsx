import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';

// Services & Context
import { AuthProvider } from './src/context/AuthContext';
import { supabase } from './src/services/supabase';
import { authService } from './src/services/authService';

// --- IMPORT DES ECRANS ---
import SplashScreen from './src/screens/SplashScreen';
import Onboarding from './src/screens/Onboarding';
import Login from './src/screens/Login';
import SignUp from './src/screens/SignUp';
import Home from './src/screens/Home';
import HomeStandard from './src/screens/HomeStandard';
import HomeAdmin from './src/screens/HomeAdmin';
import ProfilUtilisateur from './src/screens/ProfilUtilisateur';
import Signalement from './src/screens/Signalement';
import Alertes from './src/screens/Alertes';
import DossiersEnCours from './src/screens/DossiersEnCours';
import SOS from './src/screens/SOS';
import CarteDesAlertes from './src/screens/CarteDesAlertes';

// --- IMPORT DES ECRANS PROS ---
import HomePolice from './src/screens/home/homePolice'; 
import HomeOperateurSaisie from './src/screens/home/homeOperateurSaisie';
import HomeResponsableONG from './src/screens/home/homeResponsableONG';
import HomeModerateur from './src/screens/home/homeModerateur';

// --- IMPORT DU FORMULAIRE DE CREATION ---
import Identite from './src/screens/home/operateur/identite';
import Physique from './src/screens/home/operateur/physique';
import Complements from './src/screens/home/operateur/complements';

// --- GESTION DES PERSONNES ET DOSSIERS ---
import DetailPersonne from './src/screens/home/operateur/DetailPersonne';
import ListePersonnes from './src/screens/home/operateur/ListePersonnes';
import Personne from './src/screens/home/operateur/personne'; // <--- NOUVEAU
import Disparitions from './src/screens/home/operateur/disparition'; // <--- NOUVEAU
import Contact from './src/screens/home/operateur/contact'; // <--- NOUVEAU
import DetailsDossier from './src/screens/home/operateur/DetailsDossier';
import Dossiers from './src/screens/home/operateur/Dossiers';
import ModifierDossier from './src/screens/home/operateur/ModifierDossier';
import SignalementsAttente from './src/screens/home/operateur/SignalementsAttente';
import PhotosAttente from './src/screens/home/operateur/PhotosAttente';
import ValidationSignalementsPage from './src/screens/home/moderateur/ValidationSignalementsPage';
import ModerationPhotosPage from './src/screens/home/moderateur/ModerationPhotosPage';
import RapportModerationPage from './src/screens/home/moderateur/RapportModerationPage';
import VerificationIdentitePage from './src/screens/home/moderateur/VerificationIdentitePage';
import NotificationsPage from './src/screens/home/moderateur/NotificationsPage';
import VueCartePage from './src/screens/home/moderateur/VueCartePage';
import MonHistoriquePage from './src/screens/home/moderateur/MonHistoriquePage';
import ResultatsIAPage from './src/screens/home/moderateur/ResultatsIAPage';
import NouveauDossierPersonne from './src/screens/home/police/NouveauDossierPersonne';
import NouveauDossierDisparition from './src/screens/home/police/NouveauDossierDisparition';
import NouveauDossierVerification from './src/screens/home/police/NouveauDossierVerification';
import DetailDossierPage from './src/screens/home/police/DetailDossierPage';
import DossiersPage from './src/screens/home/police/DossiersPage';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- NAVIGATION BASSE (CITOYENS) ---
function MainTabs() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const loadLevel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLevel(0);
        return;
      }
      const { level: userLevel } = await authService.getUserRole(user.id);
      setLevel(userLevel);
    };
    loadLevel();
  }, []);

  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={Home} options={{ tabBarIcon: () => <Text>🏠</Text>, tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Signalement" component={Signalement} options={{ tabBarIcon: () => <Text>📢</Text>, tabBarLabel: 'Signalement' }} />
      <Tab.Screen name="Alertes" component={Alertes} options={{ tabBarIcon: () => <Text>🚨</Text>, tabBarLabel: 'Alertes' }} />
      <Tab.Screen 
        name="DossiersEnCours" 
        options={{ tabBarIcon: () => <Text>🗂️</Text>, tabBarLabel: 'Dossiers' }}
      >
        {(props) => <DossiersEnCours isAuthority={level !== null && level >= 4} {...props} />}
      </Tab.Screen>
      <Tab.Screen name="SOS" component={SOS} options={{ tabBarIcon: () => <Text>🆘</Text>, tabBarLabel: 'SOS' }} />
      <Tab.Screen name="CarteDesAlertes" component={CarteDesAlertes} options={{ tabBarIcon: () => <Text>📜</Text>, tabBarLabel: 'Carte' }} />
    </Tab.Navigator>
  );
}

// --- NAVIGATION PRINCIPALE ---
function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
              
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={Onboarding} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="SignUp" component={SignUp} />

              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="HomeStandard" component={HomeStandard} />

              {/* DASHBOARDS PROS */}
              <Stack.Screen name="homeAdmin">
                {(props) => <HomeAdmin {...props} level={6} />}
              </Stack.Screen>

              <Stack.Screen name="homePolice">
                {(props) => <HomePolice {...props} level={4} />}
              </Stack.Screen>

              <Stack.Screen name="homeOperateurSaisie">
                {(props) => <HomeOperateurSaisie {...props} level={2} />}
              </Stack.Screen>

              <Stack.Screen name="homeResponsableONG">
                {(props) => <HomeResponsableONG {...props} level={5} />}
              </Stack.Screen>

              <Stack.Screen name="homeModerateur">
                {(props) => <HomeModerateur {...props} level={3} />}
              </Stack.Screen>
              
              {/* --- ROUTES DU FORMULAIRE DE CREATION --- */}
              <Stack.Screen name="Identite" component={Identite} />
              <Stack.Screen name="Physique" component={Physique} />
              <Stack.Screen name="Complements" component={Complements} />

              {/* --- ROUTES GESTION DOSSIERS (NOUVELLES) --- */}
              <Stack.Screen name="personne" component={Personne} />
              <Stack.Screen name="disparitions" component={Disparitions} />
              <Stack.Screen name="contact" component={Contact} />
              <Stack.Screen name="DetailsDossier" component={DetailsDossier} />
              <Stack.Screen name="Dossiers" component={Dossiers} />
              <Stack.Screen name="ModifierDossier" component={ModifierDossier} />
              <Stack.Screen name="SignalementsAttente" component={SignalementsAttente} />
               <Stack.Screen name="PhotosAttente" component={PhotosAttente} />


              {/* --- ROUTE DE LA LISTE DES PERSONNES --- */}
              <Stack.Screen 
                name="ListePersonnes" 
                component={ListePersonnes} 
                options={{ headerShown: false }} 
              />

              {/* --- ROUTE DE LA PAGE DE DETAIL FINALE --- */}
              <Stack.Screen 
                name="DetailPersonne" 
                component={DetailPersonne} 
                options={{ 
                  headerShown: false,
                  gestureEnabled: false 
                }} 
              />

              {/* --- ROUTES GESTION DOSSIERS Moderateur (NOUVELLES) --- */}

                 <Stack.Screen name="ValidationSignalementsPage" component={ValidationSignalementsPage} />
                <Stack.Screen name="ModerationPhotosPage" component={ModerationPhotosPage} />
                 <Stack.Screen name="RapportModerationPage" component={RapportModerationPage} />
                <Stack.Screen name="VerificationIdentitePage" component={VerificationIdentitePage} />
                <Stack.Screen name="VueCartePage" component={VueCartePage} />
                <Stack.Screen name="NotificationsPage" component={NotificationsPage} />
                <Stack.Screen name="MonHistoriquePage" component={MonHistoriquePage} />
                <Stack.Screen name="ResultatsIAPage" component={ResultatsIAPage} />



              {/* --- ROUTES GESTION DOSSIERS Police (NOUVELLES) --- */}  

                 <Stack.Screen name="NouveauDossierPersonne" component={NouveauDossierPersonne} />
                <Stack.Screen name="NouveauDossierDisparition" component={NouveauDossierDisparition} />
                <Stack.Screen name="NouveauDossierVerification" component={NouveauDossierVerification} />
                <Stack.Screen name="DetailDossierPage" component={DetailDossierPage} />
                <Stack.Screen name="DossiersPage" component={DossiersPage} />







              <Stack.Screen name="ProfilUtilisateur" component={ProfilUtilisateur} />

            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default App;