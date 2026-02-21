import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { supabase } from '../services/supabase';
import { launchImageLibrary } from 'react-native-image-picker';

const Signalement = () => {
  const [nom, setNom] = React.useState('');
  const [prenom, setPrenom] = React.useState('');
  const [age, setAge] = React.useState('');
  const [quartier, setQuartier] = React.useState('');
  const [lieu, setLieu] = React.useState('');
  const [heure, setHeure] = React.useState('');
  const [numero, setNumero] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [photoUri, setPhotoUri] = React.useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  // Fonction pour choisir une photo (React Native CLI)
  const pickImage = async () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.7,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          setMessage('Erreur lors de la sélection de la photo.');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setPhotoUri(response.assets[0].uri || null);
        }
      }
    );
  };

  const handleSend = async () => {
    if (!nom || !prenom || !age || !quartier || !lieu || !heure || !numero) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    let uploadedPhotoUrl = null;
    // Upload photo si présente
    if (photoUri) {
      try {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const fileName = `signalement_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from('photos').upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
        });
        if (!error && data) {
          uploadedPhotoUrl = supabase.storage.from('photos').getPublicUrl(fileName).data.publicUrl;
          setPhotoUrl(uploadedPhotoUrl);
        }
      } catch (e) {
        setMessage('Erreur lors de l\'upload de la photo.');
      }
    }
    try {
      const { error } = await supabase.from('signalement').insert([
        {
          nom,
          prenom,
          age: parseInt(age),
          quartier,
          lieu,
          heure,
          numero,
          photo: uploadedPhotoUrl,
          statut: 'en_attente',
        },
      ]);
      setLoading(false);
      if (error) {
        setMessage("Erreur lors de l'envoi du signalement.");
      } else {
        setMessage('Votre signalement a été envoyé et sera validé par les autorités.');
        setNom(''); setPrenom(''); setAge(''); setQuartier(''); setLieu(''); setHeure(''); setNumero(''); setPhotoUri(null); setPhotoUrl(null);
      }
    } catch (e) {
      setLoading(false);
      setMessage("Erreur réseau ou serveur.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Faire un signalement</Text>
      <TextInput style={styles.input} placeholder="Nom de la personne disparue" value={nom} onChangeText={setNom} />
      <TextInput style={styles.input} placeholder="Prénom" value={prenom} onChangeText={setPrenom} />
      <TextInput style={styles.input} placeholder="Âge" keyboardType="numeric" value={age} onChangeText={setAge} />
      <TextInput style={styles.input} placeholder="Quartier de résidence" value={quartier} onChangeText={setQuartier} />
      <TextInput style={styles.input} placeholder="Lieu probable de disparition" value={lieu} onChangeText={setLieu} />
      <TextInput style={styles.input} placeholder="Heure de disparition" value={heure} onChangeText={setHeure} />
      <TextInput style={styles.input} placeholder="Numéro du déclarant" keyboardType="phone-pad" value={numero} onChangeText={setNumero} />
      {/* Ajout de photo */}
      <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
        <Text style={styles.buttonText}>Choisir une photo</Text>
      </TouchableOpacity>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
      ) : null}
      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Envoi...' : 'Envoyer le signalement'}</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.feedback}>{message}</Text> : null}
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
  input: {
     backgroundColor: '#FFF', 
     borderRadius: 8, 
     padding: 12, 
     marginBottom: 15, 
     borderWidth: 1,
    borderColor: '#EEE' 
    },
  button: { 
    backgroundColor: '#4FCCAE',
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 
},
  buttonText: { 
    color: '#FFF', 
    fontWeight: 'bold',
    fontSize: 16 
},
  photoButton: {
    backgroundColor: '#FFD600', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 10 
},
  photoPreview: {
     width: 120, 
     height: 120, 
     borderRadius: 10,
     alignSelf: 'center', 
     marginBottom: 10 
    },
  feedback: { 
    color: '#1976D2',
     marginTop: 15, 
     fontSize: 15,
     textAlign: 'center'
     },
});

export default Signalement;
