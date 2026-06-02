import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Package,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type DashboardStats,
  type RevenueChartResponse,
} from '../../../services/merchantApi';
import { Card, PageHeader, Skeleton } from '../../../ui';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Jour' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'year', label: 'Année' },
];

interface TopProduct {
  id?: string;
  name: string;
  sold: number;
  revenue: number;
}

export default function MerchantAnalytics() {
  const { formatCurrency } = useLocale();
  const [period, setPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<RevenueChartResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [customerStats, setCustomerStats] = useState<{
    newCustomersThisWeek: number;
    loyaltyRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, p, cs] = await Promise.all([
        merchantApi.getDashboardStats(),
        merchantApi.getRevenueChart(period),
        merchantApi.getTopProducts(5).catch(() => ({ data: [] as any[] })),
        merchantApi.getCustomerStats().catch(() => ({ data: null as any })),
      ]);
      setStats(s.data);
      setChart(c.data);
      setTopProducts(Array.isArray(p.data) ? (p.data as TopProduct[]) : []);
      setCustomerStats(c.data ? cs.data : null);
    } catch (e: any) {
      console.error('analytics:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxValue = Math.max(1, ...(chart?.datasets.data ?? [0]));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        subtitle="Revenus, transactions et clients en un coup d'œil"
        actions={
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl">
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-gradient-brand text-white shadow-glow-soft'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={DollarSign}
          label="Revenu (mois)"
          value={stats ? formatCurrency(stats.monthRevenue) : null}
          loading={loading}
          tone="success"
        />
        <Kpi
          icon={Receipt}
          label="Transactions"
          value={stats?.totalTransactions.toLocaleString('fr-FR') ?? null}
          loading={loading}
          tone="brand"
        />
        <Kpi
          icon={Users}
          label="Clients actifs"
          value={stats?.activeCustomers.toLocaleString('fr-FR') ?? null}
          loading={loading}
          tone="warning"
        />
        <Kpi
          icon={TrendingUp}
          label="Panier moyen"
          value={stats ? formatCurrency(stats.averageTransactionValue) : null}
          loading={loading}
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart revenus */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">Revenus ·{' '}
                {PERIODS.find((p) => p.id === period)?.label}
              </h3>
            </div>
            <Calendar size={14} className="text-ink-muted" />
          </div>
          {loading || !chart ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : chart.labels.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-ink-muted">
              Pas de données pour cette période
            </div>
          ) : (
            <div className="h-64 flex items-end gap-1.5 p-2">
              {chart.labels.map((lab, i) => {
                const v = chart.datasets.data[i] ?? 0;
                const h = (v / maxValue) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1.5 group"
                  >
                    <div className="text-[10px] text-ink-muted opacity-0 group-hover:opacity-100 transition font-semibold">
                      {Math.round(v).toLocaleString('fr-FR')}
                    </div>
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-300 transition-all hover:opacity-80"
                        style={{ height: `${h}%`, minHeight: v > 0 ? 4 : 0 }}
                      />
                    </div>
                    <div className="text-[10px] text-ink-dim font-medium truncate w-full text-center">
                      {lab}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top produits */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-brand-300" />
            <h3 className="text-base font-bold">Top produits</h3>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-xs text-ink-muted text-center py-8">
              Aucune vente sur la période
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div
                  key={p.id ?? idx}
                  className="flex items-center gap-3 p-2 rounded-xl bg-bg-elevated"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-ink-muted">
                      {p.sold} vendus
                    </div>
                  </div>
                  <div className="text-sm font-bold text-success-400 shrink-0">
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Stats clients */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-brand-300" />
          <h3 className="text-base font-bold">Clients</h3>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-bg-elevated p-3">
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mb-1">
                Total
              </div>
              <div className="text-xl font-bold">
                {stats?.activeCustomers.toLocaleString('fr-FR') ?? '0'}
              </div>
            </div>
            <div className="rounded-xl bg-bg-elevated p-3">
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mb-1">
                Nouveaux (sem.)
              </div>
              <div className="text-xl font-bold text-success-400">
                +{customerStats?.newCustomersThisWeek ?? 0}
              </div>
            </div>
            <div className="rounded-xl bg-bg-elevated p-3">
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mb-1">
                Taux fidélité
              </div>
              <div className="text-xl font-bold text-brand-300">
                {customerStats?.loyaltyRate
                  ? `${Math.round(customerStats.loyaltyRate)}%`
                  : '—'}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: any;
  label: string;
  value: string | null;
  loading: boolean;
  tone: 'success' | 'danger' | 'brand' | 'warning';
}) {
  const TONES = {
    success: 'text-success-400 bg-success-bg',
    danger: 'text-danger-400 bg-danger-bg',
    brand: 'text-brand-300 bg-brand-500/15',
    warning: 'text-warning-400 bg-warning-bg',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className="text-xl font-bold tracking-tight truncate">{value ?? '—'}</div>
      )}
    </Card>
  );
}
