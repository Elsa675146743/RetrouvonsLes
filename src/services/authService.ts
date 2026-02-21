import { supabase } from './supabase';
import messaging from '@react-native-firebase/messaging';
import { UserRole } from '../types/auth';
import { Alert } from 'react-native';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  accessLevel: number;
}

export const authService = {
  // --- LOGIN ---
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Récupérer le token FCM et le stocker dans Supabase
    try {
      const user = data.user;
      const fcmToken = await messaging().getToken();
      if (user && fcmToken) {
        await supabase
          .from('user_tokens')
          .upsert({ user_id: user.id, fcm_token: fcmToken });
      }
    } catch (err) {
      console.log('Erreur stockage token FCM:', err);
    }

    return data;
  },

  // --- REGISTER ---
  register: async (email: string, password: string, metadata: { nom: string; prenom: string; quartier?: string }) => {
    // 1. SignUp dans Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: metadata.nom,
          prenom: metadata.prenom,
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      // 2. Création de l'entrée dans la table 'utilisateur'
      // Note: Idéalement ceci devrait être un Trigger Supabase, mais on le fait ici au cas où.
      // On vérifie d'abord si l'utilisateur existe déjà (si un trigger l'a créé)
      const { data: existingUser } = await supabase
        .from('utilisateur')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingUser) {
        const { error: profileError } = await supabase
          .from('utilisateur')
          .insert([
            {
              id: data.user.id,
              email: email,
              nom: metadata.nom,
              prenom: metadata.prenom,
              adresse: metadata.quartier,
              type_compte: 'grand_public', // Par défaut
              statut_compte: 'actif',
              // On attribue le rôle citoyen standard par défaut via la table de liaison plus tard si besoin
              // Mais pour l'instant on initialise juste le profil
            }
          ]);

        if (profileError) {
          console.error("Erreur création profil:", profileError);
          // On ne bloque pas forcément, mais c'est risqué.
        }

        // Attribution du rôle par défaut (Citoyen Standard - Niveau 0)
        // On doit trouver l'ID du rôle 'citoyen_standard'
        const { data: roleData } = await supabase
          .from('role')
          .select('id')
          .eq('nom_role', 'citoyen_standard')
          .single();

        if (roleData) {
          await supabase
            .from('utilisateur_role')
            .insert([{
              id_utilisateur: data.user.id,
              id_role: roleData.id
            }]);
        }
      }
    }

    return data;
  },

  // --- LOGOUT ---
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // --- GET ROLE ---
  getUserRole: async (userId: string): Promise<{ role: UserRole, level: number }> => {
    try {
      // Option 1: Via RPC si disponible (comme vu dans le schéma)
      const { data: level, error: rpcError } = await supabase.rpc('get_user_niveau_acces', { user_id: userId });

      if (!rpcError && level !== null) {
        // On doit mapper le niveau numérique vers notre ENUM UserRole (approximatif pour l'UI)
        // C'est un peu "hacky", l'idéal serait de récupérer le nom du rôle aussi.
        // On fait une requête jointe pour être sûr.
      }

      // Option 2: Requête directe (Plus sûr si on veut le nom du rôle)
      const { data, error } = await supabase
        .from('utilisateur_role')
        .select(`
                role (
                    nom_role,
                    niveau_accreditation
                )
            `)
        .eq('id_utilisateur', userId)
        // On prend le rôle avec le plus haut niveau s'il y en a plusieurs
        .order('role(niveau_accreditation)', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Fallback si pas de rôle trouvé -> Citoyen Standard
        return { role: UserRole.CITOYEN_STANDARD, level: 0 };
      }

      // Mapping du nom_role (DB) vers UserRole (Frontend Enum)
      const roleObj = Array.isArray(data.role) ? data.role[0] : data.role;

      if (!roleObj) {
        return { role: UserRole.CITOYEN_STANDARD, level: 0 };
      }

      const dbRoleName = roleObj.nom_role; // ex: 'officier_police'
      const dbLevel = roleObj.niveau_accreditation;

      // Conversion simple : on met en majuscule pour matcher l'enum TS
      const roleKey = dbRoleName.toUpperCase() as keyof typeof UserRole;

      return {
        role: UserRole[roleKey] || UserRole.CITOYEN_STANDARD,
        level: dbLevel
      };

    } catch (e) {
      console.error("Erreur récupération rôle:", e);
      return { role: UserRole.CITOYEN_STANDARD, level: 0 };
    }
  }
};

