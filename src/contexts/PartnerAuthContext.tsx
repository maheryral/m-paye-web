// src/contexts/PartnerAuthContext.tsx
// Auth state pour le portail partenaire — distinct du AuthContext user.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  partnerStorage,
} from '../services/partnerPortal/partnerApi';
import { partnerPortalApi, type PartnerInfo } from '../services/partnerPortal/partnerPortalApi';

interface PartnerAuthCtx {
  partner: PartnerInfo | null;
  loading: boolean;
  login: (appId: string, appSecret: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PartnerAuthCtx | null>(null);

export function PartnerAuthProvider({ children }: { children: React.ReactNode }) {
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!partnerStorage.getToken()) {
      setPartner(null);
      return;
    }
    try {
      const me = await partnerPortalApi.me();
      setPartner(me);
      partnerStorage.setInfo(me);
    } catch {
      partnerStorage.clearAll();
      setPartner(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Hydratation rapide depuis localStorage, puis refresh en arrière-plan
      const cached = partnerStorage.getInfo<PartnerInfo>();
      if (cached) setPartner(cached);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (appId: string, appSecret: string) => {
    const res = await partnerPortalApi.login({
      app_id: appId.trim(),
      app_secret: appSecret,
    });
    partnerStorage.setToken(res.accessToken);
    // Charge le profil complet
    const me = await partnerPortalApi.me();
    partnerStorage.setInfo(me);
    setPartner(me);
  }, []);

  const logout = useCallback(() => {
    partnerStorage.clearAll();
    setPartner(null);
  }, []);

  return (
    <Ctx.Provider value={{ partner, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePartnerAuth() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error('usePartnerAuth must be used inside PartnerAuthProvider');
  return ctx;
}
