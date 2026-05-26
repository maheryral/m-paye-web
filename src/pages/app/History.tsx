import {
  ArrowDown,
  ArrowUp,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { transactionService } from '../../services/api';

interface Transaction {
  id: string;
  type: string;
  montant: number;
  statut: string;
  motif: string | null;
  reference: string;
  feeAmount: number;
  totalAmount: number;
  createdAt: string;
  isCredit: boolean;
  sender?: { fullName: string; email: string; telephone: string };
  receiver?: { fullName: string; email: string; telephone: string };
}

type Filter = 'all' | 'credit' | 'debit';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return date.toLocaleDateString('fr-FR');
}

function getTitle(tx: Transaction): string {
  if (tx.type === 'DEPOSIT') return 'Dépôt MyWallet';
  if (tx.isCredit && tx.sender?.fullName) return `Reçu de ${tx.sender.fullName}`;
  if (!tx.isCredit && tx.receiver?.fullName) return `Envoyé à ${tx.receiver.fullName}`;
  return tx.motif || 'Transaction';
}

export default function History() {
  const colors = useColors();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const response = await transactionService.getTransactions({ limit: 50 });
      setTransactions(response?.transactions || []);
    } catch (e: any) {
      console.error('Erreur chargement transactions:', e?.response?.data || e?.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      transactions.filter((tx) => {
        if (filterType === 'credit' && !tx.isCredit && tx.type !== 'DEPOSIT') return false;
        if (filterType === 'debit' && (tx.isCredit || tx.type === 'DEPOSIT')) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return getTitle(tx).toLowerCase().includes(q) || tx.reference.toLowerCase().includes(q);
        }
        return true;
      }),
    [transactions, filterType, searchQuery],
  );

  const stats = useMemo(() => {
    return {
      total: transactions.length,
      credits: transactions
        .filter((t) => t.isCredit || t.type === 'DEPOSIT')
        .reduce((s, t) => s + t.montant, 0),
      debits: transactions
        .filter((t) => !t.isCredit && t.type !== 'DEPOSIT')
        .reduce((s, t) => s + t.montant, 0),
    };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title="Historique" subtitle="Vos transactions récentes" />

        <div className="px-5 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="card flex flex-col items-center p-3">
              <div className="text-sm font-bold" style={{ color: colors.text }}>
                {stats.total}
              </div>
              <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
                Transactions
              </div>
            </div>
            <div className="card flex flex-col items-center p-3">
              <div className="text-xs font-bold" style={{ color: colors.success }}>
                {stats.credits.toLocaleString('fr-FR')} Ar
              </div>
              <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
                Crédits
              </div>
            </div>
            <div className="card flex flex-col items-center p-3">
              <div className="text-xs font-bold" style={{ color: colors.error }}>
                {stats.debits.toLocaleString('fr-FR')} Ar
              </div>
              <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
                Débits
              </div>
            </div>
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 h-11 rounded-xl border mb-3"
            style={{ borderColor: colors.border, background: colors.card }}
          >
            <Search size={20} style={{ color: colors.textSecondary }} />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.text }}
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={18} style={{ color: colors.textSecondary }} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2.5 mb-4">
            {(['all', 'credit', 'debit'] as const).map((f) => {
              const active = filterType === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className="flex-1 py-2 rounded-full border text-xs font-medium"
                  style={{
                    borderColor: active ? colors.primary : colors.border,
                    background: active ? colors.primary : 'transparent',
                    color: active ? '#fff' : colors.textSecondary,
                  }}
                >
                  {f === 'all' ? 'Tous' : f === 'credit' ? 'Crédits' : 'Débits'}
                </button>
              );
            })}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText size={64} style={{ color: colors.textSecondary }} />
              <div className="text-base" style={{ color: colors.textSecondary }}>
                Aucune transaction
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((tx) => {
                const isPositive = tx.isCredit || tx.type === 'DEPOSIT';
                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="card w-full flex items-center justify-between p-3.5 text-left hover:bg-bg-card/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isPositive
                            ? `${colors.success}20`
                            : `${colors.error}20`,
                        }}
                      >
                        {isPositive ? (
                          <ArrowDown size={20} style={{ color: colors.success }} />
                        ) : (
                          <ArrowUp size={20} style={{ color: colors.error }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: colors.text }}
                        >
                          {getTitle(tx)}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                          {formatDate(tx.createdAt)}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                          Ref: {tx.reference.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div
                        className="text-sm font-bold"
                        style={{ color: isPositive ? colors.success : colors.error }}
                      >
                        {isPositive ? '+' : '-'}
                        {tx.montant.toLocaleString('fr-FR')} Ar
                      </div>
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: `${colors.success}15`, color: colors.success }}
                      >
                        {tx.statut}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-3xl max-h-[80vh] overflow-hidden"
            style={{ background: colors.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: colors.border }}
            >
              <div className="text-lg font-bold" style={{ color: colors.text }}>
                Détails de la transaction
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={24} style={{ color: colors.textSecondary }} />
              </button>
            </div>
            <div className="p-5 space-y-3.5 overflow-y-auto max-h-[70vh]">
              <Row label="Type" value={selected.type === 'DEPOSIT' ? 'Dépôt' : 'Transfert'} />
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Montant
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color:
                      selected.isCredit || selected.type === 'DEPOSIT'
                        ? colors.success
                        : colors.error,
                  }}
                >
                  {selected.isCredit || selected.type === 'DEPOSIT' ? '+' : '-'}
                  {selected.montant.toLocaleString('fr-FR')} Ar
                </span>
              </div>
              {selected.feeAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Frais
                  </span>
                  <span className="text-sm" style={{ color: colors.warning }}>
                    {selected.feeAmount.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Statut
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${colors.success}15`, color: colors.success }}
                >
                  {selected.statut}
                </span>
              </div>
              <Row label="Date" value={new Date(selected.createdAt).toLocaleString('fr-FR')} />
              {selected.motif && <Row label="Motif" value={selected.motif} />}
              <Row label="Référence" value={selected.reference} mono />
              {selected.sender && (
                <Person label="Expéditeur" person={selected.sender} colors={colors} />
              )}
              {selected.receiver && (
                <Person label="Destinataire" person={selected.receiver} colors={colors} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const colors = useColors();
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: colors.text }}>
        {value}
      </span>
    </div>
  );
}

function Person({
  label,
  person,
  colors,
}: {
  label: string;
  person: { fullName: string; email: string; telephone: string };
  colors: any;
}) {
  return (
    <div className="pt-3 mt-1 border-t space-y-1" style={{ borderColor: colors.border }}>
      <div className="text-xs" style={{ color: colors.textSecondary }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: colors.text }}>
        {person.fullName}
      </div>
      <div className="text-xs" style={{ color: colors.textSecondary }}>
        {person.email || person.telephone}
      </div>
    </div>
  );
}
