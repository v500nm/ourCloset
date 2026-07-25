'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SubscriptionTier = 'solo' | 'couple' | 'family' | 'max';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subscriptionTier: SubscriptionTier;
  quickCode?: string;
}

interface AuthContextProps {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithQuickCode: (code: string) => Promise<void>;
  logout: () => void;
  updateSubscription: (userId: string, newTier: SubscriptionTier) => void;
  generateQuickCode: () => string;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Local DB Mock for testing RBAC
const MOCK_USERS_DB: AuthUser[] = [
  { id: 'u-1', email: 'admin@ourcloset.com', name: 'Admin', role: 'admin', subscriptionTier: 'max', quickCode: 'ADMINX' },
  { id: 'u-2', email: 'user@ourcloset.com', name: 'Saniya', role: 'user', subscriptionTier: 'couple', quickCode: 'COUPLE' },
  { id: 'u-3', email: 'solo@ourcloset.com', name: 'Armaan', role: 'user', subscriptionTier: 'solo', quickCode: 'SOLO24' },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // We'll store our mock DB in state so the admin dashboard can mutate it
  const [usersDb, setUsersDb] = useState<AuthUser[]>(MOCK_USERS_DB);

  useEffect(() => {
    // Attempt to resume session from local storage on mount
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Find them in the DB in case their sub changed
        const dbUser = usersDb.find(u => u.id === parsed.id);
        if (dbUser) setUser(dbUser);
      } catch (e) {
        console.error("Failed to parse auth session");
      }
    }
    // Also sync the usersDb from local storage if available so admin changes persist locally
    const savedDb = localStorage.getItem('mock_users_db');
    if (savedDb) {
      try {
        setUsersDb(JSON.parse(savedDb));
      } catch (e) { }
    }
    
    setLoading(false);
  }, []);

  const persistSession = (u: AuthUser) => {
    localStorage.setItem('auth_session', JSON.stringify(u));
    setUser(u);
  };

  const persistDb = (db: AuthUser[]) => {
    localStorage.setItem('mock_users_db', JSON.stringify(db));
    setUsersDb(db);
  };

  const generateQuickCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const login = async (email: string, password?: string) => {
    // Simulate network
    await new Promise(res => setTimeout(res, 800));
    const found = usersDb.find(u => u.email === email);
    if (!found) {
      // Auto-register mock for demo purposes if not found
      const newUser: AuthUser = {
        id: `u-${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'user',
        subscriptionTier: 'solo',
        quickCode: generateQuickCode(),
      };
      const newDb = [...usersDb, newUser];
      persistDb(newDb);
      persistSession(newUser);
      return;
    }
    
    // Assign a quick code if they don't have one
    if (!found.quickCode) {
      found.quickCode = generateQuickCode();
      const updatedDb = usersDb.map(u => u.id === found.id ? found : u);
      persistDb(updatedDb);
    }

    persistSession(found);
  };

  const loginWithQuickCode = async (code: string) => {
    await new Promise(res => setTimeout(res, 800));
    const found = usersDb.find(u => u.quickCode === code.toUpperCase());
    if (found) {
      persistSession(found);
    } else {
      throw new Error('Invalid QuickCode. Session not found or expired.');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_session');
    setUser(null);
  };

  const updateSubscription = (userId: string, newTier: SubscriptionTier) => {
    const updatedDb = usersDb.map(u => 
      u.id === userId ? { ...u, subscriptionTier: newTier } : u
    );
    persistDb(updatedDb);
    
    // If the active user is being updated, reflect immediately
    if (user && user.id === userId) {
      persistSession({ ...user, subscriptionTier: newTier });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithQuickCode, logout, updateSubscription, generateQuickCode }}>
      {/* We inject the users DB here secretly via a global window object just for the admin page to read without exporting it strictly, or we can just make it part of context if we assume admin uses the same provider */}
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

// Export a helper to read the DB directly from DOM since React Context shouldn't normally expose all users to non-admins
export const getAdminUserDb = (): AuthUser[] => {
  if (typeof document === 'undefined') return [];
  const el = document.getElementById('admin-db-bridge');
  if (el && el.dataset.users) {
    return JSON.parse(el.dataset.users);
  }
  return [];
};
