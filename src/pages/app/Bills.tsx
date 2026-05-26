import {
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  Info,
  Lock,
  Receipt,
  Tv,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Empty, Input, PageHeader } from '../../ui';

interface BillCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  tagline: string;
}

interface PendingBill {
  id: string;
  category: string;
  name: string;
  amount: number;
  dueDate: string;
  icon: LucideIcon;
}

interface PaidBill {
  id: string;
  name: string;
  amount: number;
  paidDate: string;
}

const CATEGORIES: BillCategory[] = [
  { id: 'electricity', name: 'JIRAMA', icon: Zap, color: '#F59E0B', tagline: 'Électricité' },
  { id: 'water', name: 'JIAMA', icon: Droplets, color: '#06B6D4', tagline: 'Eau' },
  { id: 'internet', name: 'Telma', icon: Wifi, color: '#8B5CF6', tagline: 'Internet & Mobile' },
  { id: 'tv', name: 'Canal+', icon: Tv, color: '#F43F5E', tagline: 'Télévision' },
];

export default function Bills() {
  const [selected, setSelected] = useState<string | null>(null);
  const [contract, setContract] = useState('');
  const [amount, setAmount] = useState('');

  // Mock until backend module exists
  const pending: PendingBill[] = [];
  const paid: PaidBill[] = [];

  const cat = CATEGORIES.find((c) => c.id === selected);

  const pay = () => {
    if (!contract) return alert('Numéro de contrat requis');
    const n = parseFloat(amount);
    if (!n || n <= 0) return alert('Montant invalide');
    if (!confirm(`Payer ${n.toLocaleString('fr-FR')} Ar pour ${cat?.name} ?`)) return;
    alert('Paiement effectué avec succès');
    setContract('');
    setAmount('');
    setSelected(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Factures"
        subtitle="Payez vos factures en un clic — électricité, eau, internet, TV"
      />

      {/* Categories */}
      <div>
        <h3 className="section-title mb-3 px-1">Choisir un fournisseur</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  active
                    ? 'border-brand-500 bg-brand-500/10 shadow-glow-soft'
                    : 'border-bg-border bg-bg-surface hover:bg-bg-elevated'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: c.color }}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <div className="text-base font-bold">{c.name}</div>
                <div className="text-xs text-ink-muted mt-0.5">{c.tagline}</div>
                {active && (
                  <Badge tone="brand" className="mt-3">
                    Sélectionné
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form + info side-by-side */}
      {selected && cat && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-slide-in">
          <Card padding="md" className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-bg-border">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: cat.color }}
              >
                <cat.icon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">Payer la facture {cat.name}</h3>
                <p className="text-xs text-ink-muted">{cat.tagline}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Numéro de contrat / abonné"
                icon={FileText}
                placeholder="Ex : 1234567890"
                value={contract}
                onChange={(e) => setContract(e.target.value)}
              />
              <div>
                <label className="label">Montant à payer (Ar)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    className="input text-2xl font-bold py-4 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-sm font-semibold">
                    Ar
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={Lock}
                disabled={!contract || !amount || parseFloat(amount) <= 0}
                onClick={pay}
              >
                Payer
                {amount && parseFloat(amount) > 0 && (
                  <span className="ml-1 opacity-80">
                    · {parseFloat(amount).toLocaleString('fr-FR')} Ar
                  </span>
                )}
              </Button>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Info size={14} className="text-brand-300" />
              <h3 className="text-sm font-bold">Comment ça marche</h3>
            </div>
            <ol className="space-y-3 text-xs text-ink-muted">
              {[
                'Trouvez votre numéro de contrat sur votre dernière facture',
                'Saisissez le montant exact dû',
                'Validez avec votre wallet — paiement instantané',
                'Le justificatif arrive par email et dans l\'historique',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-5 pt-4 border-t border-bg-border">
              <div className="flex items-center gap-2 text-xs text-success-400">
                <CheckCircle2 size={12} />
                <span className="font-semibold">Sans frais supplémentaires</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-success-400 mt-1.5">
                <CheckCircle2 size={12} />
                <span className="font-semibold">Confirmation immédiate</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pending bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-warning-400" />
              <h3 className="text-base font-bold">À payer</h3>
            </div>
            {pending.length > 0 && (
              <Badge tone="warning">{pending.length}</Badge>
            )}
          </div>
          {pending.length === 0 ? (
            <Empty
              icon={CheckCircle2}
              title="Tout est à jour"
              description="Aucune facture en attente de paiement"
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {pending.map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-warning-500/30 bg-warning-bg"
                  >
                    <div className="w-10 h-10 rounded-xl bg-warning-500/30 flex items-center justify-center shrink-0 text-warning-400">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{b.name}</div>
                      <div className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        Échéance {b.dueDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {b.amount.toLocaleString('fr-FR')} Ar
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-warning-400 hover:bg-warning-500/20"
                        onClick={() => setSelected(b.category)}
                      >
                        Payer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={16} className="text-success-400" />
            <h3 className="text-base font-bold">Payées récemment</h3>
          </div>
          {paid.length === 0 ? (
            <Empty
              icon={Receipt}
              title="Pas d'historique"
              description="Vos factures payées apparaîtront ici"
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {paid.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated/40 border border-bg-border"
                >
                  <div className="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center shrink-0 text-success-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.name}</div>
                    <div className="text-[11px] text-ink-muted">
                      Payée le {b.paidDate}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-success-400">
                    {b.amount.toLocaleString('fr-FR')} Ar
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
