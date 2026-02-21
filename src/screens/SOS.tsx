import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';

const SOS = () => {
  const [situation, setSituation] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [badSOSCount, setBadSOSCount] = React.useState(0);
  const [disabled, setDisabled] = React.useState(false);

  const handleSendSOS = async () => {
    if (!situation.trim()) {
      setMessage('Veuillez décrire votre situation.');
      return;
    }
    setLoading(true);
    // Simulation d'envoi et de validation (à remplacer par API)
    setTimeout(() => {
      setLoading(false);
      // Simuler une mauvaise utilisation (exemple: texte trop court)
      if (situation.trim().length < 10) {
        const newCount = badSOSCount + 1;
        setBadSOSCount(newCount);
        setMessage('Votre SOS semble incomplet ou abusif.');
        if (newCount >= 2) {
          setDisabled(true);
          setMessage('Vous avez dépassé la limite de mauvais SOS. Fonctionnalité désactivée.');
        }
      } else {
        setMessage('Votre SOS a été transmis aux autorités.');
        setSituation('');
      }
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SOS - Signaler une urgence</Text>
      <Text style={styles.info}>En cas de danger immédiat, remplissez ce formulaire. Les autorités recevront votre signalement directement.</Text>
      <TextInput
        style={styles.input}
        placeholder="Décrivez votre situation"
        multiline
        numberOfLines={4}
        value={situation}
        onChangeText={setSituation}
        editable={!disabled}
      />
      <TouchableOpacity style={[styles.button, disabled && { opacity: 0.5 }]} onPress={handleSendSOS} disabled={loading || disabled}>
        <Text style={styles.buttonText}>{loading ? 'Envoi...' : 'Envoyer SOS'}</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.feedback}>{message}</Text> : null}
      <View style={styles.urgentNumbers}>
        <Text style={styles.urgentTitle}>Numéros d'urgence au Cameroun :</Text>
        <Text style={styles.urgentItem}>Police : 117</Text>
        <Text style={styles.urgentItem}>Gendarmerie : 113</Text>
        <Text style={styles.urgentItem}>Pompiers : 118</Text>
        <Text style={styles.urgentItem}>Samu : 119</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#FF5252' },
  info: { color: '#333', fontSize: 15, marginBottom: 15 },
  input: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE', minHeight: 80 },
  button: { backgroundColor: '#FF5252', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  urgentNumbers: { marginTop: 30 },
  urgentTitle: { fontWeight: 'bold', color: '#333', marginBottom: 8 },
  urgentItem: { color: '#333', fontSize: 15, marginBottom: 3 },
  feedback: { color: '#FF5252', marginTop: 15, fontSize: 15, textAlign: 'center' },
});

export default SOS;
