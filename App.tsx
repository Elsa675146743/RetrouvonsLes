import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

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
import HomeAdmin from './src/screens/HomeAdmin';
import ProfilUtilisateur from './src/screens/ProfilUtilisateur';

// ✅ Nouveaux écrans citoyen (remplacent Signalement, Alertes, DossiersEnCours, SOS, CarteDesAlertes)
import Alertes       from './src/screens/home/citoyen/Alertes';
import Signalement       from './src/screens/home/citoyen/Signalement';
import Dossier       from './src/screens/home/citoyen/Dossier';
import CartePage          from './src/screens/home/citoyen/Carte';
import NouveauSignalement from './src/screens/home/citoyen/NouveauSignalement';
import DonsPage           from './src/screens/home/citoyen/Dons';
import VoirDossier     from './src/screens/home/citoyen/VoirDossier';
import VoirSignalement   from './src/screens/home/citoyen/VoirSignalement';



// --- IMPORT DES ECRANS PROS ---
import HomePolice           from './src/screens/home/homePolice';
import HomeOperateurSaisie  from './src/screens/home/homeOperateurSaisie';
import HomeResponsableONG   from './src/screens/home/homeResponsableONG';
import HomeModerateur       from './src/screens/home/homeModerateur';
import HomeCitoyenVerifieStandard from './src/screens/home/homeCitoyenVerifierStandard';


// --- IMPORT DU FORMULAIRE DE CREATION ---
import Identite    from './src/screens/home/operateur/identite';
import Physique    from './src/screens/home/operateur/physique';
import Complements from './src/screens/home/operateur/complements';

// --- GESTION DES PERSONNES ET DOSSIERS ---
import DetailPersonne     from './src/screens/home/operateur/DetailPersonne';
import ListePersonnes     from './src/screens/home/operateur/ListePersonnes';
import Personne           from './src/screens/home/operateur/personne';
import Disparitions       from './src/screens/home/operateur/disparition';
import Contact            from './src/screens/home/operateur/contact';
import DetailsDossier     from './src/screens/home/operateur/DetailsDossier';
import Dossiers           from './src/screens/home/operateur/Dossiers';
import ModifierDossier    from './src/screens/home/operateur/ModifierDossier';
import SignalementsAttente from './src/screens/home/operateur/SignalementsAttente';
import PhotosAttente      from './src/screens/home/operateur/PhotosAttente';

// --- MODERATEUR ---
import ValidationSignalementsPage from './src/screens/home/moderateur/ValidationSignalementsPage';
import ModerationPhotosPage       from './src/screens/home/moderateur/ModerationPhotosPage';
import RapportModerationPage      from './src/screens/home/moderateur/RapportModerationPage';
import VerificationIdentitePage   from './src/screens/home/moderateur/VerificationIdentitePage';
import NotificationsPage          from './src/screens/home/moderateur/NotificationsPage';
import VueCartePage               from './src/screens/home/moderateur/VueCartePage';
import MonHistoriquePage          from './src/screens/home/moderateur/MonHistoriquePage';
import ResultatsIAPage            from './src/screens/home/moderateur/ResultatsIAPage';

// --- POLICE ---
import NouveauDossierPersonne     from './src/screens/home/police/NouveauDossierPersonne';
import NouveauDossierDisparition  from './src/screens/home/police/NouveauDossierDisparition';
import NouveauDossierVerification from './src/screens/home/police/NouveauDossierVerification';
import DetailDossierPage          from './src/screens/home/police/DetailDossierPage';
import DossiersPage               from './src/screens/home/police/DossiersPage';
import ModifierDossierPage        from './src/screens/home/police/ModifierDossierPage';
import GestionAlertesPage         from './src/screens/home/police/GestionAlertesPage';
import CreerAlertePage            from './src/screens/home/police/CreerAlertePage';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────
// MENU PLUS (modal bottom sheet)
// ─────────────────────────────────────────────────────────────
function MenuPlus({ visible, onClose, navigation }: any) {
  const items = [
    { icon: '➕', label: 'Nouveau signalement', screen: 'NouveauSignalement', color: '#1d4ed8' },
    { icon: '❤️', label: 'Dons & Campagnes',    screen: 'Dons',               color: '#ef4444' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={menuStyles.container}>
          <View style={menuStyles.handle} />
          <Text style={menuStyles.title}>Actions</Text>
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
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              </View>
              <Text style={menuStyles.itemLabel}>{item.label}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 18 }}>›</Text>
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
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:     { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:        { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:         { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  item:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemIconBox:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemLabel:     { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  btnFermer:     { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnFermerText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
});

const plusStyles = StyleSheet.create({
  wrapper: { top: -20, justifyContent: 'center', alignItems: 'center', width: 60 },
  btn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  btnText: { fontSize: 30, color: '#fff', lineHeight: 34 },
});

// ─────────────────────────────────────────────────────────────
// NAVIGATION BASSE CITOYENS
// ─────────────────────────────────────────────────────────────
function MainTabs({ navigation }: any) {
  const [level, setLevel]             = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const loadLevel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLevel(0); return; }
      const { level: userLevel } = await authService.getUserRole(user.id);
      setLevel(userLevel);
    };
    loadLevel();
  }, []);

  return (
    <>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        {/* Accueil */}
        <Tab.Screen
          name="Home"
          component={Home}
          options={{ tabBarIcon: () => <Text>🏠</Text>, tabBarLabel: 'Accueil' }}
        />

        {/* Signalements */}
        <Tab.Screen
          name="Signalements"
          component={Signalement}
          options={{ tabBarIcon: () => <Text>📢</Text>, tabBarLabel: 'Signalement' }}
        />

        {/* Bouton + central */}
        <Tab.Screen
          name="PlusTab"
          component={Home}
          options={{
            tabBarLabel: '',
            tabBarButton: () => (
              <View style={plusStyles.wrapper}>
                <TouchableOpacity
                  style={plusStyles.btn}
                  onPress={() => setMenuVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={plusStyles.btnText}>+</Text>
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        {/* Alertes */}
       <Tab.Screen
          name="DossiersEnCours"
          component={Dossier}
          options={{ tabBarIcon: () => <Text>🗂️</Text>, tabBarLabel: 'Dossiers' }}
        />
        {/* Carte */}
        <Tab.Screen
          name="Carte"
          component={CartePage}
          options={{ tabBarIcon: () => <Text>🗺️</Text>, tabBarLabel: 'Carte' }}
        />
      </Tab.Navigator>

      {/* Modal menu + */}
      <MenuPlus
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </>
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
              <Stack.Screen name="Splash"     component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={Onboarding}   />
              <Stack.Screen name="Login"      component={Login}         />
              <Stack.Screen name="SignUp"     component={SignUp}        />

              {/* Citoyen */}
              <Stack.Screen name="MainTabs"     component={MainTabs}     />
              
                 {/* Citoyen vérifié */}
              <Stack.Screen name="homeCitoyenVerifieStandard">
                {(props) => <HomeCitoyenVerifieStandard {...props} level={1} />}
              </Stack.Screen>
              

              {/* Écrans modaux citoyen (accessibles depuis le menu +) */}
              <Stack.Screen name="NouveauSignalement" component={NouveauSignalement} />
              <Stack.Screen name="Dons"               component={DonsPage}           />
              <Stack.Screen name="VoirDossier"     component={VoirDossier}     />
             <Stack.Screen name="Alertes"     component={Alertes}     />
            <Stack.Screen name="VoirSignalement"  component={VoirSignalement}  />



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

              {/* FORMULAIRE DE CREATION */}
              <Stack.Screen name="Identite"    component={Identite}    />
              <Stack.Screen name="Physique"    component={Physique}    />
              <Stack.Screen name="Complements" component={Complements} />

              {/* GESTION DOSSIERS */}
              <Stack.Screen name="personne"            component={Personne}            />
              <Stack.Screen name="disparitions"        component={Disparitions}        />
              <Stack.Screen name="contact"             component={Contact}             />
              <Stack.Screen name="DetailsDossier"      component={DetailsDossier}      />
              <Stack.Screen name="Dossiers"            component={Dossiers}            />
              <Stack.Screen name="ModifierDossier"     component={ModifierDossier}     />
              <Stack.Screen name="SignalementsAttente" component={SignalementsAttente} />
              <Stack.Screen name="PhotosAttente"       component={PhotosAttente}       />
              <Stack.Screen name="ListePersonnes"      component={ListePersonnes}      options={{ headerShown: false }} />
              <Stack.Screen name="DetailPersonne"      component={DetailPersonne}      options={{ headerShown: false, gestureEnabled: false }} />

              {/* MODERATEUR */}
              <Stack.Screen name="ValidationSignalementsPage" component={ValidationSignalementsPage} />
              <Stack.Screen name="ModerationPhotosPage"       component={ModerationPhotosPage}       />
              <Stack.Screen name="RapportModerationPage"      component={RapportModerationPage}      />
              <Stack.Screen name="VerificationIdentitePage"   component={VerificationIdentitePage}   />
              <Stack.Screen name="VueCartePage"               component={VueCartePage}               />
              <Stack.Screen name="NotificationsPage"          component={NotificationsPage}          />
              <Stack.Screen name="MonHistoriquePage"          component={MonHistoriquePage}          />
              <Stack.Screen name="ResultatsIAPage"            component={ResultatsIAPage}            />

              {/* POLICE */}
              <Stack.Screen name="NouveauDossierPersonne"     component={NouveauDossierPersonne}     />
              <Stack.Screen name="NouveauDossierDisparition"  component={NouveauDossierDisparition}  />
              <Stack.Screen name="NouveauDossierVerification" component={NouveauDossierVerification} />
              <Stack.Screen name="DetailDossierPage"          component={DetailDossierPage}          />
              <Stack.Screen name="DossiersPage"               component={DossiersPage}               />
              <Stack.Screen name="ModifierDossierPage"        component={ModifierDossierPage}        />
              <Stack.Screen name="GestionAlertesPage"         component={GestionAlertesPage}         />
              <Stack.Screen name="CreerAlertePage"            component={CreerAlertePage}            />

              <Stack.Screen name="ProfilUtilisateur" component={ProfilUtilisateur} />

            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default App;