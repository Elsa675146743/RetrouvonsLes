import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, StatusBar, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { authService } from '../services/authService';

// On simplifie le typage pour éviter le conflit avec le Navigator
const SplashScreen = ({ navigation }: any) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
        }).start();

        const checkAuth = async () => {
            try {
                // 1. Délai minimum pour voir le logo
                await new Promise<void>(resolve => setTimeout(resolve, 2000));

                // 2. Vérifier la session Supabase
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    console.log("Session trouvée, auto-login...");
                    // Récupérer le rôle pour la redirection correcte
                    const { role, level } = await authService.getUserRole(session.user.id);
                    navigation.replace('MainTabs', { role, accessLevel: level });
                    return;
                }

                // 3. Si pas de session, vérifier si Onboarding déjà vu
                const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

                if (hasSeenOnboarding === 'true') {
                    navigation.replace('Login');
                } else {
                    navigation.replace('Onboarding');
                }

            } catch (error) {
                console.error("Erreur Splash:", error);
                // Fallback en cas d'erreur
                navigation.replace('Login');
            }
        };

        checkAuth();
    }, [fadeAnim, navigation]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <Animated.View style={{ opacity: fadeAnim }}>
                <Image
                    style={styles.logo}
                    source={require('../assets/logo.png')}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#37474F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 250,
        height: 250,
        resizeMode: 'contain',
    },
});

export default SplashScreen;