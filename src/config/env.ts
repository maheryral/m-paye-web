/**
 * Configuration centrale de l'environnement front (web).
 *
 * En dev : .env => VITE_API_URL=http://localhost:3000
 * En prod : remplacer par l'URL publique HTTPS du backend.
 */

const DEFAULT_API_URL = 'http://localhost:3000';

export const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL;

export const REQUEST_TIMEOUT_MS = 30000;

export const API_PREFIX = '';

export const buildUrl = (path: string): string => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${API_PREFIX}${cleanPath}`;
};
