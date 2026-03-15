import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Dropdown } from 'react-native-element-dropdown';

const Physique = ({ navigation, route }: any) => {
  const prevData = route.params?.data || {};
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    taille: '',
    poids: '',
    corpulence: 'Moyenne',
    peau: 'Foncée',
    cheveuxCouleur: '',
    cheveuxType: 'Autre',
    yeux: '',
    groupeSanguin: 'Non connu',
    signesDistinctifs: '',
    handicaps: '',
  });

  // --- DONNÉES POUR LES DROPDOWNS ---
  const corpulenceData = [
    { label: 'Mince', value: 'Mince' },
    { label: 'Moyenne', value: 'Moyenne' },
    { label: 'Forte', value: 'Forte' },
    { label: 'Athlétique', value: 'Athlétique' },
    { label: 'Inconnue', value: 'Inconnue' },
  ];

  const peauData = [
    { label: 'Foncée', value: 'Foncée' },
    { label: 'Claire', value: 'Claire' },
    { label: 'Métisse', value: 'Métisse' },
  ];

  const cheveuxTypeData = [
    { label: 'Lisses', value: 'Lisses' },
    { label: 'Crépus', value: 'Crépus' },
    { label: 'Bouclés', value: 'Bouclés' },
    { label: 'Autre', value: 'Autre' },
  ];

  const sangData = [
    { label: 'Inconnu', value: 'Non connu' },
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'O+', value: 'O+' },
    { label: 'AB+', value: 'AB+' },
  ];

  const handleNext = () => {
    setSubmitted(true);
    if (formData.description.trim() !== '') {
      navigation.navigate('Complements', { data: { ...prevData, ...formData } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Utilisation de KeyboardAvoidingView pour que le clavier ne cache pas les champs du bas */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Retrouvons <Text style={styles.logoHighlight}>les</Text></Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          
          {/* PROGRESS BAR */}
          <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={[styles.progressLabel, {color: '#10b981'}]}>Identité</Text>
              </View>
              <View style={styles.progressLineActive} />
              <View style={styles.progressStep}>
                  <View style={styles.stepActiveIcon}>
                      <Ionicons name="body" size={16} color="#FFF" />
                  </View>
                  <Text style={[styles.progressLabel, {color: '#8b5cf6'}]}>Physique</Text>
              </View>
              <View style={styles.progressLine} />
              <View style={styles.progressStep}>
                  <View style={styles.stepInactiveIcon}>
                      <Text style={{color: '#94a3b8', fontSize: 12}}>3</Text>
                  </View>
                  <Text style={styles.progressLabel}>Compléments</Text>
              </View>
          </View>

          <View style={styles.formCard}>
            {/* DESCRIPTION */}
            <Text style={styles.label}>Description physique *</Text>
            <TextInput 
              style={[styles.textArea, submitted && !formData.description && styles.inputError]} 
              placeholder="Décrivez l'apparence générale..." 
              placeholderTextColor="#94a3b8"
              multiline 
              value={formData.description}
              onChangeText={(v) => setFormData({...formData, description: v})}
            />
            {submitted && !formData.description && <Text style={styles.errorText}>Information obligatoire</Text>}

            {/* TAILLE / POIDS / CORPULENCE */}
            <View style={[styles.row, {marginTop: 20}]}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Taille (cm)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="170" 
                  keyboardType="numeric" 
                  value={formData.taille}
                  onChangeText={(v) => setFormData({...formData, taille: v})} 
                />
              </View>
              <View style={{width: 8}} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Poids (kg)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="65" 
                  keyboardType="numeric" 
                  value={formData.poids}
                  onChangeText={(v) => setFormData({...formData, poids: v})} 
                />
              </View>
              <View style={{width: 8}} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Corpulence</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={corpulenceData}
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  value={formData.corpulence}
                  onChange={item => setFormData({...formData, corpulence: item.value})}
                />
              </View>
            </View>

            {/* PEAU / CHEVEUX */}
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Peau</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={peauData}
                  labelField="label"
                  valueField="value"
                  value={formData.peau}
                  onChange={item => setFormData({...formData, peau: item.value})}
                  selectedTextStyle={styles.selectedTextStyle}
                />
              </View>
              <View style={{width: 8}} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Cheveux</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Noir" 
                  value={formData.cheveuxCouleur}
                  onChangeText={(v) => setFormData({...formData, cheveuxCouleur: v})} 
                />
              </View>
              <View style={{width: 8}} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Type</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={cheveuxTypeData}
                  labelField="label"
                  valueField="value"
                  value={formData.cheveuxType}
                  onChange={item => setFormData({...formData, cheveuxType: item.value})}
                  selectedTextStyle={styles.selectedTextStyle}
                />
              </View>
            </View>

            {/* YEUX / SANG */}
            <View style={styles.row}>
              <View style={styles.flex2}>
                <Text style={styles.label}>Couleur yeux</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Marron" 
                  value={formData.yeux}
                  onChangeText={(v) => setFormData({...formData, yeux: v})} 
                />
              </View>
              <View style={{width: 15}} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Sang</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={sangData}
                  labelField="label"
                  valueField="value"
                  value={formData.groupeSanguin}
                  onChange={item => setFormData({...formData, groupeSanguin: item.value})}
                  selectedTextStyle={styles.selectedTextStyle}
                />
              </View>
            </View>

            {/* SIGNES ET HANDICAPS (CORRIGÉS ICI) */}
            <Text style={[styles.label, {marginTop: 10}]}>Signes distinctifs</Text>
            <TextInput 
              style={styles.textAreaSmall} 
              placeholder="Cicatrices, tatouages, grains de beauté..." 
              multiline 
              value={formData.signesDistinctifs} // Liaison avec l'état
              onChangeText={(v) => setFormData({...formData, signesDistinctifs: v})} 
            />

            <Text style={[styles.label, {marginTop: 15}]}>Handicaps / Maladies</Text>
            <TextInput 
              style={styles.textAreaSmall} 
              placeholder="Maladies chroniques, béquilles, lunettes..." 
              multiline 
              value={formData.handicaps} // Liaison avec l'état
              onChangeText={(v) => setFormData({...formData, handicaps: v})} 
            />
          </View>

          {/* BOUTONS NAVIGATION */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
              <Text style={styles.btnTextBack}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnNext} onPress={handleNext}>
              <Text style={styles.btnTextNext}>Suivant</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { height: 65, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4, zIndex: 10 },
  logoText: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  logoHighlight: { color: '#ef4444' },
  scrollContent: { padding: 15, paddingBottom: 40 }, // Un peu de padding en bas pour le scroll
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, elevation: 2 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#fff', height: 45 },
  textArea: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#fff', textAlignVertical: 'top', height: 90 },
  textAreaSmall: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', height: 65, textAlignVertical: 'top', backgroundColor: '#fff' },
  
  dropdown: {
    height: 45,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  placeholderStyle: { fontSize: 14, color: '#94a3b8' },
  selectedTextStyle: { fontSize: 14, color: '#1e293b' },

  row: { flexDirection: 'row', marginBottom: 15 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  progressStep: { alignItems: 'center' },
  progressLabel: { fontSize: 10, marginTop: 4, fontWeight: '700', color: '#94a3b8' },
  progressLine: { width: 40, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 5, marginTop: -15 },
  progressLineActive: { width: 40, height: 2, backgroundColor: '#10b981', marginHorizontal: 5, marginTop: -15 },
  stepActiveIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  stepInactiveIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 30 },
  btnBack: { padding: 15, width: '40%', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  btnTextBack: { color: '#64748b', fontWeight: '800' },
  btnNext: { backgroundColor: '#8b5cf6', padding: 15, borderRadius: 10, width: '55%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnTextNext: { color: '#FFF', fontWeight: '800', marginRight: 10 },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: '600' }
});

export default Physique;