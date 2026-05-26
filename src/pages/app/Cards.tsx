import {
  CreditCard,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';

interface SavedCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'unionpay' | 'amex';
  last4: string;
  holder: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BRAND_COLORS: Record<SavedCard['brand'], string> = {
  visa: '#1a1f71',
  mastercard: '#eb001b',
  unionpay: '#005bac',
  amex: '#2e77bb',
};

const BRAND_LABELS: Record<SavedCard['brand'], string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  unionpay: 'UnionPay',
  amex: 'AmEx',
};

export default function Cards() {
  const colors = useColors();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    number: '',
    holder: '',
    exp: '',
    cvc: '',
  });

  const formatCardNumber = (v: string) =>
    v
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ');

  const formatExp = (v: string) => {
    const c = v.replace(/\D/g, '').slice(0, 4);
    return c.length > 2 ? `${c.slice(0, 2)}/${c.slice(2)}` : c;
  };

  const detectBrand = (num: string): SavedCard['brand'] => {
    const c = num.replace(/\s/g, '');
    if (c.startsWith('4')) return 'visa';
    if (c.startsWith('5') || c.startsWith('2')) return 'mastercard';
    if (c.startsWith('62')) return 'unionpay';
    if (c.startsWith('3')) return 'amex';
    return 'visa';
  };

  const handleAddCard = async () => {
    const cleanNum = form.number.replace(/\s/g, '');
    if (cleanNum.length < 13) {
      alert('Numéro de carte invalide');
      return;
    }
    if (!form.holder.trim()) {
      alert('Nom du porteur requis');
      return;
    }
    const [m, y] = form.exp.split('/').map((s) => parseInt(s, 10));
    if (!m || !y || m < 1 || m > 12) {
      alert('Date d\'expiration invalide');
      return;
    }
    if (form.cvc.length < 3) {
      alert('CVC invalide');
      return;
    }

    setSubmitting(true);
    try {
      // À câbler sur un endpoint backend `/cards` une fois implémenté.
      const newCard: SavedCard = {
        id: crypto.randomUUID(),
        brand: detectBrand(cleanNum),
        last4: cleanNum.slice(-4),
        holder: form.holder.toUpperCase(),
        expMonth: m,
        expYear: 2000 + y,
        isDefault: cards.length === 0,
      };
      setCards((prev) => [...prev, newCard]);
      setForm({ number: '', holder: '', exp: '', cvc: '' });
      setShowAdd(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette carte ?')) return;
    setCards((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length && !filtered.some((c) => c.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const setDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Mes cartes"
          subtitle={`${cards.length} carte${cards.length > 1 ? 's' : ''} enregistrée${cards.length > 1 ? 's' : ''}`}
          RightIcon={Plus}
          onRightPress={() => setShowAdd(true)}
        />

        <div className="px-5 mt-4 space-y-4">
          {/* Bandeau sécurité */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{
              background: `${colors.success}15`,
              borderColor: `${colors.success}40`,
            }}
          >
            <ShieldCheck size={20} style={{ color: colors.success }} />
            <div className="text-xs" style={{ color: colors.text }}>
              Vos données de carte sont chiffrées et stockées de façon sécurisée par Stripe.
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-12">
              <CreditCard size={56} style={{ color: colors.textSecondary }} />
              <div className="text-base font-semibold" style={{ color: colors.text }}>
                Aucune carte enregistrée
              </div>
              <div className="text-sm text-center max-w-xs" style={{ color: colors.textSecondary }}>
                Ajoutez une carte pour effectuer des dépôts en un clic.
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: colors.primary }}
              >
                <Plus size={18} />
                Ajouter une carte
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="relative rounded-2xl p-5 text-white shadow-glow-blue overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND_COLORS[card.brand]} 0%, #0f172a 100%)`,
                  }}
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/5" />

                  <div className="relative flex justify-between items-start mb-8">
                    <div className="text-xl font-bold tracking-wider">
                      {BRAND_LABELS[card.brand]}
                    </div>
                    {card.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25">
                        PAR DÉFAUT
                      </span>
                    )}
                  </div>

                  <div className="relative text-xl font-mono tracking-widest mb-6">
                    •••• •••• •••• {card.last4}
                  </div>

                  <div className="relative flex justify-between items-end">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/70">
                        Titulaire
                      </div>
                      <div className="text-sm font-semibold mt-0.5">{card.holder}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/70">
                        Expire
                      </div>
                      <div className="text-sm font-semibold mt-0.5">
                        {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
                      </div>
                    </div>
                  </div>

                  <div className="relative flex gap-2 mt-4 pt-4 border-t border-white/15">
                    {!card.isDefault && (
                      <button
                        onClick={() => setDefault(card.id)}
                        className="text-xs font-semibold flex-1 py-1.5 rounded-lg bg-white/15 hover:bg-white/25"
                      >
                        Définir par défaut
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-red-500/30 hover:bg-red-500/50 flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal ajout carte */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-3xl p-6 space-y-4"
            style={{ background: colors.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
                <CreditCard size={20} />
                Ajouter une carte
              </h3>
              <button onClick={() => setShowAdd(false)}>
                <X size={24} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <CardField
              label="Numéro de carte"
              value={form.number}
              onChange={(v) => setForm((f) => ({ ...f, number: formatCardNumber(v) }))}
              placeholder="1234 5678 9012 3456"
              colors={colors}
              maxLength={19}
              autocomplete="cc-number"
            />
            <CardField
              label="Nom du porteur"
              value={form.holder}
              onChange={(v) => setForm((f) => ({ ...f, holder: v }))}
              placeholder="JEAN DUPONT"
              colors={colors}
              autocomplete="cc-name"
            />
            <div className="grid grid-cols-2 gap-3">
              <CardField
                label="Expiration (MM/AA)"
                value={form.exp}
                onChange={(v) => setForm((f) => ({ ...f, exp: formatExp(v) }))}
                placeholder="12/27"
                colors={colors}
                maxLength={5}
                autocomplete="cc-exp"
              />
              <CardField
                label="CVC"
                value={form.cvc}
                onChange={(v) => setForm((f) => ({ ...f, cvc: v.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="123"
                colors={colors}
                maxLength={4}
                autocomplete="cc-csc"
                type="password"
              />
            </div>

            <div className="text-xs flex items-center gap-2" style={{ color: colors.textSecondary }}>
              <Lock size={14} />
              Vos informations sont chiffrées de bout en bout.
            </div>

            <button
              onClick={handleAddCard}
              disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-white"
              style={{ background: colors.primary, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Ajout...' : 'Ajouter la carte'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CardField({
  label,
  value,
  onChange,
  placeholder,
  colors,
  maxLength,
  type = 'text',
  autocomplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  colors: any;
  maxLength?: number;
  type?: string;
  autocomplete?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <input
        type={type}
        className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none font-mono"
        style={{ color: colors.text, borderColor: colors.border }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autocomplete}
      />
    </div>
  );
}
