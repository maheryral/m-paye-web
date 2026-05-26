import api from './api';

export interface TLPStation {
  id: string;
  nom: string;
  localisation: string;
  ordre: number;
  latitude?: number;
  longitude?: number;
}

export interface TLPTarif {
  id: string;
  type: string;
  libelle: string;
  prix: number;
  description?: string;
  validiteHeures: number;
}

export interface TLPLigne {
  id: string;
  nom: string;
  code: string;
  couleur: string;
  description?: string;
  longueurKm?: number;
  dureeMinutes?: number;
  statut: string;
  horaireOuverture?: string;
  horaireFermeture?: string;
  stations?: TLPStation[];
  tarifs?: TLPTarif[];
}

export interface TLPTicket {
  id: string;
  codeQR: string;
  prixPaye: number;
  statusPaiement: string;
  statusTicket: string;
  modePaiement?: string;
  dateAchat: string;
  dateValidite: string;
  dateUtilisation?: string;
  ligne?: TLPLigne;
  tarif?: TLPTarif;
  stationDepart?: TLPStation;
  stationArrivee?: TLPStation;
}

export const telepheriqueApi = {
  getLignes: () => api.get<TLPLigne[]>('/telepherique/lignes'),
  getLigne: (id: string) => api.get<TLPLigne>(`/telepherique/lignes/${id}`),
  getStationsByLigne: (ligneId: string) =>
    api.get<TLPStation[]>('/telepherique/stations', { params: { ligneId } }),
  getTarifsByLigne: (ligneId: string) =>
    api.get<TLPTarif[]>('/telepherique/tarifs', { params: { ligneId } }),

  createTicket: (data: {
    ligneId: string;
    tarifId: string;
    stationDepartId: string;
    stationArriveeId: string;
  }) => api.post<TLPTicket>('/telepherique/tickets', data),
  getMyTickets: () => api.get<TLPTicket[]>('/telepherique/tickets/me'),
  getTicket: (id: string) => api.get<TLPTicket>(`/telepherique/tickets/${id}`),
  payTicket: (id: string, mode: 'wallet' | 'cash' | 'mobile_money' = 'wallet') =>
    api.post<TLPTicket>(`/telepherique/tickets/${id}/pay`, { mode }),
  cancelTicket: (id: string) =>
    api.patch<TLPTicket>(`/telepherique/tickets/${id}/cancel`),
  validateQR: (codeQR: string) =>
    api.post<TLPTicket>(`/telepherique/tickets/validate/${codeQR}`),
};

export default telepheriqueApi;
