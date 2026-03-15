import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ScrollView, SafeAreaView, Image, Alert, ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { getPersonnes } from '../../../services/personneService';

const Personne = ({ route, navigation }: any) => {
  const params       = route.params || {};
  const incomingData = params.personData || null;

  // --- ÉTATS ---
  const [isExisting, setIsExisting]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [photoUri, setPhotoUri]           = useState<string | null>(null);
  const [nom, setNom]                     = useState('');
  const [prenom, setPrenom]               = useState('');
  const [sexe, setSexe]                   = useState('');
  const [ageMin, setAgeMin]               = useState('');
  const [ageMax, setAgeMax]               = useState('');
  const [description, setDescription]     = useState('');

  // --- ÉTATS POUR LA RECHERCHE SUPABASE ---
  const [toutesPersonnes, setToutesPersonnes]   = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch]       = useState(false);
  const [searchResults, setSearchResults]       = useState<any[]>([]);

  // --- CHARGEMENT AU RETOUR ARRIÈRE ---
  useEffect(() => {
    if (incomingData) {
      setNom(incomingData.nom || '');
      setPrenom(incomingData.prenom || '');
      setSexe(incomingData.sexe || '');
      setAgeMin(incomingData.ageMin || incomingData.age_estime_min?.toString() || '');
      setAgeMax(incomingData.ageMax || incomingData.age_estime_max?.toString() || '');
      setDescription(incomingData.description || incomingData.description_physique || '');
      setPhotoUri(incomingData.photoUri || incomingData.photo_principale || null);
      if (incomingData.nom) {
        setSearchQuery(`${incomingData.prenom} ${incomingData.nom}`);
      }
    }
  }, [incomingData]);

  // --- CHARGEMENT DES PERSONNES SUPABASE QUAND ON CLIQUE "Personne existante" ---
  useEffect(() => {
    if (isExisting && toutesPersonnes.length === 0) {
      setLoadingSearch(true);
      getPersonnes()
        .then((data) => setToutesPersonnes(data || []))
        .catch((err) => console.error('Erreur chargement personnes:', err))
        .finally(() => setLoadingSearch(false));
    }
  }, [isExisting]);

  // --- FILTRAGE LOCAL EN TEMPS RÉEL ---
  useEffect(() => {
    if (!searchQuery.trim() || selectedPerson) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = toutesPersonnes.filter(p =>
      `${p.prenom || ''} ${p.nom || ''}`.toLowerCase().includes(q)
    );
    setSearchResults(filtered.slice(0, 5)); // Max 5 résultats
  }, [searchQuery, toutesPersonnes, selectedPerson]);

  // --- SÉLECTION D'UNE PERSONNE EXISTANTE ---
  const handleSelectPerson = (p: any) => {
    setSelectedPerson(p);
    setNom(p.nom || '');
    setPrenom(p.prenom || '');
    setSexe(p.sexe || '');
    setAgeMin(p.age_estime_min?.toString() || '');
    setAgeMax(p.age_estime_max?.toString() || '');
    setDescription(p.description_physique || '');
    setPhotoUri(p.photo_principale || null);
    setSearchQuery(`${p.prenom} ${p.nom}`);
    setSearchResults([]); // Ferme le dropdown
  };

  // --- PHOTO ---
  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 1 });
    if (result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri || null);
    }
  };

  // --- NAVIGATION SUIVANT ---
  const handleSuivant = () => {
    if (!nom || !prenom) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires.');
      return;
    }

    // On passe les données + l'ID Supabase si personne existante
    const dataPersonne = {
      id:          selectedPerson?.id || null, // ← ID réel Supabase
      nom,
      prenom,
      sexe,
      ageMin,
      ageMax,
      photoUri,
      description,
    };

    navigation.navigate('disparitions', { personData: dataPersonne });
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informations sur la personne</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* STEPPER */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepIcon, styles.stepActive]}>
            <Ionicons name="person" size={16} color="#FFF" />
          </View>
          <Text style={styles.stepLabelActive}>Personne</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
          </View>
          <Text style={styles.stepLabel}>Disparition</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Ionicons name="call-outline" size={16} color="#64748b" />
          </View>
          <Text style={styles.stepLabel}>Contacts</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionInfo}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-outline" size={20} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.sectionMainTitle}>Identité de la personne</Text>
            <Text style={styles.sectionSubTitle}>Caractéristiques physiques</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, !isExisting && styles.activeTab]}
            onPress={() => {
              setIsExisting(false);
              setSelectedPerson(null);
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabText, !isExisting && styles.activeTabText]}>
              Nouvelle personne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isExisting && styles.activeTab]}
            onPress={() => setIsExisting(true)}
          >
            <Text style={[styles.tabText, isExisting && styles.activeTabText]}>
              Personne existante
            </Text>
          </TouchableOpacity>
        </View>

        {/* RECHERCHE SUPABASE */}
        {isExisting && (
          <View style={styles.existingSearchArea}>
            <Text style={styles.label}>Rechercher une personne</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94a3b8" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Entrez un nom..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  if (selectedPerson) setSelectedPerson(null);
                }}
              />
              {/* Spinner pendant le chargement initial */}
              {loadingSearch && (
                <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 10 }} />
              )}
              {/* Bouton effacer */}
              {searchQuery.length > 0 && !loadingSearch && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedPerson(null);
                    setSearchResults([]);
                  }}
                  style={{ marginRight: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Badge personne sélectionnée */}
            {selectedPerson && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.selectedBadgeText}>
                  {selectedPerson.prenom} {selectedPerson.nom} sélectionné(e)
                </Text>
              </View>
            )}

            {/* DROPDOWN RÉSULTATS */}
            {searchResults.length > 0 && (
              <View style={styles.dropdown}>
                {searchResults.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectPerson(item)}
                  >
                    <View style={styles.dropdownRow}>
                      <View style={styles.dropdownAvatar}>
                        <Text style={styles.dropdownAvatarText}>
                          {(item.prenom?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.dropdownText}>
                          {item.prenom} {item.nom}
                        </Text>
                        <Text style={styles.dropdownSubText}>
                          {item.sexe || '—'} • {item.nationalite || '—'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Aucun résultat */}
            {searchQuery.trim().length > 1 &&
              searchResults.length === 0 &&
              !loadingSearch &&
              !selectedPerson && (
              <Text style={styles.noResultText}>
                Aucune personne trouvée pour "{searchQuery}"
              </Text>
            )}
          </View>
        )}

        {/* FORMULAIRE */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Photos de la personne (optionnel)</Text>
          <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.imagePreview} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="cloud-upload-outline" size={24} color="#64748b" />
                <Text style={styles.addPhotoText}>Ajouter</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Prénom <Text style={{ color: 'red' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={prenom}
                onChangeText={setPrenom}
                placeholder="Prénom"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nom <Text style={{ color: 'red' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={nom}
                onChangeText={setNom}
                placeholder="Nom"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Sexe</Text>
              <TextInput
                style={styles.input}
                value={sexe}
                onChangeText={setSexe}
                placeholder="M / F"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Âge estimé</Text>
              <View style={styles.ageInputRow}>
                <TextInput
                  style={styles.ageInput}
                  value={ageMin}
                  onChangeText={setAgeMin}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={{ marginHorizontal: 5 }}>à</Text>
                <TextInput
                  style={styles.ageInput}
                  value={ageMax}
                  onChangeText={setAgeMax}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={{ marginLeft: 5 }}>ans</Text>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Description physique</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            placeholder="Signes particuliers, vêtements..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
          />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnCancel}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnCancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnNext} onPress={handleSuivant}>
          <Text style={styles.btnNextText}>Suivant</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#fcfdfe' },
  header:             { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle:        { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  stepperContainer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  stepItem:           { alignItems: 'center', width: 60 },
  stepIcon:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepActive:         { backgroundColor: '#2563eb' },
  stepLine:           { width: 40, height: 2, backgroundColor: '#f1f5f9', marginBottom: 15 },
  stepLabel:          { fontSize: 9, color: '#64748b' },
  stepLabelActive:    { fontSize: 9, color: '#2563eb', fontWeight: 'bold' },
  content:            { padding: 20 },
  sectionInfo:        { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle:         { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionMainTitle:   { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  sectionSubTitle:    { fontSize: 11, color: '#64748b' },
  tabContainer:       { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab:                { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab:          { backgroundColor: '#FFF', elevation: 1 },
  tabText:            { fontSize: 12, color: '#64748b', fontWeight: '600' },
  activeTabText:      { color: '#2563eb' },
  existingSearchArea: { marginBottom: 20 },
  searchBox:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, height: 45 },
  searchInput:        { flex: 1, paddingHorizontal: 10, fontSize: 13, color: '#1e293b' },
  selectedBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  selectedBadgeText:  { marginLeft: 6, color: '#166534', fontSize: 12, fontWeight: '600' },
  dropdown:           { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 5, elevation: 5, zIndex: 10 },
  dropdownItem:       { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownRow:        { flexDirection: 'row', alignItems: 'center' },
  dropdownAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dropdownAvatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 13 },
  dropdownText:       { fontSize: 13, color: '#1e293b', fontWeight: '600' },
  dropdownSubText:    { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  noResultText:       { color: '#94a3b8', fontSize: 12, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  formContainer:      { marginTop: 10 },
  label:              { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 8 },
  addPhotoBtn:        { width: 60, height: 60, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  imagePreview:       { width: '100%', height: '100%' },
  addPhotoText:       { fontSize: 9, color: '#64748b' },
  row:                { flexDirection: 'row', marginBottom: 15 },
  input:              { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, fontSize: 13, color: '#1e293b', height: 40 },
  ageInputRow:        { flexDirection: 'row', alignItems: 'center' },
  ageInput:           { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, width: 45, textAlign: 'center', height: 35, fontSize: 13 },
  footer:             { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#FFF' },
  btnCancel:          { height: 40, width: '45%', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  btnCancelText:      { color: '#64748b', fontWeight: '600', fontSize: 13 },
  btnNext:            { height: 40, width: '45%', borderRadius: 8, backgroundColor: '#2563eb', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnNextText:        { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});

export default Personne;