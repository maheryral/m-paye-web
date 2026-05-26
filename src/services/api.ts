import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/env';
import { asyncStorage, getOrCreateDeviceId, secureStorage } from './storage';

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
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = await secureStorage.getItem('refreshToken');
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
            throw new Error('Refresh failed');
          })();
        }
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        refreshPromise = null;
        await secureStorage.multiRemove(['accessToken', 'refreshToken']);
        await asyncStorage.removeItem('user');
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

export const userPreferencesService = {
  get: () => api.get('/user/preferences').then((r) => r.data),
  update: (data: any) => api.patch('/user/preferences', data).then((r) => r.data),
};

export const accountService = {
  getBalance: () => api.get('/wallet/balance').then((r) => r.data),
  getHistory: (params?: any) =>
    api.get('/wallet/history', { params }).then((r) => r.data),
  deposit: (data: any) => api.post('/wallet/deposit', data).then((r) => r.data),
  withdraw: (data: any) => api.post('/wallet/withdraw', data).then((r) => r.data),
  getProfile: () => api.get('/user/profile').then((r) => r.data),
  updateProfile: (data: any) =>
    api.patch('/user/profile', data).then((r) => r.data),
};

export const transactionService = {
  getTransactions: (params?: any) =>
    api.get('/transactions', { params }).then((r) => r.data),
  transfer: (data: any) =>
    api.post('/transactions/transfer', data).then((r) => r.data),
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

export const beneficiaryService = {
  list: () => api.get('/beneficiaries').then((r) => r.data),
  create: (data: any) => api.post('/beneficiaries', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/beneficiaries/${id}`, data).then((r) => r.data),
  toggleFavorite: (id: string) =>
    api.patch(`/beneficiaries/${id}/favorite`).then((r) => r.data),
  remove: (id: string) => api.delete(`/beneficiaries/${id}`).then((r) => r.data),
};

export default api;
