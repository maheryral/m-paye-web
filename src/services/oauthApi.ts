// src/services/oauthApi.ts
// Endpoints OAuth utilisés par la page /oauth/consent.
import api from './api';

export type OAuthScope =
  | 'auth_user'
  | 'auth_phone'
  | 'auth_email'
  | 'trade'
  | 'trade_refund'
  | 'wallet_balance';

export interface PartnerPublicInfo {
  appId: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  allowedScopes: OAuthScope[];
  redirectUris: string[];
  isActive: boolean;
}

export const oauthApi = {
  /** Récupère les infos publiques d'un partenaire pour affichage consent. */
  partnerInfo: (appId: string) =>
    api
      .get<PartnerPublicInfo>(`/oauth/partner-info/${encodeURIComponent(appId)}`)
      .then((r) => r.data),

  /**
   * Génère un auth_code (l'user a consenti). Le frontend redirige ensuite
   * vers redirect_uri?code=...&state=...
   * Requiert le JWT user M'Paye (l'user est connecté).
   */
  authorize: (data: {
    app_id: string;
    scopes: OAuthScope[];
    redirect_uri: string;
    state?: string;
  }) =>
    api
      .post<{ code: string; expires_at: string; state?: string }>(
        '/oauth/authorize',
        data,
      )
      .then((r) => r.data),
};
