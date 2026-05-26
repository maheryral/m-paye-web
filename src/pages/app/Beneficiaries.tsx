import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { beneficiaryService } from '../../services/api';

interface Beneficiary {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isFavorite: boolean;
  lastAmount?: number;
  lastDate?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatPhone(phone: string) {
  const c = phone.replace(/\s/g, '');
  if (c.length === 10) {
    return `${c.slice(0, 2)} ${c.slice(2, 4)} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8, 10)}`;
  }
  return phone;
}

export default function Beneficiaries() {
  const navigate = useNavigate();
  const colors = useColors();
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await beneficiaryService.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Erreur chargement bénéficiaires:', e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'Impossible de charger les bénéficiaires');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Le nom est requis';
    if (!formData.phone.trim()) errors.phone = 'Le numéro de téléphone est requis';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalide';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '' });
    setFormErrors({});
    setEditing(null);
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        const updated = await beneficiaryService.update(editing.id, {
          name: formData.name.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          email: formData.email?.trim() || undefined,
        });
        setItems((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const created = await beneficiaryService.create({
          name: formData.name.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          email: formData.email?.trim() || undefined,
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

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce bénéficiaire ?')) return;
    try {
      await beneficiaryService.remove(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur suppression');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const updated = await beneficiaryService.toggleFavorite(id);
      setItems((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Action impossible');
    }
  };

  const openEdit = (b: Beneficiary) => {
    setEditing(b);
    setFormData({ name: b.name, phone: b.phone, email: b.email || '' });
    setShowModal(true);
  };

  const filtered = useMemo(
    () =>
      items.filter((b) => {
        const q = searchTerm.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.phone.includes(searchTerm) ||
          (b.email && b.email.toLowerCase().includes(q))
        );
      }),
    [items, searchTerm],
  );

  const isRecent = (b: Beneficiary) =>
    !!b.lastDate && Date.now() - new Date(b.lastDate).getTime() < SEVEN_DAYS_MS;
  const favorites = filtered.filter((b) => b.isFavorite);
  const recents = filtered.filter((b) => isRecent(b) && !b.isFavorite);
  const others = filtered.filter((b) => !b.isFavorite && !isRecent(b));

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Bénéficiaires"
          subtitle={`${items.length} contact${items.length > 1 ? 's' : ''}`}
          RightIcon={Plus}
          onRightPress={() => {
            resetForm();
            setShowModal(true);
          }}
        />

        <div className="px-5 mt-4 space-y-4">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 h-11 rounded-xl border"
            style={{ borderColor: colors.border, background: colors.card }}
          >
            <Search size={20} style={{ color: colors.textSecondary }} />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.text }}
              placeholder="Rechercher par nom, téléphone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}>
                <X size={18} style={{ color: colors.textSecondary }} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users size={64} style={{ color: colors.textSecondary }} />
              <div className="text-base" style={{ color: colors.textSecondary }}>
                Aucun bénéficiaire
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="mt-2 px-4 py-2 rounded-xl font-semibold text-white text-sm"
                style={{ background: colors.primary }}
              >
                Ajouter un bénéficiaire
              </button>
            </div>
          ) : (
            <>
              {favorites.length > 0 && (
                <BeneficiarySection
                  title="Favoris"
                  list={favorites}
                  onSend={(b) => navigate(`/transfers?toPhone=${b.phone}`)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
              {recents.length > 0 && (
                <BeneficiarySection
                  title="Récents"
                  list={recents}
                  onSend={(b) => navigate(`/transfers?toPhone=${b.phone}`)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
              {others.length > 0 && (
                <BeneficiarySection
                  title="Tous les bénéficiaires"
                  list={others}
                  onSend={(b) => navigate(`/transfers?toPhone=${b.phone}`)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center"
          onClick={resetForm}
        >
          <div
            className="w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-3xl p-6 space-y-4"
            style={{ background: colors.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                {editing ? 'Modifier le bénéficiaire' : 'Ajouter un bénéficiaire'}
              </h3>
              <button onClick={resetForm}>
                <X size={24} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <FormField
              label="Nom complet"
              value={formData.name}
              onChange={(v) => setFormData((f) => ({ ...f, name: v }))}
              error={formErrors.name}
              colors={colors}
            />
            <FormField
              label="Téléphone"
              value={formData.phone}
              onChange={(v) => setFormData((f) => ({ ...f, phone: v }))}
              error={formErrors.phone}
              colors={colors}
              type="tel"
            />
            <FormField
              label="Email (optionnel)"
              value={formData.email}
              onChange={(v) => setFormData((f) => ({ ...f, email: v }))}
              error={formErrors.email}
              colors={colors}
              type="email"
            />

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
              style={{ background: colors.primary, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : editing ? (
                'Enregistrer'
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  error,
  colors,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  colors: any;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <input
        type={type}
        className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{
          color: colors.text,
          borderColor: error ? '#ef4444' : colors.border,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
    </div>
  );
}

function BeneficiarySection({
  title,
  list,
  onSend,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  title: string;
  list: Beneficiary[];
  onSend: (b: Beneficiary) => void;
  onEdit: (b: Beneficiary) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <section>
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-2"
        style={{ color: colors.textSecondary }}
      >
        {title}
      </h3>
      <div className="space-y-2">
        {list.map((item) => (
          <div key={item.id} className="card p-3.5">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                style={{ background: colors.primary }}
              >
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                    {item.name}
                  </div>
                  <button onClick={() => onToggleFavorite(item.id)} className="shrink-0">
                    <Star
                      size={16}
                      style={{
                        color: item.isFavorite ? '#f59e0b' : colors.textSecondary,
                        fill: item.isFavorite ? '#f59e0b' : 'none',
                      }}
                    />
                  </button>
                </div>
                <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {formatPhone(item.phone)}
                </div>
                {item.email && (
                  <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                    {item.email}
                  </div>
                )}
                {item.lastAmount && (
                  <div className="text-xs mt-1" style={{ color: colors.success }}>
                    Dernier transfert : {item.lastAmount.toLocaleString('fr-FR')} Ar
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onSend(item)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-xs font-semibold"
                style={{ background: colors.primary }}
              >
                <Send size={14} />
                Envoyer
              </button>
              <button
                onClick={() => onEdit(item)}
                className="w-10 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${colors.textSecondary}20`, color: colors.text }}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="w-10 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${colors.error}20`, color: colors.error }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
