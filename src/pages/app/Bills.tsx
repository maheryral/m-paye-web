import {
  CheckCircle2,
  Droplets,
  Lock,
  Tv,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';

interface BillCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

interface PendingBill {
  id: string;
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
  { id: 'electricity', name: 'JIRAMA', icon: Zap, color: '#f59e0b' },
  { id: 'water', name: 'JIAMA', icon: Droplets, color: '#3b82f6' },
  { id: 'internet', name: 'Telma', icon: Wifi, color: '#8b5cf6' },
  { id: 'tv', name: 'Canal+', icon: Tv, color: '#ef4444' },
];

export default function Bills() {
  const colors = useColors();
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [contractNumber, setContractNumber] = useState('');
  const [amount, setAmount] = useState('');

  // Mock data — à remplacer par le module Bill du backend quand il sera dispo
  const pendingBills: PendingBill[] = [];
  const paidBills: PaidBill[] = [];

  const handlePayBill = () => {
    if (!contractNumber) {
      alert('Veuillez entrer le numéro de contrat');
      return;
    }
    const n = parseFloat(amount);
    if (!n || n <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }
    const cat = CATEGORIES.find((b) => b.id === selectedBill);
    if (!confirm(`Payer ${n.toLocaleString('fr-FR')} Ar pour ${cat?.name} ?`)) return;
    alert('Paiement effectué avec succès');
    setContractNumber('');
    setAmount('');
    setSelectedBill(null);
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title="Factures" subtitle="Payez vos factures en un clic" />

        <div className="px-5 mt-4 space-y-5">
          {/* Catégories */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((bill) => {
              const Icon = bill.icon;
              const active = selectedBill === bill.id;
              return (
                <button
                  key={bill.id}
                  onClick={() => setSelectedBill(bill.id)}
                  className="card flex flex-col items-center gap-2 py-4 transition-colors"
                  style={
                    active
                      ? { borderColor: bill.color, background: `${bill.color}20` }
                      : undefined
                  }
                >
                  <Icon size={28} style={{ color: active ? bill.color : colors.textSecondary }} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: active ? bill.color : colors.text }}
                  >
                    {bill.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Formulaire */}
          {selectedBill && (
            <div className="card p-4 space-y-4">
              <h3 className="text-base font-semibold" style={{ color: colors.text }}>
                Payer la facture {CATEGORIES.find((b) => b.id === selectedBill)?.name}
              </h3>

              <div>
                <label className="text-sm block mb-2" style={{ color: colors.textSecondary }}>
                  Numéro de contrat
                </label>
                <input
                  className="w-full h-12 px-3 rounded-xl border bg-bg outline-none text-base"
                  style={{ borderColor: colors.border, color: colors.text }}
                  placeholder="Entrez votre numéro de contrat"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm block mb-2" style={{ color: colors.textSecondary }}>
                  Montant (Ar)
                </label>
                <input
                  className="w-full h-12 px-3 rounded-xl border bg-bg outline-none text-base"
                  style={{ borderColor: colors.border, color: colors.text }}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="numeric"
                />
              </div>

              <button
                onClick={handlePayBill}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white"
                style={{ background: colors.primary }}
              >
                <Lock size={20} />
                Payer
              </button>
            </div>
          )}

          {/* À payer */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold" style={{ color: colors.text }}>
                À payer
              </h3>
              <span className="text-xs" style={{ color: colors.warning }}>
                {pendingBills.length} facture{pendingBills.length > 1 ? 's' : ''}
              </span>
            </div>
            {pendingBills.length === 0 ? (
              <div className="card p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                Aucune facture en attente
              </div>
            ) : (
              <div className="space-y-2">
                {pendingBills.map((bill) => {
                  const Icon = bill.icon;
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-xl border"
                      style={{
                        background: `${colors.warning}15`,
                        borderColor: colors.warning,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: `${colors.warning}30` }}
                        >
                          <Icon size={20} style={{ color: colors.warning }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium" style={{ color: colors.text }}>
                            {bill.name}
                          </div>
                          <div className="text-xs" style={{ color: colors.textSecondary }}>
                            À payer le {bill.dueDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-sm font-semibold" style={{ color: colors.text }}>
                          {bill.amount.toLocaleString('fr-FR')} Ar
                        </div>
                        <button
                          onClick={() => setSelectedBill(bill.name.toLowerCase())}
                          className="px-3 py-1 rounded-md border text-xs font-medium"
                          style={{ borderColor: colors.warning, color: colors.warning }}
                        >
                          Payer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Payées récemment */}
          {paidBills.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3" style={{ color: colors.text }}>
                Payées récemment
              </h3>
              <div className="space-y-2">
                {paidBills.map((bill) => (
                  <div key={bill.id} className="card flex justify-between items-center p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${colors.success}20` }}
                      >
                        <CheckCircle2 size={20} style={{ color: colors.success }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: colors.text }}>
                          {bill.name}
                        </div>
                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                          Payée le {bill.paidDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: colors.success }}>
                      {bill.amount.toLocaleString('fr-FR')} Ar
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
