import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useLocale } from '../../contexts/LocaleContext';
import {
  merchantApi,
  type PublicPaymentLink,
} from '../../services/merchantApi';
import { cardsApi, type SavedCard } from '../../services/cardsApi';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-3 text-lg outline-none focus:border-brand-500';

export default function PayLink() {
  const { reference = '' } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useLocale();

  const [link, setLink] = useState<PublicPaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Source de paiement : 'WALLET' ou l'id d'une carte enregistrée
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [source, setSource] = useState<string>('WALLET');

  const idempotencyKey = useMemo(
    () => `pl-${reference}-${crypto.randomUUID()}`,
    [reference],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await merchantApi.getPublicPaymentLink(reference);
        if (!cancelled) setLink(r.data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    cardsApi
      .list()
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r.data) ? r.data : [];
        setCards(list);
        const def = list.find((c) => c.isDefault);
        if (def) setSource(def.id); // carte par défaut pré-sélectionnée
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reference]);

  // Équivalent MGA pour un lien en devise étrangère
  function mgaEquivalent(displayAmount: number): number | null {
    if (!link || link.devise === 'MGA') return null;
    if (link.fxRate) return displayAmount * link.fxRate;
    return null;
  }

  function getLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function pay() {
    if (!link) return;
    const amt = link.openAmount ? Number(amount) : link.amount ?? 0;
    if (link.openAmount && (!amt || amt <= 0)) {
      setErr('Saisissez un montant');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let coords: { lat: number; lng: number } | null = null;
      if (link.requiresLocation) {
        coords = await getLocation();
        if (!coords) {
          setErr(
            'Localisation requise : autorisez la géolocalisation pour payer sur place.',
          );
          setBusy(false);
          return;
        }
      }

      const isCard = source !== 'WALLET';
      const payload = {
        amount: link.openAmount ? amt : undefined,
        idempotencyKey,
        lat: coords?.lat,
        lng: coords?.lng,
        source: (isCard ? 'CARD' : 'WALLET') as 'WALLET' | 'CARD',
        paymentMethodId: isCard ? source : undefined,
      };

      const res = await merchantApi.payPaymentLink(reference, payload);

      // 3DS : la carte nécessite une authentification
      if (res.data.requiresAction && res.data.clientSecret) {
        const stripe = await loadStripe(res.data.publishableKey || '');
        if (!stripe) {
          setErr('Authentification carte impossible (Stripe non chargé).');
          setBusy(false);
          return;
        }
        const { error } = await stripe.confirmCardPayment(res.data.clientSecret);
        if (error) {
          setErr(error.message || 'Authentification de la carte échouée');
          setBusy(false);
          return;
        }
        await merchantApi.confirmCardPaymentLink(reference, {
          paymentIntentId: res.data.paymentIntentId!,
          amount: link.openAmount ? amt : undefined,
          lat: coords?.lat,
          lng: coords?.lng,
          source: 'CARD',
          paymentMethodId: source,
        });
      }
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Échec du paiement');
    } finally {
      setBusy(false);
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="w-full max-w-sm bg-bg-surface border border-bg-border rounded-3xl p-6 shadow-xl">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={28} className="animate-spin text-brand-400" />
          <span className="text-sm text-ink-muted">Chargement…</span>
        </div>
      </Shell>
    );
  }

  if (notFound || !link) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <XCircle size={40} className="text-danger-400" />
          <h2 className="text-lg font-bold">Lien introuvable</h2>
          <p className="text-sm text-ink-muted">
            Ce lien de paiement n'existe pas ou a été supprimé.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-brand-300 hover:underline mt-2"
          >
            Retour à l'accueil
          </button>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 size={48} className="text-success-400" />
          <h2 className="text-lg font-bold">Paiement réussi</h2>
          <p className="text-sm text-ink-muted">
            Vous avez payé{' '}
            <span className="font-semibold text-ink-base">
              {link.devise === 'MGA'
                ? formatCurrency(
                    link.openAmount ? Number(amount) : link.amount ?? 0,
                  )
                : `${link.openAmount ? Number(amount) : link.amount} ${link.devise}`}
            </span>{' '}
            à {link.merchantName}.
          </p>
          <button
            onClick={() => navigate('/history')}
            className="mt-3 w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 text-sm font-semibold"
          >
            Voir mes transactions
          </button>
        </div>
      </Shell>
    );
  }

  const unavailable = link.status !== 'ACTIVE';

  return (
    <Shell>
      <div className="flex flex-col items-center text-center mb-5">
        {link.merchantLogo ? (
          <img
            src={link.merchantLogo}
            alt={link.merchantName}
            className="w-14 h-14 rounded-2xl object-cover mb-2"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-2">
            <Store size={24} />
          </div>
        )}
        <h2 className="text-base font-bold">{link.merchantName}</h2>
        {link.storeName && (
          <span className="text-xs text-ink-dim">{link.storeName}</span>
        )}
      </div>

      {link.label && (
        <div className="text-center text-sm font-medium mb-1">{link.label}</div>
      )}
      {link.description && (
        <p className="text-center text-xs text-ink-muted mb-4">
          {link.description}
        </p>
      )}

      {unavailable ? (
        <div className="text-center py-6">
          <Badge status={link.status} />
          <p className="text-sm text-ink-muted mt-3">
            Ce lien de paiement n'est plus disponible.
          </p>
        </div>
      ) : (
        <>
          {link.openAmount ? (
            <div className="mb-4">
              <label className="text-xs text-ink-muted mb-1 block">
                Montant à payer{link.devise !== 'MGA' ? ` (${link.devise})` : ''}
              </label>
              <input
                type="number"
                autoFocus
                className={INPUT}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {link.devise !== 'MGA' &&
                Number(amount) > 0 &&
                mgaEquivalent(Number(amount)) != null && (
                  <div className="text-[11px] text-ink-dim mt-1">
                    ≈ {formatCurrency(mgaEquivalent(Number(amount)) as number)} prélevés
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center mb-5">
              {link.devise === 'MGA' ? (
                <div className="text-3xl font-bold">
                  {formatCurrency(link.amount ?? 0)}
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {link.amount} {link.devise}
                  </div>
                  {link.mgaAmount != null && (
                    <div className="text-xs text-ink-muted mt-1">
                      ≈ {formatCurrency(link.mgaAmount)} prélevés
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Source de paiement */}
          <div className="mb-4">
            <label className="text-xs text-ink-muted mb-1.5 block">
              Payer avec
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSource('WALLET')}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                  source === 'WALLET'
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-bg-border bg-bg-elevated'
                }`}
              >
                <Wallet size={18} className="text-brand-300" />
                <span className="text-sm flex-1">Mon solde M'Paye</span>
                {source === 'WALLET' && (
                  <CheckCircle2 size={16} className="text-brand-300" />
                )}
              </button>
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSource(c.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                    source === c.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-bg-border bg-bg-elevated'
                  }`}
                >
                  <CreditCard size={18} className="text-ink-muted" />
                  <span className="text-sm flex-1">
                    {c.brand?.toUpperCase()} •••• {c.last4}
                  </span>
                  {source === c.id && (
                    <CheckCircle2 size={16} className="text-brand-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <div className="text-xs text-danger-400 bg-danger-bg rounded-lg p-2 mb-3 text-center">
              {err}
            </div>
          )}

          <button
            onClick={pay}
            disabled={busy}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            {busy ? 'Paiement…' : 'Payer maintenant'}
          </button>
          {link.requiresLocation && (
            <p className="text-[11px] text-ink-dim text-center mt-3">
              📍 Paiement sur place : votre position sera vérifiée.
            </p>
          )}
          <p className="text-[11px] text-ink-dim text-center mt-3">
            Paiement sécurisé depuis votre portefeuille M'Paye.
          </p>
        </>
      )}
    </Shell>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PAID: { label: 'Déjà payé', cls: 'bg-brand-500/15 text-brand-300' },
    EXPIRED: { label: 'Expiré', cls: 'bg-warning-500/15 text-warning-400' },
    CANCELLED: { label: 'Annulé', cls: 'bg-danger-500/15 text-danger-400' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-bg-elevated' };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs ${s.cls}`}>
      {s.label}
    </span>
  );
}
