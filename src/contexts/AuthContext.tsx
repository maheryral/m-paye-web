import React, { createContext, useContext, useEffect, useState } from 'react';
import { accountService, authService } from '../services/api';
import { sessionEvents } from '../services/sessionEvents';
import { asyncStorage, secureStorage } from '../services/storage';

export interface User {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  kycLevel: string;
  isActive: boolean;
}

interface RegisterData {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  loginWithTokens: (accessToken: string, refreshToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<any>;
  setUser: (user: User | null) => void;
  setUserFromTokens: (accessToken: string, refreshToken: string, userData: User) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function persistSession(accessToken: string, refreshToken: string, userData: User) {
  await Promise.all([
    secureStorage.setItem('accessToken', accessToken),
    secureStorage.setItem('refreshToken', refreshToken),
    asyncStorage.setItem('user', JSON.stringify(userData)),
  ]);
}

async function clearSession() {
  await Promise.all([
    secureStorage.multiRemove(['accessToken', 'refreshToken']),
    asyncStorage.removeItem('user'),
  ]);
  // 🔄 reset le cache du switch marchand (sinon user suivant croit qu'il est déjà switché)
  try {
    localStorage.removeItem('activeMerchantId');
  } catch {
    /* localStorage indispo (SSR/test) — pas critique */
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadUser();
  }, []);

  /**
   * Écoute les expirations de session (refresh token KO côté serveur).
   * api.ts émet l'événement après avoir wipe les tokens — ici on reset
   * le state React pour éviter de garder un "faux user" avant le hard redirect.
   */
  useEffect(() => {
    const unsubscribe = sessionEvents.onExpired(() => {
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const loadUser = async () => {
    try {
      const [accessToken, refreshToken, storedUser] = await Promise.all([
        secureStorage.getItem('accessToken'),
        secureStorage.getItem('refreshToken'),
        asyncStorage.getItem('user'),
      ]);
      // 🔐 Exige les 3 — sinon session incohérente (cas typique : tokens wipés
      // par un précédent refresh KO mais 'user' resté → faux état authentifié
      // qui spam des 401 jusqu'à la redirection).
      if (accessToken && refreshToken && storedUser) {
        setUser(JSON.parse(storedUser));
      } else if (storedUser || accessToken || refreshToken) {
        // État partiel → on nettoie pour repartir propre
        await clearSession();
      }
    } catch (error) {
      console.error('Erreur chargement user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithTokens = async (accessToken: string, refreshToken: string, userData: User) => {
    await persistSession(accessToken, refreshToken, userData);
    setUser(userData);
  };

  const login = async (identifier: string, password: string) => {
    const response = await authService.login({ login: identifier, password });
    if (!response?.accessToken || !response?.refreshToken || !response?.user) {
      console.warn('[LOGIN] Réponse invalide — clés:', Object.keys(response ?? {}));
      throw new Error('Réponse de connexion invalide (tokens manquants)');
    }
    await persistSession(response.accessToken, response.refreshToken, response.user);
    setUser(response.user);
  };

  const setUserFromTokens = async (accessToken: string, refreshToken: string, userData: User) => {
    await persistSession(accessToken, refreshToken, userData);
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    if (response?.accessToken && response?.user) {
      await persistSession(response.accessToken, response.refreshToken, response.user);
      setUser(response.user);
      return response;
    }
    throw new Error("Réponse d'inscription invalide");
  };

  const logout = async () => {
    try {
      const token = await secureStorage.getItem('refreshToken');
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Erreur logout:', error);
    } finally {
      await clearSession();
      setUser(null);
    }
  };

  const logoutAllDevices = async () => {
    try {
      await authService.logoutAll();
    } catch (error) {
      console.error('Erreur logoutAll:', error);
    } finally {
      await clearSession();
      setUser(null);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    try {
      const response = await accountService.updateProfile(data);
      const updated = { ...user, ...data } as User;
      setUser(updated);
      await asyncStorage.setItem('user', JSON.stringify(updated));
      return response;
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithTokens,
        register,
        logout,
        logoutAllDevices,
        updateUser,
        setUserFromTokens,
        setUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
};
