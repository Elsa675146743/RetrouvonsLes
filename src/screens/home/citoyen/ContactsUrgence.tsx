import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';
import {
  getContactsUrgence,
  addContactUrgence,
  deleteContactUrgence,
  envoyerVerificationContact,
  ContactUrgence,
  isContactVerifie,
} from '../../../services/sosApi';

export default function ContactsUrgence({ navigation }: any) {
  const [contacts, setContacts] = useState<ContactUrgence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Récupérer l'ID utilisateur
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getContactsUrgence();
      setContacts(data);
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      Alert.alert('Erreur', 'Impossible de charger vos contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [fetchContacts])
  );

  // 🔥 REAL TIME : écouter les changements sur contact_urgence
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('contact_urgence_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contact_urgence',
          filter: `id_utilisateur=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Mise à jour contact en temps réel:', payload.new);
          const updated = payload.new as ContactUrgence;
          setContacts((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_urgence',
          filter: `id_utilisateur=eq.${userId}`,
        },
        (payload) => {
          console.log('➕ Nouveau contact ajouté en temps réel:', payload.new);
          const newContact = payload.new as ContactUrgence;
          setContacts((prev) => [newContact, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'contact_urgence',
          filter: `id_utilisateur=eq.${userId}`,
        },
        (payload) => {
          console.log('🗑️ Contact supprimé en temps réel:', payload.old);
          const deleted = payload.old as ContactUrgence;
          setContacts((prev) => prev.filter((c) => c.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAjouter = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez saisir un email valide');
      return;
    }

    setSubmitting(true);
    try {
      const newContact = await addContactUrgence(nom.trim(), email.trim(), relation.trim());
      // Le contact sera ajouté automatiquement via Realtime
      setNom('');
      setEmail('');
      setRelation('');
      setModalVisible(false);
      Alert.alert('✅ Contact ajouté', 'Un email de vérification va être envoyé.');

      // Envoyer l'email de vérification
      try {
        await envoyerVerificationContact(newContact.id);
      } catch (error) {
        console.error('Erreur envoi vérification:', error);
        Alert.alert(
          'Attention',
          'Le contact a été ajouté mais l\'email de vérification n\'a pas pu être envoyé. Vous pouvez réessayer depuis la liste.'
        );
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupprimer = (contact: ContactUrgence) => {
    Alert.alert(
      'Supprimer le contact',
      `Voulez-vous vraiment supprimer ${contact.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContactUrgence(contact.id);
              // Le contact sera supprimé automatiquement via Realtime
              Alert.alert('Contact supprimé');
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de supprimer le contact');
            }
          },
        },
      ]
    );
  };

  const handleRenvoiVerification = async (contact: ContactUrgence) => {
    try {
      await envoyerVerificationContact(contact.id);
      Alert.alert('Email envoyé', `Un email de vérification a été envoyé à ${contact.email}`);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'email');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contacts d'urgence</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#b45f06" />
        </TouchableOpacity>
      </View>

      {/* Explication */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#b45f06" />
        <Text style={styles.infoText}>
          Les contacts d'urgence recevront un email lorsque vous déclencherez un SOS.
          Chaque contact doit confirmer son email via le lien reçu.
        </Text>
      </View>

      {/* Liste des contacts */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchContacts().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b45f06" />
            <Text style={styles.loadingText}>Chargement des contacts...</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucun contact</Text>
            <Text style={styles.emptyText}>
              Ajoutez des contacts d'urgence qui seront prévenus en cas de SOS.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactNom}>{contact.nom}</Text>
                  {isContactVerifie(contact) ? (
                    <View style={styles.verifieBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                      <Text style={styles.verifieBadgeText}>Vérifié</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.nonVerifieBadge}
                      onPress={() => handleRenvoiVerification(contact)}
                    >
                      <Ionicons name="mail-outline" size={14} color="#f59e0b" />
                      <Text style={styles.nonVerifieBadgeText}>Vérifier</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.contactEmail}>{contact.email}</Text>
                {contact.relation && (
                  <Text style={styles.contactRelation}>📌 {contact.relation}</Text>
                )}
                <Text style={styles.contactDate}>
                  Ajouté le {new Date(contact.date_ajout).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleSupprimer(contact)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal d'ajout */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={modalStyles.container}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Ajouter un contact</Text>
            <Text style={modalStyles.subtitle}>
              Ce contact recevra un email en cas d'alerte SOS
            </Text>

            <Text style={modalStyles.label}>Nom *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Jean Dupont"
              placeholderTextColor="#94a3b8"
              value={nom}
              onChangeText={setNom}
            />

            <Text style={modalStyles.label}>Email *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="jean.dupont@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={modalStyles.label}>Relation</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Père, frère, ami..."
              placeholderTextColor="#94a3b8"
              value={relation}
              onChangeText={setRelation}
            />

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.buttonCancel]}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={modalStyles.buttonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.buttonSubmit, submitting && modalStyles.buttonDisabled]}
                onPress={handleAjouter}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.buttonSubmitText}>Ajouter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fefce8',
    borderRadius: 12,
    padding: 14,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  infoText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 16 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  loadingContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0b1c30' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactInfo: { flex: 1 },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactNom: { fontSize: 16, fontWeight: '700', color: '#0b1c30' },
  contactEmail: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  contactRelation: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  contactDate: { fontSize: 11, color: '#cbd5e1' },

  verifieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifieBadgeText: { fontSize: 10, fontWeight: '600', color: '#16a34a' },

  nonVerifieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  nonVerifieBadgeText: { fontSize: 10, fontWeight: '600', color: '#f59e0b' },

  deleteBtn: { padding: 8 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  handle: { width: 40, height: 4, backgroundColor: '#c6c6cd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#0b1c30', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#76777d', marginBottom: 20 },

  label: { fontSize: 13, fontWeight: '600', color: '#0b1c30', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonCancel: { backgroundColor: '#f1f5f9' },
  buttonCancelText: { fontSize: 14, fontWeight: '600', color: '#0b1c30' },
  buttonSubmit: { backgroundColor: '#b45f06' },
  buttonDisabled: { opacity: 0.5 },
  buttonSubmitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});