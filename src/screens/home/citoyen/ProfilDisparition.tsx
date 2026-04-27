import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Platform, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

export default function ProfilDisparition() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route      = useRoute<any>();
  const dossier_id = route.params?.dossier_id;

  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<any>(null);

  const fetchDossier = useCallback(async () => {
    if (!dossier_id) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('dossier_disparition')
        .select(`
          id, date_disparition, description, statut_dossier,
          personne (
            nom_complet, age, sexe, taille, poids,
            couleur_yeux, couleur_cheveux, signes_distinctifs,
            dernier_lieu_vu, condition_medicale, photo_url
          ),
          alerte ( id, statut_alerte, date_creation )
        `)
        .eq('id', dossier_id)
        .single();
      setDossier(data);
    } catch (err) {
      console.error('ProfilDisparition fetchDossier:', err);
    } finally {
      setLoading(false);
    }
  }, [dossier_id]);

  useEffect(() => { fetchDossier(); }, [fetchDossier]);

  const handlePartager = async () => {
    if (!dossier) return;
    const p = dossier.personne;
    await Share.share({
      message: `🔴 RetrouvonsLes — ${p?.nom_complet ?? 'Personne disparue'}${p?.age ? `, ${p.age} ans` : ''}${p?.dernier_lieu_vu ? `, vu(e) à ${p.dernier_lieu_vu}` : ''}. Aidez-nous à le/la retrouver.`,
    });
  };

  const getStatutLabel = (s: string) => {
    const m: Record<string, { label: string; color: string }> = {
      en_cours:  { label: 'RECHERCHE ACTIVE', color: '#c2410c' },
      amber:     { label: 'ALERTE AMBER',     color: '#1d4ed8' },
      silver:    { label: 'ALERTE SILVER',    color: '#475569' },
      resolue:   { label: 'RÉSOLUE',          color: '#16a34a' },
    };
    return m[s] ?? m['en_cours'];
  };

  const alerte   = dossier?.alerte?.[0];
  const personne = dossier?.personne;
  const statutCfg = getStatutLabel(alerte?.statut_alerte ?? 'en_cours');

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profil de disparition</Text>
        <TouchableOpacity onPress={handlePartager} style={s.shareBtn}>
          <Ionicons name="share-social-outline" size={22} color="#1e3a5f" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 60 }} />
      ) : !dossier ? (
        <View style={s.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={s.emptyTitle}>Dossier introuvable</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Photo zone */}
          <View style={s.photoZone}>
            <View style={s.photoPlaceholder}>
              <Ionicons name="person" size={80} color="#94a3b8" />
            </View>
            <View style={s.photoOverlay} />
            <View style={s.badgeAbsolute}>
              <View style={[s.badge, { backgroundColor: statutCfg.color }]}>
                <Text style={s.badgeText}>{statutCfg.label}</Text>
              </View>
            </View>
            <View style={s.nameOnPhoto}>
              <Text style={s.nameText}>{personne?.nom_complet ?? '—'}</Text>
              {personne?.age && (
                <Text style={s.ageText}>
                  {personne.age} ans
                  {personne.taille ? ` • ${personne.taille} cm` : ''}
                  {personne.poids  ? `, ${personne.poids} kg`   : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Infos principales */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Informations générales</Text>
            <InfoRow icon="person-outline"      label="Sexe"             value={personne?.sexe} />
            <InfoRow icon="location-outline"    label="Dernier lieu vu"  value={personne?.dernier_lieu_vu} />
            <InfoRow icon="calendar-outline"    label="Date disparition" value={dossier.date_disparition ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
            <InfoRow icon="eye-outline"         label="Couleur des yeux" value={personne?.couleur_yeux} />
            <InfoRow icon="color-palette-outline" label="Cheveux"        value={personne?.couleur_cheveux} />
            {personne?.signes_distinctifs && (
              <InfoRow icon="scan-outline" label="Signes distinctifs" value={personne.signes_distinctifs} />
            )}
            {personne?.condition_medicale && (
              <InfoRow icon="warning-outline" label="Condition médicale" value={personne.condition_medicale} warn />
            )}
          </View>

          {/* Description */}
          {dossier.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Description</Text>
              <Text style={s.descText}>{dossier.description}</Text>
            </View>
          )}

          {/* Boutons action */}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => navigation.navigate('NouveauSignalement', { alerte_id: alerte?.id })}
              activeOpacity={0.85}
            >
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={s.btnPrimaryText}>J'ai vu cette personne</Text>
            </TouchableOpacity>
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity
              style={s.btnSecondary}
              onPress={handlePartager}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={16} color="#1d4ed8" />
              <Text style={s.btnSecondaryText}>Partager ce profil</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, warn = false }: any) {
  if (!value) return null;
  return (
    <View style={iS.row}>
      <Ionicons name={icon} size={16} color={warn ? '#d97706' : '#64748b'} />
      <Text style={iS.label}>{label} :</Text>
      <Text style={[iS.value, warn && { color: '#92400e', fontStyle: 'italic' }]}>{value}</Text>
    </View>
  );
}

const iS = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 13, color: '#64748b', fontWeight: '600', minWidth: 130 },
  value: { fontSize: 13, color: '#1e3a5f', flex: 1, fontWeight: '500' },
});

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 50 : 14,
    backgroundColor: '#f0f4ff',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  shareBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#1e3a5f' },
  scrollContent: { paddingBottom: 60 },
  photoZone: {
    height: 260, backgroundColor: '#cbd5e1',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  badgeAbsolute: { position: 'absolute', top: 14, left: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#fff' },
  nameOnPhoto: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  nameText: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  ageText:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  descText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e3a5f' },
  btnRow: { marginHorizontal: 16, marginTop: 12 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#c2410c', borderRadius: 12,
    paddingVertical: 14, gap: 8,
  },
  btnPrimaryText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eff6ff', borderRadius: 12,
    paddingVertical: 14, borderWidth: 1, borderColor: '#bfdbfe', gap: 8,
  },
  btnSecondaryText: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
});