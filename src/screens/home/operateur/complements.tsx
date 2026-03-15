import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  ScrollView, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Dropdown } from 'react-native-element-dropdown';
import { createPersonne } from '../../../services/personneService';

const Complements = ({ navigation, route }: any) => {
  const [loading, setLoading] = useState(false);
  const allData = route.params?.data || {};

  const [formData, setFormData] = useState({
    typePiece:            'CNI',
    numeroIdentification: '',
    situationFamiliale:   'Famille inconnue',
    nombreEnfants:        '0',
    derniersVetements:    '',
    accessoires:          '',
  });

  // Les labels sont lisibles, les values sont gérées par personneService
  const pieceData = [
    { label: 'CNI',               value: 'CNI' },
    { label: 'Passeport',         value: 'Passeport' },
    { label: 'Acte de naissance', value: 'Acte de naissance' },
    { label: 'Autre',             value: 'Autre' },
  ];

  const familleData = [
    { label: 'Famille inconnue',  value: 'Famille inconnue' },
    { label: 'Célibataire',       value: 'Célibataire' },
    { label: 'Marié(e)',          value: 'Marié(e)' },
    { label: 'Vif/Veuve',         value: 'Vif/Veuve' },
  ];

  const handleFinish = async () => {
    setLoading(true);
    try {
      const finalData = { ...allData, ...formData };
      const personneSauvegardee = await createPersonne(finalData);
      navigation.navigate('DetailPersonne', { data: personneSauvegardee });
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Erreur inconnue');
      console.error('ERREUR:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logoText}>
          Retrouvons <Text style={styles.logoHighlight}>les</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={[styles.progressLabel, { color: '#10b981' }]}>Identité</Text>
          </View>
          <View style={styles.progressLineActive} />
          <View style={styles.progressStep}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={[styles.progressLabel, { color: '#10b981' }]}>Physique</Text>
          </View>
          <View style={styles.progressLineActive} />
          <View style={styles.progressStep}>
            <View style={styles.stepActiveIcon}>
              <Ionicons name="list" size={16} color="#FFF" />
            </View>
            <Text style={[styles.progressLabel, { color: '#8b5cf6' }]}>Compléments</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informations complémentaires</Text>
          <Text style={styles.sectionSubTitle}>
            Documents, situation familiale et derniers effets
          </Text>
          <View style={styles.divider} />

          {/* TYPE PIECE / NUMERO */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Type de pièce d'identité</Text>
              <Dropdown
                style={styles.dropdown}
                data={pieceData}
                labelField="label"
                valueField="value"
                value={formData.typePiece}
                onChange={item => setFormData({ ...formData, typePiece: item.value })}
                selectedTextStyle={styles.selectedTextStyle}
                placeholderStyle={styles.placeholderStyle}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Numéro d'identification</Text>
              <TextInput
                style={styles.input}
                placeholder="N° de la pièce"
                placeholderTextColor="#94a3b8"
                value={formData.numeroIdentification}
                onChangeText={(v) => setFormData({ ...formData, numeroIdentification: v })}
              />
            </View>
          </View>

          {/* SITUATION FAMILIALE / ENFANTS */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Situation familiale</Text>
              <Dropdown
                style={styles.dropdown}
                data={familleData}
                labelField="label"
                valueField="value"
                value={formData.situationFamiliale}
                onChange={item => setFormData({ ...formData, situationFamiliale: item.value })}
                selectedTextStyle={styles.selectedTextStyle}
                placeholderStyle={styles.placeholderStyle}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Nombre d'enfants</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.nombreEnfants}
                placeholderTextColor="#94a3b8"
                onChangeText={(v) => setFormData({ ...formData, nombreEnfants: v })}
              />
            </View>
          </View>

          {/* VÊTEMENTS */}
          <Text style={styles.label}>Derniers vêtements portés</Text>
          <TextInput
            style={styles.textAreaSmall}
            placeholder="Description des vêtements..."
            placeholderTextColor="#94a3b8"
            multiline
            value={formData.derniersVetements}
            onChangeText={(v) => setFormData({ ...formData, derniersVetements: v })}
          />

          {/* ACCESSOIRES */}
          <Text style={[styles.label, { marginTop: 15 }]}>Accessoires</Text>
          <TextInput
            style={styles.textAreaSmall}
            placeholder="Sac, bijoux, téléphone, etc..."
            placeholderTextColor="#94a3b8"
            multiline
            value={formData.accessoires}
            onChangeText={(v) => setFormData({ ...formData, accessoires: v })}
          />

          {/* RÉSUMÉ DE LA FICHE */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Résumé de la fiche</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.summaryLabel}>NOM COMPLET</Text>
                <Text style={styles.summaryValue}>
                  {allData.prenom} {allData.nom || 'N/A'}
                </Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.summaryLabel}>SEXE</Text>
                <Text style={styles.summaryValue}>
                  {allData.sexe || 'Non précisé'}
                </Text>
              </View>
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
              <View style={styles.flex1}>
                <Text style={styles.summaryLabel}>NATIONALITÉ</Text>
                <Text style={styles.summaryValue}>
                  {allData.nationalite || 'Non renseignée'}
                </Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.summaryLabel}>PHOTOS</Text>
                <Text style={styles.summaryValue}>
                  {allData.photo ? '1 photo(s)' : '0 photo(s)'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* BOUTONS NAVIGATION */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.btnBack}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={18} color="#64748b" />
            <Text style={styles.btnTextBack}>Précédent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnFinish, loading && { opacity: 0.7 }]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={18}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.btnTextNext}>Créer la fiche</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  header:             { height: 65, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  logoText:           { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  logoHighlight:      { color: '#ef4444' },
  scrollContent:      { padding: 15 },
  progressContainer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  progressStep:       { alignItems: 'center' },
  progressLabel:      { fontSize: 10, marginTop: 4, fontWeight: '700', color: '#94a3b8' },
  progressLineActive: { width: 40, height: 2, backgroundColor: '#10b981', marginHorizontal: 5, marginTop: -15 },
  stepActiveIcon:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  formCard:           { backgroundColor: '#FFF', borderRadius: 16, padding: 15, elevation: 2 },
  sectionTitle:       { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  sectionSubTitle:    { fontSize: 12, color: '#64748b', marginBottom: 10 },
  divider:            { height: 1, backgroundColor: '#f1f5f9', marginBottom: 15 },
  label:              { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 5 },
  input:              { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', height: 45, backgroundColor: '#fff' },
  dropdown:           { height: 45, borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, backgroundColor: 'white' },
  selectedTextStyle:  { fontSize: 14, color: '#1e293b' },
  placeholderStyle:   { fontSize: 14, color: '#94a3b8' },
  textAreaSmall:      { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, height: 65, textAlignVertical: 'top', backgroundColor: '#fff', color: '#1e293b', fontSize: 14 },
  row:                { flexDirection: 'row', marginBottom: 15 },
  flex1:              { flex: 1 },
  summaryCard:        { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 15, marginTop: 20 },
  summaryTitle:       { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 15 },
  summaryLabel:       { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  summaryValue:       { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  buttonRow:          { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 30 },
  btnBack:            { flexDirection: 'row', padding: 15, width: '40%', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  btnTextBack:        { color: '#64748b', fontWeight: '800', marginLeft: 8 },
  btnFinish:          { backgroundColor: '#10b981', padding: 15, borderRadius: 10, width: '55%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnTextNext:        { color: '#FFF', fontWeight: '800' },
});

export default Complements;