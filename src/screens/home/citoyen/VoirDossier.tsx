import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Dimensions, Platform, Image, Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

// ─── TYPES ───
interface DossierDetail {
  id: string;
  nom: string;
  prenom: string;
  age: number | null;
  sexe: string | null;
  taille: number | null;
  poids: number | null;
  couleur_cheveux: string | null;
  couleur_yeux: string | null;
  signes_distinctifs: string | null;
  dernier_lieu: string | null;
  ville: string | null;
  date_disparition: string | null;
  description: string | null;
  statut: string;
  photo_url: string | null;
  nb_vues: number;
  niveau_urgence: string | null;
}

// ─── BADGE STATUT ───
function BadgeStatut({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    en_cours: { label: 'EN COURS', bg: '#fef3c7', color: '#d97706' },
    resolu:   { label: 'RÉSOLU',   bg: '#dcfce7', color: '#16a34a' },
    archive:  { label: 'ARCHIVÉ', bg: '#f1f5f9', color: '#64748b' },
  };
  const s = map[statut] ?? { label: statut.toUpperCase(), bg: '#f1f5f9', color: '#64748b' };
  return (
    <View style={[bS.badge, { backgroundColor: s.bg }]}>
      <Text style={[bS.text, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const bS = StyleSheet.create({
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  text:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});

// ─── ONGLETS ───
type Onglet = 'infos' | 'photos' | 'chronologie';

// ─── ÉCRAN PRINCIPAL ───
export default function VoirDossier({ route, navigation }: any) {
  const dossierParam = route.params?.dossier;
  const dossierId    = route.params?.id ?? dossierParam?.id;

  const [dossier, setDossier]   = useState<DossierDetail | null>(dossierParam ?? null);
  const [loading, setLoading]   = useState(!dossierParam);
  const [onglet, setOnglet]     = useState<Onglet>('infos');
  const [photos, setPhotos]     = useState<string[]>([]);
  const [chronologie, setChronologie] = useState<any[]>([]);

  // Durée depuis disparition
  const getDuree = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const jours = Math.floor(diff / 86400000);
    if (jours < 7)  return `${jours} jour${jours > 1 ? 's' : ''}`;
    if (jours < 30) return `${Math.floor(jours / 7)} semaine${Math.floor(jours / 7) > 1 ? 's' : ''}`;
    return `${Math.floor(jours / 30)} mois`;
  };

  useEffect(() => {
    if (!dossierId) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('personne')
          .select(`
            id, nom, prenom, age, sexe, taille, poids,
            couleur_cheveux, couleur_yeux, signes_distinctifs,
            dernier_lieu_vu, ville_disparition,
            date_disparition, informations_complementaires,
            statut_dossier, nb_vues, niveau_urgence,
            photo:photo(url)
          `)
          .eq('id', dossierId)
          .single();

        if (error) { console.warn('VoirDossier fetch:', error.message); return; }
        if (!data) return;

        setDossier({
          id:                 data.id,
          nom:                data.nom ?? '',
          prenom:             data.prenom ?? '',
          age:                data.age,
          sexe:               data.sexe,
          taille:             data.taille,
          poids:              data.poids,
          couleur_cheveux:    data.couleur_cheveux,
          couleur_yeux:       data.couleur_yeux,
          signes_distinctifs: data.signes_distinctifs,
          dernier_lieu:       data.dernier_lieu_vu,
          ville:              data.ville_disparition,
          date_disparition:   data.date_disparition,
          description:        data.informations_complementaires,
          statut:             data.statut_dossier ?? 'en_cours',
          photo_url:          data.photo?.[0]?.url ?? null,
          nb_vues:            data.nb_vues ?? 0,
          niveau_urgence:     data.niveau_urgence,
        });

        setPhotos((data.photo ?? []).map((p: any) => p.url).filter(Boolean));

        // Incrémenter nb_vues
        await supabase
          .from('personne')
          .update({ nb_vues: (data.nb_vues ?? 0) + 1 })
          .eq('id', dossierId);

        // Chronologie (signalements liés)
        const { data: chron } = await supabase
          .from('signalement')
          .select('id, description, created_at, statut_validation')
          .eq('id_personne', dossierId)
          .order('created_at', { ascending: false })
          .limit(20);
        setChronologie(chron ?? []);

      } catch (err) {
        console.error('VoirDossier:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [dossierId]);

  const handlePartager = async () => {
    if (!dossier) return;
    try {
      await Share.share({
        message: `🔍 Personne disparue : ${dossier.prenom} ${dossier.nom}, ${dossier.age} ans. Dernière fois vu(e) à ${dossier.dernier_lieu ?? dossier.ville}. Aidez-nous à retrouver cette personne sur RetrouvonsLes.`,
        title: `Disparition : ${dossier.prenom} ${dossier.nom}`,
      });
    } catch (e) {}
  };

  if (loading || !dossier) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1d4ed8" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const date = dossier.date_disparition
    ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const urgenceColor = {
    critique: '#ef4444',
    eleve:    '#f97316',
    moyen:    '#f59e0b',
    faible:   '#16a34a',
  }[dossier.niveau_urgence ?? 'faible'] ?? '#16a34a';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retourBtn}>
          <Ionicons name="chevron-back" size={18} color="#1e3a5f" />
          <Text style={styles.retourText}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HERO — Photo + identité */}
        <View style={styles.hero}>
          {/* Photo */}
          <View style={styles.photoBox}>
            {dossier.photo_url ? (
              <Image source={{ uri: dossier.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={52} color="#93c5fd" />
              </View>
            )}
          </View>

          {/* Identité */}
          <View style={styles.identite}>
            <Text style={styles.nomComplet}>{dossier.prenom} {dossier.nom}</Text>
            <View style={styles.badgesRow}>
              <BadgeStatut statut={dossier.statut} />
              {dossier.niveau_urgence && (
                <Text style={[styles.urgence, { color: urgenceColor }]}>
                  Niveau d'urgence : {dossier.niveau_urgence}
                </Text>
              )}
            </View>

            {/* Meta */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>Disparu depuis : {date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{getDuree(dossier.date_disparition)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{dossier.nb_vues} vues</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ACTIONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnSignaler}
            onPress={() => navigation.navigate('Signalement', { dossier })}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <Text style={styles.btnSignalerText}>Signaler un témoignage</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPartager} onPress={handlePartager} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={18} color="#1e3a5f" />
            <Text style={styles.btnPartagerText}>Partager</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* ONGLETS */}
        <View style={styles.onglets}>
          {(['infos', 'photos', 'chronologie'] as Onglet[]).map(o => (
            <TouchableOpacity
              key={o}
              style={[styles.ongletBtn, onglet === o && styles.ongletBtnActive]}
              onPress={() => setOnglet(o)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={o === 'infos' ? 'information-circle-outline' : o === 'photos' ? 'images-outline' : 'time-outline'}
                size={16}
                color={onglet === o ? '#1d4ed8' : '#94a3b8'}
              />
              <Text style={[styles.ongletText, onglet === o && styles.ongletTextActive]}>
                {o === 'infos' ? 'Informations' : o === 'photos' ? 'Photos' : 'Chronologie'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.ongletContent}>

          {/* ── ONGLET INFORMATIONS ── */}
          {onglet === 'infos' && (
            <View style={{ gap: 20 }}>

              {/* Description physique */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description physique</Text>
                <View style={styles.physGrid}>
                  {[
                    { label: 'ÂGE',               value: dossier.age ? `${dossier.age} ans` : '—' },
                    { label: 'SEXE',               value: dossier.sexe ?? '—' },
                    { label: 'TAILLE',             value: dossier.taille ? `${dossier.taille} cm` : '—' },
                    { label: 'POIDS',              value: dossier.poids ? `${dossier.poids} kg` : '—' },
                    { label: 'COULEUR DES CHEVEUX', value: dossier.couleur_cheveux ?? '—' },
                    { label: 'COULEUR DES YEUX',   value: dossier.couleur_yeux ?? '—' },
                  ].map((item, i) => (
                    <View key={i} style={styles.physItem}>
                      <Text style={styles.physLabel}>{item.label}</Text>
                      <Text style={styles.physValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Dernier lieu */}
              {(dossier.dernier_lieu || dossier.ville) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dernier lieu où vu</Text>
                  <View style={styles.lieuCard}>
                    <View style={styles.lieuIconBox}>
                      <Ionicons name="location" size={20} color="#1d4ed8" />
                    </View>
                    <View>
                      <Text style={styles.lieuNom}>{dossier.dernier_lieu ?? '—'}</Text>
                      <Text style={styles.lieuVille}>{dossier.ville ?? '—'}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Informations complémentaires */}
              {dossier.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informations complémentaires</Text>
                  <Text style={styles.descText}>{dossier.description}</Text>
                </View>
              )}

              {/* Signes distinctifs */}
              {dossier.signes_distinctifs && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Signes distinctifs</Text>
                  <Text style={styles.descText}>{dossier.signes_distinctifs}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── ONGLET PHOTOS ── */}
          {onglet === 'photos' && (
            <View>
              {photos.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="images-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Aucune photo disponible</Text>
                </View>
              ) : (
                <View style={styles.photosGrid}>
                  {photos.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={styles.photoThumb} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── ONGLET CHRONOLOGIE ── */}
          {onglet === 'chronologie' && (
            <View>
              {chronologie.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="time-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Aucun témoignage enregistré</Text>
                </View>
              ) : (
                chronologie.map((s, i) => (
                  <View key={s.id ?? i} style={styles.chronItem}>
                    <View style={styles.chronDot} />
                    {i < chronologie.length - 1 && <View style={styles.chronLine} />}
                    <View style={styles.chronContent}>
                      <Text style={styles.chronDate}>
                        {new Date(s.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.chronDesc} numberOfLines={3}>
                        {s.description ?? '—'}
                      </Text>
                      <View style={[styles.chronBadge, {
                        backgroundColor: s.statut_validation === 'valide' ? '#dcfce7' : '#f1f5f9',
                      }]}>
                        <Text style={[styles.chronBadgeTxt, {
                          color: s.statut_validation === 'valide' ? '#16a34a' : '#64748b',
                        }]}>
                          {s.statut_validation === 'valide' ? 'Validé' : 'En attente'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },

  navBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    backgroundColor: '#f8fafc',
  },
  retourBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  retourText: { fontSize: 14, color: '#1e3a5f', fontWeight: '600' },

  hero: {
    flexDirection: 'row', gap: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff',
  },
  photoBox:        { width: 110, height: 130 },
  photo:           { width: 110, height: 130, borderRadius: 12, resizeMode: 'cover' },
  photoPlaceholder:{ width: 110, height: 130, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  identite:        { flex: 1, justifyContent: 'flex-start', gap: 8 },
  nomComplet:      { fontSize: 20, fontWeight: '800', color: '#1e3a5f', lineHeight: 24 },
  badgesRow:       { gap: 6 },
  urgence:         { fontSize: 13, fontWeight: '700' },
  metaRow:         { gap: 5, marginTop: 4 },
  metaItem:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:        { fontSize: 12, color: '#64748b' },

  divider: { height: 1, backgroundColor: '#e2e8f0' },

  actionsRow: {
    flexDirection: 'row', gap: 0,
    backgroundColor: '#fff',
  },
  btnSignaler: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, backgroundColor: '#1d4ed8',
  },
  btnSignalerText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnPartager: {
    flex: 0.45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, backgroundColor: '#fff',
    borderLeftWidth: 1, borderLeftColor: '#e2e8f0',
  },
  btnPartagerText: { fontSize: 14, fontWeight: '700', color: '#1e3a5f' },

  onglets: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  ongletBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  ongletBtnActive: { borderBottomColor: '#1d4ed8' },
  ongletText:      { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  ongletTextActive:{ color: '#1d4ed8' },

  ongletContent: { padding: 20, paddingBottom: 60 },

  section:      { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e3a5f' },

  physGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  physItem:  { minWidth: (width - 80) / 3 },
  physLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  physValue: { fontSize: 14, fontWeight: '700', color: '#1e3a5f' },

  lieuCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  lieuIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center',
  },
  lieuNom:   { fontSize: 14, fontWeight: '700', color: '#1e3a5f' },
  lieuVille: { fontSize: 12, color: '#64748b', marginTop: 2 },

  descText: { fontSize: 14, color: '#475569', lineHeight: 21 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: (width - 64) / 3, height: (width - 64) / 3, borderRadius: 10 },

  chronItem:    { flexDirection: 'row', gap: 14, paddingBottom: 20, position: 'relative' },
  chronDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1d4ed8', marginTop: 4, flexShrink: 0 },
  chronLine:    { position: 'absolute', left: 5.5, top: 16, bottom: 0, width: 1, backgroundColor: '#dbeafe' },
  chronContent: { flex: 1, gap: 6 },
  chronDate:    { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  chronDesc:    { fontSize: 13, color: '#1e3a5f', lineHeight: 18 },
  chronBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chronBadgeTxt:{ fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
});