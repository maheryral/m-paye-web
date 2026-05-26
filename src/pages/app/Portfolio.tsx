import {
  ArrowDown,
  ArrowUp,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileX2,
  Hourglass,
  Info,
  Loader2,
  Lock,
  Phone,
  RefreshCcw,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  paymentApi,
  type PaymentRequest,
  type PaymentRequestMethod,
} from '../../services/paymentApi';

type Tab = 'deposit' | 'withdraw';

interface MethodMeta {
  id: PaymentRequestMethod;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

const METHODS: MethodMeta[] = [
  { id: 'CARD', name: 'Carte bancaire', icon: CreditCard, color: '#3b82f6', description: 'Visa, Mastercard via Stripe' },
  { id: 'MOBILE_MONEY', name: 'Mobile Money', icon: Phone, color: '#10b981', description: 'MVola, Orange Money, Airtel Money' },
  { id: 'BANK', name: 'Virement bancaire', icon: Building2, color: '#8b5cf6', description: 'BNI, BFV, BOA…' },
  { id: 'CASH', name: 'Cash chez agent', icon: Wallet, color: '#f59e0b', description: 'Dépôt/retrait en espèces' },
];

const STATUS_META: Record<
  string,
  { color: string; label: string; icon: LucideIcon }
> = {
  PENDING: { color: '#f59e0b', label: 'EN ATTENTE', icon: Clock },
  PROCESSING: { color: '#3b82f6', label: 'EN COURS', icon: RefreshCcw },
  APPROVED: { color: '#10b981', label: 'APPROUVÉ', icon: CheckCircle2 },
  REJECTED: { color: '#ef4444', label: 'REJETÉ', icon: XCircle },
  CANCELLED: { color: '#9ca3af', label: 'ANNULÉ', icon: Ban },
  EXPIRED: { color: '#9ca3af', label: 'EXPIRÉ', icon: Hourglass },
};

function getInstructions(method: PaymentRequestMethod, tab: Tab, r: PaymentRequest): string {
  if (method === 'MOBILE_MONEY') {
    return tab === 'deposit'
      ? `Envoyez le montant via votre opérateur en mentionnant la référence ${r.reference}. Un admin validera sous 24h.`
      : `Vous recevrez le montant sur votre numéro mobile money après validation admin.`;
  }
  if (method === 'BANK') {
    return tab === 'deposit'
      ? `Effectuez le virement vers le compte M'Paye et indiquez la référence ${r.reference}.`
      : `L'admin effectuera le virement vers votre compte bancaire après validation.`;
  }
  if (method === 'CASH') return `Un agent vous contactera. Présentez le code ${r.reference}.`;
  return 'Demande en attente de validation.';
}

export default function Portfolio() {
  const navigate = useNavigate();
  const colors = useColors();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [tab, setTab] = useState<Tab>('deposit');
  const [method, setMethod] = useState<PaymentRequestMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      const res = await paymentApi.listMine();
      setRequests(res.data);
    } catch (e: any) {
      console.error('Erreur chargement requests', e?.response?.data || e?.message);
    } finally {
      setLoadingRequests(false);
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
    if (tab === 'withdraw' && a > balance) {
      return `Solde insuffisant (${formatCurrency(balance)} disponible)`;
    }
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
        const res = await paymentApi.createStripeIntent(amt);
        alert(
          `Paiement Stripe — demande créée (${res.data.reference}).\n\nclientSecret: ${res.data.clientSecret?.slice(0, 30)}...\n\nIntégrez Stripe.js côté front pour confirmer la carte.`,
        );
        reset();
        await loadRequests();
        return;
      }
      const res = await paymentApi.create({
        type: tab === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL',
        method: method!,
        amount: amt,
        details: Object.keys(details).length > 0 ? details : undefined,
      });
      alert(`Demande créée ✅\nRéférence : ${res.data.reference}\n\n${getInstructions(method!, tab, res.data)}`);
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

  const formatAmount = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Mon Portefeuille"
          subtitle="Dépôt et retrait — données 100% réelles"
          RightIcon={Clock}
          onRightPress={() => navigate('/history')}
        />

        <div className="px-4 mt-4">
          <div className="rounded-2xl p-5 mb-4 bg-primary-dark text-white">
            <div className="text-xs font-semibold text-white/80">Solde disponible</div>
            <div className="text-3xl font-extrabold mt-2">{formatCurrency(balance)}</div>
          </div>

          <div className="card flex gap-1 p-1 mb-4">
            <button
              onClick={() => {
                setTab('deposit');
                reset();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ${
                tab === 'deposit' ? 'bg-primary-dark text-white' : 'text-slate-400'
              }`}
            >
              <ArrowDown size={18} />
              Dépôt
            </button>
            <button
              onClick={() => {
                setTab('withdraw');
                reset();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ${
                tab === 'withdraw' ? 'bg-red-500 text-white' : 'text-slate-400'
              }`}
            >
              <ArrowUp size={18} />
              Retrait
            </button>
          </div>

          <div className="text-sm font-bold mb-3" style={{ color: colors.text }}>
            Méthode
          </div>
          <div className="space-y-2.5">
            {METHODS.map((m) => {
              const selected = method === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className="card w-full flex items-center gap-3 p-3.5 text-left transition-all"
                  style={{
                    borderColor: selected ? m.color : undefined,
                    borderWidth: selected ? 2 : 1,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: m.color }}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: colors.text }}>
                      {m.name}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                      {m.description}
                    </div>
                  </div>
                  {selected && <CheckCircle2 size={22} style={{ color: m.color }} />}
                </button>
              );
            })}
          </div>

          {method && (
            <div className="card p-3.5 mt-3">
              {method === 'MOBILE_MONEY' && (
                <>
                  <div className="text-[11px] font-bold tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    OPÉRATEUR
                  </div>
                  <div className="flex gap-2">
                    {['mvola', 'orange', 'airtel'].map((op) => (
                      <button
                        key={op}
                        onClick={() => setDetails({ ...details, operator: op })}
                        className="px-3.5 py-2 rounded-full border text-xs font-semibold"
                        style={{
                          borderColor: details.operator === op ? '#10b981' : colors.border,
                          background: details.operator === op ? '#10b981' : 'transparent',
                          color: details.operator === op ? '#fff' : colors.text,
                        }}
                      >
                        {op.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-bold tracking-wider mt-3 mb-2" style={{ color: colors.textSecondary }}>
                    NUMÉRO MOBILE MONEY
                  </div>
                  <input
                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: colors.text, borderColor: colors.border }}
                    value={details.phoneNumber || ''}
                    onChange={(e) => setDetails({ ...details, phoneNumber: e.target.value })}
                    placeholder="034 XX XXX XX"
                    inputMode="tel"
                  />
                </>
              )}

              {method === 'BANK' && (
                <>
                  <div className="text-[11px] font-bold tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    BANQUE
                  </div>
                  <input
                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
                    style={{ color: colors.text, borderColor: colors.border }}
                    value={details.bankName || ''}
                    onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                    placeholder="BNI, BFV, BOA..."
                  />
                  <div className="text-[11px] font-bold tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    NUMÉRO DE COMPTE
                  </div>
                  <input
                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: colors.text, borderColor: colors.border }}
                    value={details.accountNumber || ''}
                    onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                    placeholder="00012 3456 78901234567"
                  />
                </>
              )}

              {method === 'CASH' && (
                <div className="flex gap-2.5 items-start p-3 rounded-xl border bg-amber-500/10 border-amber-500/50">
                  <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed" style={{ color: colors.text }}>
                    Après création, un agent M'Paye vous contactera avec un code à présenter
                    pour {tab === 'deposit' ? 'déposer' : 'retirer'} en espèces.
                  </p>
                </div>
              )}

              {method === 'CARD' && (
                <div className="flex gap-2.5 items-start p-3 rounded-xl border bg-primary/10 border-primary/50">
                  <Lock size={18} className="text-primary-light shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed" style={{ color: colors.text }}>
                    Paiement sécurisé par Stripe.{' '}
                    {tab === 'withdraw'
                      ? 'Pour le retrait, utilisez Mobile Money ou Bank.'
                      : 'Vous serez redirigé pour saisir votre carte.'}
                  </p>
                </div>
              )}

              <div className="text-[11px] font-bold tracking-wider mt-4 mb-2" style={{ color: colors.textSecondary }}>
                MONTANT (Ar)
              </div>
              <input
                className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-lg font-bold outline-none"
                style={{ color: colors.text, borderColor: colors.border }}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0"
                inputMode="numeric"
              />

              <button
                onClick={handleSubmit}
                disabled={submitting || (tab === 'withdraw' && method === 'CARD')}
                className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 rounded-xl font-bold text-white"
                style={{
                  background: tab === 'deposit' ? '#1e40af' : '#ef4444',
                  opacity: submitting || (tab === 'withdraw' && method === 'CARD') ? 0.5 : 1,
                }}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Check size={18} />
                    {tab === 'deposit' ? 'Demander un dépôt' : 'Demander un retrait'}
                  </>
                )}
              </button>

              {tab === 'withdraw' && method === 'CARD' && (
                <div className="text-red-400 text-[11px] mt-2 text-center">
                  Retrait par carte non supporté — utilisez Mobile Money ou Bank.
                </div>
              )}
            </div>
          )}

          <div className="mt-6 mb-3 text-sm font-bold" style={{ color: colors.text }}>
            Mes demandes récentes
          </div>

          {loadingRequests ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin" size={24} style={{ color: colors.primary }} />
            </div>
          ) : requests.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-8">
              <FileX2 size={36} style={{ color: colors.textSecondary }} />
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                Aucune demande pour le moment
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => {
                const meta = STATUS_META[r.status];
                const StatusIcon = meta.icon;
                return (
                  <div key={r.id} className="card p-3">
                    <div className="flex justify-between items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: colors.text }}>
                          {r.reference}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                          {r.type === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} · {r.method}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0"
                        style={{ background: meta.color + '20' }}
                      >
                        <StatusIcon size={12} style={{ color: meta.color }} />
                        <span className="text-[10px] font-bold" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-base font-extrabold" style={{ color: colors.text }}>
                        {formatAmount(Number(r.amount))} Ar
                      </div>
                      <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                        {new Date(r.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {r.rejectionReason && (
                      <div className="text-red-400 text-xs mt-1">Raison : {r.rejectionReason}</div>
                    )}
                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="w-full mt-2.5 py-2 rounded-lg border text-xs font-semibold"
                        style={{ borderColor: colors.border, color: colors.text }}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
