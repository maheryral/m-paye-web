// src/pages/partner-portal/Trades.tsx
import { ChevronRight, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  partnerPortalApi,
  type TradeDetail,
  type TradeRow,
  type TradeStatus,
} from '../../services/partnerPortal/partnerPortalApi';

const STATUSES: (TradeStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'EXPIRED',
  'CANCELLED',
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export default function PartnerTrades() {
  const [status, setStatus] = useState<TradeStatus | 'ALL'>('ALL');
  const [rows, setRows] = useState<TradeRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TradeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(
    async (cursor?: string) => {
      const isLoadMore = !!cursor;
      isLoadMore ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const res = await partnerPortalApi.listTrades({
          status: status === 'ALL' ? undefined : status,
          cursor,
          limit: 50,
        });
        setRows((prev) => (isLoadMore ? [...prev, ...res.data] : res.data));
        setNextCursor(res.nextCursor);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message);
      } finally {
        isLoadMore ? setLoadingMore(false) : setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (tradeNo: string) => {
    setLoadingDetail(true);
    try {
      const d = await partnerPortalApi.getTrade(tradeNo);
      setSelected(d);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tous les trades initiés via l'API
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {s === 'ALL' ? 'Tous' : s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucun paiement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Trade No</th>
                  <th className="px-4 py-3 text-left">Order ID partenaire</th>
                  <th className="px-4 py-3 text-left">Objet</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Créé le</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr
                    key={r.tradeNo}
                    onClick={() => openDetail(r.tradeNo)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {r.tradeNo}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.outTradeNo}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                      {r.subject}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {r.amount.toLocaleString('fr-FR')} {r.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nextCursor && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button
              onClick={() => load(nextCursor)}
              disabled={loadingMore}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {loadingMore ? 'Chargement…' : 'Charger plus'}
            </button>
          </div>
        )}
      </div>

      {/* Drawer détail */}
      {selected && (
        <DetailDrawer
          trade={selected}
          loading={loadingDetail}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DetailDrawer({
  trade,
  loading,
  onClose,
}: {
  trade: TradeDetail;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50" />
      <div
        className="w-full max-w-md bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Détail du paiement</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <Field label="Trade No" value={trade.tradeNo} mono />
            <Field label="Order ID partenaire" value={trade.outTradeNo} mono />
            <Field label="Status" value={trade.status} />
            <Field
              label="Montant"
              value={`${trade.amount.toLocaleString('fr-FR')} ${trade.currency}`}
            />
            <Field label="Objet" value={trade.subject} />
            {trade.body && <Field label="Description" value={trade.body} />}
            <Field label="Créé le" value={fmtDate(trade.createdAt)} />
            <Field label="Expire le" value={fmtDate(trade.expiresAt)} />
            {trade.paidAt && (
              <Field label="Payé le" value={fmtDate(trade.paidAt)} />
            )}
            {trade.refundedAt && (
              <>
                <Field label="Remboursé le" value={fmtDate(trade.refundedAt)} />
                <Field
                  label="Montant remboursé"
                  value={`${(trade.refundedAmount ?? 0).toLocaleString('fr-FR')} ${trade.currency}`}
                />
              </>
            )}
            {trade.failureReason && (
              <Field label="Raison échec" value={trade.failureReason} />
            )}
            {trade.transactionId && (
              <Field label="Transaction interne" value={trade.transactionId} mono />
            )}
            {trade.metadata && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Metadata</p>
                <pre className="bg-slate-50 border border-slate-200 rounded p-3 text-xs overflow-x-auto">
                  {JSON.stringify(trade.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
