'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getAdminKey } from '@/lib/config';

const STORAGE_KEY = 'admin-auth';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminKey: string | null;
  login: (key: string) => boolean;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKeyState] = useState<string | null>(null);

  const validateAndStore = useCallback((key: string): boolean => {
    const validKey = getAdminKey();
    if (key !== validKey) return false;
    setAdminKeyState(key);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, key);
      } catch {
        // ignore
      }
    }
    return true;
  }, []);

  const login = useCallback((key: string) => validateAndStore(key), [validateAndStore]);

  const logout = useCallback(() => {
    setAdminKeyState(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored && stored === getAdminKey()) {
        setAdminKeyState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const value: AdminAuthContextType = {
    isAuthenticated: adminKey !== null,
    adminKey,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
