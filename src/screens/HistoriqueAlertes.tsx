// ...existing code...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4FCCAE',
  },
  alerteBox: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  alerteText: {
    color: '#333',
    fontSize: 15,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 8,
  },
});
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Permission } from '../types/auth';
import { ROLE_PERMISSIONS } from '../constants/roles';

type Alerte = {
  id: number;
  nom: string;
  prenom: string;
  age: number;
  quartier: string;
  lieu: string;
  heure: string;
  numero: string;
  photo?: string;
};

const HistoriqueAlertes = () => {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: userLoading } = useAuth();

  useEffect(() => {
    const fetchAlertes = async () => {
      const { data, error } = await supabase
        .from('signalement')
        .select('*')
        .eq('statut', 'valide');
      setAlertes(data || []);
      setLoading(false);
    };
    fetchAlertes();
  }, []);

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission);
  };

  if (userLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.alerteText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Signalements validés</Text>
      {user && hasPermission(Permission.VIEW_PUBLIC_CASES) ? (
        loading ? (
          <Text style={styles.alerteText}>Chargement...</Text>
        ) : alertes.length === 0 ? (
              <View style={styles.alerteBox}>
                <Text style={styles.alerteText}>Pas d'annonce validée</Text>
              </View>
            ) : (
              alertes.map((a, idx) => (
                <View style={styles.alerteBox} key={idx}>
                  {a.photo ? (
                    <Image source={{ uri: a.photo }} style={styles.photo} />
                  ) : null}
                  <Text style={styles.alerteText}>Nom : {a.nom} {a.prenom}</Text>
                  <Text style={styles.alerteText}>Âge : {a.age}</Text>
                  <Text style={styles.alerteText}>Quartier : {a.quartier}</Text>
                  <Text style={styles.alerteText}>Lieu : {a.lieu}</Text>
                  <Text style={styles.alerteText}>Heure : {a.heure}</Text>
                  <Text style={styles.alerteText}>Numéro du déclarant : {a.numero}</Text>
                </View>
              ))
            )
          ) : (
            <View style={styles.alerteBox}>
              <Text style={styles.alerteText}>Vous n'avez pas la permission de voir les alertes.</Text>
            </View>
          )}
        </ScrollView>
      );
    };

export default HistoriqueAlertes;
