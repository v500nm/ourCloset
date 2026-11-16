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

function setSessionCookie(u: AuthUser | null) {
  if (typeof document !== 'undefined') {
    if (u && !u.isGuest) {
      const payload = encodeURIComponent(
        JSON.stringify({ id: u.id, role: u.role, email: u.email })
      );
      document.cookie = `auth_session=${payload}; Path=/; SameSite=Lax; max-age=604800`;
    } else {
      document.cookie = 'auth_session=; Path=/; SameSite=Lax; max-age=0';
    }
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // Local storage users DB for demo/offline RBAC (disabled in production)
  const [usersDb, setUsersDb] = useState<AuthUser[]>(() => {
    if (process.env.NODE_ENV !== 'production' && !isConfigured) {
      return [
        { id: 'u-1', email: 'admin@ourcloset.com', name: 'Admin', role: 'admin', subscriptionTier: 'max', quickCode: 'ADMINX' },
        { id: 'u-3', email: 'solo@ourcloset.com', name: 'Armaan', role: 'user', subscriptionTier: 'solo', quickCode: 'SOLO24' },
      ];
    }
    return [];
  });

  const persistSession = useCallback((u: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify(u));
    }
    setSessionCookie(u);
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
    let authListenerUnsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      // 1. If Supabase is configured, check remote session & subscribe to auth state changes
      if (isConfigured) {
        try {
          const supabase = createClient();

          // Subscribe to onAuthStateChange (F-09: handles OAuth, magic-link and refresh)
          const { data: listenerData } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const remoteRole = session.user.app_metadata?.role === 'admin' ? 'admin' : 'user';
              const authUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                role: remoteRole,
                subscriptionTier: session.user.user_metadata?.tier || 'solo',
              };
              await migrateGuestDataToUser(session.user.id);
              persistSession(authUser);
              setLoading(false);
            } else if (event === 'SIGNED_OUT') {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_session');
              }
              setSessionCookie(null);
              setUser(GUEST_USER);
              setLoading(false);
            }
          });

          authListenerUnsubscribe = () => {
            listenerData.subscription.unsubscribe();
          };

          const { data } = await supabase.auth.getUser();
          if (data.user) {
            // F-01: Read role strictly from app_metadata (service-controlled), NOT user_metadata
            const role = data.user.app_metadata?.role === 'admin' ? 'admin' : 'user';
            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              role,
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
            // In production, force non-guest accounts without Supabase to user role unless verified
            if (isConfigured && parsed.role === 'admin') {
              parsed.role = 'user';
            }
            setUser(parsed);
            setSessionCookie(parsed);
          } catch {
            // Ignore
          }
        } else {
          // Default to Guest User so app is 100% functional without sign-in
          setUser(GUEST_USER);
          setSessionCookie(null);
        }

        if (process.env.NODE_ENV !== 'production' && !isConfigured) {
          const savedDb = localStorage.getItem('mock_users_db');
          if (savedDb) {
            try {
              setUsersDb(JSON.parse(savedDb));
            } catch {
              // Ignore
            }
          }
        }
      }

      setLoading(false);
    };

    initAuth();

    return () => {
      if (authListenerUnsubscribe) {
        authListenerUnsubscribe();
      }
    };
  }, [isConfigured, persistSession]);

  /**
   * Standard login with automatic guest store migration.
   */
  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (isConfigured) {
        if (!password) {
          throw new Error('Password is required for authentication.');
        }
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          // F-01: Read role strictly from app_metadata
          const role = data.user.app_metadata?.role === 'admin' ? 'admin' : 'user';
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            role,
            subscriptionTier: data.user.user_metadata?.tier || 'solo',
          };
          // Migrate guest data to authenticated user
          await migrateGuestDataToUser(data.user.id);
          persistSession(authUser);
          return;
        }
        return;
      }

      // Offline / Local development fallback only
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase authentication is not configured in this environment.');
      }

      await new Promise((res) => setTimeout(res, 300));
      let found = usersDb.find((u) => u.email === email);
      if (!found) {
        // F-01: Never automatically grant admin role from email string matching
        found = {
          id: `u-${Date.now()}`,
          email,
          name: email.split('@')[0],
          role: 'user',
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
    if (isConfigured || process.env.NODE_ENV === 'production') {
      throw new Error('QuickCode authentication is only available in local offline development.');
    }
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
    setSessionCookie(null);
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
