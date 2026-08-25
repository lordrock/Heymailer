'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { AUTH_TOKEN_KEY } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setAdmin(data.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!loading && !admin && pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, admin, pathname, router]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    setAdmin(data.admin);
    return data.admin;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setAdmin(null);
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
