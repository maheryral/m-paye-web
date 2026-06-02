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
  Plus,
  RefreshCcw,
  TrendingUp,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  paymentApi,
  type PaymentRequest,
  type PaymentRequestMethod,
} from '../../services/paymentApi';
import { cardsApi, type SavedCard } from '../../services/cardsApi';
import { providersApi } from '../../services/providersApi';
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

  // === Stripe carte (dépôt) ===
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [cardModal, setCardModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentRequestId, setStripePaymentRequestId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardModalError, setCardModalError] = useState<string | null>(null);

  // === Modal résultat (success/info/error) ===
  const [resultModal, setResultModal] = useState<{
    tone: 'success' | 'info' | 'danger';
    title: string;
    message: string;
    reference?: string;
  } | null>(null);

  const loadSavedCards = useCallback(async () => {
    try {
      const r = await cardsApi.list();
      setSavedCards(Array.isArray(r.data) ? r.data : []);
    } catch {
      setSavedCards([]);
    }
  }, []);

  useEffect(() => {
    void loadSavedCards();
  }, [loadSavedCards]);

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

    // === Cas 1 : Dépôt carte → flow Stripe Elements (réel)
    if (tab === 'deposit' && method === 'CARD') {
      void openCardModal(amt);
      return;
    }

    // === Cas 2 : Dépôt Mobile Money auto (MVola / Airtel) → providersApi
    const autoOperators: Record<string, { code: string; label: string }> = {
      mvola: { code: 'MVOLA', label: 'MVola' },
      airtel: { code: 'AIRTEL_MONEY', label: 'Airtel Money' },
    };
    const auto =
      tab === 'deposit' &&
      method === 'MOBILE_MONEY' &&
      details.operator &&
      autoOperators[details.operator];
    if (auto) {
      setSubmitting(true);
      try {
        const res = await providersApi.mobileMoneyDeposit(
          auto.code,
          amt,
          details.phoneNumber!.trim(),
        );
        const status = res.data.status;
        if (status === 'SUCCESS') {
          await fetchBalance();
          setResultModal({
            tone: 'success',
            title: `Dépôt ${auto.label} réussi`,
            message: `${amt.toLocaleString('fr-FR')} Ar crédités sur votre wallet.`,
            reference: res.data.reference,
          });
        } else if (status === 'FAILED') {
          setResultModal({
            tone: 'danger',
            title: `Dépôt ${auto.label} refusé`,
            message: res.data.message ?? `${auto.label} a refusé la transaction.`,
            reference: res.data.reference,
          });
        } else {
          setResultModal({
            tone: 'info',
            title: `En attente ${auto.label}`,
            message:
              res.data.message ??
              `${auto.label} met du temps à confirmer. Rafraîchissez dans quelques minutes pour voir le statut final.`,
            reference: res.data.reference,
          });
        }
        reset();
        await loadRequests();
      } catch (e: any) {
        setResultModal({
          tone: 'danger',
          title: `Erreur ${auto.label}`,
          message:
            e?.response?.data?.message ||
            e?.message ||
            `Échec dépôt ${auto.label}`,
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // === Cas 3 : Autre (Bank, Cash, MOBILE_MONEY non-auto, ou retrait) → PaymentRequest
    setSubmitting(true);
    try {
      const r = await paymentApi.create({
        type: tab === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL',
        method: method!,
        amount: amt,
        details: Object.keys(details).length ? details : undefined,
      });
      setResultModal({
        tone: 'info',
        title: 'Demande créée',
        message: getInstructions(method!, tab, r.data.reference),
        reference: r.data.reference,
      });
      reset();
      await loadRequests();
      await fetchBalance();
    } catch (e: any) {
      setResultModal({
        tone: 'danger',
        title: 'Erreur',
        message: e?.response?.data?.message || 'Échec de la demande',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Prépare l'intent Stripe + initialise Stripe.js et ouvre la modale carte.
   * Le flow exact dans la modale :
   *  1. Si carte sauvegardée sélectionnée → confirmCardPayment direct
   *  2. Si nouvelle carte → SetupIntent + save → puis PaymentIntent + confirm
   *  3. Backend confirme côté serveur → crédit du wallet
   */
  const openCardModal = async (amt: number) => {
    setSubmitting(true);
    setCardModalError(null);
    try {
      const intent = await paymentApi.createStripeIntent(amt);
      if (!intent.data.clientSecret) {
        throw new Error('Stripe non configuré (clientSecret manquant)');
      }
      if (!intent.data.publishableKey) {
        throw new Error('Stripe non configuré (publishableKey manquant)');
      }
      setStripePromise(loadStripe(intent.data.publishableKey));
      setStripeClientSecret(intent.data.clientSecret);
      setStripePaymentRequestId(intent.data.paymentRequestId);
      setSelectedCardId(savedCards.find((c) => c.isDefault)?.id ?? null);
      setUseNewCard(savedCards.length === 0);
      setCardModal(true);
    } catch (e: any) {
      setResultModal({
        tone: 'danger',
        title: 'Stripe indisponible',
        message:
          e?.response?.data?.message ||
          e?.message ||
          'Impossible de préparer le paiement par carte',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const closeCardModal = () => {
    setCardModal(false);
    setStripeClientSecret(null);
    setStripePaymentRequestId(null);
    setUseNewCard(false);
    setSelectedCardId(null);
    setCardModalError(null);
  };

  const onCardDepositSuccess = async (amt: number, reference: string) => {
    closeCardModal();
    await Promise.all([fetchBalance(), loadRequests(), loadSavedCards()]);
    setResultModal({
      tone: 'success',
      title: 'Dépôt réussi',
      message: `${amt.toLocaleString('fr-FR')} Ar crédités sur votre wallet.`,
      reference,
    });
    reset();
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

      {/* ============================================================== */}
      {/* Modal Stripe carte (dépôt CARD) — flow réel @stripe/react-stripe-js */}
      {/* ============================================================== */}
      {cardModal && stripeClientSecret && stripePromise && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-brand-300" />
                <div className="text-base font-bold">Paiement par carte</div>
              </div>
              <button
                onClick={closeCardModal}
                className="p-1.5 rounded-lg hover:bg-bg-elevated"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-3xl font-extrabold text-center my-3">
              {parseFloat(amount).toLocaleString('fr-FR')} Ar
            </div>

            {/* Carte sauvegardée vs nouvelle carte */}
            {savedCards.length > 0 && (
              <div className="space-y-2 mb-4">
                {savedCards.map((c) => {
                  const selected = !useNewCard && selectedCardId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setUseNewCard(false);
                        setSelectedCardId(c.id);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                        selected
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-bg-border bg-bg-elevated hover:border-brand-500/40'
                      }`}
                    >
                      <CreditCard
                        size={20}
                        className={selected ? 'text-brand-300' : 'text-ink-muted'}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold uppercase">
                          {c.brand} •••• {c.last4}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          Exp. {c.expiration}
                          {c.isDefault ? ' · Par défaut' : ''}
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 size={18} className="text-brand-300" />
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setUseNewCard(true);
                    setSelectedCardId(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    useNewCard
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-bg-border bg-bg-elevated hover:border-brand-500/40'
                  }`}
                >
                  <Plus
                    size={20}
                    className={useNewCard ? 'text-brand-300' : 'text-ink-muted'}
                  />
                  <div className="text-sm font-semibold">Utiliser une autre carte</div>
                </button>
              </div>
            )}

            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
              <StripeDepositForm
                amount={parseFloat(amount)}
                paymentRequestId={stripePaymentRequestId!}
                useNewCard={useNewCard || savedCards.length === 0}
                onError={(msg) => setCardModalError(msg)}
                onSuccess={onCardDepositSuccess}
              />
            </Elements>

            {cardModalError && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                <XCircle size={14} className="shrink-0 mt-0.5" />
                <span>{cardModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-ink-muted">
              <Lock size={11} />
              Paiement sécurisé via Stripe
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* Modal résultat (success / info / danger) */}
      {/* ============================================================== */}
      {resultModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full text-center animate-slide-in">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                resultModal.tone === 'success'
                  ? 'bg-success-bg text-success-400'
                  : resultModal.tone === 'danger'
                    ? 'bg-danger-bg text-danger-400'
                    : 'bg-warning-bg text-warning-400'
              }`}
            >
              {resultModal.tone === 'success' ? (
                <CheckCircle2 size={42} />
              ) : resultModal.tone === 'danger' ? (
                <XCircle size={42} />
              ) : (
                <Info size={42} />
              )}
            </div>
            <div className="text-lg font-bold mb-1">{resultModal.title}</div>
            <div className="text-sm text-ink-muted whitespace-pre-line">
              {resultModal.message}
            </div>
            {resultModal.reference && (
              <div className="text-[11px] text-ink-dim mt-3 font-mono">
                Réf : {resultModal.reference}
              </div>
            )}
            <Button
              variant="primary"
              size="md"
              fullWidth
              className="mt-5"
              onClick={() => setResultModal(null)}
            >
              OK
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Formulaire Stripe Elements dans le modal de dépôt carte.
 * Branche A : carte sauvegardée → confirmCardPayment direct avec payment_method id
 * Branche B : nouvelle carte → confirmCardSetup (token) + saveCard + confirmCardPayment
 *
 * Le backend confirme la transaction côté serveur après succès Stripe pour créditer
 * le wallet (cf. paymentApi.confirmStripeDeposit).
 */
function StripeDepositForm({
  amount,
  paymentRequestId,
  useNewCard,
  onError,
  onSuccess,
}: {
  amount: number;
  paymentRequestId: string;
  useNewCard: boolean;
  onError: (msg: string) => void;
  onSuccess: (amount: number, reference: string) => void | Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const cardStyle = useMemo(
    () => ({
      style: {
        base: {
          color: '#e5e7eb',
          fontSize: '16px',
          '::placeholder': { color: '#6b7280' },
        },
        invalid: { color: '#f87171' },
      },
    }),
    [],
  );

  async function submit() {
    if (!stripe || !elements) {
      onError('Stripe pas prêt');
      return;
    }
    setBusy(true);
    onError('');
    try {
      let paymentMethodId: string | null = null;

      if (useNewCard) {
        // 1. Tokeniser la carte via SetupIntent (réutilisable pour les prochains dépôts)
        const setup = await cardsApi.createSetupIntent();
        const cardEl = elements.getElement(CardElement);
        if (!cardEl) throw new Error('Champ carte introuvable');
        const { setupIntent, error: setupErr } = await stripe.confirmCardSetup(
          setup.data.clientSecret,
          { payment_method: { card: cardEl } },
        );
        if (setupErr) {
          throw new Error(setupErr.message || 'Échec enregistrement carte');
        }
        const pmId = setupIntent?.payment_method;
        if (!pmId || typeof pmId !== 'string') {
          throw new Error('Carte non tokenisée');
        }
        paymentMethodId = pmId;
        // On enregistre côté backend (non bloquant)
        try {
          await cardsApi.saveCard(pmId);
        } catch {
          /* */
        }
      }

      // 2. Confirme le PaymentIntent (initié dans openCardModal)
      //    Si paymentMethodId non null (nouvelle carte), on l'utilise ;
      //    sinon Stripe utilise la carte attachée au customer (saved card par défaut).
      const intent = await paymentApi.createStripeIntent(amount);
      const clientSecret = intent.data.clientSecret;
      if (!clientSecret) throw new Error('clientSecret manquant');

      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId
          ? paymentMethodId
          : { card: elements.getElement(CardElement)! },
      });
      if (confirmRes.error) {
        throw new Error(confirmRes.error.message || 'Paiement refusé');
      }
      if (confirmRes.paymentIntent?.status !== 'succeeded') {
        throw new Error(
          `Statut Stripe : ${confirmRes.paymentIntent?.status ?? 'inconnu'}`,
        );
      }

      // 3. Confirme côté backend (crédit wallet)
      const confirmed = await paymentApi.confirmStripeDeposit(
        intent.data.paymentRequestId || paymentRequestId,
      );
      await onSuccess(amount, confirmed.data.reference);
    } catch (e: any) {
      onError(e?.response?.data?.message || e?.message || 'Erreur paiement');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {useNewCard && (
        <div className="bg-bg-elevated border border-bg-border rounded-xl px-3 py-3">
          <CardElement options={cardStyle} />
        </div>
      )}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={busy}
        disabled={!stripe || !elements}
        icon={Lock}
        onClick={submit}
      >
        Payer {amount.toLocaleString('fr-FR')} Ar
      </Button>
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
