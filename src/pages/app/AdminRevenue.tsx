import {
  BarChart3,
  Calendar,
  Layers,
  Lock,
  PieChart,
  RefreshCcw,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import {
  monetizationApi,
  type RevenueStats,
} from '../../services/monetizationApi';
import { Badge, Button, Card, Empty, PageHeader, Skeleton } from '../../ui';

const TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transferts',
  WITHDRAWAL: 'Retraits',
  MERCHANT_PAYMENT: 'Paiements marchands',
  TAXI_BROUSSE: 'Taxi-brousse',
  TELEPHERIQUE: 'Téléphérique',
  SUBSCRIPTION: 'Abonnements',
};

const TYPE_COLORS: Record<string, string> = {
  TRANSFER: '#6366F1',
  WITHDRAWAL: '#4F46E5',
  MERCHANT_PAYMENT: '#10B981',
  TAXI_BROUSSE: '#F59E0B',
  TELEPHERIQUE: '#06B6D4',
  SUBSCRIPTION: '#8B5CF6',
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function monthLabel(s: string) {
  // Expects "YYYY-MM" or "MM" or similar
  const m = s.match(/(\d{4})[-/](\d{2})/);
  if (m) {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return monthNames[parseInt(m[2], 10) - 1] || s;
  }
  return s.slice(-2);
}

export default function AdminRevenue() {
  const { user } = useAuth();
  const { formatCurrency } = useLocale();
  const isAdmin = (user as any)?.role === 'ADMIN';

  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const r = await monetizationApi.adminStats();
      setStats(r.data);
    } catch (e: any) {
      console.error(e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Accès refusé" />
        <Card padding="lg">
          <Empty
            icon={Lock}
            title="Réservé aux administrateurs"
            description="Cette page n'est accessible qu'aux comptes ayant le rôle ADMIN."
            className="py-16"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Revenus de la plateforme"
        subtitle="Performance financière et croissance de M'Paye"
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={load}>
            Actualiser
          </Button>
        }
      />

      {/* Hero: total all-time */}
      <Card gradient padding="lg" className="min-h-[180px]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
              <Wallet size={14} />
              Revenu cumulé total
            </div>
            {loading ? (
              <Skeleton className="h-14 w-56 mt-3 bg-white/15" />
            ) : (
              <div className="text-4xl md:text-5xl font-bold text-white tracking-tight mt-3">
                {formatCurrency(stats?.totalAllTime ?? 0)}
              </div>
            )}
            <div className="text-xs text-white/80 mt-2">
              <span className="font-bold">{stats?.totalAllTimeCount ?? 0}</span> opérations
              comptabilisées depuis le lancement
            </div>
          </div>
          <Badge tone="brand" className="bg-white/15 text-white border-white/20">
            ALL-TIME
          </Badge>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Ce mois"
          value={loading ? '…' : formatCurrency(stats?.totalThisMonth ?? 0)}
          sub={`${stats?.totalThisMonthCount ?? 0} opérations`}
          icon={Calendar}
          tone="success"
          loading={loading}
        />
        <KpiCard
          label="Cette année"
          value={loading ? '…' : formatCurrency(stats?.totalThisYear ?? 0)}
          sub="vs N-1 : —"
          icon={TrendingUp}
          tone="brand"
          loading={loading}
        />
        <KpiCard
          label="Abonnés actifs"
          value={
            loading
              ? '…'
              : String(
                  (stats?.subscriptions || []).reduce((s, x) => s + x.count, 0),
                )
          }
          sub="tous plans confondus"
          icon={Users}
          tone="cyan"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Bar chart évolution mensuelle (3/5) */}
        <Card padding="md" className="lg:col-span-3">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-300" />
                <h3 className="text-base font-bold">Évolution mensuelle</h3>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Revenus des 12 derniers mois
              </p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : !stats?.byMonth.length ? (
            <Empty
              icon={BarChart3}
              title="Pas encore d'historique"
              description="Les données apparaîtront dès les premières opérations"
              className="py-12"
            />
          ) : (
            <MonthlyChart data={stats.byMonth} />
          )}
        </Card>

        {/* Source breakdown (2/5) */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <PieChart size={16} className="text-brand-300" />
            <h3 className="text-base font-bold">Par source</h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !stats?.byType.length ? (
            <Empty
              icon={Layers}
              title="Aucun revenu"
              description="Activez les modules de paiement"
              className="py-8"
            />
          ) : (
            <SourceBreakdown data={stats.byType} />
          )}
        </Card>
      </div>

      {/* Subscriptions */}
      {stats?.subscriptions && stats.subscriptions.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-brand-300" />
            <h3 className="text-base font-bold">Répartition des abonnements</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.subscriptions.map((s, i) => (
              <div
                key={`${s.plan}-${s.status}-${i}`}
                className="p-4 rounded-2xl bg-bg-elevated border border-bg-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    tone={s.status === 'ACTIVE' ? 'success' : 'neutral'}
                    className="text-[10px]"
                  >
                    {s.status}
                  </Badge>
                </div>
                <div className="text-xs text-ink-muted font-medium">{s.plan}</div>
                <div className="text-2xl font-bold mt-1">{s.count}</div>
                <div className="text-[11px] text-ink-dim">
                  abonné{s.count > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone: 'success' | 'brand' | 'cyan';
  loading?: boolean;
}) {
  const TONES = {
    success: 'text-success-400 bg-success-bg',
    brand: 'text-brand-300 bg-brand-500/15',
    cyan: 'text-cyan-400 bg-cyan-500/15',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONES[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-32" />
      ) : (
        <div className="text-2xl font-bold tracking-tight truncate">{value}</div>
      )}
      <div className="text-[11px] text-ink-dim mt-1">{sub}</div>
    </Card>
  );
}

function MonthlyChart({ data }: { data: { month: string; total: number }[] }) {
  const max = data.reduce((m, d) => Math.max(m, d.total), 0) || 1;

  return (
    <div>
      {/* Y-axis labels + bars */}
      <div className="flex items-end gap-1.5 h-56">
        {data.map((m) => {
          const h = (m.total / max) * 100;
          return (
            <div
              key={m.month}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              {/* Bar */}
              <div className="w-full relative flex flex-col justify-end h-full">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-700 via-brand-500 to-brand-300 transition-all duration-300 group-hover:opacity-90 cursor-pointer"
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
              </div>
              {/* Tooltip on hover */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                <div className="bg-bg-elevated border border-bg-border rounded-lg px-2.5 py-1.5 shadow-elevated whitespace-nowrap">
                  <div className="text-[10px] text-ink-muted">{m.month}</div>
                  <div className="text-sm font-bold">{fmt(m.total)} Ar</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 mt-2">
        {data.map((m) => (
          <div
            key={m.month}
            className="flex-1 text-center text-[10px] font-semibold text-ink-dim uppercase"
          >
            {monthLabel(m.month)}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-bg-border">
        <div className="text-xs text-ink-muted">
          Max : <span className="text-ink font-bold">{fmtShort(max)} Ar</span>
        </div>
        <div className="text-xs text-ink-muted">
          Total :{' '}
          <span className="text-ink font-bold">
            {fmtShort(data.reduce((s, d) => s + d.total, 0))} Ar
          </span>
        </div>
      </div>
    </div>
  );
}

function SourceBreakdown({
  data,
}: {
  data: { type: string; total: number; count: number }[];
}) {
  const totalAll = data.reduce((s, d) => s + d.total, 0) || 1;

  return (
    <div className="space-y-3">
      {data
        .slice()
        .sort((a, b) => b.total - a.total)
        .map((t) => {
          const pct = (t.total / totalAll) * 100;
          const color = TYPE_COLORS[t.type] || '#6366F1';
          return (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-sm font-medium truncate">
                    {TYPE_LABELS[t.type] || t.type}
                  </span>
                </div>
                <span className="text-xs font-bold">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-ink-dim mt-1">
                <span>{t.count} op.</span>
                <span>{fmt(t.total)} Ar</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
