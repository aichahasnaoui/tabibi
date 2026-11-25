import axios from 'axios';
import { useAuth } from '../store/auth.js';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((cfg) => {
  const t = useAuth.getState().accessToken;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const is401 = error.response?.status === 401;
    if (!is401 || original._retry || original.url?.includes('/auth/')) throw error;
    original._retry = true;
    try {
      refreshing ||= axios.post('/api/auth/refresh', null, { withCredentials: true });
      const { data } = await refreshing;
      useAuth.getState().setSession(data);
      return api(original);
    } catch {
      useAuth.getState().clear();
      throw error;
    } finally {
      refreshing = null;
    }
  }
);

export const errMsg = (e) => e.response?.data?.message || 'Erreur réseau';
