import {
  BarChart3,
  Calendar,
  Loader2,
  Lock,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../contexts/ThemeContext';
import { monetizationApi, type RevenueStats } from '../../services/monetizationApi';

const TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transferts',
  WITHDRAWAL: 'Retraits',
  MERCHANT_PAYMENT: 'Marchands',
  TAXI_BROUSSE: 'Taxi-brousse',
  TELEPHERIQUE: 'Téléphérique',
  SUBSCRIPTION: 'Abonnements',
};

const TYPE_COLORS: Record<string, string> = {
  TRANSFER: '#3b82f6',
  WITHDRAWAL: '#1e40af',
  MERCHANT_PAYMENT: '#10b981',
  TAXI_BROUSSE: '#f59e0b',
  TELEPHERIQUE: '#0891b2',
  SUBSCRIPTION: '#8b5cf6',
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

export default function AdminRevenue() {
  const colors = useColors();
  const { user } = useAuth();
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
      const res = await monetizationApi.adminStats();
      setStats(res.data);
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
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Accès refusé" />
        <div className="flex flex-col items-center justify-center pt-20 gap-3 px-5 text-center">
          <Lock size={48} style={{ color: colors.textSecondary }} />
          <div className="text-base" style={{ color: colors.text }}>
            Réservé aux administrateurs
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Revenus plateforme" />
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
        </div>
      </div>
    );
  }

  const maxByType = stats?.byType.reduce((m, t) => Math.max(m, t.total), 0) || 1;
  const maxByMonth = stats?.byMonth.reduce((m, t) => Math.max(m, t.total), 0) || 1;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-4xl mx-auto">
        <GradientHeader
          title="Revenus plateforme"
          subtitle="Performance financière de M'Paye"
          RightIcon={RefreshCcw}
          onRightPress={load}
        />

        <div className="px-5 mt-4 space-y-5">
          {/* KPI principal */}
          <div
            className="rounded-2xl p-5 text-white shadow-glow-blue relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)' }}
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.07]" />
            <div className="relative flex items-center gap-3 mb-2">
              <Wallet size={20} className="text-white/80" />
              <div className="text-xs font-semibold text-white/80">Total cumulé</div>
            </div>
            <div className="relative flex items-baseline gap-2">
              <div className="text-4xl font-extrabold">{fmt(stats?.totalAllTime ?? 0)}</div>
              <div className="text-xl font-semibold opacity-90">Ar</div>
            </div>
            <div className="relative text-xs text-white/80 mt-2">
              {stats?.totalAllTimeCount ?? 0} opérations comptabilisées
            </div>
          </div>

          {/* KPI secondaires */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} style={{ color: '#10b981' }} />
                <div className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                  Ce mois
                </div>
              </div>
              <div className="text-xl font-extrabold" style={{ color: colors.text }}>
                {fmt(stats?.totalThisMonth ?? 0)} Ar
              </div>
              <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {stats?.totalThisMonthCount ?? 0} transactions
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} style={{ color: '#3b82f6' }} />
                <div className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                  Cette année
                </div>
              </div>
              <div className="text-xl font-extrabold" style={{ color: colors.text }}>
                {fmt(stats?.totalThisYear ?? 0)} Ar
              </div>
            </div>
          </div>

          {/* Répartition par type */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={18} style={{ color: colors.primary }} />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Répartition par source (année)
              </h3>
            </div>
            {!stats?.byType.length ? (
              <div className="card p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                Aucun revenu enregistré pour l'instant
              </div>
            ) : (
              <div className="card p-4 space-y-4">
                {stats.byType.map((t) => {
                  const widthPct = (t.total / maxByType) * 100;
                  const color = TYPE_COLORS[t.type] || colors.primary;
                  return (
                    <div key={t.type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: color }}
                          />
                          <span className="text-sm font-medium" style={{ color: colors.text }}>
                            {TYPE_LABELS[t.type] || t.type}
                          </span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: colors.text }}>
                          {fmt(t.total)} Ar
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: colors.border }}
                      >
                        <div
                          className="h-full transition-all"
                          style={{ width: `${widthPct}%`, background: color }}
                        />
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
                        {t.count} opération{t.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Évolution mensuelle (bar chart) */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Évolution (12 derniers mois)
            </h3>
            {!stats?.byMonth.length ? (
              <div className="card p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                Pas encore d'historique
              </div>
            ) : (
              <div className="card p-4">
                <div className="flex items-end gap-1.5 h-48 mb-2">
                  {stats.byMonth.map((m) => {
                    const heightPct = (m.total / maxByMonth) * 100;
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center justify-end group"
                        title={`${m.month} : ${fmt(m.total)} Ar`}
                      >
                        <div
                          className="w-full rounded-t-md transition-all hover:opacity-80"
                          style={{
                            height: `${Math.max(heightPct, 2)}%`,
                            background: colors.primary,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  {stats.byMonth.map((m) => (
                    <div
                      key={m.month}
                      className="flex-1 text-[10px] text-center font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      {m.month.slice(-2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Abonnements */}
          {stats?.subscriptions && stats.subscriptions.length > 0 && (
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
                Répartition des abonnements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.subscriptions.map((s) => (
                  <div key={`${s.plan}-${s.status}`} className="card p-3">
                    <div className="text-xs font-bold" style={{ color: colors.primary }}>
                      {s.plan}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: colors.textSecondary }}>
                      {s.status}
                    </div>
                    <div className="text-2xl font-extrabold mt-2" style={{ color: colors.text }}>
                      {s.count}
                    </div>
                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                      abonné{s.count > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
