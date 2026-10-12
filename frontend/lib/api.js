import axios from 'axios';

export const AUTH_TOKEN_KEY = 'heymailer_token';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100/api',
  withCredentials: true,
});

// Cross-site cookies can be blocked when Netlify and Render are treated as
// different sites. Use the login token as a compatibility fallback while
// retaining the httpOnly cookie for browsers that accept it.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err?.response?.status === 401) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      const onPublicAuthRoute = window.location.pathname === '/login' || window.location.pathname.startsWith('/auth/');
      if (!onPublicAuthRoute) window.location.replace(new URL('/login', window.location.origin).toString());
    }
    return Promise.reject(err);
  }
);

export default api;

export function errMsg(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || fallback;
}
