import { useEffect, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type MerchantTransaction,
} from '../../../services/merchantApi';
import { Badge, Card, PageHeader, Skeleton } from '../../../ui';

export default function MerchantTransactions() {
  const { formatCurrency } = useLocale();
  const [items, setItems] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [q, setQ] = useState('');

  async function load(p = 1) {
    setLoading(true);
    try {
      const r = await merchantApi.getTransactions(p, 20);
      const list = Array.isArray(r.data)
        ? r.data
        : (r.data?.items ?? r.data?.transactions ?? []);
      setItems((prev) => (p === 1 ? list : [...prev, ...list]));
      setHasMore(list.length === 20);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  const filtered = q.trim()
    ? items.filter(
        (t) =>
          (t.customerName || '').toLowerCase().includes(q.toLowerCase()) ||
          (t.transactionId || '').toLowerCase().includes(q.toLowerCase()),
      )
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Ventes" subtitle="Historique de vos encaissements" />

      <Card padding="md">
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim"
          />
          <input
            className="w-full bg-bg-elevated border border-bg-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-500"
            placeholder="Rechercher un client ou une référence…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading && items.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-ink-muted">
            <Receipt size={36} className="mx-auto mb-2 opacity-40" />
            Aucune vente
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-xl bg-success-bg text-success-400 flex items-center justify-center shrink-0">
                  <Receipt size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {t.customerName || 'Client'}
                  </div>
                  <div className="text-[11px] text-ink-dim font-mono truncate">
                    {t.transactionId}
                  </div>
                  <div className="text-[11px] text-ink-dim">
                    {new Date(t.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {formatCurrency(t.amount)}
                  </div>
                  <Badge tone={t.status === 'SUCCESS' ? 'success' : 'neutral'}>
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !q && (
          <div className="pt-4 text-center">
            <button
              onClick={() => load(page + 1)}
              disabled={loading}
              className="text-sm text-brand-300 hover:underline"
            >
              {loading ? 'Chargement…' : 'Charger plus'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
