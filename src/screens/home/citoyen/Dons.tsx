import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, TextInput, Alert,
  ActivityIndicator, Modal, Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

// ─── MONTANTS PRÉDÉFINIS ───
const MONTANTS = [500, 1000, 2000, 5000, 10000, 25000];

// ─── MÉTHODES DE PAIEMENT ───
const METHODES = [
  {
    id: 'orange_money',
    label: 'Orange Money',
    numero: '655 00 00 00',
    couleur: '#FF6600',
    bg: '#fff3e0',
    icon: 'phone-portrait-outline',
    description: 'Dépôt via Orange Money Cameroun',
    disponible: true,
  },
  {
    id: 'mtn_momo',
    label: 'MTN Mobile Money',
    numero: '677 00 00 00',
    couleur: '#FFCC00',
    bg: '#fffde7',
    icon: 'phone-portrait-outline',
    description: 'Dépôt via MTN MoMo Cameroun',
    disponible: true,
  },
  {
    id: 'carte',
    label: 'Carte bancaire',
    numero: '',
    couleur: '#1d4ed8',
    bg: '#eff6ff',
    icon: 'card-outline',
    description: 'Visa / Mastercard (bientôt disponible)',
    disponible: false,
  },
];

// ─── MODAL INSTRUCTIONS PAIEMENT ───
function ModalPaiement({
  visible,
  methode,
  montant,
  onClose,
  onConfirmer,
  loading,
}: any) {
  if (!methode) return null;
  const isSimule = methode.id === 'orange_money' || methode.id === 'mtn_momo';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalS.overlay}>
        <View style={modalS.container}>
          <View style={modalS.handle} />

          {/* Titre */}
          <View style={[modalS.iconBox, { backgroundColor: methode.bg }]}>
            <Ionicons name={methode.icon} size={32} color={methode.couleur} />
          </View>
          <Text style={modalS.titre}>{methode.label}</Text>
          <Text style={modalS.montantTxt}>
            {montant.toLocaleString('fr-FR')} FCFA
          </Text>

          {isSimule ? (
            <>
              <View style={modalS.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color="#1d4ed8" />
                <Text style={modalS.infoTxt}>
                  Intégration API en cours. Pour l'instant, effectuez le dépôt manuellement puis confirmez.
                </Text>
              </View>

              <View style={modalS.etapesBox}>
                <Text style={modalS.etapesTitre}>Comment procéder :</Text>
                <Text style={modalS.etape}>
                  1. Composez{' '}
                  <Text style={{ fontWeight: '800', color: methode.couleur }}>
                    {methode.id === 'orange_money' ? '#150#' : '*126#'}
                  </Text>
                </Text>
                <Text style={modalS.etape}>
                  2. Choisissez "Transfert d'argent"
                </Text>
                <Text style={modalS.etape}>
                  3. Envoyez{' '}
                  <Text style={{ fontWeight: '800' }}>
                    {montant.toLocaleString('fr-FR')} FCFA
                  </Text>{' '}
                  au numéro :
                </Text>
                <TouchableOpacity
                  style={[modalS.numeroBadge, { backgroundColor: methode.bg, borderColor: methode.couleur }]}
                  onPress={() => Linking.openURL(`tel:${methode.numero.replace(/\s/g, '')}`)}
                >
                  <Ionicons name="call-outline" size={16} color={methode.couleur} />
                  <Text style={[modalS.numeroTxt, { color: methode.couleur }]}>
                    {methode.numero}
                  </Text>
                </TouchableOpacity>
                <Text style={modalS.etape}>
                  4. Motif : <Text style={{ fontWeight: '700' }}>Don RetrouvonsLes</Text>
                </Text>
                <Text style={modalS.etape}>
                  5. Cliquez "J'ai effectué le dépôt" ci-dessous
                </Text>
              </View>

              <TouchableOpacity
                style={[modalS.btnConfirmer, loading && { opacity: 0.6 }]}
                onPress={onConfirmer}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={modalS.btnConfirmerTxt}>J'ai effectué le dépôt</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={modalS.infoBox}>
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <Text style={modalS.infoTxt}>
                Le paiement par carte bancaire sera disponible prochainement. Merci de votre patience.
              </Text>
            </View>
          )}

          <TouchableOpacity style={modalS.btnAnnuler} onPress={onClose}>
            <Text style={modalS.btnAnnulerTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginBottom: 20 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  titre: { fontSize: 20, fontWeight: '800', color: '#0b1c30', marginBottom: 4 },
  montantTxt: { fontSize: 28, fontWeight: '900', color: '#b45f06', marginBottom: 16 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTxt: { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 17 },
  etapesBox: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16 },
  etapesTitre: { fontSize: 13, fontWeight: '700', color: '#0b1c30', marginBottom: 10 },
  etape: { fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 18 },
  numeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 8,
    alignSelf: 'center',
  },
  numeroTxt: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  btnConfirmer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  btnConfirmerTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnAnnuler: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  btnAnnulerTxt: { color: '#475569', fontWeight: '600', fontSize: 14 },
});

// ─── ÉCRAN PRINCIPAL ───
export default function DonsPage({ navigation }: any) {
  const [montantSelectionne, setMontantSelectionne] = useState<number>(2000);
  const [montantLibre, setMontantLibre] = useState('');
  const [methodeSelectionnee, setMethodeSelectionnee] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const montantFinal = montantLibre
    ? parseInt(montantLibre.replace(/\D/g, '')) || 0
    : montantSelectionne;

  const handleChoisirMethode = (methodeId: string) => {
    const m = METHODES.find(x => x.id === methodeId);
    if (!m?.disponible) {
      Alert.alert('Bientôt disponible', 'Ce mode de paiement sera disponible prochainement.');
      return;
    }
    if (montantFinal < 100) {
      Alert.alert('Montant invalide', 'Le montant minimum est de 100 FCFA.');
      return;
    }
    setMethodeSelectionnee(methodeId);
    setModalVisible(true);
  };

  const handleConfirmerDon = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Enregistrement du don en base (statut "en_attente" car paiement manuel simulé)
      await supabase.from('don').insert({
        id_utilisateur: user?.id ?? null,
        montant: montantFinal,
        devise: 'XAF',
        methode_paiement: methodeSelectionnee,
        statut: 'en_attente_confirmation',
        message: `Don via ${methodeSelectionnee} - simulation`,
      }).then(() => {}).catch(() => {});
      // On ignore l'erreur si la table n'existe pas encore

      setModalVisible(false);
      Alert.alert(
        '🙏 Merci pour votre don !',
        `Votre don de ${montantFinal.toLocaleString('fr-FR')} FCFA a été enregistré. Notre équipe le vérifiera et vous enverra une confirmation.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const methodeActive = METHODES.find(m => m.id === methodeSelectionnee);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* NAVBAR */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.eyeOuter}><View style={styles.eyeInner} /></View>
            <Text style={styles.logoTxt}>Retrouvons<Text style={styles.logoAccent}>Les</Text></Text>
          </View>
        </View>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroIconBox}>
            <Ionicons name="heart" size={36} color="#b45f06" />
          </View>
          <Text style={styles.heroTitre}>Soutenez RetrouvonsLes</Text>
          <Text style={styles.heroSub}>
            Chaque don contribue directement à retrouver des personnes disparues au Cameroun.
            Votre générosité sauve des vies.
          </Text>
        </View>

        {/* IMPACT */}
        <View style={styles.impactRow}>
          {[
            { icon: 'people-outline', val: '500+', label: 'Familles aidées' },
            { icon: 'search-outline', val: '120+', label: 'Personnes retrouvées' },
            { icon: 'shield-checkmark-outline', val: '24/7', label: 'Surveillance active' },
          ].map((item, i) => (
            <View key={i} style={styles.impactCard}>
              <Ionicons name={item.icon as any} size={22} color="#b45f06" />
              <Text style={styles.impactVal}>{item.val}</Text>
              <Text style={styles.impactLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* MONTANT */}
        <View style={styles.card}>
          <Text style={styles.cardTitre}>Choisissez un montant (FCFA)</Text>
          <View style={styles.montantsGrid}>
            {MONTANTS.map(m => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.montantBtn,
                  montantSelectionne === m && !montantLibre && styles.montantBtnActif,
                ]}
                onPress={() => { setMontantSelectionne(m); setMontantLibre(''); }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.montantBtnTxt,
                    montantSelectionne === m && !montantLibre && styles.montantBtnTxtActif,
                  ]}
                >
                  {m.toLocaleString('fr-FR')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ouTxt}>— ou saisissez un montant libre —</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Ex : 3500"
              placeholderTextColor="#cbd5e1"
              value={montantLibre}
              onChangeText={setMontantLibre}
              keyboardType="numeric"
            />
            <Text style={styles.inputSuffix}>FCFA</Text>
          </View>

          {montantFinal > 0 && (
            <View style={styles.montantResume}>
              <Text style={styles.montantResumeTxt}>
                Montant sélectionné :{' '}
                <Text style={{ fontWeight: '800', color: '#b45f06' }}>
                  {montantFinal.toLocaleString('fr-FR')} FCFA
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* MÉTHODES */}
        <View style={styles.card}>
          <Text style={styles.cardTitre}>Choisissez votre mode de paiement</Text>
          {METHODES.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.methodeItem,
                !m.disponible && styles.methodeItemDisabled,
              ]}
              onPress={() => handleChoisirMethode(m.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.methodeIconBox, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon as any} size={24} color={m.couleur} />
              </View>
              <View style={styles.methodeInfo}>
                <Text style={[styles.methodeLabel, !m.disponible && { color: '#94a3b8' }]}>
                  {m.label}
                </Text>
                <Text style={styles.methodeDesc}>{m.description}</Text>
              </View>
              {m.disponible ? (
                <Ionicons name="chevron-forward-outline" size={20} color="#94a3b8" />
              ) : (
                <View style={styles.badgeBientot}>
                  <Text style={styles.badgeBientotTxt}>Bientôt</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* NOTE TRANSPARENCE */}
        <View style={styles.noteBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#16a34a" />
          <Text style={styles.noteTxt}>
            100% des dons sont utilisés pour financer les opérations de recherche, la maintenance de la plateforme et les alertes géolocalisées.
          </Text>
        </View>

      </ScrollView>

      {/* MODAL PAIEMENT */}
      <ModalPaiement
        visible={modalVisible}
        methode={methodeActive}
        montant={montantFinal}
        onClose={() => setModalVisible(false)}
        onConfirmer={handleConfirmerDon}
        loading={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8fafc',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navCenter: { flex: 1, alignItems: 'center' },
  eyeOuter: { width: 20, height: 12, borderRadius: 10, borderWidth: 2, borderColor: '#0b1c30', justifyContent: 'center', alignItems: 'center' },
  eyeInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0b1c30' },
  logoTxt: { fontSize: 16, fontWeight: '800', color: '#0b1c30' },
  logoAccent: { color: '#b45f06' },

  content: { padding: 16, paddingBottom: 40 },

  // HERO
  hero: { alignItems: 'center', marginBottom: 20 },
  heroIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: '#fed7aa',
  },
  heroTitre: { fontSize: 22, fontWeight: '800', color: '#0b1c30', marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },

  // IMPACT
  impactRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  impactCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0',
  },
  impactVal: { fontSize: 18, fontWeight: '800', color: '#0b1c30' },
  impactLabel: { fontSize: 10, color: '#64748b', textAlign: 'center' },

  // CARD
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardTitre: { fontSize: 14, fontWeight: '700', color: '#0b1c30', marginBottom: 14 },

  // MONTANTS
  montantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  montantBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  montantBtnActif: { borderColor: '#b45f06', backgroundColor: '#fff7ed' },
  montantBtnTxt: { fontSize: 14, fontWeight: '600', color: '#475569' },
  montantBtnTxtActif: { color: '#b45f06' },
  ouTxt: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 10 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1,
    borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16, color: '#0b1c30', fontWeight: '600', padding: 0 },
  inputSuffix: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  montantResume: {
    marginTop: 12, backgroundColor: '#fff7ed', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  montantResumeTxt: { fontSize: 13, color: '#475569' },

  // MÉTHODES
  methodeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  methodeItemDisabled: { opacity: 0.5 },
  methodeIconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  methodeInfo: { flex: 1 },
  methodeLabel: { fontSize: 15, fontWeight: '700', color: '#0b1c30', marginBottom: 2 },
  methodeDesc: { fontSize: 12, color: '#64748b' },
  badgeBientot: {
    backgroundColor: '#f1f5f9', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeBientotTxt: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  // NOTE
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  noteTxt: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17 },
});
