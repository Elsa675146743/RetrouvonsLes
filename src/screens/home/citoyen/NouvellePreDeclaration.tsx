import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getOrganisations, createPreDeclaration } from '../../../services/preDeclarationApi';

type Organisation = {
  id: string;
  nom: string;
  type_organisation: string;
};

type RootStackParamList = {
  PreDeclarationDetail: { id: string };
  PreDeclarationList: undefined;
  NouvellePreDeclaration: undefined;
  ConversationDetail: { conversationId: string; contexteNom: string; contexteReference: string };
  SOS: undefined;
  ContactsUrgence: undefined;
  ConversationsList: undefined;
};

export default function NouvellePreDeclaration() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrgNom, setSelectedOrgNom] = useState<string>('');

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [nationalite, setNationalite] = useState('Camerounaise');
  const [dateDisparition, setDateDisparition] = useState('');
  const [lieuDisparition, setLieuDisparition] = useState('');
  const [villeDisparition, setVilleDisparition] = useState('');
  const [regionDisparition, setRegionDisparition] = useState('');
  const [circonstances, setCirconstances] = useState('');
  const [infosComplementaires, setInfosComplementaires] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [messageInitial, setMessageInitial] = useState('');
  const [sexe, setSexe] = useState<'masculin' | 'feminin' | 'inconnu' | 'non_precise'>('non_precise');

  const [showDateNaissancePicker, setShowDateNaissancePicker] = useState(false);
  const [showDateDisparitionPicker, setShowDateDisparitionPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    loadOrganisations();
  }, []);

  const loadOrganisations = async () => {
    setLoading(true);
    try {
      console.log('🔍 Chargement des organisations...');
      const data = await getOrganisations();
      console.log('✅ Organisations chargées:', JSON.stringify(data, null, 2));
      
      // ✅ Trier pour mettre "Police" en premier si elle existe
      const sortedData = [...data].sort((a, b) => {
        if (a.nom.toLowerCase().includes('police')) return -1;
        if (b.nom.toLowerCase().includes('police')) return 1;
        return a.nom.localeCompare(b.nom);
      });
      
      setOrganisations(sortedData);
      
      // ✅ Sélectionner automatiquement "Police" si elle existe
      const policeOrg = sortedData.find(org => 
        org.nom.toLowerCase().includes('police')
      );
      
      if (policeOrg) {
        console.log('🚔 Police trouvée, sélectionnée automatiquement:', policeOrg.id, policeOrg.nom);
        setSelectedOrg(policeOrg.id);
        setSelectedOrgNom(policeOrg.nom);
      } else if (sortedData.length > 0) {
        console.log('📌 Aucune Police trouvée, sélection par défaut:', sortedData[0].id, sortedData[0].nom);
        setSelectedOrg(sortedData[0].id);
        setSelectedOrgNom(sortedData[0].nom);
      } else {
        console.warn('⚠️ Aucune organisation trouvée !');
      }
    } catch (error) {
      console.error('❌ Erreur chargement organisations:', error);
      Alert.alert('Erreur', 'Impossible de charger les organisations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('🔍 === DÉBUT SOUMISSION PRÉ-DÉCLARATION ===');
    console.log('📌 Organisation sélectionnée:', selectedOrg, selectedOrgNom);
    console.log('📌 Nom:', nom);
    console.log('📌 Prénom:', prenom);
    console.log('📌 Sexe:', sexe);
    console.log('📌 Date naissance:', dateNaissance);
    console.log('📌 Nationalité:', nationalite);
    console.log('📌 Date disparition:', dateDisparition);
    console.log('📌 Lieu disparition:', lieuDisparition);
    console.log('📌 Ville:', villeDisparition);
    console.log('📌 Région:', regionDisparition);
    console.log('📌 Circonstances:', circonstances);
    console.log('📌 Infos complémentaires:', infosComplementaires);
    console.log('📌 Contact nom:', contactNom);
    console.log('📌 Contact téléphone:', contactTelephone);
    console.log('📌 Contact email:', contactEmail);
    console.log('📌 Message initial:', messageInitial);

    if (!selectedOrg) {
      console.error('❌ Aucune organisation sélectionnée');
      Alert.alert('Erreur', 'Veuillez sélectionner une organisation');
      return;
    }
    if (!nom.trim()) {
      console.error('❌ Nom manquant');
      Alert.alert('Erreur', 'Le nom de la personne est requis');
      return;
    }
    if (!dateDisparition) {
      console.error('❌ Date de disparition manquante');
      Alert.alert('Erreur', 'La date de disparition est requise');
      return;
    }
    if (!circonstances.trim()) {
      console.error('❌ Circonstances manquantes');
      Alert.alert('Erreur', 'Les circonstances sont requises');
      return;
    }

    setSubmitting(true);
    try {
      console.log('📤 Appel de createPreDeclaration avec organisation:', selectedOrg, selectedOrgNom);
      const result = await createPreDeclaration({
        id_organisation: selectedOrg,
        nom_personne: nom.trim(),
        prenom_personne: prenom.trim(),
        sexe: sexe,
        date_naissance: dateNaissance || undefined,
        nationalite: nationalite || 'Camerounaise',
        date_disparition: dateDisparition,
        lieu_disparition: lieuDisparition || undefined,
        ville_disparition: villeDisparition || undefined,
        region_disparition: regionDisparition || undefined,
        circonstances: circonstances.trim(),
        infos_complementaires: infosComplementaires || undefined,
        contact_nom: contactNom || undefined,
        contact_telephone: contactTelephone || undefined,
        contact_email: contactEmail || undefined,
        message_initial: messageInitial || undefined,
      });

      console.log('✅ Résultat createPreDeclaration:', JSON.stringify(result, null, 2));
      console.log('✅ Pré-déclaration ID:', result.preDeclaration.id);
      console.log('✅ Conversation ID:', result.conversationId);

      Alert.alert(
        '✅ Pré-déclaration envoyée',
        `Votre pré-déclaration a été envoyée à ${selectedOrgNom}.\nL'autorité compétente va examiner votre demande.`,
        [
          {
            text: 'Voir ma pré-déclaration',
            onPress: () => {
              console.log('📱 Navigation vers PreDeclarationDetail:', result.preDeclaration.id);
              navigation.navigate('PreDeclarationDetail', { id: result.preDeclaration.id });
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );

      navigation.goBack();
    } catch (error: any) {
      console.error('❌ Erreur lors de la soumission:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
      Alert.alert('Erreur', error.message || 'Impossible de créer la pré-déclaration');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSexeOptions = () => (
    <View style={styles.sexeContainer}>
      {['masculin', 'feminin', 'inconnu', 'non_precise'].map((s) => (
        <TouchableOpacity
          key={s}
          style={[styles.sexeOption, sexe === s && styles.sexeOptionActive]}
          onPress={() => setSexe(s as any)}
        >
          <Text style={[styles.sexeOptionText, sexe === s && styles.sexeOptionTextActive]}>
            {s === 'masculin' ? '♂ Masculin' :
             s === 'feminin' ? '♀ Féminin' :
             s === 'inconnu' ? '❓ Inconnu' : 'Non précisé'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDatePicker = (
    label: string,
    value: string,
    onConfirm: (date: string) => void,
    show: boolean,
    setShow: (v: boolean) => void
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label} {label.includes('*') ? '' : '(optionnel)'}</Text>
      <TouchableOpacity style={styles.dateInput} onPress={() => setShow(true)}>
        <Text style={value ? styles.dateText : styles.datePlaceholder}>
          {value || 'Sélectionner une date'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#b45f06" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) {
              const date = selectedDate.toISOString().split('T')[0];
              onConfirm(date);
              setTempDate(selectedDate);
            }
          }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle pré-déclaration</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#b45f06" />
          <Text style={styles.infoText}>
            Cette pré-déclaration sera transmise à l'autorité compétente.
            Une conversation sera créée pour vous permettre d'échanger.
          </Text>
        </View>

        {/* ✅ BANDEAU DE CONFIRMATION DE L'ORGANISATION SÉLECTIONNÉE */}
        {selectedOrgNom && (
          <View style={styles.orgConfirmBox}>
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={styles.orgConfirmText}>
              Organisation destinataire : <Text style={styles.orgConfirmBold}>{selectedOrgNom}</Text>
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Autorité destinataire *</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#b45f06" />
          ) : (
            <View style={styles.orgContainer}>
              {organisations.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={[styles.orgOption, selectedOrg === org.id && styles.orgOptionActive]}
                  onPress={() => {
                    console.log('📌 Organisation sélectionnée manuellement:', org.id, org.nom);
                    setSelectedOrg(org.id);
                    setSelectedOrgNom(org.nom);
                  }}
                >
                  <View>
                    <Text style={[styles.orgOptionText, selectedOrg === org.id && styles.orgOptionTextActive]}>
                      {org.nom}
                    </Text>
                    <Text style={styles.orgOptionType}>{org.type_organisation}</Text>
                  </View>
                  {selectedOrg === org.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#b45f06" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sexe</Text>
          {renderSexeOptions()}
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Nom de la personne"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Prénom"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {renderDatePicker(
          'Date de naissance',
          dateNaissance,
          setDateNaissance,
          showDateNaissancePicker,
          setShowDateNaissancePicker
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Nationalité</Text>
          <TextInput
            style={styles.input}
            value={nationalite}
            onChangeText={setNationalite}
            placeholder="Camerounaise"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {renderDatePicker(
          'Date de disparition *',
          dateDisparition,
          setDateDisparition,
          showDateDisparitionPicker,
          setShowDateDisparitionPicker
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Lieu de disparition</Text>
          <TextInput
            style={styles.input}
            value={lieuDisparition}
            onChangeText={setLieuDisparition}
            placeholder="Lieu exact"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={styles.input}
              value={villeDisparition}
              onChangeText={setVilleDisparition}
              placeholder="Ville"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Région</Text>
            <TextInput
              style={styles.input}
              value={regionDisparition}
              onChangeText={setRegionDisparition}
              placeholder="Région"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Circonstances *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={circonstances}
            onChangeText={setCirconstances}
            placeholder="Décrivez les circonstances de la disparition..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Informations complémentaires</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={infosComplementaires}
            onChangeText={setInfosComplementaires}
            placeholder="Toute information utile..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionTitle}>📞 Contact (optionnel)</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nom du contact</Text>
          <TextInput
            style={styles.input}
            value={contactNom}
            onChangeText={setContactNom}
            placeholder="Nom"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={contactTelephone}
              onChangeText={setContactTelephone}
              placeholder="Téléphone"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Message initial (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={messageInitial}
            onChangeText={setMessageInitial}
            placeholder="Un message pour l'autorité..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Envoyer la pré-déclaration</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fefce8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  infoText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 16 },

  orgConfirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  orgConfirmText: { fontSize: 13, color: '#166534' },
  orgConfirmBold: { fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0b1c30', marginTop: 8, marginBottom: 12 },

  field: { marginBottom: 14 },
  fieldHalf: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },

  label: { fontSize: 13, fontWeight: '600', color: '#0b1c30', marginBottom: 4 },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0b1c30',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  sexeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sexeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  sexeOptionActive: { borderColor: '#b45f06', backgroundColor: '#fefce8' },
  sexeOptionText: { fontSize: 13, color: '#64748b' },
  sexeOptionTextActive: { color: '#b45f06', fontWeight: '600' },

  orgContainer: { gap: 8 },
  orgOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  orgOptionActive: { borderColor: '#b45f06', backgroundColor: '#fefce8' },
  orgOptionText: { fontSize: 14, fontWeight: '500', color: '#0b1c30' },
  orgOptionTextActive: { color: '#b45f06' },
  orgOptionType: { fontSize: 12, color: '#94a3b8' },

  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateText: { fontSize: 14, color: '#0b1c30' },
  datePlaceholder: { fontSize: 14, color: '#94a3b8' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#b45f06',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});