import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { supabase } from '../services/supabase';
// Appel Edge Function pour notification FCM
const sendFCMNotification = async (userId: any, title: string, body: string) => {
  try {
    // Récupérer le token d'accès actuel
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    const res = await fetch('https://<YOUR_SUPABASE_PROJECT>.functions.supabase.co/send-fcm-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ userId, title, body }),
    });
    return await res.json();
  } catch (err) {
    console.log('Erreur notification FCM:', err);
  }
};

const DossiersEnCours = ({ isAuthority = false }) => {
  const [dossiers, setDossiers] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [ville, setVille] = useState('');
  const [age, setAge] = useState('');
  const [commentaires, setCommentaires] = useState<Record<number, Commentaire[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchDossiers = async () => {
      let query = supabase.from('signalement').select('*').eq('statut', 'en_attente');
      if (ville) query = query.ilike('lieu', `%${ville}%`);
      if (age) query = query.eq('age', parseInt(age));
      const { data, error } = await query;
      setDossiers(data || []);
      setLoading(false);
      // Charger les commentaires pour chaque dossier
      if (data && data.length > 0) {
        const ids: number[] = data.map((d: Signalement) => d.id);
        const { data: comms } = await supabase.from('commentaire_signalement').select('*').in('signalement_id', ids);
        const grouped: Record<number, Commentaire[]> = {};
        (comms as Commentaire[] | undefined)?.forEach((c: Commentaire) => {
          if (!grouped[c.signalement_id]) grouped[c.signalement_id] = [];
          grouped[c.signalement_id].push(c);
        });
        setCommentaires(grouped);
      }
    };
    fetchDossiers();
  }, [refresh, ville, age]);
  // Ajout d'un commentaire
  const handleAddComment = async (signalementId: number) => {
    const text = commentInputs[signalementId];
    if (!text || text.trim().length < 3) return;
    await supabase.from('commentaire_signalement').insert([
      { signalement_id: signalementId, texte: text }
    ]);
    setCommentInputs(inputs => ({ ...inputs, [signalementId]: '' }));
    setRefresh((r: boolean) => !r);
  };

  interface Signalement {
    id: number;
    nom: string;
    prenom: string;
    age: number;
    quartier: string;
    lieu: string;
    heure: string;
    numero: string;
    photo?: string;
    user_id?: string;
    statut: string;
  }

  interface Commentaire {
    id: number;
    signalement_id: number;
    texte: string;
  }

  const handleValidate = async (id: number) => {
    // 1. Valider le signalement
    await supabase.from('signalement').update({ statut: 'valide' }).eq('id', id);
    setRefresh((r: boolean) => !r);

    // 2. Récupérer l'utilisateur concerné
    const { data: signalement }: { data: { user_id?: string } | null } = await supabase.from('signalement').select('user_id').eq('id', id).single();
    if (signalement?.user_id) {
      // 3. Envoyer la notification via Edge Function
      await sendFCMNotification(
        signalement.user_id,
        'Signalement validé',
        "Votre signalement a été validé par l'autorité. Merci pour votre implication."
      );
    }
  };
    
  const handleReject = async (id: number) => {
    await supabase.from('signalement').update({ statut: 'rejete' }).eq('id', id);
    setRefresh(r => !r);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dossiers de disparitions en cours</Text>
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
        <Text style={styles.dossierText}>Chargement...</Text>
      ) : dossiers.length === 0 ? (
        <View style={styles.dossierBox}>
          <Text style={styles.dossierText}>Pas d'annonce</Text>
        </View>
      ) : (
        dossiers.map((d, idx) => (
          <View style={styles.dossierBox} key={idx}>
            {d.photo ? (
              <Image source={{ uri: d.photo }} style={styles.photo} />
            ) : null}
            <Text style={styles.dossierText}>Nom : {d.nom} {d.prenom}</Text>
            <Text style={styles.dossierText}>Âge : {d.age}</Text>
            <Text style={styles.dossierText}>Quartier : {d.quartier}</Text>
            <Text style={styles.dossierText}>Lieu : {d.lieu}</Text>
            <Text style={styles.dossierText}>Heure : {d.heure}</Text>
            <Text style={styles.dossierText}>Numéro du déclarant : {d.numero}</Text>
            {isAuthority && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.validateBtn} onPress={() => handleValidate(d.id)}>
                  <Text style={styles.actionText}>Valider</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(d.id)}>
                  <Text style={styles.actionText}>Rejeter</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Section commentaires */}
            <View style={styles.commentSection}>
              <Text style={styles.commentTitle}>Commentaires</Text>
              {commentaires[d.id]?.length > 0 ? (
                commentaires[d.id].map((c, i) => (
                  <Text key={i} style={styles.commentText}>- {c.texte}</Text>
                ))
              ) : (
                <Text style={styles.commentText}>Aucun commentaire</Text>
              )}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Ajouter un commentaire..."
                  value={commentInputs[d.id] || ''}
                  onChangeText={text => setCommentInputs(inputs => ({ ...inputs, [d.id]: text }))}
                />
                <TouchableOpacity style={styles.commentBtn} onPress={() => handleAddComment(d.id)}>
                  <Text style={styles.commentBtnText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
commentSection: { 
    marginTop: 15, 
    backgroundColor: '#F0F4F8', 
    borderRadius: 8, 
    padding: 10 
},
 commentTitle: { 
    fontWeight: 'bold', 
    color: '#1976D2',
     marginBottom: 5 
    },
commentText: { 
    fontSize: 13,
     color: '#333', 
     marginBottom: 3 
},
commentInputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8 
},
commentInput: { 
    flex: 1,
     backgroundColor: '#FFF', 
     borderRadius: 8, 
     padding: 8, 
     borderWidth: 1,
      borderColor: '#EEE' 
    },
commentBtn: { 
    backgroundColor: '#4FCCAE',
     paddingVertical: 8, 
     paddingHorizontal: 14,
     borderRadius: 8,
     marginLeft: 8 
},
commentBtnText: { 
    color: '#FFF',
     fontWeight: 'bold' 
},
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
  dossierBox: { 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#EEE'
 },
  dossierText: { 
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
    borderRadius: 8, padding: 8, 
    borderWidth: 1, 
    borderColor: '#EEE', 
    width: '48%' 
},
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 10 
},
  validateBtn: { 
    backgroundColor: '#4FCCAE', 
    padding: 10, 
    borderRadius: 8, 
    marginHorizontal: 5
 },
  rejectBtn: { 
    backgroundColor: '#FF5252', 
    padding: 10, 
    borderRadius: 8, 
    marginHorizontal: 5 
},
  actionText: { 
    color: '#FFF', 
    fontWeight: 'bold' 
},
});

export default DossiersEnCours;
function setRefresh(arg0: (r: any) => boolean) {
    throw new Error('Function not implemented.');
}

