// src/services/appThemeService.ts (web)
// Charge le thème global depuis /app-theme avec cache localStorage + fallback.

import axios from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/env';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
  shadow: string;
}

export interface AppTheme {
  colorsLight: ThemeColors;
  colorsDark: ThemeColors;
  version: number;
  updatedAt: string;
}

export const DEFAULT_LIGHT_COLORS: ThemeColors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  secondary: '#8b5cf6',
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  error: '#ef4444',
  success: '#3b82f6',
  warning: '#f59e0b',
  info: '#3b82f6',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',
};

export const DEFAULT_DARK_COLORS: ThemeColors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  secondary: '#a78bfa',
  background: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  error: '#f87171',
  success: '#60a5fa',
  warning: '#fbbf24',
  info: '#60a5fa',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
};

export const DEFAULT_THEME: AppTheme = {
  colorsLight: DEFAULT_LIGHT_COLORS,
  colorsDark: DEFAULT_DARK_COLORS,
  version: 0,
  updatedAt: new Date(0).toISOString(),
};

const STORAGE_KEY = 'app_theme_v1';

interface CachedTheme {
  theme: AppTheme;
  cachedAt: number;
}

/** Lit le cache localStorage (synchrone — utilisable dans useState init). */
export function readCachedThemeSync(): AppTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTheme;
    if (!parsed?.theme?.colorsLight || !parsed?.theme?.colorsDark) return null;
    return parsed.theme;
  } catch {
    return null;
  }
}

function writeCachedTheme(theme: AppTheme) {
  try {
    const payload: CachedTheme = { theme, cachedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/** Fetch fresh depuis l'API. Retourne null en cas d'erreur. */
export async function fetchTheme(): Promise<AppTheme | null> {
  try {
    const res = await axios.get<AppTheme>(`${API_BASE_URL}/app-theme`, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    if (!res.data?.colorsLight || !res.data?.colorsDark) return null;
    writeCachedTheme(res.data);
    return res.data;
  } catch {
    return null;
  }
}
