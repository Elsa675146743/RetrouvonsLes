import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, Alert, ActivityIndicator, Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';


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
              <Text style={[sStyles.circleText, etape >= e.num && sStyles.circleTextActive]}>{e.num}</Text>
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function NouveauDossierVerification({ navigation, route }: any) {
  const { personData, disparitionData } = route.params || {};
  const [loading, setLoading] = useState(false);

  const getUrgenceColor = (u: string) => {
    const map: Record<string, string> = {
      faible: '#16a34a', normal: '#f59e0b', urgent: '#f97316', critique: '#dc2626',
    };
    return map[u] || '#64748b';
  };

  const handleCreerDossier = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // 1. Créer la personne
      const { data: personne, error: errPersonne } = await supabase
        .from('personne')
        .insert({
          nom:                  personData.nom,
          prenom:               personData.prenom,
          nom_complet:          `${personData.prenom} ${personData.nom}`,
          date_naissance:       personData.dateNaissance || null,
          sexe:                 personData.sexe || 'non_precise',
          nationalite:          personData.nationalite || 'Camerounaise',
          taille_cm:            personData.taille || null,
          poids_kg:             personData.poids || null,
          couleur_yeux:         personData.couleurYeux || null,
          couleur_cheveux:      personData.couleurCheveux || null,
          signes_distinctifs:   personData.signesDistinctifs || null,
          description_physique: personData.description || null,
          cree_par:             user.id,
        })
        .select()
        .single();

      if (errPersonne) throw errPersonne;

      // 2. Créer le dossier
      const { data: dossier, error: errDossier } = await supabase
        .from('dossier_disparition')
        .insert({
          numero_dossier:            `DISP-TEMP-${Date.now()}`,
          date_disparition:          new Date().toISOString(),
          lieu_disparition:          disparitionData.lieu,
          ville_disparition:         disparitionData.ville || null,
          pays_disparition:          disparitionData.pays || 'Cameroun',
          latitude_disparition:      disparitionData.latitude || null,
          longitude_disparition:     disparitionData.longitude || null,
          circonstances:             disparitionData.circonstances,
          type_disparition:          'inconnue',
          derniere_activite_connue:  disparitionData.derniereActivite || null,
          niveau_urgence:            disparitionData.urgence || 'normal',
          contact_famille_principale: disparitionData.contactNom || null,
          telephone_contact:         disparitionData.contactTel || null,
          email_contact:             disparitionData.contactEmail || null,
          visible_public:            disparitionData.visiblePublic ?? true,
          diffusion_autorisee:       disparitionData.diffusionAutorisee ?? true,
          id_personne:               personne.id,
          id_utilisateur_createur:   user.id,
        })
        .select()
        .single();

      if (errDossier) throw errDossier;

      // 3. Journal
      await supabase.from('journal_activite').insert({
        type_action:      'creation_dossier',
        action_detaillee: `Dossier créé pour ${personData.prenom} ${personData.nom}`,
        description:      `Dossier ${dossier.numero_dossier} créé`,
        id_utilisateur:   user.id,
        id_dossier:       dossier.id,
      });

     navigation.navigate('DetailDossierPage', { dossierId: dossier.id });

    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de créer le dossier.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerSub}>Étape 3 sur 3 - Vérification</Text>
        </View>
      </View>

      <Stepper etape={3} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.verificationHeader}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#1e293b" />
          <Text style={styles.verificationTitle}>Vérification et Confirmation</Text>
        </View>

        <View style={styles.resumeGrid}>

          <View style={styles.resumeCard}>
            <View style={styles.resumeCardHeader}>
              <Ionicons name="person-outline" size={16} color="#2563eb" />
              <Text style={styles.resumeCardTitle}>Personne</Text>
            </View>
            <InfoRow label="Nom"               value={`${personData?.prenom} ${personData?.nom}`} />
            <InfoRow label="Date de naissance" value={personData?.dateNaissance} />
            <InfoRow label="Sexe"              value={personData?.sexe} />
            <InfoRow label="Taille"            value={personData?.taille ? `${personData.taille} cm` : null} />
            <InfoRow label="Photos"            value={personData?.photos?.length ? `${personData.photos.length} photo(s)` : 'Aucune'} />
          </View>

          <View style={styles.resumeCard}>
            <View style={styles.resumeCardHeader}>
              <Ionicons name="location-outline" size={16} color="#2563eb" />
              <Text style={styles.resumeCardTitle}>Disparition</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Urgence:</Text>
              <View style={[styles.urgenceBadge, { backgroundColor: getUrgenceColor(disparitionData?.urgence || 'normal') + '20' }]}>
                <Text style={[styles.urgenceBadgeText, { color: getUrgenceColor(disparitionData?.urgence || 'normal') }]}>
                  {disparitionData?.urgence?.toUpperCase() || 'NORMAL'}
                </Text>
              </View>
            </View>
            <InfoRow label="Date"  value={disparitionData?.dateDisparition} />
            <InfoRow label="Lieu"  value={`${disparitionData?.lieu || '—'}${disparitionData?.pays ? ', ' + disparitionData.pays : ''}`} />
            <InfoRow label="Ville" value={disparitionData?.ville} />
            {disparitionData?.latitude && disparitionData?.longitude && (
              <InfoRow label="Coordonnées" value={`${Number(disparitionData.latitude).toFixed(6)}, ${Number(disparitionData.longitude).toFixed(6)}`} />
            )}
          </View>

          <View style={styles.resumeCard}>
            <View style={styles.resumeCardHeader}>
              <Ionicons name="call-outline" size={16} color="#2563eb" />
              <Text style={styles.resumeCardTitle}>Contact</Text>
            </View>
            <InfoRow label="Nom"       value={disparitionData?.contactNom} />
            <InfoRow label="Téléphone" value={disparitionData?.contactTel} />
            <InfoRow label="Email"     value={disparitionData?.contactEmail} />
            {!disparitionData?.contactNom && !disparitionData?.contactTel && (
              <Text style={styles.noData}>Aucun contact renseigné</Text>
            )}
          </View>

          <View style={styles.resumeCard}>
            <View style={styles.resumeCardHeader}>
              <Ionicons name="settings-outline" size={16} color="#2563eb" />
              <Text style={styles.resumeCardTitle}>Options</Text>
            </View>
            <InfoRow label="Visible au public"   value={disparitionData?.visiblePublic ? 'Oui' : 'Non'} />
            <InfoRow label="Diffusion autorisée" value={disparitionData?.diffusionAutorisee ? 'Oui' : 'Non'} />
          </View>
        </View>

        {/* PHOTOS */}
        {personData?.photos?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera-outline" size={18} color="#1e293b" />
              <Text style={styles.sectionCardTitle}>Photos</Text>
            </View>
            <View style={styles.photosRow}>
              {personData.photos.map((p: any, i: number) => (
                <Image key={i} source={{ uri: p.uri }} style={styles.photoThumb} />
              ))}
            </View>
          </View>
        )}

        {/* CIRCONSTANCES */}
        {disparitionData?.circonstances && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color="#1e293b" />
              <Text style={styles.sectionCardTitle}>Circonstances</Text>
            </View>
            <Text style={styles.circonstancesText}>{disparitionData.circonstances}</Text>
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnModifier} onPress={() => navigation.goBack()}>
          <Text style={styles.btnModifierText}>← Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnCreer, loading && styles.btnCreerDisabled]}
          onPress={handleCreerDossier}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.btnCreerText}>Créer le Dossier</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle:        { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  headerSub:          { fontSize: 11, color: '#64748b', marginTop: 1 },
  scrollContent:      { padding: 16, paddingBottom: 20 },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  verificationTitle:  { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  resumeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  resumeCard:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', width: '47%' },
  resumeCardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resumeCardTitle:    { fontSize: 13, fontWeight: 'bold', color: '#2563eb' },
  infoRow:            { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 4, flexWrap: 'wrap' },
  infoLabel:          { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  infoValue:          { fontSize: 11, color: '#475569', flex: 1 },
  noData:             { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  urgenceBadge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  urgenceBadgeText:   { fontSize: 10, fontWeight: 'bold' },
  sectionCard:        { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionCardTitle:   { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  photosRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb:         { width: 100, height: 100, borderRadius: 8, backgroundColor: '#f1f5f9' },
  circonstancesText:  { fontSize: 13, color: '#475569', lineHeight: 18 },
  footer:             { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnModifier:        { backgroundColor: '#64748b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnModifierText:    { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnCreer:           { backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, minWidth: 140, alignItems: 'center' },
  btnCreerDisabled:   { backgroundColor: '#94a3b8' },
  btnCreerText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
});