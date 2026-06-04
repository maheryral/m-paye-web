import api from './api';

export interface PublicServiceType {
  id: string;
  code: string;
  label: string;
  iconName: string | null;
  color: string | null;
  sortOrder: number;
}

export type BillerIntegrationType = 'WEB' | 'NATIVE';

export interface PublicBiller {
  id: string;
  name: string;
  iconName: string | null;
  logoUrl: string | null;
  color: string | null;
  redirectPath: string;
  integrationType: BillerIntegrationType;
  isEssential: boolean;
  description: string | null;
  sortOrder: number;
  serviceType: PublicServiceType;
}

export const billersApi = {
  /** Liste publique des billers actifs avec leur type (pour la page Services). */
  list: () => api.get<PublicBiller[]>('/billers').then((r) => r.data),

  /** Récupère les types de service (pour grouper si pas d'ordre fourni dans biller). */
  listTypes: () =>
    api.get<PublicServiceType[]>('/service-types').then((r) => r.data),

  /**
   * Génère un token short-lived (10 min) + URL absolue à ouvrir en WebView.
   * Utilisé surtout par le mobile, mais le web peut aussi l'appeler s'il
   * veut transmettre une auth distincte au mini-program.
   */
  launchToken: (billerId: string) =>
    api
      .post<{ url: string; token: string; expiresAt: string }>(
        '/billers/launch-token',
        { billerId },
      )
      .then((r) => r.data),
};
