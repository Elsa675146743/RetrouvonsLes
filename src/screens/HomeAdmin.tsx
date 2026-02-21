import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

const HomeAdmin = ({ navigation, route }: any) => {
    const [userProfile, setUserProfile] = useState<any>(null);
    const { role, accessLevel } = route.params || {};

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
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
            {/* Header Pro */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.roleBadge}>{role || 'PROFESSIONNEL'}</Text>
                    <Text style={styles.userName}>{userProfile?.email}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Stats Dashboard */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>12</Text>
                        <Text style={styles.statLabel}>À Valider</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>5</Text>
                        <Text style={styles.statLabel}>Urgent</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>28</Text>
                        <Text style={styles.statLabel}>Résolus</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Outils d'administration</Text>

                <View style={styles.listContainer}>
                    <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert("Admin", "Validation des signalements")}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                            <Icon name="file-check" size={24} color="#F57C00" />
                        </View>
                        <View style={styles.itemText}>
                            <Text style={styles.itemTitle}>Validation Signalements</Text>
                            <Text style={styles.itemSubtitle}>12 nouveaux signalements en attente</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert("Admin", "Gestion des dossiers")}>
                        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                            <Icon name="folder-edit" size={24} color="#1976D2" />
                        </View>
                        <View style={styles.itemText}>
                            <Text style={styles.itemTitle}>Gestion des Dossiers</Text>
                            <Text style={styles.itemSubtitle}>Créer, modifier ou clôturer</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert("Admin", "Diffusion d'alerte")}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
                            <Icon name="broadcast" size={24} color="#D32F2F" />
                        </View>
                        <View style={styles.itemText}>
                            <Text style={styles.itemTitle}>Diffuser une Alerte</Text>
                            <Text style={styles.itemSubtitle}>Notifier les citoyens par zone</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert("Admin", "Utilisateurs")}>
                        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                            <Icon name="account-group" size={24} color="#388E3C" />
                        </View>
                        <View style={styles.itemText}>
                            <Text style={styles.itemTitle}>Utilisateurs & Rôles</Text>
                            <Text style={styles.itemSubtitle}>Gérer les permissions</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#CCC" />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: {
        backgroundColor: '#1E293B', // Dark blue for admin feel
        padding: 25,
        paddingTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roleBadge: {
        color: '#4FCCAE',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 5
    },
    userName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    scrollContent: { padding: 20 },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        marginTop: -10,
    },
    statCard: {
        backgroundColor: '#FFF',
        width: '31%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 2,
    },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 15, marginLeft: 5 },
    listContainer: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 1 },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    iconBox: {
        width: 45,
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemText: { flex: 1 },
    itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    itemSubtitle: { fontSize: 13, color: '#94A3B8' },
});

export default HomeAdmin;
