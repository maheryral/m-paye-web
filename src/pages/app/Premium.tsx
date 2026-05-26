import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  monetizationApi,
  type Plan,
  type Subscription,
} from '../../services/monetizationApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../ui';

const PLAN_META: Record<string, { icon: LucideIcon; bgGradient: string; accent: string }> = {
  BASIC: {
    icon: Zap,
    bgGradient: 'from-slate-600 via-slate-700 to-slate-800',
    accent: '#94A3B8',
  },
  PREMIUM: {
    icon: Crown,
    bgGradient: 'from-brand-500 via-brand-600 to-brand-700',
    accent: '#6366F1',
  },
  BUSINESS: {
    icon: Building2,
    bgGradient: 'from-cyan-500 via-cyan-600 to-blue-700',
    accent: '#06B6D4',
  },
};

export default function Premium() {
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        monetizationApi.listPlans(),
        monetizationApi.myPlan(),
      ]);
      setPlans(Array.isArray(p.data) ? p.data : []);
      setCurrent(c.data);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribe = async (plan: Plan) => {
    if (plan.id === 'BASIC') {
      alert('BASIC est votre plan par défaut');
      return;
    }
    if (balance < plan.price) {
      return alert(
        `Solde insuffisant — ${formatCurrency(balance)} disponible, ${formatCurrency(plan.price)} requis`,
      );
    }
    if (
      !confirm(
        `Souscrire au plan ${plan.name} ?\n${formatCurrency(plan.price)} débités du wallet pour 30 jours.`,
      )
    )
      return;
    setSubscribing(plan.id);
    try {
      await monetizationApi.subscribe(plan.id);
      alert(`Plan ${plan.name} activé`);
      await Promise.all([load(), fetchBalance()]);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec de la souscription');
    } finally {
      setSubscribing(null);
    }
  };

  const cancel = async () => {
    if (!confirm('Annuler le renouvellement ? Vos avantages seront actifs jusqu\'à la fin de la période.'))
      return;
    try {
      await monetizationApi.cancelPlan();
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec de l\'annulation');
    }
  };

  const yearlyDiscount = 0.2; // -20% sur le yearly (marketing)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Plans & abonnement"
        subtitle="Économisez sur vos paiements, débloquez des plafonds étendus"
      />

      {/* Hero */}
      <Card gradient padding="lg" className="text-center">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider mb-4">
          <Sparkles size={11} />
          Choisissez votre plan
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Plus vous utilisez M'Paye,<br />
          <span className="text-white/80">plus vous économisez.</span>
        </h2>
        <p className="text-sm text-white/80 mt-3 max-w-md mx-auto">
          Cashback étendu, plafonds plus élevés, support prioritaire et avantages exclusifs.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 bg-white/15 backdrop-blur-sm rounded-xl mt-6">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-brand-700'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white text-brand-700'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Annuel
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-success-500 text-white">
              -20%
            </span>
          </button>
        </div>
      </Card>

      {/* Current plan banner */}
      {current && current.plan !== 'BASIC' && (
        <Card padding="md" className="border-success-500/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success-bg flex items-center justify-center text-success-400 shrink-0">
              <Crown size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">Vous êtes {current.plan}</span>
                <Badge tone="success">Actif</Badge>
              </div>
              {current.endDate && (
                <div className="text-xs text-ink-muted mt-1">
                  Renouvellement le{' '}
                  {new Date(current.endDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={cancel}>
              Annuler le renouvellement
            </Button>
          </div>
        </Card>
      )}

      {/* Plans grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[480px] rounded-3xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card padding="lg" className="text-center text-sm text-ink-muted">
          Aucun plan disponible. Réessayez plus tard.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const meta = PLAN_META[plan.id] || PLAN_META.BASIC;
            const isCurrent = current?.plan === plan.id;
            const isFree = plan.price === 0;
            const displayedPrice =
              billingCycle === 'yearly' && plan.price > 0
                ? Math.round(plan.price * 12 * (1 - yearlyDiscount))
                : plan.price;
            const Icon = meta.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl overflow-hidden ${
                  plan.recommended
                    ? 'shadow-glow ring-2 ring-brand-500'
                    : 'shadow-card'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-brand text-white text-center py-1.5 text-[10px] font-bold uppercase tracking-wider z-10">
                    <Star size={10} className="inline mr-1" fill="white" />
                    Le plus populaire
                  </div>
                )}

                {/* Card body */}
                <div
                  className={`p-6 bg-bg-surface border ${
                    plan.recommended
                      ? 'border-brand-500'
                      : 'border-bg-border'
                  } ${plan.recommended ? 'pt-12' : ''}`}
                >
                  {/* Header */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${meta.bgGradient}`}
                  >
                    <Icon size={22} className="text-white" />
                  </div>

                  <div className="text-xl font-bold" style={{ color: meta.accent }}>
                    {plan.name}
                  </div>
                  <div className="text-xs text-ink-muted mt-1 mb-5">
                    {isFree
                      ? 'Gratuit pour toujours'
                      : `Facturé ${billingCycle === 'yearly' ? 'annuellement' : 'mensuellement'}`}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {isFree ? '0' : displayedPrice.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-base font-semibold text-ink-muted">Ar</span>
                    <span className="text-xs text-ink-dim ml-1">
                      /{billingCycle === 'yearly' ? 'an' : 'mois'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.price > 0 && (
                    <div className="text-[11px] text-success-400 font-semibold mb-5">
                      Économisez{' '}
                      {Math.round(plan.price * 12 * yearlyDiscount).toLocaleString('fr-FR')} Ar/an
                    </div>
                  )}

                  {/* CTA */}
                  <div className="my-5">
                    {isCurrent ? (
                      <div
                        className="w-full py-2.5 rounded-xl text-center text-sm font-bold border"
                        style={{
                          borderColor: meta.accent,
                          color: meta.accent,
                          background: `${meta.accent}15`,
                        }}
                      >
                        Plan actuel
                      </div>
                    ) : isFree ? (
                      <Button variant="secondary" size="md" fullWidth disabled>
                        Inclus par défaut
                      </Button>
                    ) : (
                      <Button
                        variant={plan.recommended ? 'primary' : 'secondary'}
                        size="md"
                        fullWidth
                        loading={subscribing === plan.id}
                        iconEnd={ArrowRight}
                        onClick={() => subscribe(plan)}
                      >
                        Choisir {plan.name}
                      </Button>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 pt-4 border-t border-bg-border">
                    {plan.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-ink-muted"
                      >
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0"
                          style={{ color: meta.accent }}
                          strokeWidth={3}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ / Trust block */}
      <Card padding="lg">
        <h3 className="text-base font-bold mb-1">Questions fréquentes</h3>
        <p className="text-xs text-ink-muted mb-5">
          Tout ce qu'il faut savoir avant de souscrire
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              q: 'Puis-je annuler à tout moment ?',
              a: 'Oui. L\'annulation prend effet à la fin de la période payée et n\'entraîne aucun frais.',
            },
            {
              q: 'Que se passe-t-il si mon solde est insuffisant ?',
              a: 'Le renouvellement échoue et vous repassez automatiquement au plan BASIC sans rupture.',
            },
            {
              q: 'Le cashback s\'applique-t-il sur tous mes paiements ?',
              a: 'Le cashback s\'applique sur les paiements marchands chez les partenaires M\'Paye.',
            },
            {
              q: 'Puis-je changer de plan ?',
              a: 'Oui, à tout moment — la différence est calculée au prorata du temps restant.',
            },
          ].map((item, i) => (
            <div key={i}>
              <div className="text-sm font-bold mb-1.5">{item.q}</div>
              <div className="text-xs text-ink-muted leading-relaxed">{item.a}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
