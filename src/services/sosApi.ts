import { supabase } from './supabase';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type ContactUrgence = {
  id: string;
  nom: string;
  email: string;
  relation: string;
  email_verifie: boolean;
  date_ajout: string;
  date_verification: string | null;
};

export type SosEvent = {
  id: string;
  statut: 'annule' | 'envoye' | 'traite';
  latitude: number | null;
  longitude: number | null;
  precision_metres: number | null;
  sans_position: boolean;
  message: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  id_organisation_assignee: string | null;
};

export type SosDispatchResponse = {
  ok: boolean;
  id: string;
  statut: 'envoye' | 'annule';
  sans_position: boolean;
  brevo_env_ok: boolean;
  contacts_for_email: number;
  emails_attempted: Array<{ to: string; ok: boolean; error?: string }>;
};

/**
 * Demander la permission de localisation (Android)
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permission de localisation',
          message: "L'application a besoin d'accéder à votre position pour envoyer des alertes SOS",
          buttonNeutral: 'Demander plus tard',
          buttonNegative: 'Annuler',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Erreur permission:', error);
      return false;
    }
  }
  return true;
}

/**
 * Obtenir la position GPS
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number; precision: number | null } | null> {
  return new Promise((resolve) => {
    // ✅ Vérifier que Geolocation existe
    if (!Geolocation || typeof Geolocation.getCurrentPosition !== 'function') {
      console.warn('⚠️ Geolocation non disponible');
      resolve(null);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 Position obtenue:', position.coords);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precision: position.coords.accuracy || null,
        });
      },
      (error) => {
        console.warn('❌ Erreur GPS:', error.code, error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}

/**
 * Récupérer les contacts d'urgence de l'utilisateur
 */
export async function getContactsUrgence(): Promise<ContactUrgence[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase
    .from('contact_urgence')
    .select('*')
    .eq('id_utilisateur', user.id)
    .order('date_ajout', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Ajouter un contact d'urgence
 */
export async function addContactUrgence(
  nom: string,
  email: string,
  relation: string
): Promise<ContactUrgence> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase
    .from('contact_urgence')
    .insert({
      id_utilisateur: user.id,
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      relation: relation.trim() || null,
      email_verifie: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprimer un contact d'urgence
 */
export async function deleteContactUrgence(contactId: string): Promise<void> {
  const { error } = await supabase
    .from('contact_urgence')
    .delete()
    .eq('id', contactId);

  if (error) throw error;
}

/**
 * Envoyer un email de vérification à un contact
 */
export async function envoyerVerificationContact(contactId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data: contact, error: checkError } = await supabase
    .from('contact_urgence')
    .select('id')
    .eq('id', contactId)
    .eq('id_utilisateur', user.id)
    .single();

  if (checkError || !contact) throw new Error('Contact introuvable');

  const { error } = await supabase.functions.invoke('sos-contact-verification-email', {
    body: { contact_id: contactId },
  });

  if (error) throw error;
}

/**
 * Envoyer un SOS (mode dispatch)
 */
export async function envoyerSOS(params: {
  message?: string;
  latitude?: number | null;
  longitude?: number | null;
  precisionMeters?: number | null;
}): Promise<SosDispatchResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase.functions.invoke('sos-dispatch', {
    body: {
      mode: 'dispatch',
      message: params.message || null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      precisionMeters: params.precisionMeters ?? null,
    },
  });

  if (error) {
    if (error.message?.includes('429') || error.status === 429) {
      throw new Error('Trop de demandes SOS récentes. Réessayez plus tard.');
    }
    throw error;
  }

  return data;
}

/**
 * Annuler un SOS (mode abort_trace)
 */
export async function annulerSOS(): Promise<{ id: string; statut: 'annule' }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await supabase.functions.invoke('sos-dispatch', {
    body: { mode: 'abort_trace' },
  });

  if (error) throw error;
  return data;
}

/**
 * Récupérer l'historique des SOS de l'utilisateur
 */
export async function getHistoriqueSOS(limit: number = 20): Promise<SosEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('sos_event')
    .select('*')
    .eq('id_utilisateur', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * ✅ SUPPRIMER TOUT L'HISTORIQUE DES SOS DE L'UTILISATEUR
 */
export async function supprimerHistoriqueSOS(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { error } = await supabase
    .from('sos_event')
    .delete()
    .eq('id_utilisateur', user.id);

  if (error) throw error;
}

export async function getContactsAvecVerification(): Promise<ContactUrgence[]> {
  return getContactsUrgence();
}

export function isContactVerifie(contact: ContactUrgence): boolean {
  return contact.email_verifie === true;
}