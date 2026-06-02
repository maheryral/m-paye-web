import { useEffect, useState } from 'react';
import {
  Store as StoreIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  MapPin,
  LocateFixed,
  ShieldCheck,
} from 'lucide-react';
import { merchantApi, type Store } from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export default function MerchantStores() {
  const [items, setItems] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState<Partial<Store>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await merchantApi.getStores();
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
    setForm({});
    setErr(null);
    setShowForm(true);
  }
  function openEdit(s: Store) {
    setEditing(s);
    setForm({ ...s });
    setErr(null);
    setShowForm(true);
  }

  async function save() {
    if (!form.name || !form.address || !form.phone) {
      setErr('Nom, adresse et téléphone obligatoires');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (editing) await merchantApi.updateStore(editing.id, form);
      else
        await merchantApi.createStore({
          name: form.name!,
          address: form.address!,
          phone: form.phone!,
          city: form.city,
          latitude: form.latitude,
          longitude: form.longitude,
          geofenceEnabled: form.geofenceEnabled,
          geofenceRadius: form.geofenceRadius,
        });
      setShowForm(false);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Store) {
    if (!confirm(`Supprimer la boutique "${s.name}" ?`)) return;
    await merchantApi.deleteStore(s.id);
    load();
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setErr('Géolocalisation indisponible sur ce navigateur');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
        })),
      () => setErr('Impossible de récupérer votre position'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Boutiques"
        subtitle="Vos points de vente"
        actions={
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
            Nouvelle boutique
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <StoreIcon size={36} className="mx-auto mb-2 text-ink-dim" />
          <div className="text-sm text-ink-muted">Aucune boutique</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((s) => (
            <Card key={s.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
                    <StoreIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{s.name}</div>
                    <div className="text-xs text-ink-muted flex items-center gap-1">
                      <MapPin size={11} /> {s.address}
                      {s.city ? `, ${s.city}` : ''}
                    </div>
                    <div className="text-xs text-ink-dim">{s.phone}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="p-1.5 rounded-lg hover:bg-danger-bg text-ink-muted hover:text-danger-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={s.isActive ? 'success' : 'neutral'}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {s.geofenceEnabled && (
                  <Badge tone="brand">
                    <MapPin size={10} /> Sur place {s.geofenceRadius ?? 200}m
                  </Badge>
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
              <h3 className="text-base font-bold">
                {editing ? 'Modifier la boutique' : 'Nouvelle boutique'}
              </h3>
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
                placeholder="Nom de la boutique *"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Adresse *"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={INPUT}
                  placeholder="Ville"
                  value={form.city ?? ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <input
                  className={INPUT}
                  placeholder="Téléphone *"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              {/* Geofencing */}
              <div className="border-t border-bg-border pt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-300" />
                  <span className="text-sm font-semibold">
                    Paiement sur place (geofencing)
                  </span>
                </div>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">
                    Exiger la présence du client pour les liens de cette boutique
                  </span>
                  <input
                    type="checkbox"
                    checked={!!form.geofenceEnabled}
                    onChange={(e) =>
                      setForm({ ...form, geofenceEnabled: e.target.checked })
                    }
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className={INPUT}
                    type="number"
                    step="0.0000001"
                    placeholder="Latitude"
                    value={form.latitude ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        latitude:
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                  <input
                    className={INPUT}
                    type="number"
                    step="0.0000001"
                    placeholder="Longitude"
                    value={form.longitude ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        longitude:
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={LocateFixed}
                    onClick={useMyLocation}
                    type="button"
                  >
                    Utiliser ma position
                  </Button>
                  <input
                    className={INPUT + ' flex-1'}
                    type="number"
                    placeholder="Rayon (m)"
                    value={form.geofenceRadius ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        geofenceRadius:
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>
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
                {editing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
