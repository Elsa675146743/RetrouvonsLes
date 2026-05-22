import { supabase } from './supabase';
import messaging from '@react-native-firebase/messaging';
import { UserRole } from '../types/auth';
 
export interface UserProfile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  accessLevel: number;
}
 
export const authService = {
 
  // --- LOGIN ---
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
 
    try {
      const fcmToken = await messaging().getToken();
      if (data.user && fcmToken) {
        await supabase.from('user_tokens')
          .upsert({ user_id: data.user.id, fcm_token: fcmToken });
      }
    } catch (err) {
      console.log('Erreur FCM (non bloquant):', err);
    }
 
    return data;
  },
 
  // --- REGISTER ---
  register: async (
    email: string,
    password: string,
    metadata: { nom: string; prenom: string; quartier?: string }
  ) => {
    // 1. Création dans Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom: metadata.nom, prenom: metadata.prenom } }
    });
    if (error) throw error;
 
    if (data.user) {
      // 2. Vérifier si profil existe déjà
      const { data: existingUser } = await supabase
        .from('utilisateur')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle(); // ✅ corrigé
 
      if (!existingUser) {
        // 3. Créer le profil
        const { error: profileError } = await supabase
          .from('utilisateur')
          .insert([{
            id: data.user.id,
            email: email,
            nom: metadata.nom,
            prenom: metadata.prenom,
            adresse: metadata.quartier || null,
            type_compte: 'grand_public',
            statut_compte: 'actif',
          }]);
 
        if (profileError) {
          console.error("Erreur création profil:", profileError);
          throw profileError; // ✅ bloquant pour voir l'erreur réelle
        }
 
        // 4. Assigner le rôle citoyen_standard
        const { data: roleData, error: roleError } = await supabase
          .from('role')
          .select('id')
          .eq('nom_role', 'citoyen_standard')
          .maybeSingle(); // ✅ corrigé
 
        if (roleError) {
          console.error("Erreur récupération rôle:", roleError);
        } else if (roleData) {
          const { error: assignRoleError } = await supabase
            .from('utilisateur_role')
            .insert([{ id_utilisateur: data.user.id, id_role: roleData.id }]);
 
          if (assignRoleError) {
            console.error("Erreur assignation rôle:", assignRoleError);
          } else {
            console.log("✅ Rôle citoyen_standard assigné");
          }
        }
      }
    }
 
    return data;
  },
 
  // --- LOGOUT ---
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log("Erreur signOut:", error);
    }
  },
 
  // --- GET ROLE ---
  getUserRole: async (userId: string): Promise<{ role: UserRole; level: number }> => {
    try {
      const { data, error } = await supabase
        .from('utilisateur_role')
        .select(`role (nom_role, niveau_accreditation)`)
        .eq('id_utilisateur', userId)
        .order('role(niveau_accreditation)', { ascending: false })
        .limit(1)
        .maybeSingle(); // ✅ corrigé : ne plante plus si 0 résultats
 
      if (error || !data) return { role: UserRole.CITOYEN_STANDARD, level: 0 };
 
      const roleObj = Array.isArray(data.role) ? data.role[0] : data.role;
      if (!roleObj) return { role: UserRole.CITOYEN_STANDARD, level: 0 };
 
      const roleKey = roleObj.nom_role.toUpperCase() as keyof typeof UserRole;
      return {
        role: UserRole[roleKey] || UserRole.CITOYEN_STANDARD,
        level: roleObj.niveau_accreditation || 0,
      };
    } catch (e) {
      console.error("Erreur récupération rôle:", e);
      return { role: UserRole.CITOYEN_STANDARD, level: 0 };
    }
  },
};