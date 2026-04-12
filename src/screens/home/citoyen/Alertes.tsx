import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { supabase } from '../../../services/supabase';

// ─────────────────────────────────────────────
// Types (alignés sur le schéma Supabase)
// ─────────────────────────────────────────────

type StatutAlerte = 'brouillon' | 'programmee' | 'en_cours' | 'terminee' | 'annulee';
type NiveauUrgence = 'critique' | 'urgent' | 'normal' | 'faible';

interface Alerte {
  id: string;
  numero_alerte: string | null;
  titre: string;
  message: string;
  message_court: string | null;
  type_alerte: string;
  statut_alerte: StatutAlerte;
  rayon_km: number;
  date_diffusion: string;
  date_expiration: string | null;
  created_at: string;
  id_dossier: string | null;
  // jointure dossier → personne → photo
  photo_url?: string | null;
  nom_personne?: string | null;
  prenom_personne?: string | null;
  niveau_urgence?: NiveauUrgence | null;
}

type Filtre = 'toutes' | 'actives' | 'proximite' | 'fermees';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const FILTRES: { key: Filtre; label: string }[] = [
  { key: 'toutes', label: 'Toutes les alertes' },
  { key: 'actives', label: 'Alertes actives' },
  { key: 'proximite', label: 'Alertes à proximité' },
  { key: 'fermees', label: 'Alertes fermées' },
];

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function statutLabel(statut: StatutAlerte): string {
  switch (statut) {
    case 'en_cours':    return 'En cours';
    case 'brouillon':   return 'Brouillon';
    case 'programmee':  return 'Programmée';
    case 'terminee':    return 'Terminée';
    case 'annulee':     return 'Annulée';
    default:            return statut;
  }
}

// Couleur badge selon statut_alerte
function statutColor(statut: StatutAlerte): string {
  switch (statut) {
    case 'en_cours':   return '#F97316'; // orange = "En attente" dans le design
    case 'programmee': return '#3B82F6';
    case 'terminee':   return '#22C55E';
    case 'annulee':    return '#6B7280';
    case 'brouillon':  return '#9CA3AF';
    default:           return '#F97316';
  }
}

function urgenceColor(urgence?: NiveauUrgence | null): string {
  switch (urgence) {
    case 'critique': return '#EF4444';
    case 'urgent':   return '#F97316';
    case 'normal':   return '#3B82F6';
    case 'faible':   return '#6B7280';
    default:         return '#3B82F6';
  }
}

// ─────────────────────────────────────────────
// Composant AlerteBanner
// ─────────────────────────────────────────────

interface AlerteBannerProps {
  alerte: Alerte;
  onDismiss: (id: string) => void;
}

function AlerteBanner({ alerte, onDismiss }: AlerteBannerProps) {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerBorder} />
      <View style={styles.bannerContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitre}>{alerte.titre}</Text>
          <Text style={styles.bannerDescription} numberOfLines={2}>
            {alerte.message_court ?? alerte.message}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onDismiss(alerte.id)} style={styles.bannerClose}>
          <Text style={styles.bannerCloseText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Composant CarteAlerte
// ─────────────────────────────────────────────

interface CarteAlerteProps {
  alerte: Alerte;
  onPress: (alerte: Alerte) => void;
}

function CarteAlerte({ alerte, onPress }: CarteAlerteProps) {
  const nomComplet =
    alerte.prenom_personne && alerte.nom_personne
      ? `${alerte.prenom_personne} ${alerte.nom_personne}`
      : null;

  return (
    <TouchableOpacity
      style={[styles.carte, { width: CARD_WIDTH }]}
      onPress={() => onPress(alerte)}
      activeOpacity={0.85}
    >
      <View style={styles.carteImageContainer}>
        {alerte.photo_url ? (
          <Image source={{ uri: alerte.photo_url }} style={styles.carteImage} resizeMode="cover" />
        ) : (
          <View style={[styles.carteImage, styles.carteImagePlaceholder]}>
            <Text style={styles.carteImagePlaceholderText}>📷</Text>
          </View>
        )}
        <View style={[styles.statutBadge, { backgroundColor: statutColor(alerte.statut_alerte) }]}>
          <Text style={styles.statutBadgeText}>{statutLabel(alerte.statut_alerte)}</Text>
        </View>
        {alerte.niveau_urgence && alerte.niveau_urgence !== 'normal' && (
          <View style={[styles.urgenceBadge, { backgroundColor: urgenceColor(alerte.niveau_urgence) }]}>
            <Text style={styles.urgenceBadgeText}>{alerte.niveau_urgence.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.carteBody}>
        <Text style={styles.carteTitre} numberOfLines={2}>{alerte.titre}</Text>
        {nomComplet && (
          <Text style={styles.carteNom} numberOfLines={1}>👤 {nomComplet}</Text>
        )}
        <Text style={styles.carteDescription} numberOfLines={2}>
          {alerte.message_court ?? alerte.message}
        </Text>
        <View style={styles.carteMeta}>
          <Text style={styles.carteMetaText}>🕐 {formatDate(alerte.date_diffusion)}</Text>
          <Text style={styles.carteMetaText}>📍 {alerte.rayon_km} km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Page principale Alerte
// ─────────────────────────────────────────────

export default function AlertePage() {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [alertesProximite, setAlertesProximite] = useState<Alerte[]>([]);
  const [banniersDismissed, setBanniersDismissed] = useState<Set<string>>(new Set());
  const [filtreActif, setFiltreActif] = useState<Filtre>('toutes');
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const total     = alertes.length;
  const actives   = alertes.filter((a) => a.statut_alerte === 'en_cours').length;
  const proximite = alertesProximite.length;

  // ── Chargement Supabase ──────────────────────────────────────
  const chargerAlertes = useCallback(async () => {
    try {
      setErreur(null);

      // alerte → dossier_disparition → personne → photo (principale)
      const { data, error } = await supabase
        .from('alerte')
        .select(`
          id,
          numero_alerte,
          titre,
          message,
          message_court,
          type_alerte,
          statut_alerte,
          rayon_km,
          date_diffusion,
          date_expiration,
          created_at,
          id_dossier,
          dossier_disparition (
            niveau_urgence,
            personne (
              nom,
              prenom,
              photo_principale,
              photo (
                url_cloudinary,
                est_principale,
                approuvee,
                visible_public
              )
            )
          )
        `)
        .order('date_diffusion', { ascending: false });

      if (error) throw error;

      const mapped: Alerte[] = (data ?? []).map((row: any) => {
        const dossier  = row.dossier_disparition;
        const personne = dossier?.personne;

        // Photo : photo principale approuvée, sinon photo_principale directe
        const photos: any[] = personne?.photo ?? [];
        const photoPrincipale = photos.find(
          (p: any) => p.est_principale && p.approuvee && p.visible_public
        ) ?? photos.find((p: any) => p.approuvee && p.visible_public);

        return {
          id: row.id,
          numero_alerte: row.numero_alerte,
          titre: row.titre,
          message: row.message,
          message_court: row.message_court,
          type_alerte: row.type_alerte,
          statut_alerte: row.statut_alerte,
          rayon_km: row.rayon_km ?? 50,
          date_diffusion: row.date_diffusion,
          date_expiration: row.date_expiration,
          created_at: row.created_at,
          id_dossier: row.id_dossier,
          photo_url: photoPrincipale?.url_cloudinary ?? personne?.photo_principale ?? null,
          nom_personne: personne?.nom ?? null,
          prenom_personne: personne?.prenom ?? null,
          niveau_urgence: dossier?.niveau_urgence ?? null,
        };
      });

      setAlertes(mapped);
      // Alertes "à proximité" = alertes en_cours (en prod : filtrer par GPS réel)
      setAlertesProximite(mapped.filter((a) => a.statut_alerte === 'en_cours'));
    } catch (e: any) {
      setErreur(e.message ?? 'Erreur inconnue');
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    chargerAlertes();
  }, [chargerAlertes]);

  // ── Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('alertes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerte' }, () => {
        chargerAlertes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chargerAlertes]);

  // ── Filtrage ──────────────────────────────────────────────────
  const alertesFiltrees = alertes.filter((a) => {
    switch (filtreActif) {
      case 'actives':
        return a.statut_alerte === 'en_cours';
      case 'proximite':
        return alertesProximite.some((p) => p.id === a.id);
      case 'fermees':
        return a.statut_alerte === 'terminee' || a.statut_alerte === 'annulee';
      default:
        return true;
    }
  });

  const bannierVisibles = alertesProximite.filter((a) => !banniersDismissed.has(a.id));

  const dismissBanniere = (id: string) =>
    setBanniersDismissed((prev) => new Set([...prev, id]));

  const onPressCarte = (alerte: Alerte) => {
    // navigation.navigate('DetailAlerte', { alerteId: alerte.id });
    console.log('Alerte sélectionnée :', alerte.id);
  };

  const onRefresh = () => {
    setRafraichissement(true);
    chargerAlertes();
  };

  // ── Écrans d'état ─────────────────────────────────────────────
  if (chargement) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D4ED8" />
        <Text style={styles.chargementText}>Chargement des alertes…</Text>
      </View>
    );
  }

  if (erreur) {
    return (
      <View style={styles.centered}>
        <Text style={styles.erreurText}>⚠️ {erreur}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={chargerAlertes}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header position */}
      <View style={styles.positionHeader}>
        <View style={styles.positionRow}>
          <Text style={styles.positionIcon}>📍</Text>
          <Text style={styles.positionTexte}>Position désactivée</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={rafraichissement} onRefresh={onRefresh} tintColor="#1D4ED8" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Bannières alertes à proximité */}
        {bannierVisibles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.proximiteTitreRow}>
              <Text style={styles.proximitéIcone}>⚠️</Text>
              <Text style={styles.proximiteTitle}>
                Alertes à proximité ({bannierVisibles.length})
              </Text>
            </View>
            {bannierVisibles.map((a) => (
              <AlerteBanner key={a.id} alerte={a} onDismiss={dismissBanniere} />
            ))}
          </View>
        )}

        {/* Filtres */}
        <View style={styles.filtresSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtresScroll}
          >
            {FILTRES.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filtreBtn, filtreActif === f.key && styles.filtreBtnActif]}
                onPress={() => setFiltreActif(f.key)}
              >
                <Text style={[styles.filtreBtnText, filtreActif === f.key && styles.filtreBtnTextActif]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Grille alertes */}
        {alertesFiltrees.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videEmoji}>🔍</Text>
            <Text style={styles.videTexte}>Aucune alerte dans cette catégorie</Text>
          </View>
        ) : (
          <View style={styles.grille}>
            {alertesFiltrees.map((alerte) => (
              <CarteAlerte key={alerte.id} alerte={alerte} onPress={onPressCarte} />
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{actives}</Text>
            <Text style={styles.statLabel}>ACTIVES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{proximite}</Text>
            <Text style={styles.statLabel}>À PROXIMITÉ</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { flex: 1 },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', padding: 24,
  },
  chargementText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  erreurText: { fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  positionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  positionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  positionIcon: { fontSize: 16 },
  positionTexte: { fontSize: 14, color: '#374151' },
  refreshIcon: { fontSize: 20 },

  section: {
    backgroundColor: '#FFFFFF', marginBottom: 8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  proximiteTitreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  proximitéIcone: { fontSize: 16 },
  proximiteTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  bannerContainer: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 8,
    marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  bannerBorder: { width: 4, backgroundColor: '#F59E0B' },
  bannerContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 8 },
  bannerTitre: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  bannerDescription: { fontSize: 13, color: '#6B7280' },
  bannerClose: { padding: 4 },
  bannerCloseText: { fontSize: 16, color: '#9CA3AF' },

  filtresSection: { backgroundColor: '#FFFFFF', paddingVertical: 10, marginBottom: 8 },
  filtresScroll: { paddingHorizontal: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filtreBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF',
  },
  filtreBtnActif: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  filtreBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filtreBtnTextActif: { color: '#FFFFFF', fontWeight: '600' },

  grille: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 12, paddingBottom: 12,
  },
  carte: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  carteImageContainer: { position: 'relative' },
  carteImage: { width: '100%', height: 160, backgroundColor: '#E5E7EB' },
  carteImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  carteImagePlaceholderText: { fontSize: 32 },
  statutBadge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statutBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  urgenceBadge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  urgenceBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  carteBody: { padding: 10 },
  carteTitre: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  carteNom: { fontSize: 12, color: '#1D4ED8', marginBottom: 4 },
  carteDescription: { fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 16 },
  carteMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  carteMetaText: { fontSize: 11, color: '#9CA3AF' },

  vide: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  videEmoji: { fontSize: 40, marginBottom: 12 },
  videTexte: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },

  statsContainer: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    marginHorizontal: 12, marginBottom: 24, borderRadius: 12, paddingVertical: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#1D4ED8' },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
});