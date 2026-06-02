import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  RefreshCcw,
  Undo2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type MerchantRefund,
  type MerchantTransaction,
} from '../../../services/merchantApi';
import { Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../../ui';

const STATUS_META: Record<
  string,
  { tone: 'warning' | 'brand' | 'success' | 'danger' | 'neutral'; label: string; icon: LucideIcon }
> = {
  PENDING: { tone: 'warning', label: 'En attente', icon: Clock },
  PROCESSING: { tone: 'brand', label: 'En cours', icon: RefreshCcw },
  COMPLETED: { tone: 'success', label: 'Remboursé', icon: CheckCircle2 },
  APPROVED: { tone: 'success', label: 'Approuvé', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', label: 'Rejeté', icon: XCircle },
  CANCELLED: { tone: 'neutral', label: 'Annulé', icon: Ban },
  EXPIRED: { tone: 'neutral', label: 'Expiré', icon: Hourglass },
  FAILED: { tone: 'danger', label: 'Échec', icon: XCircle },
};

export default function MerchantRefunds() {
  const { formatCurrency } = useLocale();

  const [refunds, setRefunds] = useState<MerchantRefund[]>([]);
  const [recentTx, setRecentTx] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form (modal)
  const [modal, setModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<MerchantTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [refRes, txRes] = await Promise.all([
        merchantApi.getRefunds(1, 50),
        merchantApi.getTransactions(1, 30),
      ]);
      const refData: any = refRes.data;
      setRefunds(Array.isArray(refData) ? refData : refData?.items ?? []);
      const txData: any = txRes.data;
      setRecentTx(Array.isArray(txData) ? txData : txData?.items ?? []);
    } catch (e: any) {
      console.error('refunds load:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = (tx: MerchantTransaction) => {
    setSelectedTx(tx);
    setRefundAmount(String(tx.amount));
    setReason('');
    setError(null);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setSelectedTx(null);
    setRefundAmount('');
    setReason('');
    setError(null);
  };

  const submit = async () => {
    if (!selectedTx) return;
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) {
      setError('Montant invalide');
      return;
    }
    if (amt > Number(selectedTx.amount)) {
      setError('Le remboursement ne peut excéder le montant initial');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Motif requis (3 caractères minimum)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await merchantApi.createRefund(selectedTx.id, amt, reason.trim());
      closeModal();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Échec du remboursement');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtre les transactions qui peuvent être remboursées (montant > 0 + statut OK)
  const refundableTx = recentTx.filter((t) => Number(t.amount) > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Remboursements"
        subtitle="Initiez le remboursement d'une transaction client"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Left: transactions remboursables === */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Undo2 size={18} className="text-brand-300" />
                <h3 className="text-base font-bold">Transactions récentes</h3>
              </div>
              <span className="text-xs text-ink-muted">
                Cliquez pour rembourser
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : refundableTx.length === 0 ? (
              <Empty
                icon={Undo2}
                title="Aucune transaction"
                description="Les ventes récentes apparaîtront ici"
              />
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 -mr-1">
                {refundableTx.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => openModal(tx)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-bg-border bg-bg-elevated hover:border-brand-500/50 hover:bg-brand-500/5 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center shrink-0">
                      <Plus size={16} className="text-success-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">
                        {Number(tx.amount).toLocaleString('fr-FR')} Ar
                      </div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {tx.transactionId || tx.id} ·{' '}
                        {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </div>
                    </div>
                    <Undo2 size={14} className="text-ink-muted shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* === Right: historique des remboursements === */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Mes remboursements</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : refunds.length === 0 ? (
              <Empty
                icon={Undo2}
                title="Pas de remboursement"
                description="L'historique apparaîtra ici"
              />
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 -mr-1">
                {refunds.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                  const StatusIcon = meta.icon;
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl border border-bg-border bg-bg-elevated/40"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-ink-muted font-mono truncate">
                            {r.reference}
                          </div>
                          <div className="text-base font-bold mt-0.5">
                            {Number(r.amount).toLocaleString('fr-FR')} Ar
                          </div>
                        </div>
                        <Badge tone={meta.tone} icon={<StatusIcon size={10} />}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-ink-muted line-clamp-2">
                        {r.reason}
                      </div>
                      <div className="text-[10px] text-ink-dim mt-1.5">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* === Modal création de remboursement === */}
      {modal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Undo2 size={18} className="text-brand-300" />
                <div className="text-base font-bold">Nouveau remboursement</div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-bg-elevated"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl bg-bg-elevated p-3 mb-4">
              <div className="text-xs text-ink-muted">Transaction</div>
              <div className="text-sm font-mono truncate">
                {selectedTx.transactionId || selectedTx.id}
              </div>
              <div className="text-lg font-bold mt-1">
                {formatCurrency(Number(selectedTx.amount))}
              </div>
              <div className="text-[11px] text-ink-muted">
                {new Date(selectedTx.createdAt).toLocaleString('fr-FR')}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Montant à rembourser</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(e.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="0"
                    className="input text-2xl font-bold py-4 pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-sm font-semibold">
                    Ar
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-ink-muted">
                    Max : {Number(selectedTx.amount).toLocaleString('fr-FR')} Ar
                  </span>
                  <button
                    onClick={() => setRefundAmount(String(selectedTx.amount))}
                    className="text-brand-300 font-semibold hover:underline"
                  >
                    Total
                  </button>
                </div>
              </div>

              <Input
                label="Motif du remboursement"
                placeholder="Ex : Produit défectueux, erreur de prix…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
              />

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  loading={submitting}
                  icon={Undo2}
                  onClick={submit}
                >
                  Rembourser
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
