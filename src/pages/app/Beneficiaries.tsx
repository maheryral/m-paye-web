import {
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { beneficiaryService } from '../../services/api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  PageHeader,
  Skeleton,
} from '../../ui';

interface Beneficiary {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isFavorite: boolean;
  lastAmount?: number;
  lastDate?: string;
}

type View = 'all' | 'favorites' | 'recent';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function formatPhone(phone: string) {
  const c = phone.replace(/\s/g, '');
  if (c.length === 10) {
    return `${c.slice(0, 2)} ${c.slice(2, 4)} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8, 10)}`;
  }
  return phone;
}

export default function Beneficiaries() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('all');

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await beneficiaryService.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Erreur:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Le nom est requis';
    if (!form.phone.trim()) e.phone = 'Le numéro est requis';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email invalide';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '' });
    setErrors({});
    setEditing(null);
    setPanelOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setPanelOpen(true);
  };

  const openEdit = (b: Beneficiary) => {
    setEditing(b);
    setForm({ name: b.name, phone: b.phone, email: b.email || '' });
    setErrors({});
    setPanelOpen(true);
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        const updated = await beneficiaryService.update(editing.id, {
          name: form.name.trim(),
          phone: form.phone.replace(/\s/g, ''),
          email: form.email?.trim() || undefined,
        });
        setItems((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const created = await beneficiaryService.create({
          name: form.name.trim(),
          phone: form.phone.replace(/\s/g, ''),
          email: form.email?.trim() || undefined,
        });
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce bénéficiaire ?')) return;
    try {
      await beneficiaryService.remove(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur');
    }
  };

  const toggleFav = async (id: string) => {
    try {
      const updated = await beneficiaryService.toggleFavorite(id);
      setItems((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch {
      /* */
    }
  };

  const isRecent = (b: Beneficiary) =>
    !!b.lastDate && Date.now() - new Date(b.lastDate).getTime() < SEVEN_DAYS;

  const filtered = useMemo(() => {
    let res = items;
    if (view === 'favorites') res = res.filter((b) => b.isFavorite);
    if (view === 'recent') res = res.filter(isRecent);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.phone.includes(search) ||
          (b.email && b.email.toLowerCase().includes(q)),
      );
    }
    return res;
  }, [items, view, search]);

  const counts = {
    all: items.length,
    favorites: items.filter((b) => b.isFavorite).length,
    recent: items.filter(isRecent).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bénéficiaires"
        subtitle="Vos destinataires sauvegardés pour des transferts rapides"
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
            Ajouter
          </Button>
        }
      />

      {/* Filter bar */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Rechercher par nom, téléphone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl shrink-0">
            {[
              { id: 'all' as View, label: 'Tous', count: counts.all },
              { id: 'favorites' as View, label: 'Favoris', count: counts.favorites },
              { id: 'recent' as View, label: 'Récents', count: counts.recent },
            ].map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {v.label}
                  {v.count > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded ${
                        active ? 'bg-white/25' : 'bg-bg-surface'
                      }`}
                    >
                      {v.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <Empty
            icon={Users}
            title={
              search || view !== 'all'
                ? 'Aucun résultat'
                : 'Aucun bénéficiaire'
            }
            description={
              search || view !== 'all'
                ? "Essayez d'ajuster vos filtres"
                : 'Ajoutez vos premiers contacts pour des transferts en un clic'
            }
            action={
              <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
                Ajouter un bénéficiaire
              </Button>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <BeneficiaryCard
              key={b.id}
              b={b}
              onSend={() => navigate(`/transfers?toPhone=${b.phone}`)}
              onEdit={() => openEdit(b)}
              onDelete={() => remove(b.id)}
              onToggleFav={() => toggleFav(b.id)}
            />
          ))}
        </div>
      )}

      {/* === Slide-over add/edit === */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={resetForm}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-surface border-l border-bg-border flex flex-col animate-slide-in shadow-elevated">
            <div className="p-5 border-b border-bg-border flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold">
                {editing ? 'Modifier' : 'Nouveau bénéficiaire'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 -mr-2 rounded-lg hover:bg-bg-subtle text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-bg-elevated">
                <Avatar name={form.name || '?'} size="lg" />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {form.name || 'Nom du bénéficiaire'}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {form.phone ? formatPhone(form.phone) : form.email || 'Aucun contact'}
                  </div>
                </div>
              </div>

              <Input
                label="Nom complet"
                icon={UserIcon}
                placeholder="Jean Dupont"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                error={errors.name}
                autoFocus
              />
              <Input
                label="Numéro de téléphone"
                icon={Phone}
                type="tel"
                placeholder="034 12 345 67"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                error={errors.phone}
              />
              <Input
                label="Email (optionnel)"
                icon={Mail}
                type="email"
                placeholder="jean@exemple.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                error={errors.email}
              />
            </div>

            <div className="p-4 border-t border-bg-border flex gap-2 shrink-0">
              <Button variant="secondary" size="md" fullWidth onClick={resetForm}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                onClick={submit}
              >
                {editing ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function BeneficiaryCard({
  b,
  onSend,
  onEdit,
  onDelete,
  onToggleFav,
}: {
  b: Beneficiary;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card padding="md" className="group relative">
      {/* Top: avatar + actions */}
      <div className="flex items-start justify-between mb-3">
        <Avatar name={b.name} size="lg" />
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFav}
            className={`p-1.5 rounded-lg transition-colors ${
              b.isFavorite
                ? 'text-warning-400 bg-warning-bg'
                : 'text-ink-muted hover:text-warning-400 hover:bg-warning-bg'
            }`}
            aria-label="Favori"
          >
            <Star
              size={16}
              fill={b.isFavorite ? 'currentColor' : 'none'}
            />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-bg-subtle"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 card shadow-elevated z-20 p-1 animate-slide-in">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-bg-subtle text-left"
                  >
                    <Pencil size={14} />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-danger-400 hover:bg-danger-bg text-left"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 mb-3">
        <div className="text-sm font-bold truncate">{b.name}</div>
        <div className="text-xs text-ink-muted truncate flex items-center gap-1.5 mt-1">
          <Phone size={11} />
          {formatPhone(b.phone)}
        </div>
        {b.email && (
          <div className="text-xs text-ink-muted truncate flex items-center gap-1.5 mt-0.5">
            <Mail size={11} />
            {b.email}
          </div>
        )}
        {b.lastAmount && (
          <Badge tone="success" className="mt-2.5">
            Dernier: {b.lastAmount.toLocaleString('fr-FR')} Ar
          </Badge>
        )}
      </div>

      {/* CTA */}
      <Button variant="primary" size="sm" fullWidth icon={Send} onClick={onSend}>
        Envoyer
      </Button>
    </Card>
  );
}
