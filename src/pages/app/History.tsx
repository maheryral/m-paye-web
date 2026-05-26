import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Copy,
  Download,
  Filter,
  Inbox,
  Loader2,
  MoreVertical,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { transactionService } from '../../services/api';
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

interface Tx {
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

type FilterType = 'all' | 'credit' | 'debit';
type SortKey = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function txTitle(t: Tx): string {
  if (t.type === 'DEPOSIT') return 'Dépôt wallet';
  if (t.isCredit && t.sender?.fullName) return `Reçu de ${t.sender.fullName}`;
  if (!t.isCredit && t.receiver?.fullName) return `Envoyé à ${t.receiver.fullName}`;
  return t.motif || 'Transaction';
}

function counterpartName(t: Tx): string {
  return t.sender?.fullName || t.receiver?.fullName || 'M\'Paye';
}

export default function History() {
  const { formatCurrency } = useLocale();

  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Tx | null>(null);

  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await transactionService.getTransactions({ limit: 100 });
      setTransactions(r?.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    let credits = 0;
    let debits = 0;
    let fees = 0;
    for (const t of transactions) {
      const a = Number(t.montant) || 0;
      if (t.isCredit || t.type === 'DEPOSIT') credits += a;
      else debits += a;
      fees += Number(t.feeAmount) || 0;
    }
    return { total: transactions.length, credits, debits, fees };
  }, [transactions]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let res = transactions.filter((t) => {
      if (filter === 'credit' && !t.isCredit && t.type !== 'DEPOSIT') return false;
      if (filter === 'debit' && (t.isCredit || t.type === 'DEPOSIT')) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !txTitle(t).toLowerCase().includes(q) &&
          !t.reference.toLowerCase().includes(q) &&
          !counterpartName(t).toLowerCase().includes(q)
        )
          return false;
      }
      if (dateFrom) {
        if (new Date(t.createdAt) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        if (new Date(t.createdAt) > end) return false;
      }
      return true;
    });
    res = [...res].sort((a, b) => {
      if (sortKey === 'amount') {
        const av = Number(a.montant) || 0;
        const bv = Number(b.montant) || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? at - bt : bt - at;
    });
    return res;
  }, [transactions, filter, search, dateFrom, dateTo, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter, search, dateFrom, dateTo]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Référence', 'Description', 'Montant (Ar)', 'Frais', 'Statut'],
      ...filtered.map((t) => [
        new Date(t.createdAt).toISOString(),
        t.isCredit || t.type === 'DEPOSIT' ? 'Crédit' : 'Débit',
        t.reference,
        txTitle(t),
        String(t.montant),
        String(t.feeAmount || 0),
        t.statut,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpaye-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const activeFilters =
    (filter !== 'all' ? 1 : 0) +
    (search ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Historique"
        subtitle="Toutes vos transactions, filtrables et exportables"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={Filter}
              onClick={() => setShowFilters((v) => !v)}
            >
              Filtres
              {activeFilters > 0 && (
                <Badge tone="brand" className="ml-1">
                  {activeFilters}
                </Badge>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={exportCSV}
              disabled={filtered.length === 0}
            >
              Exporter
            </Button>
          </>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Transactions"
          value={stats.total.toString()}
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="Total crédits"
          value={formatCurrency(stats.credits)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Total débits"
          value={formatCurrency(stats.debits)}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="Frais cumulés"
          value={formatCurrency(stats.fees)}
          icon={Wallet}
          tone="warning"
        />
      </div>

      {/* Filters bar */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Rechercher par nom, référence, motif..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl shrink-0">
            {[
              { id: 'all' as const, label: 'Tous' },
              { id: 'credit' as const, label: 'Crédits' },
              { id: 'debit' as const, label: 'Débits' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === t.id
                    ? 'bg-brand-500 text-white'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-bg-border animate-slide-in">
            <Input
              label="Date de début"
              type="date"
              icon={Calendar}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Date de fin"
              type="date"
              icon={Calendar}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={resetFilters}
                disabled={activeFilters === 0}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={Inbox}
            title={
              activeFilters > 0
                ? 'Aucun résultat'
                : 'Pas encore de transactions'
            }
            description={
              activeFilters > 0
                ? "Essayez d'ajuster vos filtres"
                : 'Vos transactions apparaîtront ici'
            }
            action={
              activeFilters > 0 && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )
            }
            className="py-16"
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  <th className="text-left text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    <button
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-1 hover:text-ink"
                    >
                      Date
                      {sortKey === 'date' && (
                        <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Description
                  </th>
                  <th className="text-left text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Référence
                  </th>
                  <th className="text-right text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    <button
                      onClick={() => toggleSort('amount')}
                      className="flex items-center gap-1 ml-auto hover:text-ink"
                    >
                      Montant
                      {sortKey === 'amount' && (
                        <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-center text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Statut
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => {
                  const isPos = t.isCredit || t.type === 'DEPOSIT';
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="border-b border-bg-border hover:bg-bg-elevated/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-ink">{fmtDate(t.createdAt)}</div>
                        <div className="text-[11px] text-ink-dim">
                          {fmtTime(t.createdAt)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPos
                                ? 'bg-success-bg text-success-400'
                                : 'bg-danger-bg text-danger-400'
                            }`}
                          >
                            {isPos ? (
                              <ArrowDownLeft size={16} />
                            ) : (
                              <ArrowUpRight size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {txTitle(t)}
                            </div>
                            {t.motif && (
                              <div className="text-[11px] text-ink-muted truncate max-w-[260px]">
                                {t.motif}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">
                        {t.reference.slice(0, 12)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div
                          className={`text-sm font-bold ${
                            isPos ? 'text-success-400' : 'text-ink'
                          }`}
                        >
                          {isPos ? '+' : '−'}
                          {Number(t.montant).toLocaleString('fr-FR')} Ar
                        </div>
                        {t.feeAmount > 0 && (
                          <div className="text-[10px] text-warning-400">
                            −{Number(t.feeAmount).toLocaleString('fr-FR')} frais
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge tone="success">{t.statut}</Badge>
                      </td>
                      <td className="px-3">
                        <MoreVertical size={14} className="text-ink-dim" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-bg-border">
              {pageItems.map((t) => {
                const isPos = t.isCredit || t.type === 'DEPOSIT';
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-bg-elevated/50 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPos
                          ? 'bg-success-bg text-success-400'
                          : 'bg-danger-bg text-danger-400'
                      }`}
                    >
                      {isPos ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {txTitle(t)}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {fmtDate(t.createdAt)} · {fmtTime(t.createdAt)}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold shrink-0 ${
                        isPos ? 'text-success-400' : 'text-ink'
                      }`}
                    >
                      {isPos ? '+' : '−'}
                      {Number(t.montant).toLocaleString('fr-FR')} Ar
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-bg-border">
                <div className="text-xs text-ink-muted">
                  Page <span className="text-ink font-semibold">{page}</span> sur{' '}
                  <span className="text-ink font-semibold">{totalPages}</span> ·{' '}
                  {filtered.length} résultats
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* === Slide-over panel === */}
      {selected && (
        <DetailsPanel tx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Loader2;
  tone: 'brand' | 'success' | 'danger' | 'warning';
}) {
  const TONES = {
    brand: 'text-brand-300 bg-brand-500/15',
    success: 'text-success-400 bg-success-bg',
    danger: 'text-danger-400 bg-danger-bg',
    warning: 'text-warning-400 bg-warning-bg',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight truncate">{value}</div>
    </Card>
  );
}

function DetailsPanel({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const { formatCurrency } = useLocale();
  const isPos = tx.isCredit || tx.type === 'DEPOSIT';
  const counterpart = tx.sender || tx.receiver;

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(tx.reference);
      alert('Référence copiée');
    } catch {
      /* */
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-surface border-l border-bg-border flex flex-col animate-slide-in shadow-elevated">
        {/* Header */}
        <div className="p-5 border-b border-bg-border flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs text-ink-muted">Détail transaction</div>
            <div className="text-sm font-bold mt-0.5">{txTitle(tx)}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-bg-subtle text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Amount block */}
          <div className="text-center py-6">
            <div
              className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 ${
                isPos
                  ? 'bg-success-bg text-success-400'
                  : 'bg-danger-bg text-danger-400'
              }`}
            >
              {isPos ? (
                <ArrowDownLeft size={26} />
              ) : (
                <ArrowUpRight size={26} />
              )}
            </div>
            <div
              className={`text-3xl font-bold tracking-tight ${
                isPos ? 'text-success-400' : 'text-ink'
              }`}
            >
              {isPos ? '+' : '−'}
              {Number(tx.montant).toLocaleString('fr-FR')} Ar
            </div>
            <Badge tone="success" className="mt-2">
              {tx.statut}
            </Badge>
          </div>

          {/* Counterpart */}
          {counterpart && (
            <Card padding="md" className="bg-bg-elevated/50">
              <div className="text-xs text-ink-muted mb-2 font-semibold uppercase tracking-wider">
                {tx.isCredit ? 'De' : 'Vers'}
              </div>
              <div className="flex items-center gap-3">
                <Avatar name={counterpart.fullName} size="md" />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {counterpart.fullName}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {counterpart.email || counterpart.telephone}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Details rows */}
          <div className="space-y-1">
            <DetailRow label="Type">
              {tx.type === 'DEPOSIT' ? 'Dépôt wallet' : 'Transfert'}
            </DetailRow>
            <DetailRow label="Date">
              {fmtDate(tx.createdAt)} à {fmtTime(tx.createdAt)}
            </DetailRow>
            <DetailRow label="Montant">
              {formatCurrency(tx.montant)}
            </DetailRow>
            {tx.feeAmount > 0 && (
              <DetailRow label="Frais">
                <span className="text-warning-400">
                  {formatCurrency(tx.feeAmount)}
                </span>
              </DetailRow>
            )}
            {tx.feeAmount > 0 && (
              <DetailRow label="Total">
                <span className="font-bold">{formatCurrency(tx.totalAmount)}</span>
              </DetailRow>
            )}
            {tx.motif && <DetailRow label="Motif">{tx.motif}</DetailRow>}
            <DetailRow label="Référence">
              <button
                onClick={copyRef}
                className="font-mono text-xs flex items-center gap-1.5 text-brand-300 hover:text-brand-200"
              >
                {tx.reference}
                <Copy size={12} />
              </button>
            </DetailRow>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-bg-border flex gap-2 shrink-0">
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Fermer
          </Button>
          <Button variant="primary" size="md" fullWidth icon={Download}>
            Reçu PDF
          </Button>
        </div>
      </aside>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-bg-border/50 last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm text-ink text-right">{children}</span>
    </div>
  );
}
