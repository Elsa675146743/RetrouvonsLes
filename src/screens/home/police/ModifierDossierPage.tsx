import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  Alert, Switch
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';
import { Modal } from 'react-native';

export default function ModifierDossierPage({ navigation, route }: any) {
  const dossierId = route && route.params ? route.params.dossierId : null;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [personne, setPersonne] = useState<any>(null);
  const [dossier, setDossier]   = useState<any>(null);
  const [showStatutPicker, setShowStatutPicker]   = useState(false);
  const [showUrgencePicker, setShowUrgencePicker] = useState(false);

  // Champs modifiables
  const [statutDossier, setStatutDossier]         = useState('en_cours');
  const [niveauUrgence, setNiveauUrgence]         = useState('normal');
  const [lieuDisparition, setLieuDisparition]     = useState('');
  const [ville, setVille]                         = useState('');
  const [circonstances, setCirconstances]         = useState('');
  const [vetementsPortes, setVetementsPortes]     = useState('');
  const [objetsPersonnels, setObjetsPersonnels]   = useState('');
  const [derniereActivite, setDerniereActivite]   = useState('');
  const [contactNom, setContactNom]               = useState('');
  const [contactTel, setContactTel]               = useState('');
  const [contactEmail, setContactEmail]           = useState('');
  const [visiblePublic, setVisiblePublic]         = useState(true);
  const [diffusionAutorisee, setDiffusionAutorisee] = useState(true);
  const [notesInternes, setNotesInternes]         = useState('');

  const statutOptions = [
    { label: 'En Cours',         value: 'en_cours'        },
    { label: 'Retrouvé Vivant',  value: 'retrouve_vivant' },
    { label: 'Retrouvé Décédé',  value: 'retrouve_decede' },
    { label: 'Suspendu',         value: 'suspendu'        },
    { label: 'Clôturé',          value: 'cloture'         },
  ];

  const urgenceOptions = [
    { label: 'Faible',    value: 'faible',   color: '#16a34a' },
    { label: 'Normal',    value: 'normal',   color: '#f59e0b' },
    { label: 'Urgent',    value: 'urgent',   color: '#f97316' },
    { label: 'Critique',  value: 'critique', color: '#dc2626' },
  ];

  // ── Chargement ────────────────────────────────────────────────
  const fetchDossier = useCallback(async () => {
    if (!dossierId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dossier_disparition')
        .select('*, personne:id_personne ( * )')
        .eq('id', dossierId)
        .single();
      if (error) throw error;

      setDossier(data);
      setPersonne(data.personne || {});

      // Pré-remplir les champs
      setStatutDossier(data.statut_dossier         || 'en_cours');
      setNiveauUrgence(data.niveau_urgence         || 'normal');
      setLieuDisparition(data.lieu_disparition     || '');
      setVille(data.ville_disparition              || '');
      setCirconstances(data.circonstances          || '');
      setVetementsPortes(data.derniers_vetements_portes || '');
      setObjetsPersonnels(data.objets_personnels   || '');
      setDerniereActivite(data.derniere_activite_connue || '');
      setContactNom(data.contact_famille_principale || '');
      setContactTel(data.telephone_contact         || '');
      setContactEmail(data.email_contact           || '');
      setVisiblePublic(data.visible_public         ?? true);
      setDiffusionAutorisee(data.diffusion_autorisee ?? true);
      setNotesInternes(data.notes_internes         || '');
    } catch (err) {
      console.error('Erreur chargement dossier:', err);
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { fetchDossier(); }, [fetchDossier]);

  // ── Sauvegarde ────────────────────────────────────────────────
  const handleEnregistrer = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('dossier_disparition')
        .update({
          statut_dossier:            statutDossier,
          niveau_urgence:            niveauUrgence,
          lieu_disparition:          lieuDisparition || null,
          ville_disparition:         ville || null,
          circonstances:             circonstances || null,
          derniers_vetements_portes: vetementsPortes || null,
          objets_personnels:         objetsPersonnels || null,
          derniere_activite_connue:  derniereActivite || null,
          contact_famille_principale: contactNom || null,
          telephone_contact:         contactTel || null,
          email_contact:             contactEmail || null,
          visible_public:            visiblePublic,
          diffusion_autorisee:       diffusionAutorisee,
          notes_internes:            notesInternes || null,
          updated_at:                new Date().toISOString(),
        })
        .eq('id', dossierId);

      if (error) throw error;

      // Journal
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('journal_activite').insert({
          type_action:      'modification_dossier',
          action_detaillee: `Dossier modifié`,
          description:      `Dossier ${dossier?.numero_dossier} mis à jour`,
          id_utilisateur:   user.id,
          id_dossier:       dossierId,
        });
      }

      Alert.alert(
        '✅ Dossier mis à jour',
        'Les modifications ont été enregistrées.',
        [{
          text: 'OK',
          onPress: () => navigation.navigate('DetailDossier', { dossierId })
        }]
      );

    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  if (!dossierId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingFull}>
          <Text style={{ color: '#94a3b8' }}>Aucun dossier sélectionné</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingFull}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  const nomComplet = personne?.nom_complet
    || `${personne?.prenom || ''} ${personne?.nom || ''}`.trim()
    || '—';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Modifier le Dossier</Text>
          <Text style={styles.headerSub}>
            {dossier?.numero_dossier} - {nomComplet}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.btnRetour}
          onPress={() => navigation.navigate('DetailDossierPage', { dossierId })}
        >
          <Ionicons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.btnRetourText}>Retour au dossier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* INFOS PERSONNE — lecture seule */}
        <View style={styles.personneCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color="#64748b" />
            <Text style={styles.personneTitle}>Informations Personne (lecture seule)</Text>
          </View>
          <View style={styles.personneRow}>
            <Text style={styles.personneItem}>
              <Text style={styles.personneItemLabel}>Nom: </Text>
              {nomComplet}
            </Text>
            {personne?.date_naissance && (
              <Text style={styles.personneItem}>
                <Text style={styles.personneItemLabel}>Date naissance: </Text>
                {personne.date_naissance}
              </Text>
            )}
            {personne?.sexe && (
              <Text style={styles.personneItem}>
                <Text style={styles.personneItemLabel}>Sexe: </Text>
                {personne.sexe}
              </Text>
            )}
          </View>
        </View>

        {/* DÉTAILS DU DOSSIER */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>Détails du Dossier</Text>
          </View>

          {/* STATUT */}
          <View style={styles.field}>
            <Text style={styles.label}>Statut du Dossier <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowStatutPicker(true)}
            >
              <Text style={styles.pickerText}>
                {statutOptions.find(o => o.value === statutDossier)?.label || 'Sélectionner'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* URGENCE */}
          <View style={styles.field}>
            <Text style={styles.label}>Niveau d'Urgence <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowUrgencePicker(true)}
            >
              <Text style={styles.pickerText}>
                {urgenceOptions.find(o => o.value === niveauUrgence)?.label || 'Sélectionner'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* LIEU + VILLE */}
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Lieu de Disparition</Text>
              <TextInput
                style={styles.input}
                placeholder="Lieu de disparition"
                placeholderTextColor="#94a3b8"
                value={lieuDisparition}
                onChangeText={setLieuDisparition}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                placeholder="Ville"
                placeholderTextColor="#94a3b8"
                value={ville}
                onChangeText={setVille}
              />
            </View>
          </View>

          {/* CIRCONSTANCES */}
          <View style={styles.field}>
            <Text style={styles.label}>Circonstances</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez les circonstances..."
              placeholderTextColor="#94a3b8"
              value={circonstances}
              onChangeText={setCirconstances}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* VÊTEMENTS + OBJETS */}
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Vêtements Portés</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description des vêtements..."
                placeholderTextColor="#94a3b8"
                value={vetementsPortes}
                onChangeText={setVetementsPortes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Objets Personnels</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Téléphone, sac, bijoux..."
                placeholderTextColor="#94a3b8"
                value={objetsPersonnels}
                onChangeText={setObjetsPersonnels}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* DERNIÈRE ACTIVITÉ */}
          <View style={styles.field}>
            <Text style={styles.label}>Dernière Activité Connue</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Qu'était en train de faire la personne..."
              placeholderTextColor="#94a3b8"
              value={derniereActivite}
              onChangeText={setDerniereActivite}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* CONTACT */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Nom du Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                placeholderTextColor="#94a3b8"
                value={contactNom}
                onChangeText={setContactNom}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="+237..."
                placeholderTextColor="#94a3b8"
                value={contactTel}
                onChangeText={setContactTel}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* OPTIONS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>Options</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Visible au Public</Text>
            <Switch
              value={visiblePublic}
              onValueChange={setVisiblePublic}
              trackColor={{ true: '#2563eb', false: '#e2e8f0' }}
              thumbColor="#FFF"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Diffusion Autorisée</Text>
            <Switch
              value={diffusionAutorisee}
              onValueChange={setDiffusionAutorisee}
              trackColor={{ true: '#2563eb', false: '#e2e8f0' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* NOTES INTERNES */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="clipboard-outline" size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>Notes Internes</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textAreaLarge]}
            placeholder="Notes visibles uniquement par les autorités..."
            placeholderTextColor="#94a3b8"
            value={notesInternes}
            onChangeText={setNotesInternes}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnAnnuler}
          onPress={() => navigation.navigate('DetailDossierPage', { dossierId })}
        >
          <Text style={styles.btnAnnulerText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnEnregistrer, saving && styles.btnEnregistrerDisabled]}
          onPress={handleEnregistrer}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="#FFF" />
              <Text style={styles.btnEnregistrerText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

              {/* MODAL STATUT */}
        <Modal visible={showStatutPicker} transparent animationType="fade" onRequestClose={() => setShowStatutPicker(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatutPicker(false)}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Statut du Dossier</Text>
              {statutOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.modalItem, statutDossier === opt.value && styles.modalItemActive]}
                  onPress={() => { setStatutDossier(opt.value); setShowStatutPicker(false); }}
                >
                  <Text style={[styles.modalItemText, statutDossier === opt.value && styles.modalItemTextActive]}>
                    {opt.label}
                  </Text>
                  {statutDossier === opt.value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL URGENCE */}
        <Modal visible={showUrgencePicker} transparent animationType="fade" onRequestClose={() => setShowUrgencePicker(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUrgencePicker(false)}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Niveau d'Urgence</Text>
              {urgenceOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.modalItem, niveauUrgence === opt.value && styles.modalItemActive]}
                  onPress={() => { setNiveauUrgence(opt.value); setShowUrgencePicker(false); }}
                >
                  <View style={[styles.urgenceDot, { backgroundColor: opt.color }]} />
                  <Text style={[styles.modalItemText, niveauUrgence === opt.value && styles.modalItemTextActive]}>
                    {opt.label}
                  </Text>
                  {niveauUrgence === opt.value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:               { flex: 1, backgroundColor: '#f8fafc' },
  loadingFull:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle:             { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  headerSub:               { fontSize: 11, color: '#64748b', marginTop: 2 },
  btnRetour:               { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnRetourText:           { fontSize: 12, color: '#64748b', fontWeight: '600' },
  scrollContent:           { padding: 16, paddingBottom: 20 },
  personneCard:            { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  personneTitle:           { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  personneRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  personneItem:            { fontSize: 13, color: '#475569' },
  personneItemLabel:       { fontWeight: 'bold', color: '#1e293b' },
  sectionCard:             { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionTitle:            { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  field:                   { marginBottom: 14 },
  row:                     { flexDirection: 'row', gap: 12, marginBottom: 14 },
  fieldHalf:               { flex: 1 },
  label:                   { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required:                { color: '#ef4444' },
  input:                   { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1e293b' },
  textArea:                { height: 80, paddingTop: 10 },
  textAreaLarge:           { height: 110, paddingTop: 10 },
  pickerRow:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:                    { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:              { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText:                { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive:          { color: '#FFF' },
  switchRow:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  switchLabel:             { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  footer:                  { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnAnnuler:              { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  btnAnnulerText:          { fontSize: 13, color: '#64748b', fontWeight: '600' },
  btnEnregistrer:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  btnEnregistrerDisabled:  { backgroundColor: '#94a3b8' },
  btnEnregistrerText:      { color: '#FFF', fontWeight: '700', fontSize: 14 },

  picker:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44 },
pickerText:          { fontSize: 13, color: '#1e293b' },
modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
modalBox:            { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '85%' },
modalTitle:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
modalItem:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
modalItemActive:     { backgroundColor: '#eff6ff' },
modalItemText:       { fontSize: 14, color: '#1e293b', flex: 1 },
modalItemTextActive: { color: '#2563eb', fontWeight: '600' },
urgenceDot:          { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
});
