import { supabase } from './supabase';


const normaliser = (texte: string): string => {
  if (!texte) return '';
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .trim();
};

const mapNiveauUrgence = (val: string): string => {
  const map: Record<string, string> = {
    'faible':   'faible',
    'normal':   'normal',
    'urgent':   'urgent',
    'critique': 'critique',
  };
  return map[normaliser(val)] || 'normal';
};

const mapTypeDisparition = (val: string): string => {
  const map: Record<string, string> = {
    'inconnue':              'inconnue',
    'fugue':                 'fugue',
    'enlevement_presume':    'enlevement_presume',
    'enlevement':            'enlevement_presume',
    'accident':              'accident',
    'disparition_volontaire':'disparition_volontaire',
    'conflit_arme':          'conflit_arme',
    'migration':             'migration',
    'catastrophe_naturelle': 'catastrophe_naturelle',
    'autre':                 'autre',
  };
  return map[normaliser(val)] || 'inconnue';
};

// =====================================================
// FONCTION 1 : Lire tous les dossiers
// =====================================================
export const getDossiers = async () => {
  const { data, error } = await supabase
    .from('dossier_disparition')
    .select(`
      id,
      numero_dossier,
      date_disparition,
      lieu_disparition,
      ville_disparition,
      region_disparition,
      statut_dossier,
      niveau_urgence,
      circonstances,
      created_at,
      personne:id_personne (
        id,
        nom,
        prenom,
        sexe,
        age_estime_min,
        photo_principale
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// =====================================================
// FONCTION 2 : Lire un seul dossier par ID
// =====================================================
export const getDossierById = async (id: string) => {
  const { data, error } = await supabase
    .from('dossier_disparition')
    .select(`
      *,
      personne:id_personne (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// =====================================================
// FONCTION 3 : Créer un dossier
// =====================================================
export const createDossier = async (
  personneId: string,
  dataDisparition: any,
  contactData: any,
  userId?: string
) => {
  // Conversion de la date string "jj/mm/aaaa" en format ISO
  let dateISO = null;
  if (dataDisparition.dateLabel) {
    const parts = dataDisparition.dateLabel.split('/');
    if (parts.length === 3) {
      dateISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const { data, error } = await supabase
    .from('dossier_disparition')
    .insert([{
      // Champs obligatoires
      date_disparition:          dateISO || new Date().toISOString(),
      circonstances:             dataDisparition.circonstances || 'Non précisées',
      type_disparition:          mapTypeDisparition(dataDisparition.typeDisparition),
      niveau_urgence:            mapNiveauUrgence(dataDisparition.urgence),

      // Lieu
      lieu_disparition:          dataDisparition.lieu || null,
      ville_disparition:         dataDisparition.ville || null,
      region_disparition:        dataDisparition.region || null,
      pays_disparition:          'Cameroun',

      // Contact famille
      contact_famille_principale: contactData.nomContact || null,
      telephone_contact:          contactData.telephone || null,
      email_contact:              contactData.email || null,

      // Statut initial
      statut_dossier:            'en_cours',
      visible_public:            true,
      diffusion_autorisee:       true,

      // Relations
      id_personne:               personneId,
      id_utilisateur_createur:   userId || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};