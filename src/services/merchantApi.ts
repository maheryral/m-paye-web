import api from './api';

export interface MerchantProfile {
  id: string;
  businessName: string;
  businessType: string;
  registrationNumber: string;
  isActive: boolean;
  balance: number;
  storeCount: number;
  verifiedAt?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export interface MerchantStatusResponse {
  hasMerchant: boolean;
  merchant: MerchantProfile | null;
}

export interface DashboardStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalTransactions: number;
  pendingRefunds: number;
  activeCustomers: number;
  averageTransactionValue: number;
}

export interface MerchantTransaction {
  id: string;
  amount: number;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  createdAt: string;
  paymentMethod: string;
  transactionId: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  qrCode?: string;
  isActive: boolean;
  createdAt: string;
}

export const merchantApi = {
  getStatus: () => api.get<MerchantStatusResponse>('/merchant/status'),
  getProfile: () => api.get<MerchantProfile>('/merchant/profile'),
  upgradeRequest: (data: FormData) =>
    api.post('/merchants', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateProfile: (data: Partial<MerchantProfile>) =>
    api.put('/merchant/profile', data),

  getDashboardStats: () => api.get<DashboardStats>('/merchant/dashboard/stats'),

  getTransactions: (page = 1, limit = 20, filters?: Record<string, any>) =>
    api.get('/merchant/transactions', { params: { page, limit, ...filters } }),

  getStores: () => api.get<Store[]>('/merchant/stores'),
  createStore: (data: { name: string; address: string; phone: string }) =>
    api.post<Store>('/merchant/stores', data),

  getBalance: () =>
    api.get<{ balance: number; pendingBalance: number; totalReceived: number }>(
      '/merchant/balance',
    ),

  generateQRCode: (amount?: number, storeId?: string) =>
    api.post<{ qrCode: string; qrCodeData: string; expiresAt: string; amount?: number }>(
      '/merchant/qrcode/generate',
      { amount, storeId },
    ),
};

export default merchantApi;
