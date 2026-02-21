import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { UserRole, User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, access_level, organization_id')
      .eq('id', authUser.id)
      .single();
    if (error) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser({
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role as UserRole,
      accessLevel: data.access_level,
      organizationId: data.organization_id,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchUserProfile();
    // Optionally, listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser: fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
