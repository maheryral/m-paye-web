import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_DARK_COLORS,
  DEFAULT_LIGHT_COLORS,
  fetchTheme,
  readCachedThemeSync,
  type ThemeColors as ApiThemeColors,
} from '../services/appThemeService';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = ApiThemeColors;

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  /** Force un re-fetch de la palette depuis l'API. */
  refreshTheme: () => Promise<boolean>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@theme_mode';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Convertit "#3b82f6" ou "#fff" en "59 130 246" (canaux RGB séparés par espaces).
 * Si l'entrée est déjà au format canaux (ex: "59 130 246"), elle est renvoyée
 * telle quelle. Cette fonction est tolérante : palette invalide → fallback noir
 * pour éviter un crash de l'app (la couleur sera juste fausse, pas la page).
 */
function hexToRgbChannels(input: string): string {
  if (!input) return '0 0 0';
  const trimmed = input.trim();
  // Déjà au format "r g b" — on accepte tel quel.
  if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(trimmed)) return trimmed;
  let hex = trimmed.replace(/^#/, '');
  // Format court #abc → #aabbcc
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6 || !/^[0-9a-f]{6}$/i.test(hex)) return '0 0 0';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      return saved as ThemeMode;
    }
    return 'dark';
  });
  const [systemDark, setSystemDark] = useState<boolean>(getSystemPrefersDark);

  // Palette dynamique : hydrate depuis le cache localStorage en sync (évite
  // flash defaults), puis fetch API au mount pour récupérer la version fraîche.
  const cachedAtBoot = readCachedThemeSync();
  const [lightColors, setLightColors] = useState<ThemeColors>(
    cachedAtBoot?.colorsLight ?? DEFAULT_LIGHT_COLORS,
  );
  const [darkColors, setDarkColors] = useState<ThemeColors>(
    cachedAtBoot?.colorsDark ?? DEFAULT_DARK_COLORS,
  );

  // Fetch au mount (1 fois)
  useEffect(() => {
    void fetchTheme().then((t) => {
      if (t) {
        setLightColors(t.colorsLight);
        setDarkColors(t.colorsDark);
      }
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = mode === 'system' ? systemDark : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  /**
   * Synchronise les CSS variables `--color-*` avec les couleurs du contexte.
   * Indispensable pour que les classes Tailwind `bg-brand-500`, `text-success-500`
   * (et leurs variantes opacité `bg-brand-500/20`) reflètent la palette de l'admin.
   *
   * Format requis par tailwind.config.js : canaux RGB séparés par des espaces
   * (ex: "59 130 246"), pour que `rgb(var(--c) / <alpha-value>)` fonctionne.
   * On convertit donc les hex de l'API à la volée.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary',      hexToRgbChannels(colors.primary));
    root.style.setProperty('--color-primary-dark', hexToRgbChannels(colors.primaryDark));
    root.style.setProperty('--color-secondary',    hexToRgbChannels(colors.secondary));
    root.style.setProperty('--color-success',      hexToRgbChannels(colors.success));
    root.style.setProperty('--color-warning',      hexToRgbChannels(colors.warning));
    root.style.setProperty('--color-danger',       hexToRgbChannels(colors.error));
  }, [colors]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const refreshTheme = useCallback(async (): Promise<boolean> => {
    const t = await fetchTheme();
    if (t) {
      setLightColors(t.colorsLight);
      setDarkColors(t.colorsDark);
      return true;
    }
    return false;
  }, []);

  return (
    <ThemeContext.Provider
      value={{ mode, colors, isDark, setMode, toggleTheme, refreshTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  return ctx;
};

export const useColors = (): ThemeColors => useTheme().colors;
export const useIsDark = (): boolean => useTheme().isDark;
