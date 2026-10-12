'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { AUTH_TOKEN_KEY } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const bootstrapped = useRef(false);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setAdmin(data.admin);
      setAccess(data.access || null);
      return data.admin;
    } catch {
      setAdmin(null);
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // AuthProvider lives for the lifetime of the application. Bootstrap the
    // session once; route changes must not race a valid login with /auth/me.
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    // Token exchange pages establish the session themselves. Running /auth/me
    // in parallel can return 401 just after the exchange and clear the fresh
    // bearer token, especially when the API cookie is cross-site.
    if (pathname === '/auth/magic-link' || pathname === '/auth/verify-email') {
      setLoading(false);
      return;
    }
    fetchMe();
  }, [fetchMe, pathname]);

  useEffect(() => {
    const publicAuthRoute = pathname === '/login' || pathname.startsWith('/auth/');
    if (!loading && !admin && !publicAuthRoute) {
      router.replace('/login');
    }
  }, [loading, admin, pathname, router]);

  useEffect(() => {
    if (!admin) return undefined;
    const timer = window.setInterval(() => fetchMe(), 30000);
    return () => window.clearInterval(timer);
  }, [admin, fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    setAdmin(data.admin);
    const current = await fetchMe();
    return current || data.admin;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    if (data.token) window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    if (data.admin) setAdmin(data.admin);
    return data;
  };

  const completeTokenAuth = useCallback(async (endpoint, token) => {
    const { data } = await api.post(endpoint, { token });
    if (data.token) window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    if (data.admin) setAdmin(data.admin);
    await fetchMe();
    return data;
  }, [fetchMe]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setAdmin(null);
      setAccess(null);
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ admin, access, loading, login, signup, completeTokenAuth, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
