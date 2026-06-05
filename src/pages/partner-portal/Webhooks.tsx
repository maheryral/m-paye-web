// src/pages/partner-portal/Webhooks.tsx
import { Loader2, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  partnerPortalApi,
  type WebhookRow,
  type WebhookStatus,
} from '../../services/partnerPortal/partnerPortalApi';

const STATUSES: (WebhookStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'FAILED',
  'DELIVERED',
  'ABANDONED',
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  ABANDONED: 'bg-slate-200 text-slate-600',
};

export default function PartnerWebhooks() {
  const [status, setStatus] = useState<WebhookStatus | 'ALL'>('ALL');
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (cursor?: string) => {
      const isLoadMore = !!cursor;
      isLoadMore ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const res = await partnerPortalApi.listWebhooks({
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

  const handleReplay = async (id: string) => {
    setReplaying((s) => new Set(s).add(id));
    try {
      await partnerPortalApi.replayWebhook(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? 'Replay impossible');
    } finally {
      setReplaying((s) => {
        const c = new Set(s);
        c.delete(id);
        return c;
      });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Historique des notifications envoyées à votre endpoint
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucune livraison.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">Trade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Tentatives</th>
                  <th className="px-4 py-3 text-left">Dernière erreur</th>
                  <th className="px-4 py-3 text-left">Créé le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                        {r.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.relatedTradeNo ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                      {r.lastStatusCode && (
                        <span className="text-xs text-slate-400 ml-2">
                          HTTP {r.lastStatusCode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {r.attempts}/{r.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                      {r.lastError ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(r.status === 'FAILED' || r.status === 'ABANDONED') && (
                        <button
                          onClick={() => handleReplay(r.id)}
                          disabled={replaying.has(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {replaying.has(r.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCw className="w-3 h-3" />
                          )}
                          Replay
                        </button>
                      )}
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
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
