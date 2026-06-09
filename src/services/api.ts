import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/env';
import { asyncStorage, getOrCreateDeviceId, secureStorage } from './storage';
import { sessionEvents } from './sessionEvents';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const [token, deviceId] = await Promise.all([
    secureStorage.getItem('accessToken'),
    getOrCreateDeviceId(),
  ]);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['x-device-id'] = deviceId;
  return config;
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // 🐛 Log des 4xx/5xx pour debug rapide (URL + statut + payload)
    if (error.response && (error.response.status >= 400 || error.response.status === 0)) {
      console.warn(
        `[API ${error.response.status}] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.baseURL ?? ''}${originalRequest?.url}`,
        error.response.data,
      );
    }

    // Évite de boucler si c'est /auth/refresh lui-même qui a échoué
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshCall
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = await secureStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('Pas de refresh token en storage');
            }
            const deviceId = await getOrCreateDeviceId();
            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'x-device-id': deviceId } },
            );
            if (response.data?.accessToken && response.data?.refreshToken) {
              await secureStorage.setItem('accessToken', response.data.accessToken);
              await secureStorage.setItem('refreshToken', response.data.refreshToken);
              return response.data.accessToken as string;
            }
            throw new Error(
              `Refresh: réponse invalide (clés manquantes) - keys=${Object.keys(response.data || {}).join(',')}`,
            );
          })();
        }
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr: any) {
        refreshPromise = null;
        // 🔴 LOG diagnostic : sans ça, le wipe + redirect masque la cause exacte
        console.warn(
          '[AUTH refresh KO]',
          refreshErr?.response?.status,
          refreshErr?.response?.data || refreshErr?.message,
        );
        // 🧹 Logout complet (tokens + user)
        await secureStorage.multiRemove(['accessToken', 'refreshToken']);
        await asyncStorage.removeItem('user');
        // 📣 Notifie AuthContext pour reset user state
        sessionEvents.emitExpired();
        // 🚪 Hard redirect en backup (reset complet de l'app)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ===== Services =====

export const authService = {
  login: (data: { login: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  register: (data: any) => api.post('/auth/register', data).then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),
  logoutAll: () => api.post('/auth/logout-all').then((r) => r.data),
  getSessions: () => api.get('/auth/sessions').then((r) => r.data),
  revokeDevice: (deviceId: string) =>
    api.post('/auth/sessions/revoke', { deviceId }).then((r) => r.data),
  getCurrentUser: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (data: any) =>
    api.post('/auth/change-password', data).then((r) => r.data),
  checkAccount: (data: { telephone?: string; email?: string }) =>
    api.post('/auth/check-account', data).then((r) => r.data),
  sendOTP: (data: { telephone?: string; email?: string }) =>
    api.post('/auth/send-otp', data).then((r) => r.data),
  verifyOTP: (data: { code: string; userId: string }) =>
    api.post('/auth/verify-otp', data).then((r) => r.data),
  initiateRegistration: (data: any) =>
    api.post('/auth/register/initiate', data).then((r) => r.data),
  verifyRegistration: (data: any) =>
    api.post('/auth/register/verify', data).then((r) => r.data),
};

export const kycService = {
  status: () => api.get('/kyc/status').then((r) => r.data),
  submitLiveness: (payload: {
    level?: string;
    sequence: string[];
    frames: { direction: string; image: string }[];
  }) => api.post('/kyc/liveness', payload).then((r) => r.data),
};

export const userPreferencesService = {
  get: () => api.get('/user/preferences').then((r) => r.data),
  update: (data: any) => api.patch('/user/preferences', data).then((r) => r.data),
};

export const accountService = {
  getBalance: () => api.get('/wallet/balance').then((r) => r.data),
  getHistory: (params?: any) =>
    api.get('/wallet/history', { params }).then((r) => r.data),
  // Dépôts via Stripe (paymentApi) ou validation admin (payment-requests).
  // Retraits via payment-requests. Les anciens /wallet/{deposit,withdraw} ont été retirés.
  getProfile: () => api.get('/user/profile').then((r) => r.data),
  updateProfile: (data: any) =>
    api.patch('/user/profile', data).then((r) => r.data),
  /**
   * Score de sécurité du compte (calculé serveur).
   * Retourne `{ score: 0-100, level: 'weak'|'fair'|'good'|'excellent', components: [...] }`.
   */
  getSecurityScore: () =>
    api.get('/user/security-score').then((r) => r.data),
  /**
   * Export RGPD complet (profil, transactions, bénéficiaires, etc.) au format JSON.
   * Le client est responsable de sauvegarder/télécharger le résultat.
   */
  exportData: () => api.get('/user/export-data').then((r) => r.data),
  /**
   * Upload de la photo de profil — multipart/form-data.
   * `file` est un `File` issu d'un `<input type="file">`.
   */
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post('/user/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  removeAvatar: () => api.delete('/user/avatar').then((r) => r.data),
};

export const transactionService = {
  getTransactions: (params?: any) =>
    api.get('/transactions', { params }).then((r) => r.data),
  transfer: (data: any, idempotencyKey?: string) =>
    api
      .post('/transactions/transfer', data, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      })
      .then((r) => r.data),
  searchUserByEmail: (email: string) =>
    api.get(`/user/search?email=${email}`).then((r) => r.data),
  searchUserByPhone: (phone: string) =>
    api.get(`/user/search?phone=${phone}`).then((r) => r.data),
  suggestUsers: (q: string) =>
    api.get('/user/suggest', { params: { q } }).then((r) => r.data),
};

export const notificationService = {
  getNotifications: (page = 1, limit = 20) =>
    api.get('/notifications', { params: { page, limit } }).then((r) => r.data),
  getUnread: () => api.get('/notifications/unread').then((r) => r.data),
  getUnreadCount: () => api.get('/notifications/unread/count').then((r) => r.data),
  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllAsRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  archive: (id: string) => api.patch(`/notifications/${id}/archive`).then((r) => r.data),
};

/**
 * Step-up auth : envoie un OTP au téléphone du user pour autoriser la
 * création initiale de son mot de passe. Refuse si l'user a déjà un mdp.
 * Cf. backend POST /auth/send-password-setup-otp.
 */
export const sendPasswordSetupOtp = () =>
  api.post('/auth/send-password-setup-otp').then((r) => r.data);

export const beneficiaryService = {
  list: () => api.get('/beneficiaries').then((r) => r.data),
  create: (data: any) => api.post('/beneficiaries', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/beneficiaries/${id}`, data).then((r) => r.data),
  toggleFavorite: (id: string) =>
    api.patch(`/beneficiaries/${id}/favorite`).then((r) => r.data),
  remove: (id: string) => api.delete(`/beneficiaries/${id}`).then((r) => r.data),
  /**
   * Upload de la photo de profil — multipart/form-data.
   * Sur web, `file` est un `File` issu d'un `<input type="file">`.
   */
  uploadAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post(`/beneficiaries/${id}/avatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  removeAvatar: (id: string) =>
    api.delete(`/beneficiaries/${id}/avatar`).then((r) => r.data),
};

/**
 * Résout une URL d'asset relative (renvoyée par l'API, ex `/uploads/avatars/...`)
 * en URL absolue téléchargeable. Renvoie la valeur inchangée si elle est déjà
 * absolue ou nulle.
 */
export const resolveAssetUrl = (
  relativeOrAbsolute: string | null | undefined,
): string | null | undefined => {
  if (!relativeOrAbsolute) return relativeOrAbsolute;
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  const base = API_BASE_URL.replace(/\/$/, '');
  const cleaned = relativeOrAbsolute.startsWith('/')
    ? relativeOrAbsolute
    : `/${relativeOrAbsolute}`;
  return `${base}${cleaned}`;
};

/**
 * QR de paiement marchand (Mode A : payout direct mobile / Mode B : crédit wallet).
 *  - POST  /qr/generate         (marchand auth)
 *  - GET   /qr/info/:reference  (public, preview)
 *  - POST  /qr/pay/:reference   (payeur auth + idempotency-key)
 */
export interface QrInfo {
  reference: string;
  montant: number;
  devise: string;
  description: string | null;
  statut: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'PROCESSING' | 'FAILED';
  mode: 'DIRECT_MOBILE' | 'WALLET';
  payoutOperator: 'MVOLA' | 'AIRTEL_MONEY' | 'ORANGE_MONEY' | null;
  payoutOperatorLabel: string | null;
  payoutPhoneMasked: string | null;
  merchant: { id: string; nom: string; logoUrl: string | null };
  expiration: string;
  paidAt: string | null;
}

export interface QrGenerateResult {
  reference: string;
  montant: number;
  devise: string;
  description: string | null;
  mode: 'DIRECT_MOBILE' | 'WALLET';
  payoutOperator: string | null;
  expiration: string;
}

/**
 * Location de voiture — phase 1 : lecture seule (search + détail).
 * Le booking/paiement vient en phase 2.
 */
export interface RentalListing {
  id: string;
  city: string;
  pricePerDay: number | string;
  withDriver: boolean;
  deposit: number | string;
  minDays: number;
  notes?: string | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year?: number | null;
    type: string;
    seats: number;
    hasAC: boolean;
    transmission: string;
    fuel: string;
    photos?: string[] | null;
    description?: string | null;
  };
  partner: {
    id: string;
    name: string;
    logoUrl?: string | null;
    phone: string;
    email?: string | null;
    city: string;
    /** Coords GPS optionnelles (Decimal stringifié par Prisma). */
    latitude?: number | string | null;
    longitude?: number | string | null;
    description?: string | null;
  };
}

export interface RentalBooking {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  pricePerDay: string | number;
  deposit: string | number;
  totalAmount: string | number;
  withDriver: boolean;
  pickupCity: string;
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded';
  bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentReference?: string | null;
  refundAmount?: string | number | null;
  confirmationCode: string;
  createdAt: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
  listing?: {
    id: string;
    vehicle: { brand: string; model: string; type: string; photos?: string[] | null };
    partner: { id: string; name: string; phone: string };
  };
}

export const vehicleRentalService = {
  // Public
  search: (params?: {
    city?: string;
    type?: string;
    withDriver?: boolean;
    minSeats?: number;
    maxPricePerDay?: number;
  }) =>
    api
      .get<{ items: RentalListing[]; total: number }>('/vehicle-rentals', { params })
      .then((r) => r.data),
  detail: (id: string) =>
    api.get<RentalListing>(`/vehicle-rentals/${id}`).then((r) => r.data),
  cities: () => api.get<string[]>('/vehicle-rentals/cities').then((r) => r.data),

  // Booking (auth requise — l'interceptor ajoute le token automatiquement)
  book: (listingId: string, payload: { startDate: string; endDate: string }) =>
    api.post<RentalBooking>(`/vehicle-rentals/${listingId}/book`, payload).then((r) => r.data),
  pay: (bookingId: string) =>
    api.post<RentalBooking>(`/vehicle-rentals/bookings/${bookingId}/pay`).then((r) => r.data),
  myBookings: () =>
    api.get<RentalBooking[]>('/vehicle-rentals/bookings/me').then((r) => r.data),
  cancelBooking: (bookingId: string, note?: string) =>
    api
      .patch<RentalBooking>(`/vehicle-rentals/bookings/${bookingId}/cancel`, { note })
      .then((r) => r.data),
};

export const qrService = {
  generate: (data: {
    montant: number;
    description?: string;
    payoutPhone?: string;
  }) => api.post<QrGenerateResult>('/qr/generate', data).then((r) => r.data),

  info: (reference: string) =>
    api.get<QrInfo>(`/qr/info/${reference}`).then((r) => r.data),

  pay: (reference: string, idempotencyKey?: string) =>
    api
      .post(`/qr/pay/${reference}`, null, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      })
      .then((r) => r.data),
};

export default api;
