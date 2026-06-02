import { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { merchantApi, type Product } from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const EMPTY: Partial<Product> = {
  name: '',
  sku: '',
  category: '',
  price: 0,
  trackStock: false,
  stockQuantity: 0,
  lowStockAlert: 5,
  isActive: true,
};

export default function MerchantProducts() {
  const { formatCurrency } = useLocale();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await merchantApi.listProducts();
      setItems(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErr(null);
    setShowForm(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ ...p });
    setErr(null);
    setShowForm(true);
  }

  async function save() {
    if (!form.name || !form.price) {
      setErr('Nom et prix obligatoires');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity || 0),
        lowStockAlert: Number(form.lowStockAlert || 0),
      };
      if (editing) await merchantApi.updateProduct(editing.id, payload);
      else await merchantApi.createProduct(payload);
      setShowForm(false);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    await merchantApi.deleteProduct(p.id);
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Produits"
        subtitle="Votre catalogue"
        actions={
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
            Nouveau produit
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Package size={36} className="mx-auto mb-2 text-ink-dim" />
          <div className="text-sm text-ink-muted">
            Aucun produit. Créez votre premier article.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => {
            const low =
              p.trackStock &&
              p.lowStockAlert != null &&
              p.stockQuantity <= p.lowStockAlert;
            return (
              <Card key={p.id} padding="md">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{p.name}</div>
                    {p.sku && (
                      <div className="text-[11px] text-ink-dim font-mono">
                        {p.sku}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="p-1.5 rounded-lg hover:bg-danger-bg text-ink-muted hover:text-danger-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xl font-bold mt-2">
                  {formatCurrency(p.price)}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {!p.isActive && <Badge tone="neutral">Inactif</Badge>}
                  {p.category && <Badge tone="brand">{p.category}</Badge>}
                  {p.trackStock && (
                    <Badge tone={low ? 'danger' : 'success'}>
                      Stock : {p.stockQuantity}
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal form */}
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
              <h3 className="text-base font-bold">
                {editing ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Nom *">
                <input
                  className="w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  value={form.name ?? ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prix (Ar) *">
                  <input
                    type="number"
                    className="w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    value={form.price ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="SKU">
                  <input
                    className="w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    value={form.sku ?? ''}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Catégorie">
                <input
                  className="w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  value={form.category ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.trackStock}
                  onChange={(e) =>
                    setForm({ ...form, trackStock: e.target.checked })
                  }
                />
                Gérer le stock
              </label>
              {form.trackStock && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantité">
                    <input
                      type="number"
                      className="w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                      value={form.stockQuantity ?? 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stockQuantity: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Alerte stock bas">
                    <input
                      type="number"
                      className="w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                      value={form.lowStockAlert ?? 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lowStockAlert: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                Actif (visible à la vente)
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
                onClick={save}
              >
                {editing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-ink-muted mb-1 block">{label}</label>
      {children}
    </div>
  );
}
