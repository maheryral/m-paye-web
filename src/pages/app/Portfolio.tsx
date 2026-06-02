import {
  ArrowDownToLine,
  ArrowLeft as ArrowLeftIcon,
  ArrowUpFromLine,
  Building2,
  CheckCircle2,
  CreditCard,
  History as HistoryIcon,
  Info,
  Lock,
  Phone,
  Plus,
  RefreshCcw,
  Send,
  Star,
  Trash2,
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
  type PaymentRequestMethod,
} from '../../services/paymentApi';
import { cardsApi, type SavedCard } from '../../services/cardsApi';
import { providersApi } from '../../services/providersApi';
import { Badge, Button, Card, Input, PageHeader } from '../../ui';

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

/** Thème visuel (dégradé + nom) selon la marque de carte. */
function brandTheme(brand: string) {
  const themes: Record<string, { name: string; gradient: string }> = {
    visa: { name: 'VISA', gradient: 'from-indigo-900 via-indigo-700 to-blue-600' },
    mastercard: { name: 'Mastercard', gradient: 'from-rose-900 via-orange-700 to-amber-500' },
    unionpay: { name: 'UnionPay', gradient: 'from-blue-900 via-cyan-700 to-cyan-500' },
    amex: { name: 'Amex', gradient: 'from-slate-800 via-slate-600 to-cyan-500' },
  };
  return themes[brand?.toLowerCase()] ?? {
    name: (brand || 'CARTE').toUpperCase(),
    gradient: 'from-slate-800 via-slate-600 to-slate-500',
  };
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [tab, setTab] = useState<Tab>('deposit');
  const [method, setMethod] = useState<PaymentRequestMethod | null>(null);
  const [methodModal, setMethodModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // === Stripe carte ===
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentRequestId, setStripePaymentRequestId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // === Modal "Ajouter une carte" (SetupIntent autonome) ===
  const [addCardModal, setAddCardModal] = useState(false);
  const [addCardSecret, setAddCardSecret] = useState<string | null>(null);
  const [addCardPromise, setAddCardPromise] = useState<Promise<Stripe | null> | null>(null);
  const [addCardPreparing, setAddCardPreparing] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

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

  const resetForm = () => {
    setMethod(null);
    setAmount('');
    setDetails({});
    setSelectedCardId(null);
    setUseNewCard(false);
    setStripeReady(false);
    setStripePromise(null);
    setStripeClientSecret(null);
    setStripePaymentRequestId(null);
    setCardError(null);
  };

  /** Ouvre le modal plein écran pour la méthode choisie. Pré-charge Stripe si CARD. */
  const openMethodModal = async (m: PaymentRequestMethod) => {
    setMethod(m);
    setMethodModal(true);
    setCardError(null);

    if (m === 'CARD' && tab === 'deposit') {
      // Pré-charge le Stripe Promise + créera le PaymentIntent au clic "Payer"
      // pour que l'amount soit fixé. Le clientSecret sera obtenu à ce moment-là.
      setSelectedCardId(savedCards.find((c) => c.isDefault)?.id ?? null);
      setUseNewCard(savedCards.length === 0);
    }
  };

  const closeMethodModal = () => {
    setMethodModal(false);
    resetForm();
  };

  /** Pré-charge le PaymentIntent + Stripe.js au moment où l'user clique "Payer". */
  const prepareStripe = async (amt: number): Promise<boolean> => {
    setCardError(null);
    try {
      const intent = await paymentApi.createStripeIntent(amt);
      if (!intent.data.clientSecret || !intent.data.publishableKey) {
        throw new Error('Stripe non configuré');
      }
      setStripePromise(loadStripe(intent.data.publishableKey));
      setStripeClientSecret(intent.data.clientSecret);
      setStripePaymentRequestId(intent.data.paymentRequestId);
      setStripeReady(true);
      return true;
    } catch (e: any) {
      setCardError(
        e?.response?.data?.message ||
          e?.message ||
          'Impossible de préparer Stripe',
      );
      return false;
    }
  };

  const onCardDepositSuccess = async (amt: number, reference: string) => {
    closeMethodModal();
    await Promise.all([fetchBalance(), loadSavedCards()]);
    setResultModal({
      tone: 'success',
      title: 'Dépôt réussi',
      message: `${amt.toLocaleString('fr-FR')} Ar crédités sur votre wallet.`,
      reference,
    });
  };

  /** Validation par méthode. */
  const validate = (): string | null => {
    const a = parseFloat(amount);
    if (!a || a < 100) return 'Montant minimum : 100 Ar';
    if (tab === 'withdraw' && a > balance) return 'Solde insuffisant';
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
      setCardError(err);
      return;
    }
    const amt = parseFloat(amount);

    // === Cas 1 : Dépôt CARD → prépare Stripe et passe en mode Elements ===
    if (tab === 'deposit' && method === 'CARD') {
      // Si pas de carte sélectionnée et pas de saisie nouvelle → erreur claire
      if (!useNewCard && !selectedCardId) {
        setCardError(
          'Sélectionnez une carte ou choisissez "Ajouter une nouvelle carte".',
        );
        return;
      }
      const ok = await prepareStripe(amt);
      if (!ok) return;
      // Le composant StripeDepositForm prend le relais
      return;
    }

    // === Cas 2 : Mobile Money auto (MVola / Airtel) → providersApi ===
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
          closeMethodModal();
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
          closeMethodModal();
          setResultModal({
            tone: 'info',
            title: `En attente ${auto.label}`,
            message:
              res.data.message ??
              `${auto.label} met du temps à confirmer. Rafraîchissez plus tard.`,
            reference: res.data.reference,
          });
        }
      } catch (e: any) {
        setCardError(
          e?.response?.data?.message ||
            e?.message ||
            `Échec dépôt ${auto.label}`,
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // === Cas 3 : Autres (BANK, CASH, MM Orange, ou retrait) → PaymentRequest ===
    setSubmitting(true);
    try {
      const r = await paymentApi.create({
        type: tab === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL',
        method: method!,
        amount: amt,
        details: Object.keys(details).length ? details : undefined,
      });
      closeMethodModal();
      await fetchBalance();
      setResultModal({
        tone: 'info',
        title: 'Demande créée',
        message: getInstructions(method!, tab, r.data.reference),
        reference: r.data.reference,
      });
    } catch (e: any) {
      setCardError(e?.response?.data?.message || 'Échec de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  /** Supprime une carte sauvegardée (avec confirmation). */
  const deleteSavedCard = async (cardId: string) => {
    if (!confirm('Supprimer cette carte ?')) return;
    try {
      await cardsApi.remove(cardId);
      if (selectedCardId === cardId) {
        setSelectedCardId(null);
        setUseNewCard(true);
      }
      await loadSavedCards();
    } catch (e: any) {
      setResultModal({
        tone: 'danger',
        title: 'Suppression impossible',
        message: e?.response?.data?.message || 'Erreur',
      });
    }
  };

  const setDefaultCard = async (cardId: string) => {
    try {
      await cardsApi.setDefault(cardId);
      await loadSavedCards();
    } catch (e: any) {
      setResultModal({
        tone: 'danger',
        title: 'Erreur',
        message: e?.response?.data?.message || 'Échec',
      });
    }
  };

  /** Ouvre la modale "Ajouter une carte" (SetupIntent autonome, hors flux dépôt). */
  const openAddCard = async () => {
    setAddCardError(null);
    setAddCardPreparing(true);
    setAddCardModal(true);
    try {
      const r = await cardsApi.createSetupIntent();
      setAddCardPromise(loadStripe(r.data.publishableKey));
      setAddCardSecret(r.data.clientSecret);
    } catch (e: any) {
      setAddCardError(
        e?.response?.data?.message ||
          "Impossible d'initialiser Stripe (clé manquante côté serveur ?)",
      );
    } finally {
      setAddCardPreparing(false);
    }
  };

  const closeAddCard = () => {
    setAddCardModal(false);
    setAddCardSecret(null);
    setAddCardPromise(null);
    setAddCardError(null);
  };

  const onAddCardSuccess = async () => {
    closeAddCard();
    await loadSavedCards();
  };

  // Stats des KPIs
  const stats = useMemo(() => {
    return {
      // On affiche juste le solde + 2 placeholders simples maintenant
      // (la liste des demandes a été retirée à la demande de l'utilisateur)
    };
  }, []);
  void stats; // évite warning unused

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

      {/* Solde disponible (full-width sans KPIs encombrants) */}
      <Card gradient padding="lg" className="min-h-[160px]">
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

      {/* Sélecteur de méthode + tabs */}
      <Card padding="md">
        <div className="grid grid-cols-2 gap-1 p-1 bg-bg-elevated rounded-xl mb-5">
          <button
            onClick={() => setTab('deposit')}
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
            onClick={() => setTab('withdraw')}
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

        <div className="section-title mb-3">Choisissez une méthode</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const disabled = tab === 'withdraw' && m.id === 'CARD';
            return (
              <button
                key={m.id}
                onClick={() => !disabled && void openMethodModal(m.id)}
                disabled={disabled}
                className={`p-3 rounded-xl border text-left transition-all ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed border-bg-border bg-bg-elevated'
                    : 'border-bg-border bg-bg-elevated hover:border-brand-500/60 hover:shadow-glow-soft'
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
        <p className="text-[11px] text-ink-dim mt-3 text-center">
          Cliquez sur une méthode pour ouvrir le formulaire
        </p>
      </Card>

      {/* ============================================================== */}
      {/* MODAL PLEIN ÉCRAN — formulaire de dépôt / retrait par méthode  */}
      {/* ============================================================== */}
      {methodModal && method && (
        <div className="fixed inset-0 z-40 bg-bg-base overflow-y-auto animate-fade-in">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-bg-base py-3 z-10">
              <button
                onClick={closeMethodModal}
                disabled={submitting}
                className="flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                <ArrowLeftIcon size={16} />
                Retour aux méthodes
              </button>
              <Badge tone={tab === 'deposit' ? 'success' : 'danger'}>
                {tab === 'deposit' ? 'Dépôt' : 'Retrait'}
              </Badge>
            </div>

            {/* Card-header de la méthode */}
            <Card padding="md">
              {(() => {
                const m = METHODS.find((x) => x.id === method)!;
                const Icon = m.icon;
                return (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: m.color }}
                    >
                      <Icon size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="text-base font-bold">{m.name}</div>
                      <div className="text-xs text-ink-muted">{m.description}</div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* === CARD ============================================ */}
            {method === 'CARD' && tab === 'deposit' && (
              <>
                {/* Cards management intégrée */}
                <Card padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-brand-300" />
                      <h3 className="text-sm font-bold">Mes cartes</h3>
                    </div>
                    <Button variant="secondary" size="sm" icon={Plus} onClick={openAddCard}>
                      Ajouter
                    </Button>
                  </div>

                  {savedCards.length === 0 ? (
                    <div className="rounded-xl bg-bg-elevated p-4 text-center">
                      <CreditCard size={24} className="mx-auto text-ink-muted mb-2" />
                      <div className="text-sm text-ink-muted">Aucune carte enregistrée</div>
                      <div className="text-[11px] text-ink-dim mt-1">
                        Cliquez "Ajouter" pour enregistrer votre première carte.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedCards.map((c) => {
                        const selected = !useNewCard && selectedCardId === c.id;
                        const theme = brandTheme(c.brand);
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center rounded-xl border overflow-hidden transition ${
                              selected
                                ? 'border-brand-500 bg-brand-500/10'
                                : 'border-bg-border bg-bg-elevated hover:border-brand-500/40'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setUseNewCard(false);
                                setSelectedCardId(c.id);
                              }}
                              className={`flex-1 flex items-center gap-3 p-3 text-left text-white bg-gradient-to-r ${theme.gradient}`}
                            >
                              <CreditCard size={20} className="shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold uppercase truncate">
                                  {theme.name} •••• {c.last4}
                                </div>
                                <div className="text-[11px] text-white/80">
                                  Exp. {c.expiration}
                                  {c.isDefault ? ' · Par défaut' : ''}
                                </div>
                              </div>
                              {selected && <CheckCircle2 size={18} className="shrink-0" />}
                            </button>
                            <div className="flex items-center gap-1 px-2 bg-bg-elevated">
                              {!c.isDefault && (
                                <button
                                  onClick={() => setDefaultCard(c.id)}
                                  className="p-2 rounded-lg text-ink-muted hover:text-warning-400"
                                  title="Définir par défaut"
                                >
                                  <Star size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteSavedCard(c.id)}
                                className="p-2 rounded-lg text-ink-muted hover:text-danger-400"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
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
                        <Plus size={20} className={useNewCard ? 'text-brand-300' : 'text-ink-muted'} />
                        <div className="text-sm font-semibold">Utiliser une autre carte (à saisir)</div>
                      </button>
                    </div>
                  )}
                </Card>

                {/* Formulaire dépôt CARD */}
                <Card padding="md">
                  <div className="space-y-4">
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
                          autoFocus
                          disabled={stripeReady}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-sm font-semibold">
                          Ar
                        </span>
                      </div>
                      <p className="text-xs text-ink-dim mt-2">Minimum : 100 Ar</p>
                    </div>

                    {!stripeReady ? (
                      <>
                        <div className="flex gap-2.5 items-start p-3 rounded-xl border border-brand-500/30 bg-brand-500/10">
                          <Lock size={16} className="text-brand-300 shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed">
                            Paiement sécurisé Stripe. Sélectionnez une carte enregistrée
                            ou cochez "Utiliser une autre carte" pour saisir.
                          </p>
                        </div>

                        {cardError && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                            <XCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{cardError}</span>
                          </div>
                        )}

                        <Button
                          variant="success"
                          size="lg"
                          fullWidth
                          loading={submitting}
                          disabled={!amount || parseFloat(amount) < 100 ||
                            (!useNewCard && !selectedCardId)}
                          icon={Lock}
                          onClick={handleSubmit}
                        >
                          Continuer
                        </Button>
                      </>
                    ) : stripePromise && stripeClientSecret ? (
                      <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                        <StripeDepositForm
                          amount={parseFloat(amount)}
                          paymentRequestId={stripePaymentRequestId!}
                          useNewCard={useNewCard || savedCards.length === 0}
                          selectedCard={
                            !useNewCard
                              ? savedCards.find((c) => c.id === selectedCardId) ?? null
                              : null
                          }
                          onError={(msg) => setCardError(msg)}
                          onSuccess={onCardDepositSuccess}
                        />
                        {cardError && (
                          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                            <XCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{cardError}</span>
                          </div>
                        )}
                      </Elements>
                    ) : null}
                  </div>
                </Card>
              </>
            )}

            {/* === MOBILE_MONEY ===================================== */}
            {method === 'MOBILE_MONEY' && (
              <Card padding="md">
                <div className="space-y-4">
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
                  {cardError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                      <XCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{cardError}</span>
                    </div>
                  )}
                  <Button
                    variant={tab === 'deposit' ? 'success' : 'danger'}
                    size="lg"
                    fullWidth
                    loading={submitting}
                    icon={Send}
                    onClick={handleSubmit}
                  >
                    {tab === 'deposit' ? 'Demander un dépôt' : 'Demander un retrait'}
                  </Button>
                </div>
              </Card>
            )}

            {/* === BANK ============================================ */}
            {method === 'BANK' && (
              <Card padding="md">
                <div className="space-y-4">
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
                  {cardError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                      <XCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{cardError}</span>
                    </div>
                  )}
                  <Button
                    variant={tab === 'deposit' ? 'success' : 'danger'}
                    size="lg"
                    fullWidth
                    loading={submitting}
                    icon={Send}
                    onClick={handleSubmit}
                  >
                    {tab === 'deposit' ? 'Demander un dépôt' : 'Demander un retrait'}
                  </Button>
                </div>
              </Card>
            )}

            {/* === CASH ============================================ */}
            {method === 'CASH' && (
              <Card padding="md">
                <div className="space-y-4">
                  <div className="flex gap-2.5 items-start p-3 rounded-xl border border-warning-500/30 bg-warning-bg">
                    <Info size={16} className="text-warning-400 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Après création, un agent M'Paye vous contactera avec un code à
                      présenter pour {tab === 'deposit' ? 'déposer' : 'retirer'} en espèces.
                    </p>
                  </div>
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
                  {cardError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                      <XCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{cardError}</span>
                    </div>
                  )}
                  <Button
                    variant={tab === 'deposit' ? 'success' : 'danger'}
                    size="lg"
                    fullWidth
                    loading={submitting}
                    icon={Send}
                    onClick={handleSubmit}
                  >
                    {tab === 'deposit' ? 'Demander un dépôt' : 'Demander un retrait'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL "Ajouter une carte" (SetupIntent autonome)                */}
      {/* ============================================================== */}
      {addCardModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={closeAddCard}
        >
          <Card
            padding="lg"
            className="max-w-md w-full animate-slide-in"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-brand-300" />
                <div className="text-base font-bold">Ajouter une carte</div>
              </div>
              <button onClick={closeAddCard} className="p-1.5 rounded-lg hover:bg-bg-elevated">
                <X size={16} />
              </button>
            </div>

            {addCardError ? (
              <div className="text-sm text-danger-400 bg-danger-bg rounded-lg p-3">
                {addCardError}
              </div>
            ) : addCardPreparing || !addCardSecret || !addCardPromise ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-6 justify-center">
                <RefreshCcw size={14} className="animate-spin" /> Initialisation…
              </div>
            ) : (
              <Elements stripe={addCardPromise} options={{ clientSecret: addCardSecret }}>
                <AddCardForm
                  clientSecret={addCardSecret}
                  onError={(msg) => setAddCardError(msg)}
                  onSuccess={onAddCardSuccess}
                />
              </Elements>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-ink-muted">
              <Lock size={11} />
              Paiement sécurisé via Stripe
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL résultat (success / info / danger)                        */}
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
            <div className="text-sm text-ink-muted whitespace-pre-line">{resultModal.message}</div>
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

/** Formulaire Stripe Elements pour confirmer le dépôt par carte. */
function StripeDepositForm({
  amount,
  paymentRequestId,
  useNewCard,
  selectedCard,
  onError,
  onSuccess,
}: {
  amount: number;
  paymentRequestId: string;
  useNewCard: boolean;
  selectedCard: SavedCard | null;
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
        // Nouvelle carte : SetupIntent → token → save → pm_id
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
        try {
          await cardsApi.saveCard(pmId);
        } catch {
          /* */
        }
      } else if (selectedCard?.stripePaymentMethodId) {
        // Carte sauvegardée : utilise pm_xxx directement
        paymentMethodId = selectedCard.stripePaymentMethodId;
      } else {
        throw new Error("Aucune carte sélectionnée.");
      }

      const intent = await paymentApi.createStripeIntent(amount);
      const clientSecret = intent.data.clientSecret;
      if (!clientSecret) throw new Error('clientSecret manquant');

      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId,
      });
      if (confirmRes.error) {
        throw new Error(confirmRes.error.message || 'Paiement refusé');
      }
      if (confirmRes.paymentIntent?.status !== 'succeeded') {
        throw new Error(`Statut Stripe : ${confirmRes.paymentIntent?.status ?? 'inconnu'}`);
      }

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
      {useNewCard ? (
        <div className="bg-bg-elevated border border-bg-border rounded-xl px-3 py-3">
          <CardElement options={cardStyle} />
        </div>
      ) : selectedCard ? (
        <div className="rounded-xl bg-brand-500/5 border border-brand-500/30 px-3 py-2.5 text-xs text-ink-muted">
          La carte{' '}
          <span className="font-semibold uppercase">
            {selectedCard.brand} •••• {selectedCard.last4}
          </span>{' '}
          sera débitée — pas besoin de re-saisir vos informations.
        </div>
      ) : null}
      <Button
        variant="success"
        size="lg"
        fullWidth
        loading={busy}
        disabled={!stripe || !elements || (!useNewCard && !selectedCard?.stripePaymentMethodId)}
        icon={Lock}
        onClick={submit}
      >
        Payer {amount.toLocaleString('fr-FR')} Ar
      </Button>
    </div>
  );
}

/** Mini-formulaire Stripe pour enregistrer une carte (SetupIntent uniquement). */
function AddCardForm({
  clientSecret,
  onError,
  onSuccess,
}: {
  clientSecret: string;
  onError: (msg: string) => void;
  onSuccess: () => void | Promise<void>;
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
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    setBusy(true);
    onError('');
    try {
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });
      if (error) {
        onError(error.message || "Échec de l'enregistrement de la carte");
        return;
      }
      const pmId = setupIntent?.payment_method;
      if (!pmId || typeof pmId !== 'string') {
        onError('Carte non enregistrée');
        return;
      }
      await cardsApi.saveCard(pmId);
      await onSuccess();
    } catch (e: any) {
      onError(e?.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-bg-elevated border border-bg-border rounded-xl px-3 py-3">
        <CardElement options={cardStyle} />
      </div>
      <Button
        variant="primary"
        size="md"
        fullWidth
        loading={busy}
        disabled={!stripe}
        icon={Lock}
        onClick={submit}
      >
        Enregistrer la carte
      </Button>
    </div>
  );
}
