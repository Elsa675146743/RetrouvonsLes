import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput } from 'react-native';
import { supabase } from '../services/supabase';

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

const Alertes = () => {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [ville, setVille] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    const fetchAlertes = async () => {
      let query = supabase.from('signalement').select('*').eq('statut', 'en_attente');
      if (ville) query = query.ilike('lieu', `%${ville}%`);
      if (age) query = query.eq('age', parseInt(age));
      const { data, error } = await query;
      setAlertes(data || []);
      setLoading(false);
    };
    fetchAlertes();
  }, [ville, age]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Alertes en cours</Text>
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filtrer par ville"
          value={ville}
          onChangeText={setVille}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Âge"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
      </View>
      {loading ? (
        <Text style={styles.alerteText}>Chargement...</Text>
      ) : alertes.length === 0 ? (
        <View style={styles.alerteBox}>
          <Text style={styles.alerteText}>Pas d'annonce</Text>
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
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA', 
    padding: 20 
},
  title: {
     fontSize: 20, 
     fontWeight: 'bold', 
     marginBottom: 20, 
     color: '#4FCCAE'
 },
  alerteBox: { 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#EEE' 
},
  alerteText: { 
    color: '#333', 
    fontSize: 15 
},
  photo: { 
    width: 100,
    height: 100, 
    borderRadius: 10,
    alignSelf: 'center', 
    marginBottom: 8 
},
  filterRow: {
     flexDirection: 'row', 
     marginBottom: 15, 
     justifyContent: 'space-between' 
    },
  filterInput: { 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#EEE',
     width: '48%'
     },
});

export default Alertes;
