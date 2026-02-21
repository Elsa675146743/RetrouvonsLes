import CarteDesAlertes from './src/screens/CarteDesAlertes';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView, Text } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';

// --- IMPORT DU SPLASHSCREEN ---
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


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


import { useEffect, useState } from 'react';
import { supabase } from './src/services/supabase';
import { authService } from './src/services/authService';

function MainTabs() {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    const loadLevel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLevel(0);
        return;
      }
      const { level } = await authService.getUserRole(user.id);
      setLevel(level);
    };
    loadLevel();
  }, []);

  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={Home} options={{ tabBarIcon: () => <Text>🏠</Text>, tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Signalement" component={Signalement} options={{ tabBarIcon: () => <Text>📢</Text>, tabBarLabel: 'Signalement' }} />
      <Tab.Screen name="Alertes" component={Alertes} options={{ tabBarIcon: () => <Text>🚨</Text>, tabBarLabel: 'Alertes' }} />
      <Tab.Screen name="DossiersEnCours" component={(props: React.JSX.IntrinsicAttributes & { isAuthority?: boolean | undefined; }) => <DossiersEnCours isAuthority={level === 4 || level === 5 || level === 6 || level === 7} {...props} />} options={{ tabBarIcon: () => <Text>🗂️</Text>, tabBarLabel: 'Dossiers' }} />
      <Tab.Screen name="SOS" component={SOS} options={{ tabBarIcon: () => <Text>🆘</Text>, tabBarLabel: 'SOS' }} />
      <Tab.Screen name="CarteDesAlertes" component={CarteDesAlertes} options={{ tabBarIcon: () => <Text>📜</Text>, tabBarLabel: 'Carte des Alertes' }} />
    </Tab.Navigator>
  );
}

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
              <Stack.Screen name="HomeAdmin" component={HomeAdmin} />
              <Stack.Screen name="ProfilUtilisateur" component={ProfilUtilisateur} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default App;