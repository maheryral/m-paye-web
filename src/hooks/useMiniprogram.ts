// src/hooks/useMiniprogram.ts
//
// Hook pour les mini-programmes M'Paye. Gère :
//   - Récupération du token (URL ?token=... sur mobile, /billers/launch-token sur web)
//   - Création du client axios scopé
//   - Refresh auto à expiration (10 min)
//   - État loading / error

import { useEffect, useRef, useState } from 'react';
import {
  createMiniprogramClient,
  fetchMiniprogramToken,
  type MiniprogramClient,
} from '../services/miniprogramApi';

interface UseMiniprogramOptions {
  /** ID du Biller (obligatoire pour récupérer un token côté web). */
  billerId: string;
}

interface UseMiniprogramResult {
  client: MiniprogramClient | null;
  loading: boolean;
  error: string | null;
}

export function useMiniprogram({ billerId }: UseMiniprogramOptions): UseMiniprogramResult {
  const [client, setClient] = useState<MiniprogramClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 1. Token déjà dans l'URL (cas WebView mobile : ?source=mobile&token=...)
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');

        // 2. Sinon (cas web direct), on demande un launch-token au backend
        if (!token) {
          token = await fetchMiniprogramToken(billerId);
        } else {
          // Nettoie l'URL pour ne pas leak le token dans l'historique browser
          urlParams.delete('token');
          urlParams.delete('source');
          const qs = urlParams.toString();
          const cleanUrl =
            window.location.pathname + (qs ? `?${qs}` : '');
          window.history.replaceState({}, '', cleanUrl);
        }

        if (!mountedRef.current) return;
        setClient(createMiniprogramClient(token));
      } catch (e: any) {
        if (!mountedRef.current) return;
        setError(
          e?.response?.data?.message ??
            e?.message ??
            'Impossible d\'initialiser le mini-program',
        );
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [billerId]);

  return { client, loading, error };
}
