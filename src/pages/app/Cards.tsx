import { CreditCard, Plus, ShieldCheck, Trash2, X, Star, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button, Card, Empty, PageHeader, Skeleton } from '../../ui';
import { cardsApi, type SavedCard } from '../../services/cardsApi';

const BRAND_THEMES: Record<string, { name: string; gradient: string }> = {
  visa: { name: 'VISA', gradient: 'from-indigo-900 via-indigo-700 to-blue-600' },
  mastercard: { name: 'Mastercard', gradient: 'from-rose-900 via-orange-700 to-amber-500' },
  unionpay: { name: 'UnionPay', gradient: 'from-blue-900 via-cyan-700 to-cyan-500' },
  amex: { name: 'Amex', gradient: 'from-slate-800 via-slate-600 to-cyan-500' },
};
const themeFor = (brand: string) =>
  BRAND_THEMES[brand?.toLowerCase()] ?? {
    name: (brand || 'CARTE').toUpperCase(),
    gradient: 'from-slate-800 via-slate-600 to-slate-500',
  };

export default function Cards() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Stripe initialisé à l'ouverture du formulaire (avec la clé renvoyée par le backend)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [setupErr, setSetupErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await cardsApi.list();
      setCards(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function openAdd() {
    setSetupErr(null);
    setPreparing(true);
    setShowAdd(true);
    try {
      const r = await cardsApi.createSetupIntent();
      setStripePromise(loadStripe(r.data.publishableKey));
      setClientSecret(r.data.clientSecret);
    } catch (e: any) {
      setSetupErr(
        e?.response?.data?.message ||
          'Impossible d’initialiser Stripe (clé manquante côté serveur ?)',
      );
    } finally {
      setPreparing(false);
    }
  }

  function closeAdd() {
    setShowAdd(false);
    setClientSecret(null);
    setStripePromise(null);
  }

  async function setDefault(id: string) {
    await cardsApi.setDefault(id);
    load();
  }
  async function remove(id: string) {
    if (!confirm('Supprimer cette carte ?')) return;
    await cardsApi.remove(id);
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mes cartes"
        subtitle="Cartes bancaires pour payer directement (tokenisées via Stripe)"
        actions={
          <Button variant="primary" size="md" icon={Plus} onClick={openAdd}>
            Ajouter une carte
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Empty
          icon={CreditCard}
          title="Aucune carte enregistrée"
          description="Ajoutez une carte pour payer vos achats directement, sans passer par votre solde."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((c) => {
            const theme = themeFor(c.brand);
            return (
              <div
                key={c.id}
                className={`relative rounded-2xl p-5 text-white bg-gradient-to-br ${theme.gradient} shadow-lg`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold tracking-wide">
                    {theme.name}
                  </span>
                  <div className="flex gap-1">
                    {!c.isDefault && (
                      <button
                        onClick={() => setDefault(c.id)}
                        className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25"
                        title="Définir par défaut"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => remove(c.id)}
                      className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-8 text-lg tracking-widest">
                  •••• •••• •••• {c.last4}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/80">
                  <span>Expire {c.expiration}</span>
                  {c.isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20">
                      Par défaut
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-ink-dim">
        <ShieldCheck size={14} /> Les données de carte ne transitent jamais par
        nos serveurs : elles sont tokenisées directement par Stripe.
      </div>

      {/* Modal ajout carte */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={closeAdd}
        >
          <Card
            padding="md"
            className="w-full max-w-md"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Ajouter une carte</h3>
              <button
                onClick={closeAdd}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>

            {preparing || !clientSecret || !stripePromise ? (
              setupErr ? (
                <div className="text-sm text-danger-400 bg-danger-bg rounded-lg p-3">
                  {setupErr}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-ink-muted py-6 justify-center">
                  <Loader2 size={16} className="animate-spin" /> Initialisation…
                </div>
              )
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <AddCardForm
                  clientSecret={clientSecret}
                  onDone={() => {
                    closeAdd();
                    load();
                  }}
                />
              </Elements>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function AddCardForm({
  clientSecret,
  onDone,
}: {
  clientSecret: string;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    setErr(null);
    try {
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });
      if (error) {
        setErr(error.message || 'Échec de l’enregistrement de la carte');
        return;
      }
      const pmId = setupIntent?.payment_method;
      if (!pmId || typeof pmId !== 'string') {
        setErr('Carte non enregistrée');
        return;
      }
      await cardsApi.saveCard(pmId);
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Erreur lors de l’enregistrement');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-elevated border border-bg-border rounded-xl px-3 py-3">
        <CardElement options={cardStyle} />
      </div>
      {err && (
        <div className="text-xs text-danger-400 bg-danger-bg rounded-lg p-2">
          {err}
        </div>
      )}
      <Button
        variant="primary"
        size="md"
        fullWidth
        loading={busy}
        disabled={!stripe}
        onClick={submit}
      >
        Enregistrer la carte
      </Button>
    </div>
  );
}
