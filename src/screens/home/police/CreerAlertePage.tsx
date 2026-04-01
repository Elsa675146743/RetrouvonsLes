import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  Alert, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

export default function CreerAlertePage({ navigation, route }: any) {
  const dossierId = route?.params?.dossierId || null;

  const [dossiers, setDossiers]               = useState<any[]>([]);
  const [selectedDossier, setSelectedDossier] = useState(dossierId || '');
  const [typeAlerte, setTypeAlerte]           = useState('disparition_standard');
  const [rayon, setRayon]                     = useState('50');
  const [titre, setTitre]                     = useState('');
  const [message, setMessage]                 = useState('');
  const [messageCourt, setMessageCourt]       = useState('');
  const [canalPush, setCanalPush]             = useState(true);
  const [canalInApp, setCanalInApp]           = useState(true);
  const [canalEmail, setCanalEmail]           = useState(false);
  const [canalSMS, setCanalSMS]               = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [showDossierPicker, setShowDossierPicker] = useState(false);
  const [showTypePicker, setShowTypePicker]   = useState(false);

  const typeOptions = [
    { label: 'Disparition standard',  value: 'disparition_standard' },
    { label: 'Disparition urgente',   value: 'disparition_urgente'  },
    { label: 'Enfant disparu',        value: 'enfant_disparu'       },
    { label: 'Personne vulnérable',   value: 'personne_vulnerable'  },
    { label: 'Autre',                 value: 'autre'                },
  ];

  const canaux = [
    { key: 'push',   label: 'Push Notifications', sub: 'Notifications sur mobile',       icon: 'phone-portrait-outline', value: canalPush,   set: setCanalPush   },
    { key: 'inapp',  label: 'In-App',              sub: "Notifications dans l'application", icon: 'notifications-outline',  value: canalInApp,  set: setCanalInApp  },
    { key: 'email',  label: 'Email',               sub: 'Par courrier électronique',      icon: 'mail-outline',           value: canalEmail,  set: setCanalEmail  },
    { key: 'sms',    label: 'SMS',                 sub: 'Par message texte',              icon: 'chatbox-outline',        value: canalSMS,    set: setCanalSMS    },
  ];

  useEffect(() => {
    supabase
      .from('dossier_disparition')
      .select('id, numero_dossier, personne:id_personne ( nom_complet )')
      .eq('statut_dossier', 'en_cours')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setDossiers(data || []));
  }, []);

  const getDossierLabel = () => {
    if (!selectedDossier) return '-- Sélectionner un dossier --';
    const d = dossiers.find(d => d.id === selectedDossier);
    return d ? `${d.numero_dossier} - ${d.personne?.nom_complet || ''}` : '-- Sélectionner un dossier --';
  };

  const handleSave = async (publier: boolean) => {
    if (!titre.trim()) { Alert.alert('Champs requis', 'Le titre est obligatoire.'); return; }
    if (!message.trim()) { Alert.alert('Champs requis', 'Le message est obligatoire.'); return; }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      const canauxList = [
        ...(canalPush  ? ['push']  : []),
        ...(canalInApp ? ['inapp'] : []),
        ...(canalEmail ? ['email'] : []),
        ...(canalSMS   ? ['sms']   : []),
      ].join(',');

      const { data, error } = await supabase.from('alerte').insert({
        titre,
        message,
        message_court:      messageCourt || null,
        type_alerte:        typeAlerte,
        statut_alerte:      publier ? 'en_cours' : 'brouillon',
        rayon_diffusion_km: parseInt(rayon) || 50,
        canaux_diffusion:   canauxList,
        id_dossier:         selectedDossier || null,
        cree_par:           user?.id,
        date_diffusion:     publier ? new Date().toISOString() : null,
      }).select().single();

      if (error) throw error;

      await supabase.from('journal_activite').insert({
        type_action:      'diffusion_alerte',
        action_detaillee: `Alerte ${publier ? 'créée et publiée' : 'enregistrée en brouillon'}`,
        description:      titre,
        id_utilisateur:   user?.id,
        id_dossier:       selectedDossier || null,
        id_alerte:        data?.id,
      });

      Alert.alert(
        publier ? '✅ Alerte publiée !' : '📝 Brouillon enregistré',
        publier ? 'L\'alerte a été diffusée.' : 'L\'alerte a été sauvegardée.',
        [{ text: 'OK', onPress: () => navigation.navigate('GestionAlertes') }]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de créer l\'alerte.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Créer une Alerte</Text>
          <Text style={styles.headerSub}>Diffusez une alerte aux utilisateurs pour retrouver une personne disparue</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* INFORMATIONS ALERTE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>Informations de l'alerte</Text>
          </View>

          {/* DOSSIER LIÉ */}
          <View style={styles.field}>
            <Text style={styles.label}>Dossier lié <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowDossierPicker(true)}>
              <Text style={[styles.pickerText, !selectedDossier && { color: '#94a3b8' }]} numberOfLines={1}>
                {getDossierLabel()}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* TYPE + RAYON */}
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Type d'alerte <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowTypePicker(true)}>
                <Text style={styles.pickerText} numberOfLines={1}>
                  {typeOptions.find(o => o.value === typeAlerte)?.label}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Rayon de diffusion (km)</Text>
              <TextInput
                style={styles.input}
                value={rayon}
                onChangeText={setRayon}
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* TITRE */}
          <View style={styles.field}>
            <Text style={styles.label}>Titre de l'alerte <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Disparition inquiétante à Yaoundé"
              placeholderTextColor="#94a3b8"
              value={titre}
              onChangeText={setTitre}
            />
          </View>

          {/* MESSAGE COMPLET */}
          <View style={styles.field}>
            <Text style={styles.label}>Message complet <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textAreaLarge]}
              placeholder="Description détaillée de la disparition, signes particuliers, dernière localisation..."
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{message.length} caractères</Text>
          </View>

          {/* MESSAGE COURT */}
          <View style={styles.field}>
            <Text style={styles.label}>Message court (pour notifications push)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Version courte du message (max 200 caractères)"
              placeholderTextColor="#94a3b8"
              value={messageCourt}
              onChangeText={(t) => setMessageCourt(t.slice(0, 200))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{messageCourt.length}/200 caractères</Text>
          </View>
        </View>

        {/* CANAUX DE DIFFUSION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wifi-outline" size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>Canaux de diffusion</Text>
          </View>

          <View style={styles.canauxGrid}>
            {canaux.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.canalCard, c.value && styles.canalCardActive]}
                onPress={() => c.set(!c.value)}
              >
                <View style={[styles.canalCheckbox, c.value && styles.canalCheckboxActive]}>
                  {c.value && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                <Ionicons name={c.icon as any} size={20} color={c.value ? '#2563eb' : '#94a3b8'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.canalLabel, c.value && styles.canalLabelActive]}>{c.label}</Text>
                  <Text style={styles.canalSub}>{c.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnAnnuler}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Ionicons name="arrow-back" size={16} color="#FFF" />
          <Text style={styles.btnAnnulerText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnBrouillon}
          onPress={() => handleSave(false)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
            <>
              <Ionicons name="save-outline" size={16} color="#FFF" />
              <Text style={styles.btnBrouillonText}>Enregistrer brouillon</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPublier}
          onPress={() => handleSave(true)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
            <>
              <Ionicons name="megaphone-outline" size={16} color="#FFF" />
              <Text style={styles.btnPublierText}>Créer et Publier</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL DOSSIER */}
      <Modal visible={showDossierPicker} transparent animationType="fade" onRequestClose={() => setShowDossierPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDossierPicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sélectionner un dossier</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {dossiers.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.modalItem, selectedDossier === d.id && styles.modalItemActive]}
                  onPress={() => { setSelectedDossier(d.id); setShowDossierPicker(false); }}
                >
                  <Text style={[styles.modalItemText, selectedDossier === d.id && styles.modalItemTextActive]}>
                    {d.numero_dossier} — {d.personne?.nom_complet || '—'}
                  </Text>
                  {selectedDossier === d.id && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL TYPE */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Type d'alerte</Text>
            {typeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalItem, typeAlerte === opt.value && styles.modalItemActive]}
                onPress={() => { setTypeAlerte(opt.value); setShowTypePicker(false); }}
              >
                <Text style={[styles.modalItemText, typeAlerte === opt.value && styles.modalItemTextActive]}>
                  {opt.label}
                </Text>
                {typeAlerte === opt.value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  header:              { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle:         { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  headerSub:           { fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 16 },
  scrollContent:       { padding: 16, paddingBottom: 20 },
  sectionCard:         { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionTitle:        { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  field:               { marginBottom: 14 },
  row:                 { flexDirection: 'row', gap: 12, marginBottom: 14 },
  fieldHalf:           { flex: 1 },
  label:               { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required:            { color: '#ef4444' },
  input:               { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1e293b' },
  textArea:            { height: 80, paddingTop: 10 },
  textAreaLarge:       { height: 130, paddingTop: 10 },
  charCount:           { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' },
  picker:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  pickerText:          { fontSize: 13, color: '#1e293b', flex: 1 },
  canauxGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  canalCard:           { flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#f8fafc' },
  canalCardActive:     { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  canalCheckbox:       { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  canalCheckboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  canalLabel:          { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  canalLabelActive:    { color: '#2563eb' },
  canalSub:            { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  footer:              { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0', justifyContent: 'flex-end' },
  btnAnnuler:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#64748b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  btnAnnulerText:      { color: '#FFF', fontWeight: '600', fontSize: 13 },
  btnBrouillon:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  btnBrouillonText:    { color: '#FFF', fontWeight: '600', fontSize: 13 },
  btnPublier:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  btnPublierText:      { color: '#FFF', fontWeight: '700', fontSize: 13 },
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox:            { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '88%' },
  modalTitle:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItem:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  modalItemActive:     { backgroundColor: '#eff6ff' },
  modalItemText:       { fontSize: 13, color: '#1e293b', flex: 1 },
  modalItemTextActive: { color: '#2563eb', fontWeight: '600' },
});