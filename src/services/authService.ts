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

    try {
      const user = data.user;
      const fcmToken = await messaging().getToken();
      if (user && fcmToken) {
        await supabase
          .from('user_tokens')
          .upsert({ user_id: user.id, fcm_token: fcmToken });
      }
    } catch (err) {
      console.log('Erreur stockage token FCM (non bloquant):', err);
    }

    return data;
  },

  // --- REGISTER ---
  register: async (email: string, password: string, metadata: { nom: string; prenom: string; quartier?: string }) => {
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
              type_compte: 'grand_public',
              statut_compte: 'actif',
            }
          ]);

        if (profileError) console.error("Erreur création profil:", profileError);

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

  // --- LOGOUT (Mis à jour pour être plus robuste) ---
  logout: async () => {
    try {
      // Tentative de déconnexion propre de Supabase
      await supabase.auth.signOut();
      
      // Optionnel : On peut vider les jetons de notifications ici si besoin
      // const fcmToken = await messaging().deleteToken(); 
      
    } catch (error) {
      // On log l'erreur en console mais on ne "throw" pas
      // pour que le composant puisse continuer la redirection
      console.log("Erreur lors du signOut Supabase:", error);
    }
  },

  // --- GET ROLE ---
  getUserRole: async (userId: string): Promise<{ role: UserRole, level: number }> => {
    try {
      const { data, error } = await supabase
        .from('utilisateur_role')
        .select(`
                role (
                    nom_role,
                    niveau_accreditation
                )
            `)
        .eq('id_utilisateur', userId)
        .order('role(niveau_accreditation)', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { role: UserRole.CITOYEN_STANDARD, level: 0 };
      }

      const roleObj = Array.isArray(data.role) ? data.role[0] : data.role;

      if (!roleObj) return { role: UserRole.CITOYEN_STANDARD, level: 0 };

      const dbRoleName = roleObj.nom_role;
      const dbLevel = roleObj.niveau_accreditation;

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