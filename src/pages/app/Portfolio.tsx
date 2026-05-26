import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  History as HistoryIcon,
  Hourglass,
  Info,
  Lock,
  Phone,
  RefreshCcw,
  TrendingUp,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  paymentApi,
  type PaymentRequest,
  type PaymentRequestMethod,
} from '../../services/paymentApi';
import { Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../ui';

type Tab = 'deposit' | 'withdraw';

interface MethodDef {
  id: PaymentRequestMethod;
  name: string;
  short: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

const METHODS: MethodDef[] = [
  { id: 'CARD', name: 'Carte bancaire', short: 'Carte', icon: CreditCard, color: '#6366F1', description: 'Visa, Mastercard via Stripe — instantané' },
  { id: 'MOBILE_MONEY', name: 'Mobile Money', short: 'Mobile', icon: Phone, color: '#10B981', description: 'MVola, Orange Money, Airtel Money' },
  { id: 'BANK', name: 'Virement bancaire', short: 'Banque', icon: Building2, color: '#8B5CF6', description: 'BNI, BFV, BOA — validation 24-48h' },
  { id: 'CASH', name: 'Cash chez agent', short: 'Cash', icon: Wallet, color: '#F59E0B', description: 'Dépôt/retrait en espèces' },
];

const STATUS_META: Record<string, { tone: 'warning' | 'brand' | 'success' | 'danger' | 'neutral'; label: string; icon: LucideIcon }> = {
  PENDING: { tone: 'warning', label: 'En attente', icon: Clock },
  PROCESSING: { tone: 'brand', label: 'En cours', icon: RefreshCcw },
  APPROVED: { tone: 'success', label: 'Approuvé', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', label: 'Rejeté', icon: XCircle },
  CANCELLED: { tone: 'neutral', label: 'Annulé', icon: Ban },
  EXPIRED: { tone: 'neutral', label: 'Expiré', icon: Hourglass },
};

function getInstructions(method: PaymentRequestMethod, tab: Tab, ref: string): string {
  if (method === 'MOBILE_MONEY') {
    return tab === 'deposit'
      ? `Envoyez le montant via votre opérateur en mentionnant la référence ${ref}. Validation sous 24h.`
      : `Vous recevrez le montant sur votre numéro mobile money après validation admin.`;
  }
  if (method === 'BANK') {
    return tab === 'deposit'
      ? `Effectuez le virement vers le compte M'Paye et indiquez la référence ${ref}.`
      : `L'admin effectuera le virement vers votre compte bancaire après validation.`;
  }
  if (method === 'CASH') return `Un agent vous contactera. Présentez le code ${ref}.`;
  return 'Demande en attente de validation.';
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [tab, setTab] = useState<Tab>('deposit');
  const [method, setMethod] = useState<PaymentRequestMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      const r = await paymentApi.listMine();
      setRequests(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      console.error(e?.response?.data || e?.message);
    } finally {
      setLoadingReq(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const reset = () => {
    setMethod(null);
    setAmount('');
    setDetails({});
  };

  const validate = (): string | null => {
    const a = parseFloat(amount);
    if (!a || a < 100) return 'Montant minimum : 100 Ar';
    if (tab === 'withdraw' && a > balance) return `Solde insuffisant`;
    if (!method) return 'Choisissez une méthode';
    if (method === 'MOBILE_MONEY') {
      if (!details.operator) return 'Choisissez un opérateur';
      if (!details.phoneNumber?.trim()) return 'Numéro mobile money requis';
    }
    if (method === 'BANK') {
      if (!details.bankName?.trim()) return 'Nom de banque requis';
      if (!details.accountNumber?.trim()) return 'Numéro de compte requis';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const amt = parseFloat(amount);
    setSubmitting(true);
    try {
      if (tab === 'deposit' && method === 'CARD') {
        const r = await paymentApi.createStripeIntent(amt);
        alert(`Stripe — demande créée (${r.data.reference}).\nclientSecret: ${r.data.clientSecret?.slice(0, 30)}...`);
        reset();
        await loadRequests();
        return;
      }
      const r = await paymentApi.create({
        type: tab === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL',
        method: method!,
        amount: amt,
        details: Object.keys(details).length ? details : undefined,
      });
      alert(`Demande créée ✅\nRéf : ${r.data.reference}\n\n${getInstructions(method!, tab, r.data.reference)}`);
      reset();
      await loadRequests();
      await fetchBalance();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Annuler cette demande ?')) return;
    try {
      await paymentApi.cancel(id);
      await loadRequests();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Annulation impossible');
    }
  };

  // Stats
  const stats = useMemo(() => {
    let totalDeposit = 0;
    let totalWithdraw = 0;
    let pending = 0;
    for (const r of requests) {
      const a = Number(r.amount) || 0;
      const isPaid = r.status === 'APPROVED';
      if (r.status === 'PENDING' || r.status === 'PROCESSING') pending++;
      if (isPaid && r.type === 'DEPOSIT') totalDeposit += a;
      if (isPaid && r.type === 'WITHDRAWAL') totalWithdraw += a;
    }
    return { totalDeposit, totalWithdraw, pending };
  }, [requests]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Portefeuille"
        subtitle="Déposez ou retirez de l'argent en quelques clics"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={HistoryIcon}
            onClick={() => navigate('/history')}
          >
            Historique
          </Button>
        }
      />

      {/* Balance + Stats strip */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card gradient padding="lg" className="lg:col-span-2 min-h-[160px]">
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
            <Wallet size={14} />
            Solde disponible
          </div>
          <div className="text-4xl md:text-5xl font-bold text-white tracking-tight mt-3">
            {formatCurrency(balance)}
          </div>
          <div className="text-xs text-white/70 mt-2">
            Disponible immédiatement
          </div>
        </Card>

        <KpiCard
          label="Total déposé"
          value={formatCurrency(stats.totalDeposit)}
          icon={ArrowDownToLine}
          tone="success"
        />
        <KpiCard
          label="Total retiré"
          value={formatCurrency(stats.totalWithdraw)}
          icon={ArrowUpFromLine}
          tone="danger"
        />
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Left: form (2/3) === */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-bg-elevated rounded-xl mb-5">
              <button
                onClick={() => {
                  setTab('deposit');
                  reset();
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'deposit'
                    ? 'bg-success-500 text-white shadow-glow-soft'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <ArrowDownToLine size={15} />
                Dépôt
              </button>
              <button
                onClick={() => {
                  setTab('withdraw');
                  reset();
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'withdraw'
                    ? 'bg-danger-500 text-white shadow-glow-soft'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <ArrowUpFromLine size={15} />
                Retrait
              </button>
            </div>

            {/* Method selection */}
            <div className="mb-5">
              <div className="section-title mb-3">Méthode</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {METHODS.map((m) => {
                  const selected = method === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-brand-500 bg-brand-500/10 shadow-glow-soft'
                          : 'border-bg-border bg-bg-elevated hover:bg-bg-elevated/70'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                        style={{ background: m.color }}
                      >
                        <Icon size={18} className="text-white" />
                      </div>
                      <div className="text-sm font-bold">{m.short}</div>
                      <div className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">
                        {m.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method-specific fields */}
            {method && (
              <div className="space-y-4 pt-4 border-t border-bg-border">
                {method === 'MOBILE_MONEY' && (
                  <>
                    <div>
                      <label className="label">Opérateur</label>
                      <div className="flex gap-2 flex-wrap">
                        {['mvola', 'orange', 'airtel'].map((op) => (
                          <button
                            key={op}
                            onClick={() => setDetails({ ...details, operator: op })}
                            className={`px-4 py-2 rounded-xl border text-xs font-semibold uppercase ${
                              details.operator === op
                                ? 'bg-success-500 text-white border-success-500'
                                : 'bg-bg-elevated text-ink border-bg-border hover:border-ink-dim'
                            }`}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      label="Numéro mobile money"
                      type="tel"
                      placeholder="034 XX XXX XX"
                      value={details.phoneNumber || ''}
                      onChange={(e) => setDetails({ ...details, phoneNumber: e.target.value })}
                    />
                  </>
                )}

                {method === 'BANK' && (
                  <>
                    <Input
                      label="Banque"
                      placeholder="BNI, BFV, BOA..."
                      value={details.bankName || ''}
                      onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                    />
                    <Input
                      label="Numéro de compte"
                      placeholder="00012 3456 78901234567"
                      value={details.accountNumber || ''}
                      onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                    />
                  </>
                )}

                {method === 'CASH' && (
                  <div className="flex gap-2.5 items-start p-3 rounded-xl border border-warning-500/30 bg-warning-bg">
                    <Info size={16} className="text-warning-400 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Après création, un agent M'Paye vous contactera avec un code à présenter
                      pour {tab === 'deposit' ? 'déposer' : 'retirer'} en espèces.
                    </p>
                  </div>
                )}

                {method === 'CARD' && (
                  <div className="flex gap-2.5 items-start p-3 rounded-xl border border-brand-500/30 bg-brand-500/10">
                    <Lock size={16} className="text-brand-300 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Paiement sécurisé Stripe.{' '}
                      {tab === 'withdraw'
                        ? 'Retrait par carte indisponible — utilisez Mobile Money ou Bank.'
                        : 'Vous serez redirigé pour saisir votre carte.'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="label">Montant (Ar)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="0"
                      className="input text-2xl font-bold py-4 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-sm font-semibold">
                      Ar
                    </span>
                  </div>
                  <p className="text-xs text-ink-dim mt-2">Minimum : 100 Ar</p>
                </div>

                <Button
                  variant={tab === 'deposit' ? 'success' : 'danger'}
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={tab === 'withdraw' && method === 'CARD'}
                  icon={Check}
                  onClick={handleSubmit}
                >
                  {tab === 'deposit' ? 'Demander un dépôt' : 'Demander un retrait'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* === Right: requests list (1/3) === */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Mes demandes</h3>
                <p className="text-xs text-ink-muted">
                  {stats.pending > 0
                    ? `${stats.pending} en attente`
                    : 'Tout est à jour'}
                </p>
              </div>
              {stats.pending > 0 && (
                <Badge tone="warning">
                  {stats.pending}
                </Badge>
              )}
            </div>

            {loadingReq ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <Empty
                icon={TrendingUp}
                title="Pas de demande"
                description="Vos demandes apparaîtront ici"
              />
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 -mr-1">
                {requests.slice(0, 10).map((r) => {
                  const meta = STATUS_META[r.status];
                  const StatusIcon = meta.icon;
                  const isDeposit = r.type === 'DEPOSIT';
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl border border-bg-border bg-bg-elevated/40 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isDeposit ? (
                              <ArrowDownToLine size={14} className="text-success-400" />
                            ) : (
                              <ArrowUpFromLine size={14} className="text-danger-400" />
                            )}
                            <span className="text-xs font-bold uppercase">
                              {isDeposit ? 'Dépôt' : 'Retrait'} · {r.method}
                            </span>
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5 font-mono truncate">
                            {r.reference}
                          </div>
                        </div>
                        <Badge tone={meta.tone} icon={<StatusIcon size={10} />}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold">
                          {Number(r.amount).toLocaleString('fr-FR')} Ar
                        </div>
                        <div className="text-[10px] text-ink-dim">
                          {new Date(r.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </div>
                      {r.rejectionReason && (
                        <div className="text-[11px] text-danger-400 mt-1.5">
                          {r.rejectionReason}
                        </div>
                      )}
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="w-full mt-2.5 py-1.5 rounded-lg border border-bg-border text-[11px] font-semibold text-ink-muted hover:text-danger-400 hover:border-danger-500/50"
                        >
                          Annuler la demande
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {requests.length > 10 && (
              <button
                onClick={() => navigate('/history')}
                className="w-full mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                Voir l'historique complet
                <ChevronRight size={12} />
              </button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: 'success' | 'danger' | 'brand';
}) {
  const TONES = {
    success: 'text-success-400 bg-success-bg',
    danger: 'text-danger-400 bg-danger-bg',
    brand: 'text-brand-300 bg-brand-500/15',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight truncate">{value}</div>
    </Card>
  );
}
