// src/services/partnerPortal/partnerApi.ts
//
// Axios instance dédiée au portail partenaire — JAMAIS partagée avec l'API
// user. Token stocké sous une clé distincte (`partner.accessToken`) pour
// éviter toute fuite entre les deux périmètres d'auth.

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../config/env';

const PARTNER_TOKEN_KEY = 'partner.accessToken';
const PARTNER_INFO_KEY = 'partner.info';

export const partnerStorage = {
  getToken: () => localStorage.getItem(PARTNER_TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(PARTNER_TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(PARTNER_TOKEN_KEY),

  getInfo: <T = unknown>(): T | null => {
    const raw = localStorage.getItem(PARTNER_INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setInfo: (info: unknown) =>
    localStorage.setItem(PARTNER_INFO_KEY, JSON.stringify(info)),
  clearInfo: () => localStorage.removeItem(PARTNER_INFO_KEY),

  clearAll: () => {
    localStorage.removeItem(PARTNER_TOKEN_KEY);
    localStorage.removeItem(PARTNER_INFO_KEY);
  },
};

const partnerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

partnerApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = partnerStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → on jette le token et on redirige vers le login partenaire.
// Pas de refresh : les sessions portail durent 8h et le partenaire se reconnecte.
partnerApi.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      partnerStorage.clearAll();
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/partner-portal/login')
      ) {
        window.location.href = '/partner-portal/login';
      }
    }
    return Promise.reject(error);
  },
);

export default partnerApi;
