// src/pages/partner-portal/Activities.tsx
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  partnerPortalApi,
  type ActivityRow,
} from '../../services/partnerPortal/partnerPortalApi';

export default function PartnerActivities() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    isLoadMore ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const res = await partnerPortalApi.listActivities({ cursor, limit: 100 });
      setRows((prev) => (isLoadMore ? [...prev, ...res.data] : res.data));
      setNextCursor(res.nextCursor);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message);
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Toutes les requêtes effectuées via votre App ID
        </p>
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
            Aucune activité enregistrée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Endpoint</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Trade</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-right">Durée</th>
                  <th className="px-4 py-3 text-left">Erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className={!r.success ? 'bg-red-50/30' : ''}>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {r.endpoint}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 inline" />
                      )}
                      <span className="text-xs text-slate-500 ml-1">{r.statusCode}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.relatedTradeNo ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.ip ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {r.durationMs != null ? `${r.durationMs}ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate">
                      {r.errorMessage ?? ''}
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
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}
