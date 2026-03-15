import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createDossier } from '../../../services/dossierService';

const ContactPage = ({ navigation, route }: any) => {
  const { personData, dataDisparition } = route.params || {};
  const [loading, setLoading] = useState(false);

  const summary = {
    personneName: personData ? `${personData.prenom} ${personData.nom}` : 'Non spécifié',
    dateDisparition: dataDisparition?.dateLabel || 'Non spécifiée',
    lieuDisparition: dataDisparition?.lieu || 'Non spécifié',
    photoCount: personData?.photoUri ? 1 : 0,
  };

  const [nomContact, setNomContact]   = useState('');
  const [telephone, setTelephone]     = useState('');
  const [email, setEmail]             = useState('');

  const handleCreateDossier = async () => {
    if (!nomContact || !telephone) {
      Alert.alert('Erreur', 'Veuillez remplir au moins le nom et le téléphone.');
      return;
    }

    // Vérification que la personne a bien un ID Supabase
    if (!personData?.id) {
      Alert.alert(
        'Erreur',
        'Cette personne n\'existe pas encore dans la base de données. ' +
        'Veuillez d\'abord créer sa fiche via le menu Personnes.'
      );
      return;
    }

    setLoading(true);
    try {
      const contactData = { nomContact, telephone, email };

      // Sauvegarde dans Supabase
      const dossierSauvegarde = await createDossier(
        personData.id,           // ID réel de la personne dans Supabase
        dataDisparition,
        contactData,
      );

      console.log('Dossier créé :', dossierSauvegarde);

      // Navigation vers DetailsDossier avec les données réelles
      navigation.navigate('DetailsDossier', {
        dossierId:      dossierSauvegarde.numero_dossier,
        dossierIdReal:  dossierSauvegarde.id,
        personData,
        dataDisparition,
        contactData,
      });

    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de créer le dossier.');
      console.error('ERREUR:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER AVEC STEPPER */}
      <View style={styles.header}>
        <View style={styles.stepperContainer}>
          <View style={styles.step}>
            <View style={[styles.stepCircle, styles.stepDone]}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
            <Text style={styles.stepTextDone}>Personne</Text>
          </View>
          <View style={styles.stepLineActive} />
          <View style={styles.step}>
            <View style={[styles.stepCircle, styles.stepDone]}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
            <Text style={styles.stepTextDone}>Disparition</Text>
          </View>
          <View style={styles.stepLineActive} />
          <View style={styles.step}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="call" size={16} color="#FFF" />
            </View>
            <Text style={styles.stepTextActive}>Contacts</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* FORMULAIRE CONTACT */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="call-outline" size={20} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Informations de contact</Text>
              <Text style={styles.cardSub}>Contacts de la famille ou proches</Text>
            </View>
          </View>

          <Text style={styles.label}>Nom du contact principal</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom complet du contact"
            placeholderTextColor="#94a3b8"
            value={nomContact}
            onChangeText={setNomContact}
          />

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={telephone}
                onChangeText={setTelephone}
              />
            </View>
            <View style={[styles.flexItem, { marginLeft: 10 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@exemple.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>
        </View>

        {/* RÉSUMÉ */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>Résumé du dossier</Text>
          <View style={styles.row}>
            <View style={styles.flexItem}>
              <Text style={styles.summaryLabel}>PERSONNE</Text>
              <Text style={styles.summaryValue}>{summary.personneName}</Text>
            </View>
            <View style={styles.flexItem}>
              <Text style={styles.summaryLabel}>DATE DISPARITION</Text>
              <Text style={styles.summaryValue}>{summary.dateDisparition}</Text>
            </View>
          </View>
          <View style={[styles.row, { marginTop: 15 }]}>
            <View style={styles.flexItem}>
              <Text style={styles.summaryLabel}>LIEU</Text>
              <Text style={styles.summaryValue}>{summary.lieuDisparition}</Text>
            </View>
            <View style={styles.flexItem}>
              <Text style={styles.summaryLabel}>PHOTOS</Text>
              <Text style={styles.summaryValue}>{summary.photoCount} photo(s)</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnAnnuler}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.btnAnnulerText}>Précédent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSubmit, loading && { opacity: 0.7 }]}
          onPress={handleCreateDossier}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnSubmitText}>Créer le dossier</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8fafc' },
  header:           { backgroundColor: '#FFF', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  step:             { alignItems: 'center', width: 80 },
  stepCircle:       { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  stepDone:         { backgroundColor: '#10b981' },
  stepActive:       { backgroundColor: '#2563eb' },
  stepLineActive:   { width: 50, height: 2, backgroundColor: '#10b981', marginBottom: 20 },
  stepTextDone:     { fontSize: 10, color: '#10b981', fontWeight: 'bold' },
  stepTextActive:   { fontSize: 10, color: '#2563eb', fontWeight: 'bold' },
  scrollContent:    { padding: 16 },
  card:             { backgroundColor: '#FFF', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconContainer:    { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle:        { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardSub:          { fontSize: 12, color: '#64748b' },
  label:            { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 10 },
  input:            { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, height: 45, paddingHorizontal: 12, fontSize: 14, color: '#1e293b' },
  row:              { flexDirection: 'row' },
  flexItem:         { flex: 1 },
  summaryCard:      { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryHeader:    { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 15 },
  summaryLabel:     { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', letterSpacing: 0.5 },
  summaryValue:     { fontSize: 14, color: '#1e293b', fontWeight: '600', marginTop: 4 },
  footer:           { flexDirection: 'row', padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0', justifyContent: 'space-between' },
  btnAnnuler:       { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  btnAnnulerText:   { color: '#64748b', fontWeight: '600' },
  btnSubmit:        { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  btnSubmitText:    { color: '#FFF', fontWeight: 'bold' },
});

export default ContactPage;