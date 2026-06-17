import api from './api';

export interface MerchantProfile {
  id: string;
  businessName: string;
  businessType: string;
  registrationNumber: string;
  isActive: boolean;
  validationStatus?: string;
  rejectionReason?: string;
  balance: number;
  storeCount: number;
  verifiedAt?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  defaultTaxRate?: number;
  vatNumber?: string;
}

export interface TaxSummary {
  year: number;
  month: number;
  vatNumber: string | null;
  defaultRate: number;
  totalTTC: number;
  totalHT: number;
  vatCollected: number;
  transactionCount: number;
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

export interface RevenueChartResponse {
  labels: string[];
  datasets: { data: number[] };
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
  storeName?: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  geofenceEnabled?: boolean;
  geofenceRadius?: number;
  qrCode?: string;
  qrCodeUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  price: number;
  currency?: string;
  taxRate?: number;
  trackStock: boolean;
  stockQuantity: number;
  lowStockAlert?: number;
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  name?: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  status?: string;
}

export interface MerchantRefund {
  id: string;
  reference: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  transactionId: string;
}

export interface Withdrawal {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  bankName?: string;
  accountNumber?: string;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

export interface MerchantEmployee {
  id: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';
  displayName?: string;
  internalCode?: string;
  isActive: boolean;
  user?: { id: string; prenom: string; nom: string; email: string };
}

export interface BankAccount {
  id: string;
  label?: string | null;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban?: string | null;
  bic?: string | null;
  isDefault: boolean;
  createdAt: string;
}

export type PaymentLinkStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface PaymentLink {
  id: string;
  reference: string;
  label?: string | null;
  description?: string | null;
  amount: number | null;
  openAmount: boolean;
  devise: string;
  status: PaymentLinkStatus;
  reusable: boolean;
  expiresAt?: string | null;
  paidCount: number;
  totalCollected: number;
  storeId?: string | null;
  payUrl: string;
  createdAt: string;
}

export interface PaymentLinkDetail extends PaymentLink {
  storeName?: string | null;
  payments: { id: string; reference: string; amount: number; date: string }[];
}

export interface PublicPaymentLink {
  reference: string;
  label?: string | null;
  description?: string | null;
  amount: number | null;
  openAmount: boolean;
  devise: string;
  mgaAmount: number | null;
  fxRate: number | null;
  status: PaymentLinkStatus;
  reusable: boolean;
  requiresLocation: boolean;
  merchantId: string;
  merchantName: string;
  merchantLogo?: string | null;
  storeName?: string | null;
  expiresAt?: string | null;
}

export interface LoyaltyProgram {
  exists: boolean;
  isActive: boolean;
  earnRate: number;
  pointValue: number;
  welcomeBonus: number;
  minRedeemPoints: number;
}

export interface LoyaltyMerchantView {
  program: LoyaltyProgram;
  stats: {
    members: number;
    pointsIssued: number;
    pointsRedeemed: number;
    pointsOutstanding: number;
  };
}

export interface LoyaltyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  lifetimeSpend: number;
}

export interface LoyaltyAccountSummary {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string | null;
  points: number;
  totalEarned: number;
  pointValue: number;
  estimatedValue: number;
}

export interface LoyaltyHistoryEntry {
  id: string;
  type: 'EARN' | 'WELCOME' | 'REDEEM' | 'ADJUST';
  points: number;
  note?: string | null;
  createdAt: string;
}

export interface LoyaltyAccountDetail {
  merchantId: string;
  merchantName?: string;
  merchantLogo?: string | null;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  program: LoyaltyProgram;
  history: LoyaltyHistoryEntry[];
}

export interface MerchantSwitchResponse {
  accessToken: string;
  refreshToken: string;
  merchantId: string;
}

export const merchantApi = {
  // Statut & profil
  getStatus: () => api.get<MerchantStatusResponse>('/merchant/status'),

  /**
   * Bascule le JWT vers le contexte marchand. Le nouveau token porte
   * activeMerchantId requis par /qr/generate et autres routes marchand.
   * Le client DOIT sauvegarder les nouveaux tokens dans le storage.
   */
  switch: (merchantId: string) =>
    api.post<MerchantSwitchResponse>('/merchants/switch', { merchantId }),
  getProfile: () => api.get<MerchantProfile>('/merchant/profile'),
  upgradeRequest: (data: FormData) =>
    api.post('/merchants', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateProfile: (data: Partial<MerchantProfile>) =>
    api.put('/merchant/profile', data),

  /**
   * Upload du logo marchand — multipart/form-data, clé `file`.
   * `file` est un `File` issu d'un `<input type="file">`. Renvoie le profil.
   */
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<MerchantProfile>('/merchant/profile/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeLogo: () => api.delete<MerchantProfile>('/merchant/profile/logo'),

  /** Upload de la couverture marchand — multipart/form-data, clé `file`. */
  uploadCover: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<MerchantProfile>('/merchant/profile/cover', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeCover: () => api.delete<MerchantProfile>('/merchant/profile/cover'),

  // Dashboard & analytics
  getDashboardStats: () => api.get<DashboardStats>('/merchant/dashboard/stats'),
  getRevenueChart: (period: 'day' | 'week' | 'month' | 'year' = 'week') =>
    api.get<RevenueChartResponse>('/merchant/revenue/chart', {
      params: { period },
    }),
  getTopProducts: (limit = 10) =>
    api.get('/merchant/analytics/top-products', { params: { limit } }),
  getTaxSummary: (year?: number, month?: number) =>
    api.get<TaxSummary>('/merchant/reports/tax-summary', {
      params: { year, month },
    }),
  getCustomerStats: () =>
    api.get<{
      uniqueCustomers: number;
      repeatCustomers: number;
      newCustomersThisWeek: number;
      loyaltyRate: number;
    }>('/merchant/analytics/customers'),

  // Transactions
  getTransactions: (page = 1, limit = 20, filters?: Record<string, any>) =>
    api.get('/merchant/transactions', { params: { page, limit, ...filters } }),
  getTransactionDetails: (id: string) =>
    api.get<MerchantTransaction>(`/merchant/transactions/${id}`),

  // Boutiques
  getStores: () => api.get<Store[]>('/merchant/stores'),
  createStore: (data: {
    name: string;
    address: string;
    phone: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    geofenceEnabled?: boolean;
    geofenceRadius?: number;
  }) => api.post<Store>('/merchant/stores', data),
  updateStore: (id: string, data: Partial<Store>) =>
    api.put<Store>(`/merchant/stores/${id}`, data),
  deleteStore: (id: string) => api.delete(`/merchant/stores/${id}`),

  // Produits
  listProducts: (filter?: { active?: boolean; lowStock?: boolean }) =>
    api.get<Product[]>('/merchant/products', { params: filter }),
  createProduct: (data: Partial<Product>) =>
    api.post<Product>('/merchant/products', data),
  updateProduct: (id: string, data: Partial<Product>) =>
    api.patch<Product>(`/merchant/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/merchant/products/${id}`),
  adjustStock: (id: string, delta: number, reason?: string) =>
    api.patch(`/merchant/products/${id}/adjust-stock`, { delta, reason }),

  // Coupons
  getCoupons: () => api.get<Coupon[]>('/merchant/coupons'),
  createCoupon: (data: Partial<Coupon>) =>
    api.post<Coupon>('/merchant/coupons', data),
  updateCoupon: (id: string, data: Partial<Coupon>) =>
    api.put<Coupon>(`/merchant/coupons/${id}`, data),
  toggleCoupon: (id: string, isActive: boolean) =>
    api.patch(`/merchant/coupons/${id}`, { isActive }),
  deleteCoupon: (id: string) => api.delete(`/merchant/coupons/${id}`),

  // Remboursements
  getRefunds: (page = 1, limit = 20) =>
    api.get('/merchant/refunds', { params: { page, limit } }),
  createRefund: (transactionId: string, amount: number, reason: string) =>
    api.post('/merchant/refunds', { transactionId, amount, reason }),

  // Solde & retraits
  getBalance: () =>
    api.get<{ balance: number; pendingBalance: number; totalReceived: number }>(
      '/merchant/balance',
    ),
  withdraw: (amount: number, bankAccountId: string) =>
    api.post('/merchant/withdraw', { amount, bankAccountId }),
  getWithdrawalHistory: (page = 1, limit = 20) =>
    api.get('/merchant/withdrawals', { params: { page, limit } }),

  // Comptes bancaires enregistrés
  listBankAccounts: () =>
    api.get<BankAccount[]>('/merchant/bank-accounts'),
  createBankAccount: (data: {
    label?: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    iban?: string;
    bic?: string;
    isDefault?: boolean;
  }) => api.post<BankAccount>('/merchant/bank-accounts', data),
  setDefaultBankAccount: (id: string) =>
    api.patch(`/merchant/bank-accounts/${id}/default`),
  deleteBankAccount: (id: string) =>
    api.delete(`/merchant/bank-accounts/${id}`),

  // Liens de paiement (POS)
  listPaymentLinks: (status?: PaymentLinkStatus) =>
    api.get<PaymentLink[]>('/merchant/payment-links', {
      params: status ? { status } : undefined,
    }),
  getPaymentLink: (id: string) =>
    api.get<PaymentLinkDetail>(`/merchant/payment-links/${id}`),
  createPaymentLink: (data: {
    label?: string;
    description?: string;
    amount?: number;
    currency?: string;
    reusable?: boolean;
    expiresAt?: string;
    storeId?: string;
  }) => api.post<PaymentLink>('/merchant/payment-links', data),

  // FX / multi-devise
  getFxCurrencies: () => api.get<string[]>('/fx/currencies'),
  cancelPaymentLink: (id: string) =>
    api.patch<PaymentLink>(`/merchant/payment-links/${id}/cancel`),

  // Côté payeur (lien public, utilisateur authentifié)
  getPublicPaymentLink: (reference: string) =>
    api.get<PublicPaymentLink>(`/payment-links/${reference}`),
  payPaymentLink: (
    reference: string,
    data: {
      amount?: number;
      idempotencyKey?: string;
      lat?: number;
      lng?: number;
      source?: 'WALLET' | 'CARD';
      paymentMethodId?: string;
    },
  ) =>
    api.post<{
      message?: string;
      transactionId?: string;
      merchantReceive?: string;
      totalDebit?: string;
      fee?: string;
      // 3DS : authentification requise
      requiresAction?: boolean;
      clientSecret?: string | null;
      paymentIntentId?: string;
      publishableKey?: string | null;
    }>(`/payment-links/${reference}/pay`, data),
  confirmCardPaymentLink: (
    reference: string,
    data: {
      paymentIntentId: string;
      amount?: number;
      lat?: number;
      lng?: number;
      source?: 'WALLET' | 'CARD';
      paymentMethodId?: string;
    },
  ) =>
    api.post<{
      message: string;
      transactionId: string;
      merchantReceive: string;
    }>(`/payment-links/${reference}/confirm-card`, data),

  // Fidélité — marchand
  getLoyalty: () => api.get<LoyaltyMerchantView>('/merchant/loyalty'),
  updateLoyalty: (data: {
    isActive?: boolean;
    earnRate?: number;
    pointValue?: number;
    welcomeBonus?: number;
    minRedeemPoints?: number;
  }) => api.put<LoyaltyProgram>('/merchant/loyalty', data),
  getLoyaltyMembers: () => api.get<LoyaltyMember[]>('/merchant/loyalty/members'),

  // Fidélité — client
  myLoyalty: () => api.get<LoyaltyAccountSummary[]>('/loyalty'),
  getLoyaltyAccount: (merchantId: string) =>
    api.get<LoyaltyAccountDetail>(`/loyalty/${merchantId}`),
  redeemLoyalty: (merchantId: string, points: number) =>
    api.post<{
      message: string;
      points: number;
      creditedAmount: string;
      remainingPoints: number;
      transactionId: string;
    }>(`/loyalty/${merchantId}/redeem`, { points }),

  // Employés
  listEmployees: () => api.get<MerchantEmployee[]>('/merchant/employees'),
  myRole: () => api.get('/merchant/employees/me/role'),

  // QR
  generateQRCode: (amount?: number, storeId?: string) =>
    api.post<{
      qrCode: string;
      qrCodeData: string;
      expiresAt: string;
      amount?: number;
    }>('/merchant/qrcode/generate', { amount, storeId }),

  // ===== REPORTS / EXPORT =====
  exportTransactions: (
    format: 'csv' | 'excel' | 'pdf',
    startDate: string,
    endDate: string,
  ) =>
    api.get('/merchant/transactions/export', {
      params: { format, startDate, endDate },
      responseType: 'blob',
    }),
  exportCSV: (year?: number, month?: number) =>
    api.get('/merchant/reports/export-csv', {
      params: { year, month },
      responseType: 'blob',
    }),
  taxSummary: (year?: number, month?: number) =>
    api.get('/merchant/reports/tax-summary', { params: { year, month } }),
  receiptHtml: (transactionId: string) =>
    api.get<string>(`/merchant/receipts/${transactionId}/html`),

  // ===== EMPLOYEES =====
  addEmployee: (data: {
    identifier: string;
    role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';
    displayName?: string;
    internalCode?: string;
  }) => api.post('/merchant/employees', data),
  updateEmployee: (
    id: string,
    data: Partial<{
      role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';
      displayName: string;
      internalCode: string;
      isActive: boolean;
    }>,
  ) => api.patch(`/merchant/employees/${id}`, data),
  removeEmployee: (id: string) => api.delete(`/merchant/employees/${id}`),

  // Encaissement par scan (cas Alipay / WeChat / autre QR client)
  scanPayment: (qrData: string, amount: number, storeId?: string) =>
    api.post<{
      success: boolean;
      transactionId: string;
      amount: number;
      customerName?: string;
      timestamp: string;
    }>('/merchant/scan/payment', { qrData, amount, storeId }),
};

export default merchantApi;
