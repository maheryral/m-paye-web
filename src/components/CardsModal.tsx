import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { CreditCard, Lock, Plus, Star, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cardsApi, type SavedCard } from '../services/cardsApi';
import { Button, Skeleton } from '../ui';

export default function CardsModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdding(false);
    setErr('');
    void load();
    // Fermeture à la touche Échap
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const load = async () => {
    try {
      setLoading(true);
      const r = await cardsApi.list();
      setCards(Array.isArray(r.data) ? r.data : []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const startAdd = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await cardsApi.createSetupIntent();
      setStripePromise(loadStripe(r.data.publishableKey));
      setClientSecret(r.data.clientSecret);
      setAdding(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Stripe non configuré côté serveur ?');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer cette carte ?')) return;
    try {
      await cardsApi.remove(id);
      await load();
      onChanged?.();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec de la suppression');
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await cardsApi.setDefault(id);
      await load();
      onChanged?.();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec');
    }
  };

  const onAdded = async () => {
    setAdding(false);
    setClientSecret(null);
    await load();
    onChanged?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-bg-surface border border-bg-border rounded-2xl shadow-elevated max-h-[88vh] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border shrink-0">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-brand-500" />
            <h3 className="text-base font-bold">Mes cartes</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-ink-muted hover:text-ink hover:bg-bg-subtle"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Liste des cartes */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-bg-border rounded-xl">
              <CreditCard size={26} className="mx-auto text-ink-dim mb-2" />
              <div className="text-sm font-semibold">Aucune carte enregistrée</div>
              <div className="text-xs text-ink-muted mt-1">
                Ajoutez une carte pour payer plus vite.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-bg-border bg-bg-elevated/40"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-500 shrink-0">
                    <CreditCard size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">
                      {c.brand?.toUpperCase()} •••• {c.last4}
                    </div>
                    <div className="text-xs text-ink-muted">
                      Expire {c.expiration}
                      {c.isDefault && (
                        <span className="ml-2 text-[10px] font-bold text-success-400">
                          · Par défaut
                        </span>
                      )}
                    </div>
                  </div>
                  {!c.isDefault && (
                    <button
                      onClick={() => makeDefault(c.id)}
                      className="p-2 rounded-lg text-ink-muted hover:text-warning-400 hover:bg-bg-subtle"
                      title="Définir par défaut"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(c.id)}
                    className="p-2 rounded-lg text-ink-muted hover:text-danger-400 hover:bg-bg-subtle"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {err && (
            <div className="text-xs text-danger-400 bg-danger-bg rounded-lg px-3 py-2">{err}</div>
          )}

          {/* Ajout d'une carte */}
          {adding && clientSecret && stripePromise ? (
            <div className="border-t border-bg-border pt-4">
              <div className="text-xs font-bold text-ink-muted mb-2 uppercase tracking-wider">
                Nouvelle carte
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <AddCardForm clientSecret={clientSecret} onError={setErr} onSuccess={onAdded} />
              </Elements>
              <button
                onClick={() => setAdding(false)}
                className="mt-2 text-xs text-ink-muted hover:text-ink"
              >
                Annuler
              </button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              icon={Plus}
              loading={busy}
              onClick={startAdd}
            >
              Ajouter une carte
            </Button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-dim">
            <Lock size={11} />
            Cartes tokenisées par Stripe — jamais stockées chez nous.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Formulaire Stripe Elements pour enregistrer une carte (SetupIntent). */
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
          color: '#0f172a',
          fontSize: '16px',
          fontFamily: 'Poppins, system-ui, sans-serif',
          '::placeholder': { color: '#94a3b8' },
        },
        invalid: { color: '#ef4444' },
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
      <div className="bg-bg-surface border border-bg-border rounded-xl px-3 py-3">
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
