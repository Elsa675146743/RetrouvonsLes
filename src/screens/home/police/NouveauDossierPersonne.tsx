import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, Alert, Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

function Stepper({ etape }: { etape: number }) {
  const etapes = [
    { num: 1, label: 'Personne'     },
    { num: 2, label: 'Disparition'  },
    { num: 3, label: 'Vérification' },
  ];
  return (
    <View style={sStyles.container}>
      {etapes.map((e, i) => (
        <React.Fragment key={e.num}>
          <View style={sStyles.item}>
            <View style={[sStyles.circle, etape >= e.num && sStyles.circleActive]}>
              <Text style={[sStyles.circleText, etape >= e.num && sStyles.circleTextActive]}>
                {e.num}
              </Text>
            </View>
            <Text style={[sStyles.label, etape >= e.num && sStyles.labelActive]}>{e.label}</Text>
          </View>
          {i < etapes.length - 1 && (
            <View style={[sStyles.line, etape > e.num && sStyles.lineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const sStyles = StyleSheet.create({
  container:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  item:             { alignItems: 'center', gap: 6 },
  circle:           { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  circleActive:     { backgroundColor: '#2563eb' },
  circleText:       { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  circleTextActive: { color: '#FFF' },
  label:            { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  labelActive:      { color: '#2563eb' },
  line:             { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginBottom: 16, marginHorizontal: 4 },
  lineActive:       { backgroundColor: '#2563eb' },
});

export default function NouveauDossierPersonne({ navigation, route }: any) {

  const [nom, setNom]                           = useState('');
  const [prenom, setPrenom]                     = useState('');
  const [dateNaissance, setDateNaissance]       = useState('');
  const [sexe, setSexe]                         = useState('masculin');
  const [nationalite, setNationalite]           = useState('Camerounaise');
  const [taille, setTaille]                     = useState('');
  const [poids, setPoids]                       = useState('');
  const [couleurYeux, setCouleurYeux]           = useState('');
  const [couleurCheveux, setCouleurCheveux]     = useState('');
  const [signesDistinctifs, setSignesDistinctifs] = useState('');
  const [description, setDescription]           = useState('');
  const [photos, setPhotos]                     = useState<any[]>([]);

  const sexeOptions = [
    { label: 'Masculin', value: 'masculin' },
    { label: 'Féminin',  value: 'feminin'  },
    { label: 'Inconnu',  value: 'inconnu'  },
  ];

  const ajouterPhoto = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 }, (response) => {
      if (response.assets) {
        const nouvelles = response.assets.map(a => ({
          uri: a.uri, type: a.type, fileName: a.fileName, fileSize: a.fileSize,
        }));
        setPhotos(prev => [...prev, ...nouvelles].slice(0, 5));
      }
    });
  };

  const supprimerPhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSuivant = () => {
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Champs requis', 'Le nom et prénom sont obligatoires.');
      return;
    }
    navigation.navigate('NouveauDossierDisparition', {
      personData: {
        nom, prenom, dateNaissance, sexe, nationalite,
        taille: taille ? parseInt(taille) : null,
        poids: poids ? parseInt(poids) : null,
        couleurYeux, couleurCheveux, signesDistinctifs,
        description, photos,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Créer un Nouveau Dossier</Text>
          <Text style={styles.headerSub}>Étape 1 sur 3 - Informations Personne</Text>
        </View>
      </View>

      <Stepper etape={1} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Informations sur la Personne Disparue</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Nom <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Nom de famille" placeholderTextColor="#94a3b8" value={nom} onChangeText={setNom} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Prénom <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Prénom" placeholderTextColor="#94a3b8" value={prenom} onChangeText={setPrenom} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Date de naissance</Text>
              <TextInput style={styles.input} placeholder="JJ/MM/AAAA" placeholderTextColor="#94a3b8" value={dateNaissance} onChangeText={setDateNaissance} keyboardType="numeric" />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Sexe</Text>
              <View style={styles.sexeRow}>
                {sexeOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sexeBtn, sexe === opt.value && styles.sexeBtnActive]}
                    onPress={() => setSexe(opt.value)}
                  >
                    <Text style={[styles.sexeBtnText, sexe === opt.value && styles.sexeBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Nationalité</Text>
              <TextInput style={styles.input} placeholder="Camerounaise" placeholderTextColor="#94a3b8" value={nationalite} onChangeText={setNationalite} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Taille (cm)</Text>
              <TextInput style={styles.input} placeholder="ex: 175" placeholderTextColor="#94a3b8" value={taille} onChangeText={setTaille} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Poids (kg)</Text>
              <TextInput style={styles.input} placeholder="ex: 70" placeholderTextColor="#94a3b8" value={poids} onChangeText={setPoids} keyboardType="numeric" />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Couleur des yeux</Text>
              <TextInput style={styles.input} placeholder="ex: Marron" placeholderTextColor="#94a3b8" value={couleurYeux} onChangeText={setCouleurYeux} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Couleur des cheveux</Text>
            <TextInput style={styles.input} placeholder="ex: Noirs" placeholderTextColor="#94a3b8" value={couleurCheveux} onChangeText={setCouleurCheveux} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Signes distinctifs</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cicatrices, tatouages, marques particulières..."
              placeholderTextColor="#94a3b8"
              value={signesDistinctifs}
              onChangeText={setSignesDistinctifs}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description physique</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description générale de la personne..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Photos</Text>
          </View>

          <TouchableOpacity style={styles.btnAjouterPhoto} onPress={ajouterPhoto}>
            <Ionicons name="image-outline" size={18} color="#FFF" />
            <Text style={styles.btnAjouterPhotoText}>Ajouter des photos</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={styles.photosGrid}>
              {photos.map((p, i) => (
                <View key={i} style={styles.photoItem}>
                  <Image source={{ uri: p.uri }} style={styles.photoImg} />
                  <TouchableOpacity style={styles.photoDel} onPress={() => supprimerPhoto(i)}>
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                  {i === 0 && (
                    <View style={styles.photoPrincipale}>
                      <Text style={styles.photoPrincipaleText}>Principale</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnAnnuler} onPress={() => navigation.goBack()}>
          <Text style={styles.btnAnnulerText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSuivant} onPress={handleSuivant}>
          <Text style={styles.btnSuivantText}>Suivant →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  header:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle:         { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  headerSub:           { fontSize: 11, color: '#64748b', marginTop: 1 },
  scrollContent:       { padding: 16, paddingBottom: 20 },
  sectionCard:         { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionTitle:        { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  row:                 { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldHalf:           { flex: 1 },
  field:               { marginBottom: 12 },
  label:               { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required:            { color: '#ef4444' },
  input:               { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1e293b' },
  textArea:            { height: 80, paddingTop: 10 },
  sexeRow:             { flexDirection: 'row', gap: 4 },
  sexeBtn:             { flex: 1, height: 44, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sexeBtnActive:       { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  sexeBtnText:         { fontSize: 10, color: '#64748b', fontWeight: '600' },
  sexeBtnTextActive:   { color: '#FFF' },
  btnAjouterPhoto:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  btnAjouterPhotoText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  photosGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoItem:           { width: 90, height: 90, position: 'relative' },
  photoImg:            { width: 90, height: 90, borderRadius: 8, backgroundColor: '#f1f5f9' },
  photoDel:            { position: 'absolute', top: -6, right: -6 },
  photoPrincipale:     { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#16a34a', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  photoPrincipaleText: { fontSize: 9, color: '#FFF', fontWeight: 'bold' },
  footer:              { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnAnnuler:          { backgroundColor: '#64748b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnAnnulerText:      { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnSuivant:          { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnSuivantText:      { color: '#FFF', fontWeight: '700', fontSize: 14 },
});