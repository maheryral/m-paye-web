import { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, X, Power } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { merchantApi, type Coupon } from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export default function MerchantCoupons() {
  const { formatCurrency } = useLocale();
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Coupon>>({
    discountType: 'PERCENTAGE',
    discountValue: 10,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await merchantApi.getCoupons();
      setItems(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ discountType: 'PERCENTAGE', discountValue: 10 });
    setErr(null);
    setShowForm(true);
  }

  async function save() {
    if (!form.code || !form.discountValue) {
      setErr('Code et valeur obligatoires');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await merchantApi.createCoupon({
        ...form,
        code: form.code!.toUpperCase(),
        discountValue: Number(form.discountValue),
        minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: Coupon) {
    await merchantApi.toggleCoupon(c.id, !c.isActive);
    load();
  }
  async function remove(c: Coupon) {
    if (!confirm(`Supprimer le coupon ${c.code} ?`)) return;
    await merchantApi.deleteCoupon(c.id);
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coupons"
        subtitle="Codes promotionnels"
        actions={
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
            Nouveau coupon
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Ticket size={36} className="mx-auto mb-2 text-ink-dim" />
          <div className="text-sm text-ink-muted">Aucun coupon</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <Card key={c.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-brand-300 text-lg truncate">
                    {c.code}
                  </div>
                  {c.name && (
                    <div className="text-xs text-ink-muted truncate">
                      {c.name}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggle(c)}
                    className={`p-1.5 rounded-lg hover:bg-bg-subtle ${
                      c.isActive ? 'text-success-400' : 'text-ink-dim'
                    }`}
                    title={c.isActive ? 'Désactiver' : 'Activer'}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="p-1.5 rounded-lg hover:bg-danger-bg text-ink-muted hover:text-danger-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-xl font-bold mt-2">
                {c.discountType === 'PERCENTAGE'
                  ? `-${c.discountValue}%`
                  : `-${formatCurrency(c.discountValue)}`}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone={c.isActive ? 'success' : 'neutral'}>
                  {c.isActive ? 'Actif' : 'Inactif'}
                </Badge>
                {c.usageLimit != null && (
                  <Badge tone="brand">
                    {c.usedCount}/{c.usageLimit} utilisés
                  </Badge>
                )}
                {c.minPurchase != null && c.minPurchase > 0 && (
                  <span className="text-[11px] text-ink-dim">
                    min {formatCurrency(c.minPurchase)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => !busy && setShowForm(false)}
        >
          <Card
            padding="md"
            className="w-full max-w-lg my-8"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Nouveau coupon</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                className={`${INPUT} font-mono uppercase`}
                placeholder="CODE (ex: PROMO10)"
                value={form.code ?? ''}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
              />
              <input
                className={INPUT}
                placeholder="Nom / description"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className={INPUT}
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountType: e.target.value as 'PERCENTAGE' | 'FIXED',
                    })
                  }
                >
                  <option value="PERCENTAGE">Pourcentage (%)</option>
                  <option value="FIXED">Montant fixe (Ar)</option>
                </select>
                <input
                  type="number"
                  className={INPUT}
                  placeholder="Valeur"
                  value={form.discountValue ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, discountValue: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  className={INPUT}
                  placeholder="Achat min (optionnel)"
                  value={form.minPurchase ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, minPurchase: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  className={INPUT}
                  placeholder="Limite d'usage (optionnel)"
                  value={form.usageLimit ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, usageLimit: Number(e.target.value) })
                  }
                />
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
                onClick={save}
              >
                Créer le coupon
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
