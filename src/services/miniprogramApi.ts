// src/services/miniprogramApi.ts
//
// Helper pour les mini-programmes M'Paye.
// Le mini-program reçoit un JWT court (10 min, audience 'webview:biller') :
//   - sur mobile via URL ?token=...
//   - sur web via POST /billers/launch-token { billerId }
//
// Tous les appels passent par :
//   GET /miniprogram/proxy/* → forward signé HMAC vers l'API du partenaire
//   POST /miniprogram/pay    → débit user + crédit merchant
//
// Le token est utilisé comme Bearer pour ces endpoints.

import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import api from './api';

/** Récupère le token webview:biller pour ouvrir un mini-program côté web. */
export async function fetchMiniprogramToken(billerId: string): Promise<string> {
  // Utilise l'instance user normale (Bearer du user M'Paye)
  const { data } = await api.post<{ token: string; url: string; expiresAt: string }>(
    '/billers/launch-token',
    { billerId },
  );
  return data.token;
}

/**
 * Crée un client axios scopé sur le token webview:biller.
 * Le token vit max 10 min — au-delà l'user devra réouvrir le mini-program.
 */
export function createMiniprogramClient(token: string) {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 15_000,
  });

  return {
    /** Contexte : { userId, biller } */
    context: () =>
      client.get('/miniprogram/context').then((r) => r.data),

    /**
     * Forward GET vers l'API du partenaire.
     * Le subPath et query sont préservés tels quels.
     *
     *   proxyGet('/rooms?city=Tana&max=200000') → forward à apiBaseUrl/rooms?city=Tana&max=200000
     */
    proxyGet: <T = unknown>(subPath: string) =>
      client.get<T>(`/miniprogram/proxy${ensureSlash(subPath)}`).then((r) => r.data),

    proxyPost: <T = unknown>(subPath: string, body: unknown) =>
      client
        .post<T>(`/miniprogram/proxy${ensureSlash(subPath)}`, body)
        .then((r) => r.data),

    proxyPatch: <T = unknown>(subPath: string, body: unknown) =>
      client
        .patch<T>(`/miniprogram/proxy${ensureSlash(subPath)}`, body)
        .then((r) => r.data),

    proxyDelete: <T = unknown>(subPath: string) =>
      client
        .delete<T>(`/miniprogram/proxy${ensureSlash(subPath)}`)
        .then((r) => r.data),

    /**
     * Paiement depuis le mini-program.
     * Débit du wallet user → crédit merchant (Carlton) + notification au partenaire.
     */
    pay: (input: {
      externalRef: string;
      amount: number;
      subject: string;
      metadata?: Record<string, any>;
    }) => {
      const idempotencyKey = crypto.randomUUID();
      return client
        .post<{ ok: boolean; transactionRef: string; replay: boolean }>(
          '/miniprogram/pay',
          input,
          { headers: { 'Idempotency-Key': idempotencyKey } },
        )
        .then((r) => r.data);
    },
  };
}

export type MiniprogramClient = ReturnType<typeof createMiniprogramClient>;

function ensureSlash(p: string): string {
  return p.startsWith('/') ? p : `/${p}`;
}
