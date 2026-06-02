import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link2,
  Plus,
  Copy,
  Check,
  X,
  Ban,
  ExternalLink,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type PaymentLink,
  type PaymentLinkDetail,
  type PaymentLinkStatus,
  type Store,
} from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

const STATUS: Record<PaymentLinkStatus, { tone: any; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Actif' },
  PAID: { tone: 'brand', label: 'Payé' },
  EXPIRED: { tone: 'warning', label: 'Expiré' },
  CANCELLED: { tone: 'danger', label: 'Annulé' },
};

export default function MerchantPaymentLinks() {
  const { formatCurrency } = useLocale();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<string[]>(['MGA']);
  const [stores, setStores] = useState<Store[]>([]);

  // Création
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    label: string;
    description: string;
    amount: string;
    currency: string;
    storeId: string;
    reusable: boolean;
    expiresAt: string;
  }>({
    label: '',
    description: '',
    amount: '',
    currency: 'MGA',
    storeId: '',
    reusable: false,
    expiresAt: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Détail / partage
  const [detail, setDetail] = useState<PaymentLinkDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await merchantApi.listPaymentLinks();
      setLinks(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    merchantApi
      .getFxCurrencies()
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length) setCurrencies(r.data);
      })
      .catch(() => {});
    merchantApi
      .getStores()
      .then((r) => setStores(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  // Affichage du montant dans la devise du lien (MGA formaté, sinon "X EUR")
  const amountLabel = (l: PaymentLink) =>
    l.openAmount
      ? 'Montant libre'
      : l.devise === 'MGA'
        ? formatCurrency(l.amount ?? 0)
        : `${l.amount} ${l.devise}`;

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const amt = form.amount.trim() === '' ? undefined : Number(form.amount);
      if (amt != null && (Number.isNaN(amt) || amt <= 0)) {
        setErr('Montant invalide');
        setBusy(false);
        return;
      }
      await merchantApi.createPaymentLink({
        label: form.label || undefined,
        description: form.description || undefined,
        amount: amt,
        currency: form.currency || 'MGA',
        storeId: form.storeId || undefined,
        reusable: form.reusable,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
      });
      setShowForm(false);
      setForm({
        label: '',
        description: '',
        amount: '',
        currency: 'MGA',
        storeId: '',
        reusable: false,
        expiresAt: '',
      });
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Échec de la création');
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setCopied(false);
    try {
      const r = await merchantApi.getPaymentLink(id);
      setDetail(r.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm('Annuler ce lien de paiement ?')) return;
    await merchantApi.cancelPaymentLink(id);
    setDetail(null);
    load();
  }

  function copy(url: string) {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Liens de paiement"
        subtitle="Encaissez à distance via un lien ou un QR partageable"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setErr(null);
              setShowForm(true);
            }}
          >
            Nouveau lien
          </Button>
        }
      />

      <Card padding="none">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="p-10 text-center">
            <Link2 size={32} className="mx-auto text-ink-dim mb-2" />
            <div className="text-sm text-ink-muted">
              Aucun lien de paiement. Créez-en un pour encaisser à distance.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {links.map((l) => {
              const st = STATUS[l.status];
              return (
                <button
                  key={l.id}
                  onClick={() => openDetail(l.id)}
                  className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-bg-subtle transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
                    <Link2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {l.label || 'Lien de paiement'}
                    </div>
                    <div className="text-[11px] text-ink-dim">
                      {amountLabel(l)}
                      {l.reusable ? ' · réutilisable' : ''}
                      {l.paidCount > 0 ? ` · ${l.paidCount} paiement(s)` : ''}
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal création */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => !busy && setShowForm(false)}
        >
          <Card
            padding="md"
            className="w-full max-w-md my-8"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Nouveau lien de paiement</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                className={INPUT}
                placeholder="Libellé (ex: Facture #1024)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              <textarea
                className={INPUT}
                placeholder="Description (optionnel)"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-ink-muted mb-1 block">
                    Montant (vide = libre)
                  </label>
                  <input
                    type="number"
                    className={INPUT}
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Devise
                  </label>
                  <select
                    className={INPUT}
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {form.currency !== 'MGA' && (
                <div className="text-[11px] text-ink-dim">
                  Le client paiera l'équivalent en Ariary (MGA) au taux du jour ;
                  vous êtes réglé en MGA.
                </div>
              )}
              {stores.length > 0 && (
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Boutique (optionnel)
                  </label>
                  <select
                    className={INPUT}
                    value={form.storeId}
                    onChange={(e) =>
                      setForm({ ...form, storeId: e.target.value })
                    }
                  >
                    <option value="">Aucune</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.geofenceEnabled ? ' (sur place)' : ''}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const sel = stores.find((s) => s.id === form.storeId);
                    return sel?.geofenceEnabled ? (
                      <div className="text-[11px] text-ink-dim mt-1">
                        Paiement restreint aux clients présents à {sel.name}{' '}
                        (rayon {sel.geofenceRadius ?? 200} m).
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Expiration (optionnel)
                </label>
                <input
                  type="datetime-local"
                  className={INPUT}
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm({ ...form, expiresAt: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.reusable}
                  onChange={(e) =>
                    setForm({ ...form, reusable: e.target.checked })
                  }
                />
                Réutilisable (plusieurs paiements)
              </label>
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
                onClick={create}
              >
                Créer le lien
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal détail / partage */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => setDetail(null)}
        >
          <Card
            padding="md"
            className="w-full max-w-md my-8"
            onClick={(e: any) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold">
                    {detail.label || 'Lien de paiement'}
                  </h3>
                  <button
                    onClick={() => setDetail(null)}
                    className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-2xl">
                    <QRCodeSVG value={detail.payUrl} size={168} />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {amountLabel(detail)}
                    </div>
                    {detail.devise !== 'MGA' && (
                      <div className="text-[11px] text-ink-dim mb-1">
                        réglé en Ariary au taux du jour
                      </div>
                    )}
                    <Badge tone={STATUS[detail.status].tone}>
                      {STATUS[detail.status].label}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    readOnly
                    className={INPUT + ' flex-1 text-xs'}
                    value={detail.payUrl}
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    icon={copied ? Check : Copy}
                    onClick={() => copy(detail.payUrl)}
                  >
                    {copied ? 'Copié' : 'Copier'}
                  </Button>
                </div>

                <a
                  href={detail.payUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-300 hover:underline"
                >
                  <ExternalLink size={13} /> Ouvrir la page de paiement
                </a>

                {detail.payments.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-ink-muted mb-1">
                      Paiements reçus ({detail.paidCount}) ·{' '}
                      {formatCurrency(detail.totalCollected)}
                    </div>
                    <div className="divide-y divide-bg-border max-h-40 overflow-auto">
                      {detail.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span className="text-ink-dim text-[11px]">
                            {new Date(p.date).toLocaleString('fr-FR')}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(detail.status === 'ACTIVE' || detail.status === 'EXPIRED') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Ban}
                    className="mt-4 text-danger-400"
                    onClick={() => cancel(detail.id)}
                  >
                    Annuler le lien
                  </Button>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
