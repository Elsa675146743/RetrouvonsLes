import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button } from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

const HomeStandard = ({ navigation, route }: any) => {
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        // Charger les infos de l'utilisateur
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Ici on pourrait charger plus de détails depuis la table 'utilisateur'
                setUserProfile({ email: user.email, id: user.id });
            }
        };
        loadProfile();
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
            navigation.replace('Login');
        } catch (error) {
            Alert.alert("Erreur", "Déconnexion impossible");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Bonjour,</Text>
                    <Text style={styles.userName}>{userProfile?.email || 'Citoyen'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Icon name="logout" size={24} color="#FF4B4B" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Banner Alertes */}
                <View style={styles.alertBanner}>
                    <Icon name="alert-circle" size={30} color="#FFF" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>3 Alertes en cours</Text>
                        <Text style={styles.alertDesc}>Dans votre zone (Yaoundé)</Text>
                    </View>
                </View>

                {/* Actions Rapides */}
                <Text style={styles.sectionTitle}>Que souhaitez-vous faire ?</Text>

                <View style={styles.grid}>
                    <TouchableOpacity style={styles.card} onPress={() => Alert.alert("Bientôt", "Formulaire de signalement")}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                            <Icon name="eye-plus" size={32} color="#1E88E5" />
                        </View>
                        <Text style={styles.cardTitle}>Signaler une disparition</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => Alert.alert("Bientôt", "Liste des avis")}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                            <Icon name="format-list-bulleted" size={32} color="#43A047" />
                        </View>
                        <Text style={styles.cardTitle}>Consulter les avis</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => Alert.alert("Bientôt", "Carte interactive")}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                            <Icon name="map-marker-radius" size={32} color="#FB8C00" />
                        </View>
                        <Text style={styles.cardTitle}>Carte des alertes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => Alert.alert("Bientôt", "Mes signalements")}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                            <Icon name="folder-account" size={32} color="#8E24AA" />
                        </View>
                        <Text style={styles.cardTitle}>Mon Activité</Text>
                    </TouchableOpacity>
                </View>

                {/* Dernières actualités */}
                <Text style={styles.sectionTitle}>Actualités & Conseils</Text>
                <View style={styles.newsCard}>
                    <Text style={styles.newsTitle}>Comment réagir en cas de disparition ?</Text>
                    <Text style={styles.newsText}>Les 24 premières heures sont cruciales. Voici les étapes à suivre...</Text>
                    <Button title="Lire le guide" variant="outline" style={{ marginTop: 10, height: 40, padding: 0 }} />
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFF',
        elevation: 2,
    },
    welcomeText: { fontSize: 14, color: '#666' },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    logoutButton: { padding: 5 },
    scrollContent: { padding: 20 },
    alertBanner: {
        backgroundColor: '#FF4B4B',
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        elevation: 3,
    },
    alertTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    alertDesc: { color: '#FFF', fontSize: 13 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 1,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: { textAlign: 'center', fontWeight: 'bold', color: '#555' },
    newsCard: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
    },
    newsTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5, color: '#333' },
    newsText: { color: '#666', fontSize: 14, marginBottom: 10 },
});

export default HomeStandard; 