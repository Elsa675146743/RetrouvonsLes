import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../services/supabase';

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
const SignalementsAttente = ({ navigation }: any) => {
  const [signalements, setSignalements] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [validating, setValidating]     = useState<string | null>(null);

  // =====================================================
  // CHARGEMENT DES SIGNALEMENTS EN ATTENTE
  // =====================================================
  const fetchSignalements = async () => {
    try {
      const { data, error } = await supabase
        .from('signalement')
        .select(`
          id,
          numero_signalement,
          description,
          date_observation,
          lieu_observation,
          ville_observation,
          region_observation,
          niveau_certitude,
          statut_validation,
          created_at,
          contexte_observation,
          etat_personne_observee,
          temoin_anonyme,
          nom_temoin,
          source_signalement,
          utilisateur:id_utilisateur (
            nom,
            prenom,
            telephone
          ),
          dossier:id_dossier (
            id,
            numero_dossier,
            personne:id_personne (
              nom,
              prenom
            )
          )
        `)
        .eq('statut_validation', 'en_attente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignalements(data || []);
    } catch (err) {
      console.error('Erreur signalements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recharge à chaque fois qu'on arrive sur cet écran
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSignalements();
    }, [])
  );

  // =====================================================
  // VALIDATION D'UN SIGNALEMENT
  // =====================================================
  const handleValider = (signalement: any) => {
    Alert.alert(
      'Valider ce signalement',
      `Voulez-vous valider le signalement ${signalement.numero_signalement || signalement.id.slice(-6).toUpperCase()} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            setValidating(signalement.id);
            try {
              const { error } = await supabase
                .from('signalement')
                .update({
                  statut_validation: 'valide',
                  date_verification: new Date().toISOString(),
                })
                .eq('id', signalement.id);

              if (error) throw error;

              // Retire immédiatement de la liste sans recharger
              setSignalements(prev => prev.filter(s => s.id !== signalement.id));
              Alert.alert('✅ Validé', 'Le signalement a été validé avec succès.');
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de valider ce signalement.');
            } finally {
              setValidating(null);
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // REJET D'UN SIGNALEMENT
  // =====================================================
  const handleRejeter = (signalement: any) => {
    Alert.alert(
      'Rejeter ce signalement',
      'Voulez-vous rejeter ce signalement ? Il sera marqué comme invalide.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            setValidating(signalement.id);
            try {
              const { error } = await supabase
                .from('signalement')
                .update({
                  statut_validation: 'invalide',
                  date_verification: new Date().toISOString(),
                })
                .eq('id', signalement.id);

              if (error) throw error;

              // Retire immédiatement de la liste
              setSignalements(prev => prev.filter(s => s.id !== signalement.id));
              Alert.alert('❌ Rejeté', 'Le signalement a été rejeté.');
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de rejeter ce signalement.');
            } finally {
              setValidating(null);
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FILTRAGE LOCAL
  // =====================================================
  const filteredSignalements = signalements.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.description?.toLowerCase().includes(q) ||
      s.lieu_observation?.toLowerCase().includes(q) ||
      s.ville_observation?.toLowerCase().includes(q) ||
      s.numero_signalement?.toLowerCase().includes(q) ||
      s.dossier?.numero_dossier?.toLowerCase().includes(q) ||
      `${s.dossier?.personne?.prenom || ''} ${s.dossier?.personne?.nom || ''}`.toLowerCase().includes(q)
    );
  });

  // Couleur certitude
  const getCertitudeStyle = (certitude: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      certain:       { bg: '#f0fdf4', text: '#166534' },
      tres_probable: { bg: '#eff6ff', text: '#1e40af' },
      probable:      { bg: '#fef3c7', text: '#92400e' },
      incertain:     { bg: '#f1f5f9', text: '#64748b' },
      doute:         { bg: '#fee2e2', text: '#991b1b' },
    };
    return map[certitude] || { bg: '#f1f5f9', text: '#64748b' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <Text style={styles.appTitle}>RetrouvonsLes</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSignalements(); }}
          />
        }
      >
        {/* TITRE */}
        <Text style={styles.pageTitle}>Signalements en attente</Text>

        {/* NOTE INFO */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold' }}>Note : </Text>
            En tant qu'opérateur, vous pouvez consulter les signalements en attente de validation liés à votre organisation. La validation est effectuée par les modérateurs (niveau 3+).
          </Text>
        </View>

        {/* BARRE RECHERCHE + BOUTON ACTUALISER */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par description, lieu, numéro de dossier..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.btnActualiser}
            onPress={() => { setLoading(true); fetchSignalements(); }}
          >
            <Ionicons name="refresh-outline" size={16} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.btnActualiserText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {/* BADGE COMPTEUR */}
        <View style={styles.compteurBadge}>
          <Ionicons name="time-outline" size={14} color="#92400e" style={{ marginRight: 6 }} />
          <Text style={styles.compteurText}>
            {loading ? '...' : filteredSignalements.length} signalement(s) en attente
          </Text>
        </View>

        {/* CONTENU */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Chargement des signalements...</Text>
          </View>
        ) : filteredSignalements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="alert-circle-outline" size={40} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Aucun signalement en attente de traitement'}
            </Text>
          </View>
        ) : (
          filteredSignalements.map((item) => {
            const certitudeStyle = getCertitudeStyle(item.niveau_certitude);
            const isValidating   = validating === item.id;
            const nomPersonne    = item.dossier?.personne
              ? `${item.dossier.personne.prenom || ''} ${item.dossier.personne.nom || ''}`.trim()
              : 'Personne inconnue';

            return (
              <View key={item.id} style={styles.card}>

                {/* HEADER CARTE */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardNumero}>
                      {item.numero_signalement || `SIG-${item.id.slice(-6).toUpperCase()}`}
                    </Text>
                    {item.dossier?.numero_dossier && (
                      <Text style={styles.cardDossier}>
                        📁 {item.dossier.numero_dossier}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.certitudeBadge, { backgroundColor: certitudeStyle.bg }]}>
                    <Text style={[styles.certitudeText, { color: certitudeStyle.text }]}>
                      {item.niveau_certitude?.replace(/_/g, ' ') || 'inconnu'}
                    </Text>
                  </View>
                </View>

                {/* PERSONNE CONCERNÉE */}
                <View style={styles.personneRow}>
                  <Ionicons name="person-outline" size={14} color="#2563eb" />
                  <Text style={styles.personneNom}>{nomPersonne}</Text>
                </View>

                <View style={styles.divider} />

                {/* DESCRIPTION */}
                <Text style={styles.description} numberOfLines={3}>
                  {item.description || '—'}
                </Text>

                {/* INFOS */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText} numberOfLines={1}>
                      {item.ville_observation || item.lieu_observation || '—'}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText}>
                      {item.date_observation
                        ? new Date(item.date_observation).toLocaleDateString('fr-FR')
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="phone-portrait-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText}>
                      {item.source_signalement?.replace(/_/g, ' ') || '—'}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText}>
                      {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>

                {/* TÉMOIN */}
                {!item.temoin_anonyme && item.nom_temoin && (
                  <View style={styles.temoinRow}>
                    <Ionicons name="person-circle-outline" size={13} color="#8b5cf6" />
                    <Text style={styles.temoinText}>
                      Témoin : {item.nom_temoin}
                    </Text>
                  </View>
                )}
                {item.temoin_anonyme && (
                  <View style={styles.temoinRow}>
                    <Ionicons name="eye-off-outline" size={13} color="#94a3b8" />
                    <Text style={[styles.temoinText, { color: '#94a3b8' }]}>
                      Signalement anonyme
                    </Text>
                  </View>
                )}

                {/* Auteur si connecté */}
                {item.utilisateur && (
                  <View style={styles.temoinRow}>
                    <Ionicons name="person-outline" size={13} color="#64748b" />
                    <Text style={styles.temoinText}>
                      Par : {item.utilisateur.prenom} {item.utilisateur.nom}
                    </Text>
                  </View>
                )}

                {/* BOUTONS ACTION */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.btnRejeter, isValidating && { opacity: 0.5 }]}
                    onPress={() => handleRejeter(item)}
                    disabled={isValidating}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                    <Text style={styles.btnRejeterText}>Rejeter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnValider, isValidating && { opacity: 0.5 }]}
                    onPress={() => handleValider(item)}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                        <Text style={styles.btnValiderText}>Valider</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  appHeader:          { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  appHeaderLeft:      { flexDirection: 'row', alignItems: 'center' },
  appTitle:           { fontSize: 18, fontWeight: '800', color: '#1e293b', marginLeft: 10 },
  scrollContent:      { padding: 16, paddingBottom: 40 },
  pageTitle:          { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },

  // Info box
  infoBox:            { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#dbeafe' },
  infoText:           { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },

  // Recherche
  searchRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  searchContainer:    { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput:        { flex: 1, fontSize: 13, color: '#1e293b', marginLeft: 8 },
  btnActualiser:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, height: 44 },
  btnActualiserText:  { color: '#2563eb', fontWeight: '600', fontSize: 13 },

  // Compteur
  compteurBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 20, borderWidth: 1, borderColor: '#fde68a' },
  compteurText:       { fontSize: 13, color: '#92400e', fontWeight: '600' },

  // Loading / Empty
  centerContainer:    { alignItems: 'center', marginTop: 60 },
  loadingText:        { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  emptyContainer:     { alignItems: 'center', marginTop: 60 },
  emptyIconCircle:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText:          { color: '#94a3b8', fontSize: 15, textAlign: 'center' },

  // Carte
  card:               { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderLeft:     { flex: 1, marginRight: 8 },
  cardNumero:         { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  cardDossier:        { fontSize: 12, color: '#2563eb', marginTop: 2, fontWeight: '600' },
  certitudeBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  certitudeText:      { fontSize: 11, fontWeight: 'bold' },
  personneRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  personneNom:        { marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  divider:            { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },
  description:        { fontSize: 13, color: '#334155', lineHeight: 18, marginBottom: 12 },
  infoGrid:           { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  infoItem:           { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 6 },
  infoItemText:       { marginLeft: 5, fontSize: 11, color: '#64748b', flex: 1 },
  temoinRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  temoinText:         { marginLeft: 6, fontSize: 12, color: '#64748b', fontStyle: 'italic' },

  // Boutons
  cardActions:        { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14 },
  btnRejeter:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff1f2', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
  btnRejeterText:     { color: '#ef4444', fontWeight: '600', marginLeft: 6, fontSize: 13 },
  btnValider:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 8 },
  btnValiderText:     { color: '#FFF', fontWeight: '600', marginLeft: 6, fontSize: 13 },
});

export default SignalementsAttente;