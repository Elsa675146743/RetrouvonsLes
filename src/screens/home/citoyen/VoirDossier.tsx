import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Dimensions, Platform, Image,
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
    retrouve_vivant: { label: 'RETROUVÉ VIVANT', bg: '#dcfce7', color: '#16a34a' },
    retrouve_decede: { label: 'RETROUVÉ DÉCÉDÉ', bg: '#fee2e2', color: '#dc2626' },
    suspendu: { label: 'SUSPENDU', bg: '#f1f5f9', color: '#64748b' },
    classe_sans_suite: { label: 'CLASSÉ', bg: '#f1f5f9', color: '#94a3b8' },
    transfere: { label: 'TRANSFÉRÉ', bg: '#ede9fe', color: '#7c3aed' },
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

// ─── BADGE URGENCE ───
function BadgeUrgence({ niveau }: { niveau: string | null }) {
  if (!niveau) return null;
  const map: Record<string, { label: string; bg: string; color: string }> = {
    critique: { label: 'CRITIQUE', bg: '#fee2e2', color: '#dc2626' },
    urgent:   { label: 'URGENT',   bg: '#ffedd5', color: '#ea580c' },
    normal:   { label: 'NORMAL',   bg: '#fef3c7', color: '#d97706' },
    faible:   { label: 'FAIBLE',   bg: '#dcfce7', color: '#16a34a' },
  };
  const u = map[niveau] ?? { label: niveau.toUpperCase(), bg: '#f1f5f9', color: '#64748b' };
  return (
    <View style={[bU.badge, { backgroundColor: u.bg }]}>
      <Text style={[bU.text, { color: u.color }]}>{u.label}</Text>
    </View>
  );
}

const bU = StyleSheet.create({
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  text:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});

// ─── ONGLETS ───
type Onglet = 'infos' | 'photos' | 'chronologie';

// ─── ÉCRAN PRINCIPAL ───
export default function VoirDossier({ route, navigation }: any) {
  const dossierParam = route.params?.dossier;
  const dossierId    = route.params?.id ?? route.params?.dossierId ?? dossierParam?.id;

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
        // Récupérer le dossier et la personne
        const { data: dossierData, error: dossierError } = await supabase
          .from('dossier_disparition')
          .select(`
            id,
            date_disparition,
            lieu_disparition,
            ville_disparition,
            circonstances,
            statut_dossier,
            niveau_urgence,
            nombre_vues_fiche,
            id_personne
          `)
          .eq('id', dossierId)
          .single();

        if (dossierError) {
          console.warn('VoirDossier fetch dossier:', dossierError.message);
          setLoading(false);
          return;
        }

        if (!dossierData) {
          setLoading(false);
          return;
        }

        // Récupérer la personne
        const { data: personneData, error: personneError } = await supabase
          .from('personne')
          .select(`
            id, nom, prenom, age_estime_min, age_estime_max, sexe,
            taille_cm, poids_kg, couleur_cheveux, couleur_yeux,
            signes_distinctifs, photo_principale,
            description_physique, derniers_vetements_portes
          `)
          .eq('id', dossierData.id_personne)
          .single();

        if (personneError) {
          console.warn('VoirDossier fetch personne:', personneError.message);
        }

        // Récupérer les photos
        const { data: photosData } = await supabase
          .from('photo')
          .select('url_cloudinary, est_principale')
          .eq('id_personne', dossierData.id_personne)
          .eq('approuvee', true)
          .order('est_principale', { ascending: false });

        const photoUrls = (photosData ?? []).map(p => p.url_cloudinary).filter(Boolean);
        
        // Calculer l'âge estimé
        let age: number | null = null;
        if (personneData?.age_estime_min && personneData?.age_estime_max) {
          age = Math.floor((personneData.age_estime_min + personneData.age_estime_max) / 2);
        } else if (personneData?.age_estime_min) {
          age = personneData.age_estime_min;
        } else if (personneData?.age_estime_max) {
          age = personneData.age_estime_max;
        }

        setDossier({
          id: dossierData.id,
          nom: personneData?.nom ?? '',
          prenom: personneData?.prenom ?? '',
          age,
          sexe: personneData?.sexe ?? null,
          taille: personneData?.taille_cm ?? null,
          poids: personneData?.poids_kg ?? null,
          couleur_cheveux: personneData?.couleur_cheveux ?? null,
          couleur_yeux: personneData?.couleur_yeux ?? null,
          signes_distinctifs: personneData?.signes_distinctifs ?? null,
          dernier_lieu: dossierData.lieu_disparition ?? null,
          ville: dossierData.ville_disparition ?? null,
          date_disparition: dossierData.date_disparition ?? null,
          description: dossierData.circonstances ?? personneData?.description_physique ?? null,
          statut: dossierData.statut_dossier ?? 'en_cours',
          photo_url: personneData?.photo_principale ?? photoUrls[0] ?? null,
          nb_vues: dossierData.nombre_vues_fiche ?? 0,
          niveau_urgence: dossierData.niveau_urgence ?? null,
        });

        setPhotos(photoUrls);

        // Incrémenter nb_vues
        await supabase
          .from('dossier_disparition')
          .update({ nombre_vues_fiche: (dossierData.nombre_vues_fiche ?? 0) + 1 })
          .eq('id', dossierId);

        // Chronologie (signalements liés)
        const { data: chron } = await supabase
          .from('signalement')
          .select('id, description, created_at, statut_validation')
          .eq('id_dossier', dossierId)
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

  if (loading || !dossier) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#b45f06" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const date = dossier.date_disparition
    ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date inconnue';

  const ageText = dossier.age ? `${dossier.age} ans` : 'Âge inconnu';
  const tailleText = dossier.taille ? `${dossier.taille} cm` : '—';
  const poidsText = dossier.poids ? `${dossier.poids} kg` : '—';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retourBtn}>
          <Ionicons name="arrow-back" size={20} color="#0b1c30" />
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
                <Ionicons name="person-outline" size={48} color="#cbd5e1" />
              </View>
            )}
          </View>

          {/* Identité */}
          <View style={styles.identite}>
            <Text style={styles.nomComplet}>{dossier.prenom} {dossier.nom}</Text>
            <View style={styles.badgesRow}>
              <BadgeStatut statut={dossier.statut} />
              <BadgeUrgence niveau={dossier.niveau_urgence} />
            </View>

            {/* Meta */}
            <View style={styles.metaContainer}>
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
                size={18}
                color={onglet === o ? '#b45f06' : '#94a3b8'}
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
            <View style={{ gap: 24 }}>

              {/* Description physique */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description physique</Text>
                <View style={styles.physGrid}>
                  <View style={styles.physItem}>
                    <Text style={styles.physLabel}>ÂGE</Text>
                    <Text style={styles.physValue}>{ageText}</Text>
                  </View>
                  <View style={styles.physItem}>
                    <Text style={styles.physLabel}>SEXE</Text>
                    <Text style={styles.physValue}>{dossier.sexe === 'masculin' ? 'Homme' : dossier.sexe === 'feminin' ? 'Femme' : dossier.sexe ?? '—'}</Text>
                  </View>
                  <View style={styles.physItem}>
                    <Text style={styles.physLabel}>TAILLE</Text>
                    <Text style={styles.physValue}>{tailleText}</Text>
                  </View>
                  <View style={styles.physItem}>
                    <Text style={styles.physLabel}>POIDS</Text>
                    <Text style={styles.physValue}>{poidsText}</Text>
                  </View>
                  <View style={styles.physItem}>
                    <Text style={styles.physLabel}>CHEVEUX</Text>
                    <Text style={styles.physValue}>{dossier.couleur_cheveux ?? '—'}</Text>
                  </View>
                  <View style={styles.physItem}>
                    <Text style={styles.physLabel}>YEUX</Text>
                    <Text style={styles.physValue}>{dossier.couleur_yeux ?? '—'}</Text>
                  </View>
                </View>
              </View>

              {/* Dernier lieu */}
              {(dossier.dernier_lieu || dossier.ville) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dernier lieu où vu</Text>
                  <View style={styles.lieuCard}>
                    <View style={styles.lieuIconBox}>
                      <Ionicons name="location-outline" size={22} color="#b45f06" />
                    </View>
                    <View style={styles.lieuTexts}>
                      <Text style={styles.lieuNom}>{dossier.dernier_lieu ?? 'Lieu inconnu'}</Text>
                      <Text style={styles.lieuVille}>{dossier.ville ?? ''}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Signes distinctifs */}
              {dossier.signes_distinctifs && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Signes distinctifs</Text>
                  <Text style={styles.descText}>{dossier.signes_distinctifs}</Text>
                </View>
              )}

              {/* Vêtements portés */}
              {dossier.description && dossier.description.includes('Vêtements') && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Vêtements portés</Text>
                  <Text style={styles.descText}>{dossier.description}</Text>
                </View>
              )}

              {/* Informations complémentaires */}
              {dossier.description && !dossier.description.includes('Vêtements') && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informations complémentaires</Text>
                  <Text style={styles.descText}>{dossier.description}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── ONGLET PHOTOS ── */}
          {onglet === 'photos' && (
            <View>
              {photos.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="images-outline" size={52} color="#cbd5e1" />
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
                  <Ionicons name="time-outline" size={52} color="#cbd5e1" />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  retourBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retourText: { fontSize: 15, color: '#0b1c30', fontWeight: '600' },

  hero: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  photoBox:        { width: 110, height: 130, borderRadius: 14, overflow: 'hidden' },
  photo:           { width: 110, height: 130, resizeMode: 'cover' },
  photoPlaceholder: { width: 110, height: 130, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  identite:        { flex: 1, justifyContent: 'center', gap: 8 },
  nomComplet:      { fontSize: 20, fontWeight: '800', color: '#0b1c30', lineHeight: 26 },
  badgesRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaContainer:   { gap: 6, marginTop: 6 },
  metaItem:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:        { fontSize: 12, color: '#64748b' },

  divider: { height: 1, backgroundColor: '#e2e8f0' },

  onglets: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  ongletBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  ongletBtnActive: { borderBottomColor: '#b45f06' },
  ongletText:      { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  ongletTextActive: { color: '#b45f06' },

  ongletContent: { padding: 20, paddingBottom: 60 },

  section:      { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0b1c30', letterSpacing: 0.3 },

  physGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 20, rowGap: 16 },
  physItem:  { minWidth: (width - 80) / 3 },
  physLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  physValue: { fontSize: 14, fontWeight: '700', color: '#0b1c30' },

  lieuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lieuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lieuTexts: { flex: 1 },
  lieuNom:   { fontSize: 14, fontWeight: '700', color: '#0b1c30' },
  lieuVille: { fontSize: 12, color: '#64748b', marginTop: 2 },

  descText: { fontSize: 14, color: '#475569', lineHeight: 22 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: (width - 64) / 3, height: (width - 64) / 3, borderRadius: 12, backgroundColor: '#f1f5f9' },

  chronItem:    { flexDirection: 'row', gap: 14, paddingBottom: 20, position: 'relative' },
  chronDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: '#b45f06', marginTop: 4, flexShrink: 0 },
  chronLine:    { position: 'absolute', left: 5.5, top: 16, bottom: 0, width: 1.5, backgroundColor: '#e2e8f0' },
  chronContent: { flex: 1, gap: 6 },
  chronDate:    { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  chronDesc:    { fontSize: 13, color: '#0b1c30', lineHeight: 18 },
  chronBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chronBadgeTxt:{ fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
});