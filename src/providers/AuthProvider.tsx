'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/services/supabase/client';
import { migrateGuestDataToUser } from '@/services/accountService';

export type SubscriptionTier = 'solo' | 'couple' | 'family' | 'max';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subscriptionTier: SubscriptionTier;
  quickCode?: string;
  isGuest?: boolean;
}

interface AuthContextProps {
  user: AuthUser | null;
  loading: boolean;
  isGuest: boolean;
  isConfigured: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithQuickCode: (code: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
  updateSubscription: (userId: string, newTier: SubscriptionTier) => void;
  generateQuickCode: () => string;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const GUEST_USER: AuthUser = {
  id: 'guest',
  email: 'guest@ourcloset.local',
  name: 'Guest Stylist',
  role: 'user',
  subscriptionTier: 'solo',
  isGuest: true,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // Local storage users DB for demo/offline RBAC
  const [usersDb, setUsersDb] = useState<AuthUser[]>([
    { id: 'u-1', email: 'admin@ourcloset.com', name: 'Admin', role: 'admin', subscriptionTier: 'max', quickCode: 'ADMINX' },
    { id: 'u-3', email: 'solo@ourcloset.com', name: 'Armaan', role: 'user', subscriptionTier: 'solo', quickCode: 'SOLO24' },
  ]);

  const persistSession = useCallback((u: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify(u));
    }
    setUser(u);
  }, []);

  const persistDb = (dbList: AuthUser[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_users_db', JSON.stringify(dbList));
    }
    setUsersDb(dbList);
  };

  const generateQuickCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Initialize session and Supabase auth listener
  useEffect(() => {
    const initAuth = async () => {
      // 1. If Supabase is configured, check remote session
      if (isConfigured) {
        try {
          const supabase = createClient();
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              role: data.user.user_metadata?.role || 'user',
              subscriptionTier: data.user.user_metadata?.tier || 'solo',
            };
            persistSession(authUser);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to local session
        }
      }

      // 2. Offline / local session resume
      if (typeof window !== 'undefined') {
        const savedSession = localStorage.getItem('auth_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            setUser(parsed);
          } catch {
            // Ignore
          }
        } else {
          // Default to Guest User so app is 100% functional without sign-in
          setUser(GUEST_USER);
        }

        const savedDb = localStorage.getItem('mock_users_db');
        if (savedDb) {
          try {
            setUsersDb(JSON.parse(savedDb));
          } catch {
            // Ignore
          }
        }
      }

      setLoading(false);
    };

    initAuth();
  }, [isConfigured, persistSession]);

  /**
   * Standard login (Supabase or local mock) with automatic guest store migration.
   */
  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (isConfigured && password) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            role: 'user',
            subscriptionTier: 'solo',
          };
          // Migrate guest data to authenticated user
          await migrateGuestDataToUser(data.user.id);
          persistSession(authUser);
          return;
        }
      }

      // Offline / Local fallback
      await new Promise((res) => setTimeout(res, 300));
      let found = usersDb.find((u) => u.email === email);
      if (!found) {
        found = {
          id: `u-${Date.now()}`,
          email,
          name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'user',
          subscriptionTier: 'solo',
          quickCode: generateQuickCode(),
        };
        const updated = [...usersDb, found];
        persistDb(updated);
      }

      // Migrate guest data
      await migrateGuestDataToUser(found.id);
      persistSession(found);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Magic Link Email Login via Supabase.
   */
  const signInWithMagicLink = async (email: string) => {
    if (!isConfigured) {
      await login(email);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/today` : undefined,
      },
    });
    if (error) throw error;
  };

  /**
   * Google OAuth Login via Supabase.
   */
  const signInWithGoogle = async () => {
    if (!isConfigured) {
      await login('google.user@example.com');
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/today` : undefined,
      },
    });
    if (error) throw error;
  };

  const continueAsGuest = () => {
    persistSession(GUEST_USER);
  };

  const loginWithQuickCode = async (code: string) => {
    await new Promise((res) => setTimeout(res, 200));
    const found = usersDb.find((u) => u.quickCode === code.toUpperCase());
    if (found) {
      await migrateGuestDataToUser(found.id);
      persistSession(found);
    } else {
      throw new Error('Invalid QuickCode. Session not found or expired.');
    }
  };

  const logout = () => {
    if (isConfigured) {
      try {
        const supabase = createClient();
        supabase.auth.signOut().catch(() => {});
      } catch {
        // Ignore
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
    }
    // Revert to Guest User
    setUser(GUEST_USER);
  };

  const updateSubscription = (userId: string, newTier: SubscriptionTier) => {
    const updatedDb = usersDb.map((u) => (u.id === userId ? { ...u, subscriptionTier: newTier } : u));
    persistDb(updatedDb);

    if (user && user.id === userId) {
      persistSession({ ...user, subscriptionTier: newTier });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest: Boolean(!user || user.isGuest || user.id === 'guest'),
        isConfigured,
        login,
        loginWithQuickCode,
        signInWithMagicLink,
        signInWithGoogle,
        continueAsGuest,
        logout,
        updateSubscription,
        generateQuickCode,
      }}
    >
      <div data-users={JSON.stringify(usersDb)} id="admin-db-bridge" className="hidden" />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const getAdminUserDb = (): AuthUser[] => {
  if (typeof document === 'undefined') return [];
  const el = document.getElementById('admin-db-bridge');
  if (el && el.dataset.users) {
    try {
      return JSON.parse(el.dataset.users);
    } catch {
      return [];
    }
  }
  return [];
};
