import {
  Check,
  Crown,
  Loader2,
  Sparkles,
  Star,
  UserCircle2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  monetizationApi,
  type Plan,
  type Subscription,
} from '../../services/monetizationApi';

export default function Premium() {
  const colors = useColors();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        monetizationApi.listPlans(),
        monetizationApi.myPlan(),
      ]);
      setPlans(Array.isArray(p.data) ? p.data : []);
      setCurrent(c.data);
    } catch (e: any) {
      console.error('Erreur chargement plans:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubscribe = async (plan: Plan) => {
    if (plan.id === 'BASIC') {
      alert('BASIC est votre plan par défaut, pas besoin de souscrire.');
      return;
    }
    if (balance < plan.price) {
      alert(
        `Solde insuffisant : ${formatCurrency(balance)} disponible, ${formatCurrency(plan.price)} requis. Rechargez votre portefeuille.`,
      );
      return;
    }
    if (
      !confirm(
        `Souscrire au plan ${plan.name} ?\n\n${formatCurrency(plan.price)} seront débités de votre wallet pour 30 jours.`,
      )
    )
      return;

    setSubscribing(plan.id);
    try {
      await monetizationApi.subscribe(plan.id);
      alert(`Abonnement ${plan.name} activé !`);
      await Promise.all([load(), fetchBalance()]);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Abonnement échoué');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Annuler le renouvellement ?\nVous garderez vos avantages jusqu'à la fin de la période.",
      )
    )
      return;
    try {
      await monetizationApi.cancelPlan();
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Annulation échouée');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Premium" />
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Plans d'abonnement"
          subtitle="Économisez sur tous vos paiements"
        />

        <div className="px-5 mt-4 space-y-4">
          {/* Plan actuel */}
          <div
            className="rounded-2xl p-5 text-white shadow-glow-blue overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
            }}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.07]" />
            <div className="relative flex items-center gap-3 mb-2">
              {current?.plan === 'BASIC' || !current?.plan ? (
                <UserCircle2 size={28} className="text-white" />
              ) : (
                <Crown size={28} className="text-yellow-300" />
              )}
              <div>
                <div className="text-xs text-white/80">Votre plan actuel</div>
                <div className="text-2xl font-extrabold">{current?.plan || 'BASIC'}</div>
              </div>
            </div>
            {current?.endDate && (
              <div className="relative text-xs text-white/80">
                Expire le {new Date(current.endDate).toLocaleDateString('fr-FR')}
              </div>
            )}
            {current && current.plan !== 'BASIC' && current.endDate && (
              <button
                onClick={handleCancel}
                className="relative mt-3 text-xs font-semibold underline text-white/90"
              >
                Annuler le renouvellement
              </button>
            )}
          </div>

          {/* Liste plans */}
          <div className="space-y-4">
            {plans.map((plan) => {
              const isCurrent = current?.plan === plan.id;
              const isFree = plan.price === 0;
              return (
                <div
                  key={plan.id}
                  className="card p-5 relative"
                  style={{
                    borderColor: plan.color,
                    borderWidth: plan.recommended ? 2 : 1,
                  }}
                >
                  {plan.recommended && (
                    <div
                      className="absolute -top-3 left-5 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ background: plan.color }}
                    >
                      <Star size={12} fill="#fff" />
                      RECOMMANDÉ
                    </div>
                  )}

                  <div className="flex justify-between items-baseline mb-1">
                    <div className="text-xl font-extrabold" style={{ color: plan.color }}>
                      {plan.name}
                    </div>
                    <div className="text-lg font-bold" style={{ color: colors.text }}>
                      {plan.priceLabel}
                    </div>
                  </div>

                  <ul className="space-y-2 mt-4 mb-5">
                    {plan.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: colors.text }}
                      >
                        <Check size={16} className="mt-0.5 shrink-0" style={{ color: plan.color }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div
                      className="w-full py-2.5 rounded-xl text-center text-sm font-bold"
                      style={{
                        background: `${plan.color}20`,
                        color: plan.color,
                      }}
                    >
                      Plan actuel
                    </div>
                  ) : isFree ? (
                    <div
                      className="w-full py-2.5 rounded-xl text-center text-sm font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      Plan par défaut
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={subscribing === plan.id}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{
                        background: plan.color,
                        opacity: subscribing === plan.id ? 0.7 : 1,
                      }}
                    >
                      {subscribing === plan.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Souscrire
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {plans.length === 0 && (
            <div className="card p-8 text-center text-sm" style={{ color: colors.textSecondary }}>
              Aucun plan disponible. Réessayez plus tard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
