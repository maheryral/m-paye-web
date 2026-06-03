import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Users,
  Undo2,
  Wallet,
  Package,
  Store,
  Ticket,
  ArrowRight,
  Percent,
  QrCode,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type DashboardStats,
  type RevenueChartResponse,
  type MerchantTransaction,
  type TaxSummary,
} from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const { formatCurrency } = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<RevenueChartResponse | null>(null);
  const [recent, setRecent] = useState<MerchantTransaction[]>([]);
  const [customers, setCustomers] = useState<{
    newCustomersThisWeek: number;
    loyaltyRate: number;
  } | null>(null);
  const [tax, setTax] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Édition taux TVA / NIF
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxRate, setTaxRate] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [taxBusy, setTaxBusy] = useState(false);

  async function loadAll() {
    try {
      const [s, c, t, cs, tx] = await Promise.all([
        merchantApi.getDashboardStats(),
        merchantApi.getRevenueChart('week'),
        merchantApi.getTransactions(1, 6),
        merchantApi.getCustomerStats(),
        merchantApi.getTaxSummary(),
      ]);
      setStats(s.data);
      setChart(c.data);
      const list = Array.isArray(t.data)
        ? t.data
        : (t.data?.items ?? t.data?.transactions ?? []);
      setRecent(list);
      setCustomers(cs.data);
      setTax(tx.data);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openTaxForm() {
    setTaxRate(String(tax?.defaultRate ?? 0));
    setVatNumber(tax?.vatNumber ?? '');
    setShowTaxForm(true);
  }

  async function saveTax() {
    setTaxBusy(true);
    try {
      await merchantApi.updateProfile({
        defaultTaxRate: Number(taxRate) || 0,
        vatNumber: vatNumber || undefined,
      } as any);
      setShowTaxForm(false);
      await loadAll();
    } catch {
      /* */
    } finally {
      setTaxBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tableau marchand"
        subtitle="Vue d'ensemble de votre activité commerciale"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={TrendingUp}
            onClick={() => navigate('/seller-mode')}
          >
            Encaisser
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <Kpi
              icon={TrendingUp}
              label="Revenu du jour"
              value={formatCurrency(stats.todayRevenue)}
              tone="brand"
            />
            <Kpi
              icon={Receipt}
              label="Revenu du mois"
              value={formatCurrency(stats.monthRevenue)}
              sub={`${stats.totalTransactions} ventes`}
              tone="success"
            />
            <Kpi
              icon={Users}
              label="Clients actifs"
              value={String(stats.activeCustomers)}
              sub={
                customers
                  ? `+${customers.newCustomersThisWeek} cette semaine · ${customers.loyaltyRate}% fidèles`
                  : `Panier moyen ${formatCurrency(stats.averageTransactionValue)}`
              }
              tone="cyan"
            />
            <Kpi
              icon={Undo2}
              label="Remboursements"
              value={String(stats.pendingRefunds)}
              sub="en attente"
              tone="warning"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">Revenus (7 jours)</h3>
            <span className="text-xs text-ink-muted">
              {stats ? formatCurrency(stats.weekRevenue) : '—'} cette semaine
            </span>
          </div>
          {loading || !chart ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : (
            <RevenueBars chart={chart} formatCurrency={formatCurrency} />
          )}
        </Card>

        {/* Quick actions */}
        <Card padding="md">
          <h3 className="text-base font-bold mb-4">Raccourcis</h3>
          <div className="space-y-2">
            <QuickLink
              icon={Package}
              label="Mes produits"
              onClick={() => navigate('/merchant/products')}
            />
            <QuickLink
              icon={Store}
              label="Mes boutiques"
              onClick={() => navigate('/merchant/stores')}
            />
            <QuickLink
              icon={Wallet}
              label="Solde & retraits"
              onClick={() => navigate('/merchant/balance')}
            />
            <QuickLink
              icon={Ticket}
              label="Coupons"
              onClick={() => navigate('/merchant/coupons')}
            />
            <QuickLink
              icon={Receipt}
              label="Toutes les ventes"
              onClick={() => navigate('/merchant/transactions')}
            />
          </div>
        </Card>
      </div>

      {/* TVA & fiscalité (mois courant) */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Percent size={18} className="text-brand-300" />
            <h3 className="text-base font-bold">TVA & fiscalité (ce mois)</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={openTaxForm}>
            Configurer
          </Button>
        </div>
        {loading || !tax ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : tax.defaultRate <= 0 ? (
          <div className="text-sm text-ink-muted">
            Aucun taux de TVA configuré. Cliquez sur « Configurer » pour
            l'activer — la TVA sera alors ventilée sur vos reçus.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <TaxTile label={`Taux`} value={`${tax.defaultRate}%`} />
            <TaxTile label="Chiffre HT" value={formatCurrency(tax.totalHT)} />
            <TaxTile
              label="TVA collectée"
              value={formatCurrency(tax.vatCollected)}
              tone
            />
            <TaxTile label="Total TTC" value={formatCurrency(tax.totalTTC)} />
          </div>
        )}
        {tax?.vatNumber && (
          <div className="text-[11px] text-ink-dim mt-3">
            NIF/IFU : <span className="font-mono">{tax.vatNumber}</span>
          </div>
        )}
      </Card>

      {/* Recent transactions */}
      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <h3 className="text-base font-bold">Ventes récentes</h3>
          <Button
            variant="ghost"
            size="sm"
            iconEnd={ArrowRight}
            onClick={() => navigate('/merchant/transactions')}
          >
            Tout voir
          </Button>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Aucune vente pour le moment
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3.5 hover:bg-bg-elevated/40"
              >
                <div className="w-10 h-10 rounded-xl bg-success-bg text-success-400 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {t.customerName || 'Client'}
                  </div>
                  <div className="text-[11px] text-ink-dim">
                    {new Date(t.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-success-400">
                    +{formatCurrency(t.amount)}
                  </div>
                  <Badge tone={t.status === 'SUCCESS' ? 'success' : 'neutral'}>
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal config TVA */}
      {showTaxForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !taxBusy && setShowTaxForm(false)}
        >
          <Card
            padding="md"
            className="w-full max-w-md"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">TVA & fiscalité</h3>
              <button
                onClick={() => setShowTaxForm(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Taux de TVA par défaut (%)
                </label>
                <input
                  type="number"
                  className={INPUT}
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="20"
                />
                <div className="text-[11px] text-ink-dim mt-1">
                  Appliqué aux encaissements : le montant payé est TTC, la TVA
                  est ventilée sur le reçu.
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Numéro fiscal (NIF/IFU) — optionnel
                </label>
                <input
                  className={INPUT}
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="Ex: 1234567890"
                />
              </div>
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={taxBusy}
                onClick={saveTax}
              >
                Enregistrer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function TaxTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: boolean;
}) {
  return (
    <div className="rounded-xl border border-bg-border p-3">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div
        className={`text-lg font-bold mt-0.5 ${tone ? 'text-brand-300' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone: 'brand' | 'success' | 'cyan' | 'warning';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-300',
    success: 'bg-success-bg text-success-400',
    cyan: 'bg-cyan-500/15 text-cyan-300',
    warning: 'bg-warning-bg text-warning-500',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-ink-muted">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-ink-dim mt-1">{sub}</div>}
    </Card>
  );
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-bg-border hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-bg-elevated text-brand-300 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight size={14} className="text-ink-dim" />
    </button>
  );
}

function RevenueBars({
  chart,
  formatCurrency,
}: {
  chart: RevenueChartResponse;
  formatCurrency: (n: number) => string;
}) {
  const data = chart.datasets?.data ?? [];
  const labels = chart.labels ?? [];
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-2 h-56 pt-4">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <div className="relative w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-brand-500/40 to-brand-400 transition-all"
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
              title={formatCurrency(v)}
            />
          </div>
          <span className="text-[10px] text-ink-dim truncate w-full text-center">
            {labels[i] ?? ''}
          </span>
        </div>
      ))}
      {data.length === 0 && (
        <div className="w-full text-center text-sm text-ink-muted self-center">
          Pas encore de données
        </div>
      )}
    </div>
  );
}
