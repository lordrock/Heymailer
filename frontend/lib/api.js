import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err?.response?.status === 401) {
      const onLogin = window.location.pathname.startsWith('/login');
      if (!onLogin) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export function errMsg(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || fallback;
}
