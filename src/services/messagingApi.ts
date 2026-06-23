import { Buffer } from 'buffer';
import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export type Conversation = {
  id: string;
  id_pre_declaration: string | null;
  id_dossier: string | null;
  id_signalement: string | null;
  statut: 'ouverte' | 'en_attente' | 'traitee' | 'fermee';
  id_utilisateur_assigne: string | null;
  id_organisation_escalade: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  id_conversation: string;
  id_auteur: string;
  corps: string;
  type_message: 'texte' | 'demande_complement' | 'demande_piece' | 'note_systeme';
  metadonnees: any;
  deleted_at: string | null;
  created_at: string;
  auteur?: {
    id: string;
    nom: string;
    prenom: string;
  };
  pieces_jointes?: MessagePieceJointe[];
};

export type MessagePieceJointe = {
  id: string;
  id_message: string;
  nom_fichier: string;
  mime_type: string;
  taille_octets: number;
  url_storage: string;
  created_at: string;
};

export type ConversationWithDetails = Conversation & {
  contexte_nom: string;
  contexte_reference: string;
  dernier_message: {
    corps: string;
    created_at: string;
    id_auteur: string;
  } | null;
  non_lus: number;
  participants?: {
    id_utilisateur: string;
    role: 'citoyen' | 'autorite';
  }[];
};

// ============================================================
// CONVERSATIONS
// ============================================================

export async function getConversations(): Promise<ConversationWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase
    .from('conversation')
    .select(`
      id,
      id_pre_declaration,
      id_dossier,
      id_signalement,
      statut,
      id_utilisateur_assigne,
      id_organisation_escalade,
      created_at,
      updated_at,
      pre_declaration_citoyenne!left (
        id,
        nom_personne,
        prenom_personne,
        statut
      ),
      dossier_disparition!left (
        id,
        numero_dossier,
        statut_dossier,
        personne:personne!left (
          nom,
          prenom
        )
      ),
      signalement!left (
        id,
        description,
        statut_validation
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // ✅ Typer les données avec 'as any' pour contourner les erreurs TS
  const conversations = data as any[] || [];

  const result: ConversationWithDetails[] = [];

  for (const conv of conversations) {
    let contexteNom = 'Conversation';
    let contexteReference = '';

    // ✅ Vérifier l'existence des propriétés avec des casts sécurisés
    if (conv.id_pre_declaration && conv.pre_declaration_citoyenne) {
      const p = conv.pre_declaration_citoyenne;
      contexteNom = `${p.prenom_personne || ''} ${p.nom_personne || ''}`.trim() || 'Pré-déclaration';
      contexteReference = `Pré-déclaration #${p.id?.slice(-8) || ''}`;
    } else if (conv.id_dossier && conv.dossier_disparition) {
      const d = conv.dossier_disparition;
      const personne = d.personne || {};
      contexteNom = `${personne.prenom || ''} ${personne.nom || ''}`.trim() || 'Personne disparue';
      const numeroDossier = d.numero_dossier || d.id?.slice(-8) || '';
      contexteReference = `Dossier ${numeroDossier}`;
    } else if (conv.id_signalement && conv.signalement) {
      const s = conv.signalement;
      contexteNom = 'Signalement';
      contexteReference = `Signalement #${s.id?.slice(-8) || ''}`;
    }

    // Dernier message
    const { data: lastMsg } = await supabase
      .from('message')
      .select('corps, created_at, id_auteur')
      .eq('id_conversation', conv.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    // Messages non lus (corrigé)
    const { count: unreadCount } = await supabase
      .from('message_lecture')
      .select('*', { count: 'exact', head: true })
      .eq('id_message', conv.id)
      .eq('id_utilisateur', user.id);

    // Participants
    const { data: participants } = await supabase
      .from('conversation_participant')
      .select('id_utilisateur, role')
      .eq('id_conversation', conv.id);

    result.push({
      id: conv.id,
      id_pre_declaration: conv.id_pre_declaration,
      id_dossier: conv.id_dossier,
      id_signalement: conv.id_signalement,
      statut: conv.statut as 'ouverte' | 'en_attente' | 'traitee' | 'fermee',
      id_utilisateur_assigne: conv.id_utilisateur_assigne,
      id_organisation_escalade: conv.id_organisation_escalade,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      contexte_nom: contexteNom,
      contexte_reference: contexteReference,
      dernier_message: lastMsg?.[0] || null,
      non_lus: unreadCount || 0,
      participants: participants || [],
    });
  }

  return result;
}

export async function getConversationWithMessages(
  conversationId: string
): Promise<{ conversation: Conversation; messages: Message[] }> {
  const { data: conversation, error: convError } = await supabase
    .from('conversation')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError) throw convError;

  const { data: messages, error: msgError } = await supabase
    .from('message')
    .select(`
      *,
      auteur:utilisateur!id_auteur (
        id,
        nom,
        prenom
      ),
      pieces_jointes:message_piece_jointe (*)
    `)
    .eq('id_conversation', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (msgError) throw msgError;

  return { conversation, messages: messages || [] };
}

export async function createConversation(params: {
  id_dossier?: string;
  id_signalement?: string;
  id_pre_declaration?: string;
  message_initial?: string;
}): Promise<Conversation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase
    .from('conversation')
    .insert({
      id_pre_declaration: params.id_pre_declaration || null,
      id_dossier: params.id_dossier || null,
      id_signalement: params.id_signalement || null,
      statut: 'ouverte',
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('conversation_participant').insert({
    id_conversation: data.id,
    id_utilisateur: user.id,
    role: 'citoyen',
  });

  if (params.message_initial) {
    await sendMessage({
      id_conversation: data.id,
      corps: params.message_initial,
      type_message: 'texte',
    });
  }

  return data;
}

export async function getConversationByContext(params: {
  id_dossier?: string;
  id_signalement?: string;
  id_pre_declaration?: string;
}): Promise<Conversation | null> {
  let query = supabase.from('conversation').select('*');

  if (params.id_dossier) {
    query = query.eq('id_dossier', params.id_dossier);
  } else if (params.id_signalement) {
    query = query.eq('id_signalement', params.id_signalement);
  } else if (params.id_pre_declaration) {
    query = query.eq('id_pre_declaration', params.id_pre_declaration);
  } else {
    throw new Error('Au moins un contexte requis');
  }

  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

// ============================================================
// MESSAGES (Version React Native - sans File)
// ============================================================

export async function sendMessage(params: {
  id_conversation: string;
  corps: string;
  type_message?: 'texte' | 'demande_complement' | 'demande_piece' | 'note_systeme';
  metadonnees?: any;
}): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data: conv } = await supabase
    .from('conversation')
    .select('statut')
    .eq('id', params.id_conversation)
    .single();

  if (!conv || conv.statut === 'fermee' || conv.statut === 'traitee') {
    throw new Error('Cette conversation est fermée');
  }

  const { data, error } = await supabase
    .from('message')
    .insert({
      id_conversation: params.id_conversation,
      id_auteur: user.id,
      corps: params.corps.trim(),
      type_message: params.type_message || 'texte',
      metadonnees: params.metadonnees || {},
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase
    .from('conversation')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.id_conversation);

  return data;
}

/**
 * Uploader une pièce jointe pour un message (React Native)
 */
export async function uploadPieceJointeRN(params: {
  id_message: string;
  uri: string;
  nom_fichier: string;
  mime_type: string;
  taille_octets: number;
}): Promise<MessagePieceJointe | null> {
  try {
    const { id_message, uri, nom_fichier, mime_type, taille_octets } = params;
    const ext = nom_fichier.split('.').pop() || 'jpg';
    const fileName = `messages/${id_message}/${Date.now()}_${Math.random()}.${ext}`;

    // Lire le fichier depuis l'URI
    const RNFS = require('react-native-fs');
    const fileContent = await RNFS.readFile(uri, 'base64');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, Buffer.from(fileContent, 'base64'), {
        contentType: mime_type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    const { data: pjData, error: pjError } = await supabase
      .from('message_piece_jointe')
      .insert({
        id_message: id_message,
        nom_fichier: nom_fichier,
        mime_type: mime_type,
        taille_octets: taille_octets,
        url_storage: urlData.publicUrl,
      })
      .select('*')
      .single();

    if (pjError) {
      console.error('Erreur insertion PJ:', pjError);
      return null;
    }

    return pjData;
  } catch (error) {
    console.error('Erreur upload pièce jointe:', error);
    return null;
  }
}

export async function marquerMessageTraite(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { error } = await supabase.rpc('message_messagerie_marquer_traite', {
    p_message_id: messageId,
  });

  if (error) throw error;
}

export async function supprimerMessage(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { error } = await supabase.rpc('soft_delete_own_message', {
    p_message_id: messageId,
  });

  if (error) throw error;
}

export async function marquerMessagesLus(
  conversationId: string,
  userId: string
): Promise<void> {
  const { data: messages } = await supabase
    .from('message')
    .select('id')
    .eq('id_conversation', conversationId)
    .neq('id_auteur', userId)
    .is('deleted_at', null);

  if (!messages || messages.length === 0) return;

  for (const msg of messages) {
    const { data: existing } = await supabase
      .from('message_lecture')
      .select('id')
      .eq('id_message', msg.id)
      .eq('id_utilisateur', userId)
      .single();

    if (!existing) {
      await supabase.from('message_lecture').insert({
        id_message: msg.id,
        id_utilisateur: userId,
        lu_at: new Date().toISOString(),
      });
    }
  }
}

// ============================================================
// PARTICIPANTS
// ============================================================

export async function ajouterParticipant(
  conversationId: string,
  utilisateurId: string,
  role: 'citoyen' | 'autorite'
): Promise<void> {
  const { error } = await supabase.from('conversation_participant').insert({
    id_conversation: conversationId,
    id_utilisateur: utilisateurId,
    role: role,
  });

  if (error) throw error;
}


export async function getParticipants(
  conversationId: string
): Promise<{ id_utilisateur: string; role: string; nom: string; prenom: string }[]> {
  const { data, error } = await supabase
    .from('conversation_participant')
    .select(`
      id_utilisateur,
      role
    `)
    .eq('id_conversation', conversationId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // ✅ Récupérer les infos utilisateur séparément
  const result = [];
  for (const item of data) {
    const { data: userData } = await supabase
      .from('utilisateur')
      .select('nom, prenom')
      .eq('id', item.id_utilisateur)
      .single();

    result.push({
      id_utilisateur: item.id_utilisateur,
      role: item.role,
      nom: userData?.nom || 'Inconnu',
      prenom: userData?.prenom || 'Inconnu',
    });
  }

  return result;
}

// ============================================================
// TÂCHES DE SUIVI
// ============================================================

export type TacheSuivi = {
  id: string;
  id_conversation: string;
  titre: string;
  description: string | null;
  statut: 'ouverte' | 'en_cours' | 'faite' | 'annulee';
  id_createur: string;
  created_at: string;
  updated_at: string;
};

export async function createTacheSuivi(params: {
  id_conversation: string;
  titre: string;
  description?: string;
}): Promise<TacheSuivi> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase
    .from('messagerie_tache_suivi')
    .insert({
      id_conversation: params.id_conversation,
      titre: params.titre,
      description: params.description || null,
      id_createur: user.id,
      statut: 'ouverte',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTacheStatut(
  tacheId: string,
  statut: 'ouverte' | 'en_cours' | 'faite' | 'annulee'
): Promise<void> {
  const { error } = await supabase
    .from('messagerie_tache_suivi')
    .update({
      statut: statut,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tacheId);

  if (error) throw error;
}

export async function getTachesConversation(
  conversationId: string
): Promise<TacheSuivi[]> {
  const { data, error } = await supabase
    .from('messagerie_tache_suivi')
    .select('*')
    .eq('id_conversation', conversationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}