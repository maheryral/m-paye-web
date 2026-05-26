import {
  Check,
  CreditCard,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Empty, Input, PageHeader } from '../../ui';

interface SavedCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'unionpay' | 'amex';
  last4: string;
  holder: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BRAND_THEMES: Record<SavedCard['brand'], { name: string; gradient: string }> = {
  visa: { name: 'VISA', gradient: 'from-indigo-900 via-indigo-700 to-blue-600' },
  mastercard: { name: 'Mastercard', gradient: 'from-rose-900 via-orange-700 to-amber-500' },
  unionpay: { name: 'UnionPay', gradient: 'from-blue-900 via-cyan-700 to-cyan-500' },
  amex: { name: 'Amex', gradient: 'from-slate-800 via-slate-600 to-cyan-500' },
};

function detectBrand(num: string): SavedCard['brand'] {
  const c = num.replace(/\s/g, '');
  if (c.startsWith('4')) return 'visa';
  if (c.startsWith('5') || c.startsWith('2')) return 'mastercard';
  if (c.startsWith('62')) return 'unionpay';
  if (c.startsWith('3')) return 'amex';
  return 'visa';
}

export default function Cards() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ number: '', holder: '', exp: '', cvc: '' });

  const formatNum = (v: string) =>
    v
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ');
  const formatExp = (v: string) => {
    const c = v.replace(/\D/g, '').slice(0, 4);
    return c.length > 2 ? `${c.slice(0, 2)}/${c.slice(2)}` : c;
  };

  const previewBrand = form.number ? detectBrand(form.number) : 'visa';

  const handleAdd = async () => {
    const cleanNum = form.number.replace(/\s/g, '');
    if (cleanNum.length < 13) return alert('Numéro de carte invalide');
    if (!form.holder.trim()) return alert('Nom du porteur requis');
    const [m, y] = form.exp.split('/').map((s) => parseInt(s, 10));
    if (!m || !y || m < 1 || m > 12) return alert("Date d'expiration invalide");
    if (form.cvc.length < 3) return alert('CVC invalide');

    setSubmitting(true);
    try {
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
      setAddOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette carte ?')) return;
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length && !next.some((c) => c.isDefault)) next[0].isDefault = true;
      return next;
    });
  };

  const setDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mes cartes"
        subtitle={
          cards.length
            ? `${cards.length} carte${cards.length > 1 ? 's' : ''} enregistrée${cards.length > 1 ? 's' : ''}`
            : 'Aucune carte pour le moment'
        }
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setAddOpen(true)}>
            Ajouter une carte
          </Button>
        }
      />

      {/* Security banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-success-bg border border-success-500/30">
        <div className="w-10 h-10 rounded-xl bg-success-500/20 flex items-center justify-center text-success-400 shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="text-sm font-bold text-success-400">Vos données sont protégées</div>
          <div className="text-xs text-ink-muted">
            Les numéros sont chiffrés et stockés via Stripe. M'Paye n'a jamais accès à votre CVC.
          </div>
        </div>
      </div>

      {/* Cards grid */}
      {cards.length === 0 ? (
        <Card padding="lg">
          <Empty
            icon={CreditCard}
            title="Aucune carte enregistrée"
            description="Ajoutez une carte pour effectuer des dépôts en un clic"
            action={
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setAddOpen(true)}>
                Ajouter ma première carte
              </Button>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const theme = BRAND_THEMES[c.brand];
            return (
              <div
                key={c.id}
                className={`relative rounded-3xl p-6 text-white overflow-hidden shadow-elevated bg-gradient-to-br ${theme.gradient}`}
              >
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.08]" />
                <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-white/[0.05]" />

                <div className="relative flex flex-col h-44 justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {c.isDefault ? 'Carte par défaut' : 'Carte secondaire'}
                      </div>
                      <div className="w-10 h-7 rounded-md bg-white/15 backdrop-blur-sm mt-2" />
                    </div>
                    <div className="text-lg font-bold">{theme.name}</div>
                  </div>

                  <div>
                    <div className="font-mono text-xl tracking-[0.3em]">
                      •••• {c.last4}
                    </div>
                    <div className="flex justify-between items-end mt-3">
                      <div>
                        <div className="text-[9px] uppercase opacity-70">Titulaire</div>
                        <div className="text-xs font-semibold mt-0.5 truncate max-w-[140px]">
                          {c.holder}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase opacity-70">Expire</div>
                        <div className="text-xs font-semibold mt-0.5">
                          {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative flex gap-1.5 mt-4 pt-4 border-t border-white/15">
                  {!c.isDefault && (
                    <button
                      onClick={() => setDefault(c.id)}
                      className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-white/15 hover:bg-white/25"
                    >
                      Par défaut
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-danger-500/40 text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add card tile */}
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-3xl p-6 h-[260px] border-2 border-dashed border-bg-border hover:border-brand-500 hover:bg-brand-500/5 transition-all flex flex-col items-center justify-center gap-3 text-ink-muted hover:text-brand-300"
          >
            <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center">
              <Plus size={24} />
            </div>
            <div className="text-sm font-bold">Ajouter une carte</div>
          </button>
        </div>
      )}

      {/* === Slide-over add ===  */}
      {addOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setAddOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-surface border-l border-bg-border flex flex-col animate-slide-in shadow-elevated">
            <div className="p-5 border-b border-bg-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-brand-300" />
                <h2 className="text-base font-bold">Ajouter une carte</h2>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-bg-subtle text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Card preview */}
              <div
                className={`relative rounded-3xl p-6 text-white overflow-hidden bg-gradient-to-br ${BRAND_THEMES[previewBrand].gradient}`}
              >
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.08]" />
                <div className="relative flex flex-col h-36 justify-between">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-7 rounded-md bg-white/15 backdrop-blur-sm" />
                    <div className="text-base font-bold">
                      {BRAND_THEMES[previewBrand].name}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-base tracking-[0.25em] truncate">
                      {form.number || '•••• •••• •••• ••••'}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider opacity-80">
                      <span>{form.holder || 'NOM DU PORTEUR'}</span>
                      <span>{form.exp || 'MM/AA'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Numéro de carte"
                  placeholder="1234 5678 9012 3456"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: formatNum(e.target.value) }))}
                  maxLength={19}
                  autoComplete="cc-number"
                  className="font-mono"
                />
                <Input
                  label="Nom du porteur"
                  placeholder="JEAN DUPONT"
                  value={form.holder}
                  onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))}
                  autoComplete="cc-name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Expiration"
                    placeholder="MM/AA"
                    value={form.exp}
                    onChange={(e) => setForm((f) => ({ ...f, exp: formatExp(e.target.value) }))}
                    maxLength={5}
                    autoComplete="cc-exp"
                    className="font-mono"
                  />
                  <Input
                    label="CVC"
                    type="password"
                    placeholder="•••"
                    value={form.cvc}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))
                    }
                    maxLength={4}
                    autoComplete="cc-csc"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30">
                <Lock size={14} className="text-brand-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Vos données sont chiffrées de bout en bout. Le CVC n'est jamais stocké.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-bg-border flex gap-2 shrink-0">
              <Button variant="secondary" size="md" fullWidth onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                icon={Check}
                onClick={handleAdd}
              >
                Ajouter
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
