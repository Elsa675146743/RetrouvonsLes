import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, Alert, ActivityIndicator, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const ModifierDossier = ({ navigation, route }: any) => {
  const { dossierId, numeroDossier, initialData } = route.params || {};

  // ✅ Initialisation avec les données reçues
  const [date, setDate]               = useState(initialData?.dateLabel || initialData?.date || '');
  const [urgence, setUrgence]         = useState(initialData?.urgence || 'normal');
  const [statut, setStatut]           = useState(initialData?.statut || 'en_cours');
  const [lieu, setLieu]               = useState(initialData?.lieu || '');
  const [ville, setVille]             = useState(initialData?.ville || '');
  const [region, setRegion]           = useState(initialData?.region || '');
  const [pays, setPays]               = useState(initialData?.pays || 'Cameroun');
  const [typeDisparition, setType]    = useState(initialData?.typeDisparition || initialData?.type || 'inconnue');
  const [circonstances, setCirconstances] = useState(initialData?.circonstances || initialData?.description || '');
  const [contactNom, setContactNom]   = useState(initialData?.contactNom || '');
  const [contactTel, setContactTel]   = useState(initialData?.contactTel || '');
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || '');
  const [saving, setSaving]           = useState(false);

  // Picker modals
  const [showUrgencePicker, setShowUrgencePicker]   = useState(false);
  const [showStatutPicker, setShowStatutPicker]     = useState(false);
  const [showTypePicker, setShowTypePicker]         = useState(false);

  const urgenceOptions = [
    { label: 'Faible',    value: 'faible' },
    { label: 'Normal',    value: 'normal' },
    { label: 'Urgent',    value: 'urgent' },
    { label: 'Critique',  value: 'critique' },
  ];

  const statutOptions = [
    { label: 'En cours',          value: 'en_cours' },
    { label: 'Retrouvé vivant',   value: 'retrouve_vivant' },
    { label: 'Retrouvé décédé',   value: 'retrouve_decede' },
    { label: 'Suspendu',          value: 'suspendu' },
    { label: 'Classé sans suite', value: 'classe_sans_suite' },
  ];

  const typeOptions = [
    { label: 'Inconnue',               value: 'inconnue' },
    { label: 'Fugue',                  value: 'fugue' },
    { label: 'Enlèvement présumé',     value: 'enlevement_presume' },
    { label: 'Accident',               value: 'accident' },
    { label: 'Disparition volontaire', value: 'disparition_volontaire' },
    { label: 'Conflit armé',           value: 'conflit_arme' },
    { label: 'Migration',              value: 'migration' },
    { label: 'Catastrophe naturelle',  value: 'catastrophe_naturelle' },
    { label: 'Autre',                  value: 'autre' },
  ];

  const getLabel = (options: any[], value: string) =>
    options.find(o => o.value === value)?.label || value;

  // ✅ Conversion date "jj/mm/aaaa" → ISO pour Supabase
  const dateToISO = (dateStr: string): string | null => {
    if (!dateStr) return null;
    // Si déjà au format ISO
    if (dateStr.includes('-') && dateStr.length >= 10) return dateStr;
    // Format jj/mm/aaaa
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return null;
  };

  // ✅ SAUVEGARDE RÉELLE DANS SUPABASE
  const handleSave = async () => {
    if (!dossierId) {
      Alert.alert('Erreur', 'ID du dossier manquant.');
      return;
    }
    if (!lieu.trim()) {
      Alert.alert('Erreur', 'Le lieu de disparition est obligatoire.');
      return;
    }
    if (!circonstances.trim()) {
      Alert.alert('Erreur', 'Les circonstances sont obligatoires.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dossier_disparition')
        .update({
          // Disparition
          date_disparition:           dateToISO(date),
          niveau_urgence:             urgence,
          statut_dossier:             statut,
          lieu_disparition:           lieu.trim(),
          ville_disparition:          ville.trim() || null,
          region_disparition:         region.trim() || null,
          pays_disparition:           pays.trim() || 'Cameroun',
          type_disparition:           typeDisparition,
          circonstances:              circonstances.trim(),
          // Contact
          contact_famille_principale: contactNom.trim() || null,
          telephone_contact:          contactTel.trim() || null,
          email_contact:              contactEmail.trim() || null,
          // Timestamp
          updated_at:                 new Date().toISOString(),
        })
        .eq('id', dossierId);

      if (error) throw error;

      Alert.alert(
        '✅ Succès',
        'Le dossier a été mis à jour avec succès.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de mettre à jour le dossier.');
      console.error('ERREUR UPDATE:', err);
    } finally {
      setSaving(false);
    }
  };

  // Composant picker modal réutilisable
  const PickerModal = ({
    visible, onClose, options, selected, onSelect, title
  }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {options.map((opt: any) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalItem, selected === opt.value && styles.modalItemActive]}
                onPress={() => { onSelect(opt.value); onClose(); }}
              >
                <Text style={[styles.modalItemText, selected === opt.value && styles.modalItemTextActive]}>
                  {opt.label}
                </Text>
                {selected === opt.value && (
                  <Ionicons name="checkmark" size={18} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Modifier le dossier</Text>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
          <Text style={styles.btnBackText}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* BANDEAU INFO */}
        <View style={styles.blueBanner}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={30} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.bannerTitle}>
              Dossier : {numeroDossier || dossierId || 'Inconnu'}
            </Text>
            <Text style={styles.bannerSub}>Mise à jour des informations</Text>
          </View>
        </View>

        {/* SECTION 1 : DISPARITION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Informations de disparition</Text>
          </View>

          {/* DATE + URGENCE */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  value={date}
                  onChangeText={setDate}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor="#94a3b8"
                />
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Urgence</Text>
              <TouchableOpacity
                style={styles.fakePicker}
                onPress={() => setShowUrgencePicker(true)}
              >
                <Text style={styles.fakePickerText}>
                  {getLabel(urgenceOptions, urgence)}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* STATUT */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Statut du dossier</Text>
            <TouchableOpacity
              style={styles.fakePicker}
              onPress={() => setShowStatutPicker(true)}
            >
              <Text style={styles.fakePickerText}>
                {getLabel(statutOptions, statut)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* LIEU */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Lieu de disparition *</Text>
            <TextInput
              style={styles.input}
              value={lieu}
              onChangeText={setLieu}
              placeholder="Ex: Ekounou"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* VILLE / RÉGION / PAYS */}
          <View style={styles.row}>
            <View style={styles.inputGroupThird}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                value={ville}
                onChangeText={setVille}
                placeholder="Yaoundé"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroupThird}>
              <Text style={styles.label}>Région</Text>
              <TextInput
                style={styles.input}
                value={region}
                onChangeText={setRegion}
                placeholder="Centre"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroupThird}>
              <Text style={styles.label}>Pays</Text>
              <TextInput
                style={styles.input}
                value={pays}
                onChangeText={setPays}
                placeholder="Cameroun"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* TYPE DISPARITION */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Type de disparition</Text>
            <TouchableOpacity
              style={styles.fakePicker}
              onPress={() => setShowTypePicker(true)}
            >
              <Text style={styles.fakePickerText}>
                {getLabel(typeOptions, typeDisparition)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* CIRCONSTANCES */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Circonstances *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={circonstances}
              onChangeText={setCirconstances}
              placeholder="Décrivez les faits..."
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* SECTION 2 : CONTACT */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Contact principal</Text>
          </View>

          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={contactNom}
              onChangeText={setContactNom}
              placeholder="Nom du contact"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={contactTel}
                onChangeText={setContactTel}
                keyboardType="phone-pad"
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@exemple.com"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        {/* BOUTONS ACTIONS */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.btnCancelText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSave, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.btnSaveText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* MODALS PICKERS */}
      <PickerModal
        visible={showUrgencePicker}
        onClose={() => setShowUrgencePicker(false)}
        options={urgenceOptions}
        selected={urgence}
        onSelect={setUrgence}
        title="Niveau d'urgence"
      />
      <PickerModal
        visible={showStatutPicker}
        onClose={() => setShowStatutPicker(false)}
        options={statutOptions}
        selected={statut}
        onSelect={setStatut}
        title="Statut du dossier"
      />
      <PickerModal
        visible={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        options={typeOptions}
        selected={typeDisparition}
        onSelect={setType}
        title="Type de disparition"
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f1f5f9' },
  topBar:             { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#f8fafc' },
  topBarTitle:        { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  btnBack:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', alignSelf: 'flex-start', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  btnBackText:        { color: '#64748b', marginLeft: 5, fontSize: 13 },
  scrollContent:      { padding: 16 },
  blueBanner:         { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#dbeafe' },
  iconContainer:      { backgroundColor: '#FFF', padding: 10, borderRadius: 8, marginRight: 15 },
  bannerTitle:        { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  bannerSub:          { fontSize: 12, color: '#64748b' },
  sectionCard:        { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  sectionTitle:       { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginLeft: 10 },
  row:                { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  inputGroup:         { width: '48%' },
  inputGroupThird:    { width: '31%' },
  inputGroupFull:     { width: '100%', marginBottom: 15 },
  label:              { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input:              { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#1e293b', backgroundColor: '#f8fafc' },
  inputFlex:          { flex: 1, height: 42, color: '#1e293b' },
  inputWithIcon:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 42, backgroundColor: '#f8fafc' },
  textArea:           { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  fakePicker:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 42, backgroundColor: '#f8fafc' },
  fakePickerText:     { fontSize: 14, color: '#1e293b' },
  footerActions:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  btnCancel:          { flex: 0.35, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#FFF', alignItems: 'center' },
  btnCancelText:      { color: '#64748b', fontWeight: '600', fontSize: 14 },
  btnSave:            { flex: 0.6, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSaveText:        { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  // Modal picker
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:       { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:         { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  modalItem:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  modalItemActive:    { backgroundColor: '#eff6ff', borderRadius: 8 },
  modalItemText:      { fontSize: 14, color: '#1e293b' },
  modalItemTextActive:{ color: '#2563eb', fontWeight: '600' },
});

export default ModifierDossier;