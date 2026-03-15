import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  ScrollView, SafeAreaView, Image, Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Dropdown } from 'react-native-element-dropdown'; // Remplacement du Picker
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';

const Identite = ({ navigation }: any) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    alias: '',
    sexe: '', 
    dateNaissance: null as Date | null,
    dateLabel: 'jj/mm/aaaa',
    ageMin: '',
    ageMax: '',
    nationalite: '',
    langue: '',
  });

  // Données pour le Dropdown Sexe
  const sexeData = [
    { label: 'Masculin', value: 'Masculin' },
    { label: 'Féminin', value: 'Féminin' },
  ];

  const errors = {
    prenom: !formData.prenom.trim(),
    nom: !formData.nom.trim(),
    sexe: !formData.sexe || formData.sexe === "",
    dateNaissance: !formData.dateNaissance,
  };

  const choisirPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri || null);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}`;
      setFormData({ ...formData, dateNaissance: selectedDate, dateLabel: formatted });
    }
  };

  const handleNext = () => {
    setSubmitted(true);
    if (!errors.prenom && !errors.nom && !errors.sexe && !errors.dateNaissance) {
      navigation.navigate('Physique', { data: { ...formData, photo: photoUri } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>
          Retrouvons <Text style={styles.logoHighlight}>les</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* BARRE DE PROGRESSION */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepWrapper}>
            <View style={[styles.stepIcon, styles.stepActive]}>
              <Ionicons name="person" size={18} color="#FFF" />
            </View>
            <Text style={[styles.stepText, styles.textActive]}>Identité</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepWrapper}>
            <View style={styles.stepIcon}>
              <Ionicons name="body" size={18} color="#94a3b8" />
            </View>
            <Text style={styles.stepText}>Physique</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepWrapper}>
            <View style={styles.stepIcon}>
              <Ionicons name="list" size={18} color="#94a3b8" />
            </View>
            <Text style={styles.stepText}>Compléments</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <TouchableOpacity style={styles.addPhotoBtn} onPress={choisirPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            ) : (
              <View style={{alignItems: 'center'}}>
                <Ionicons name="camera" size={30} color="#8b5cf6" />
                <Text style={{fontSize: 10, color: '#8b5cf6', fontWeight: '600'}}>Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* PRÉNOM / NOM */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput 
                style={[styles.input, submitted && errors.prenom && styles.inputError]} 
                placeholder="Prénom" 
                placeholderTextColor="#94a3b8"
                value={formData.prenom}
                onChangeText={(v) => setFormData({...formData, prenom: v})}
              />
            </View>
            <View style={{width: 10}} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput 
                style={[styles.input, submitted && errors.nom && styles.inputError]} 
                placeholder="Nom" 
                placeholderTextColor="#94a3b8"
                value={formData.nom}
                onChangeText={(v) => setFormData({...formData, nom: v})}
              />
            </View>
          </View>

          {/* SURNOM / SEXE (DROPDOWN STYLE WEB) */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Surnom / Alias</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Alias" 
                placeholderTextColor="#94a3b8"
                value={formData.alias}
                onChangeText={(v) => setFormData({...formData, alias: v})}
              />
            </View>
            <View style={{width: 10}} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Sexe *</Text>
              <Dropdown
                style={[styles.dropdown, submitted && errors.sexe && styles.inputError]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                containerStyle={styles.dropdownContainer}
                data={sexeData}
                maxHeight={120}
                labelField="label"
                valueField="value"
                placeholder="Choisir"
                value={formData.sexe}
                onChange={item => setFormData({...formData, sexe: item.value})}
              />
            </View>
          </View>

          {/* DATE NAISSANCE / AGE ESTIMÉ */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Date naissance *</Text>
              <TouchableOpacity 
                style={[styles.input, styles.dateInput, submitted && errors.dateNaissance && styles.inputError]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{color: formData.dateNaissance ? '#1e293b' : '#94a3b8', fontSize: 13}}>{formData.dateLabel}</Text>
                <Ionicons name="calendar" size={18} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
            <View style={{width: 10}} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Âge estimé (Ans)</Text>
              <View style={styles.ageRow}>
                <Text style={styles.ageSubLabel}>Min:</Text>
                <TextInput 
                  style={styles.ageInput} 
                  placeholder="0" 
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric" 
                  maxLength={3}
                  value={formData.ageMin}
                  onChangeText={(v) => setFormData({...formData, ageMin: v})} 
                />
                <Text style={[styles.ageSubLabel, {marginLeft: 6}]}>Max:</Text>
                <TextInput 
                  style={styles.ageInput} 
                  placeholder="99" 
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric" 
                  maxLength={3}
                  value={formData.ageMax}
                  onChangeText={(v) => setFormData({...formData, ageMax: v})} 
                />
              </View>
            </View>
          </View>

          {/* NATIONALITÉ / LANGUE PARLÉE */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Nationalité</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Camerounaise" 
                placeholderTextColor="#94a3b8"
                value={formData.nationalite}
                onChangeText={(v) => setFormData({...formData, nationalite: v})}
              />
            </View>
            <View style={{width: 10}} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Langue parlée</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Français" 
                placeholderTextColor="#94a3b8"
                value={formData.langue}
                onChangeText={(v) => setFormData({...formData, langue: v})}
              />
            </View>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker 
            value={formData.dateNaissance || new Date()} 
            mode="date" 
            display="default" 
            onChange={onChangeDate} 
          />
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
            <Text style={styles.btnTextBack}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnNext} onPress={handleNext}>
            <Text style={styles.btnTextNext}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    height: 65, 
    backgroundColor: '#FFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 4, 
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  logoText: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  logoHighlight: { color: '#ef4444' },
  scrollContent: { padding: 15 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  stepWrapper: { alignItems: 'center', width: 85 },
  stepIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  stepActive: { backgroundColor: '#8b5cf6' },
  stepLine: { width: 30, height: 2, backgroundColor: '#e2e8f0', marginTop: -15 },
  stepText: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontWeight: '700' },
  textActive: { color: '#8b5cf6' },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, elevation: 2 },
  addPhotoBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%', borderRadius: 40 },
  row: { flexDirection: 'row', marginBottom: 15 },
  flex1: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#fff', height: 45 },
  dateInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // STYLES DU DROPDOWN
  dropdown: {
    height: 45,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  dropdownContainer: {
    borderRadius: 8,
    marginTop: 2,
    elevation: 3,
  },
  placeholderStyle: { fontSize: 14, color: '#94a3b8' },
  selectedTextStyle: { fontSize: 14, color: '#1e293b' },

  ageRow: { flexDirection: 'row', alignItems: 'center', height: 45 },
  ageSubLabel: { fontSize: 11, color: '#64748b', marginRight: 4 },
  ageInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 2, width: 40, height: 35, textAlign: 'center', backgroundColor: '#fff', color: '#1e293b', fontSize: 13 },
  inputError: { borderColor: '#ef4444' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 30 },
  btnBack: { padding: 15, width: '40%', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  btnTextBack: { color: '#64748b', fontWeight: '800' },
  btnNext: { backgroundColor: '#8b5cf6', padding: 15, borderRadius: 10, width: '55%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnTextNext: { color: '#FFF', fontWeight: '800', marginRight: 10 }
});

export default Identite;