// src/pages/partner-portal/Dashboard.tsx
// Vue d'ensemble : stats globales + activité 30j.

import {
  ArrowDownCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { partnerPortalApi, type Stats } from '../../services/partnerPortal/partnerPortalApi';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export default function PartnerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    partnerPortalApi
      .stats()
      .then(setStats)
      .catch((e) => setError(e?.response?.data?.message ?? e?.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error ?? 'Données indisponibles'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Vue d'ensemble de votre activité M'Paye
        </p>
      </div>

      {/* KPIs 30 jours */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={CreditCard}
          color="blue"
          label="Paiements (30j)"
          value={stats.last30Days.paidCount.toLocaleString('fr-FR')}
          sub={`${fmtAr(stats.last30Days.paidAmount)} Ar`}
        />
        <Kpi
          icon={ArrowDownCircle}
          color="purple"
          label="Remboursements (30j)"
          value={stats.last30Days.refundedCount.toLocaleString('fr-FR')}
          sub={`${fmtAr(stats.last30Days.refundedAmount)} Ar`}
        />
        <Kpi
          icon={CheckCircle2}
          color="emerald"
          label="Taux de succès"
          value={`${stats.successRate}%`}
          sub="Sur l'ensemble"
        />
        <Kpi
          icon={TrendingUp}
          color="indigo"
          label="Total transactions"
          value={stats.totalTrades.toLocaleString('fr-FR')}
          sub="Depuis l'inscription"
        />
      </div>

      {/* Répartition par status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Répartition par status
        </h2>
        {Object.keys(stats.byStatus).length === 0 ? (
          <p className="text-sm text-slate-500 italic">Aucune transaction pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.byStatus).map(([status, info]) => {
              const pct = stats.totalTrades > 0
                ? (info.count / stats.totalTrades) * 100
                : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[status] ?? 'bg-slate-200 text-slate-700'}`}
                  >
                    {status}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${pct.toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-16 text-right">
                    {info.count.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs text-slate-500 w-28 text-right">
                    {fmtAr(info.totalAmount)} Ar
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'purple' | 'emerald' | 'indigo';
  label: string;
  value: string;
  sub: string;
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function fmtAr(n: number) {
  return n.toLocaleString('fr-FR');
}
