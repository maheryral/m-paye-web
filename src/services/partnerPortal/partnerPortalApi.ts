// src/services/partnerPortal/partnerPortalApi.ts
// Wrappers typés pour tous les endpoints /partner-portal/*.

import partnerApi from './partnerApi';

// ─── Types partagés ───────────────

export interface PartnerInfo {
  id: string;
  appId: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  allowedScopes: string[];
  redirectUris: string[];
  webhookUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResult {
  accessToken: string;
  partner: { id: string; appId: string; name: string };
}

export type TradeStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface TradeRow {
  tradeNo: string;
  outTradeNo: string;
  amount: number;
  currency: string;
  subject: string;
  status: TradeStatus;
  paidAt: string | null;
  refundedAt: string | null;
  refundedAmount: number | null;
  expiresAt: string;
  createdAt: string;
}

export interface TradeDetail extends TradeRow {
  body: string | null;
  metadata: Record<string, any> | null;
  failureReason: string | null;
  transactionId: string | null;
}

export interface Stats {
  totalTrades: number;
  byStatus: Record<string, { count: number; totalAmount: number }>;
  successRate: number;
  last30Days: {
    paidCount: number;
    paidAmount: number;
    refundedCount: number;
    refundedAmount: number;
  };
}

export type WebhookStatus = 'PENDING' | 'FAILED' | 'DELIVERED' | 'ABANDONED';

export interface WebhookRow {
  id: string;
  event: string;
  url: string;
  status: WebhookStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  lastStatusCode: number | null;
  deliveredAt: string | null;
  relatedTradeNo: string | null;
  createdAt: string;
}

export interface ActivityRow {
  id: string;
  action: string;
  endpoint: string;
  ip: string | null;
  userAgent: string | null;
  statusCode: number;
  success: boolean;
  relatedTradeNo: string | null;
  relatedUserId: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface Paged<T> {
  data: T[];
  nextCursor: string | null;
}

// ─── API ─────────────────────────

export const partnerPortalApi = {
  // Auth
  login: (data: { app_id: string; app_secret: string }) =>
    partnerApi
      .post<LoginResult>('/partner-portal/auth/login', data)
      .then((r) => r.data),

  // Profil
  me: () =>
    partnerApi.get<PartnerInfo>('/partner-portal/me').then((r) => r.data),

  updateMe: (data: {
    logoUrl?: string | null;
    description?: string | null;
    webhookUrl?: string | null;
  }) =>
    partnerApi
      .patch<PartnerInfo>('/partner-portal/me', data)
      .then((r) => r.data),

  rotateSecret: () =>
    partnerApi
      .post<{ appSecret: string }>('/partner-portal/rotate-secret')
      .then((r) => r.data),

  // Trades
  listTrades: (params?: {
    status?: TradeStatus;
    cursor?: string;
    limit?: number;
  }) =>
    partnerApi
      .get<Paged<TradeRow>>('/partner-portal/trades', { params })
      .then((r) => r.data),

  getTrade: (tradeNo: string) =>
    partnerApi
      .get<TradeDetail>(
        `/partner-portal/trades/${encodeURIComponent(tradeNo)}`,
      )
      .then((r) => r.data),

  // Stats
  stats: () =>
    partnerApi.get<Stats>('/partner-portal/stats').then((r) => r.data),

  // Webhooks
  listWebhooks: (params?: {
    status?: WebhookStatus;
    cursor?: string;
    limit?: number;
  }) =>
    partnerApi
      .get<Paged<WebhookRow>>('/partner-portal/webhooks', { params })
      .then((r) => r.data),

  replayWebhook: (id: string) =>
    partnerApi
      .post<{ ok: boolean }>(
        `/partner-portal/webhooks/${encodeURIComponent(id)}/replay`,
      )
      .then((r) => r.data),

  // Audit log
  listActivities: (params?: { cursor?: string; limit?: number }) =>
    partnerApi
      .get<Paged<ActivityRow>>('/partner-portal/activities', { params })
      .then((r) => r.data),
};
