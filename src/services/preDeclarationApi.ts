import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export type PreDeclaration = {
  id: string;
  id_utilisateur: string;
  id_organisation: string;
  statut: 'soumise' | 'en_examen' | 'convertie' | 'rejetee';
  id_dossier: string | null;
  nom_personne: string;
  prenom_personne: string;
  sexe: 'masculin' | 'feminin' | 'inconnu' | 'non_precise';
  date_naissance: string | null;
  nationalite: string;
  date_disparition: string;
  lieu_disparition: string | null;
  ville_disparition: string | null;
  region_disparition: string | null;
  pays_disparition: string;
  latitude_disparition: number | null;
  longitude_disparition: number | null;
  type_disparition: string;
  niveau_urgence: string;
  circonstances: string;
  infos_complementaires: string | null;
  contact_nom: string | null;
  contact_telephone: string | null;
  contact_email: string | null;
  motif_rejet: string | null;
  rejetee_par: string | null;
  rejetee_at: string | null;
  created_at: string;
  updated_at: string;
  // Jointure
  organisation?: {
    nom: string;
    type_organisation: string;
  };
  conversation?: {
    id: string;
    statut: string;
  };
};

export type NouvellePreDeclarationInput = {
  id_organisation: string;
  nom_personne: string;
  prenom_personne?: string;
  sexe?: 'masculin' | 'feminin' | 'inconnu' | 'non_precise';
  date_naissance?: string;
  nationalite?: string;
  date_disparition: string;
  lieu_disparition?: string;
  ville_disparition?: string;
  region_disparition?: string;
  pays_disparition?: string;
  latitude_disparition?: number;
  longitude_disparition?: number;
  type_disparition?: string;
  niveau_urgence?: string;
  circonstances: string;
  infos_complementaires?: string;
  contact_nom?: string;
  contact_telephone?: string;
  contact_email?: string;
  message_initial?: string;
};

// ============================================================
// FONCTIONS
// ============================================================

/**
 * Créer une nouvelle pré-déclaration avec conversation
 */
export async function createPreDeclaration(
  input: NouvellePreDeclarationInput
): Promise<{ preDeclaration: PreDeclaration; conversationId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  // Utiliser la RPC qui crée pré-déclaration + conversation en une transaction
  const { data, error } = await supabase.rpc('create_pre_declaration_with_conversation', {
    p_input: {
      id_organisation: input.id_organisation,
      nom_personne: input.nom_personne,
      prenom_personne: input.prenom_personne || '',
      sexe: input.sexe || 'non_precise',
      date_naissance: input.date_naissance || null,
      nationalite: input.nationalite || 'Camerounaise',
      date_disparition: input.date_disparition,
      lieu_disparition: input.lieu_disparition || '',
      ville_disparition: input.ville_disparition || '',
      region_disparition: input.region_disparition || '',
      pays_disparition: input.pays_disparition || 'Cameroun',
      latitude_disparition: input.latitude_disparition || null,
      longitude_disparition: input.longitude_disparition || null,
      type_disparition: input.type_disparition || 'inconnue',
      niveau_urgence: input.niveau_urgence || 'normal',
      circonstances: input.circonstances,
      infos_complementaires: input.infos_complementaires || '',
      contact_nom: input.contact_nom || '',
      contact_telephone: input.contact_telephone || '',
      contact_email: input.contact_email || '',
      message_initial: input.message_initial || '',
    },
  });

  if (error) throw error;

  return {
    preDeclaration: data.pre_declaration as PreDeclaration,
    conversationId: data.conversation.id,
  };
}

/**
 * Récupérer les pré-déclarations du citoyen connecté
 */
export async function getMesPreDeclarations(): Promise<PreDeclaration[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('pre_declaration_citoyenne')
    .select(`
      *,
      organisation:organisation!id_organisation (
        nom,
        type_organisation
      ),
      conversation:conversation!id_pre_declaration (
        id,
        statut
      )
    `)
    .eq('id_utilisateur', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer une pré-déclaration par ID
 */
export async function getPreDeclarationById(id: string): Promise<PreDeclaration | null> {
  const { data, error } = await supabase
    .from('pre_declaration_citoyenne')
    .select(`
      *,
      organisation:organisation!id_organisation (
        nom,
        type_organisation
      ),
      conversation:conversation!id_pre_declaration (
        id,
        statut
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Récupérer les organisations disponibles
 */
export async function getOrganisations(): Promise<{ id: string; nom: string; type_organisation: string }[]> {
  const { data, error } = await supabase
    .from('organisation')
    .select('id, nom, type_organisation')
    .eq('statut_actif', true)
    .order('nom', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Mettre à jour le statut d'une pré-déclaration (autorité)
 */
export async function updatePreDeclarationStatut(
  id: string,
  statut: 'en_examen' | 'convertie' | 'rejetee',
  motif_rejet?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const updateData: any = { statut };

  if (statut === 'rejetee') {
    updateData.motif_rejet = motif_rejet || null;
    updateData.rejetee_par = user.id;
    updateData.rejetee_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('pre_declaration_citoyenne')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Vérifier si l'utilisateur est une autorité
 */
export async function isAutorite(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('utilisateur')
    .select('type_compte')
    .eq('id', user.id)
    .single();

  return data?.type_compte === 'autorite';
}