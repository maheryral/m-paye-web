import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  Lock,
  RefreshCcw,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../contexts/ThemeContext';
import { paymentApi, type PaymentRequest } from '../../services/paymentApi';

const STATUS_META: Record<string, { color: string; label: string; icon: LucideIcon }> = {
  PENDING: { color: '#f59e0b', label: 'EN ATTENTE', icon: Clock },
  PROCESSING: { color: '#3b82f6', label: 'EN COURS', icon: RefreshCcw },
  APPROVED: { color: '#10b981', label: 'APPROUVÉ', icon: CheckCircle2 },
  REJECTED: { color: '#ef4444', label: 'REJETÉ', icon: XCircle },
  CANCELLED: { color: '#9ca3af', label: 'ANNULÉ', icon: Ban },
  EXPIRED: { color: '#9ca3af', label: 'EXPIRÉ', icon: Hourglass },
};

export default function AdminPayments() {
  const colors = useColors();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'ADMIN';

  const [items, setItems] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<{ id: string; ref: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res =
        filter === 'pending' ? await paymentApi.listPending() : await paymentApi.listAll();
      setItems(res.data);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [filter, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (r: PaymentRequest) => {
    if (
      !confirm(
        `Approuver ?\n${Number(r.amount).toLocaleString('fr-FR')} Ar pour ${r.user?.prenom} ${r.user?.nom}`,
      )
    )
      return;
    setBusyId(r.id);
    try {
      await paymentApi.approve(r.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Approbation échouée');
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      alert('Saisissez la raison du rejet');
      return;
    }
    setBusyId(rejectModal.id);
    try {
      await paymentApi.reject(rejectModal.id, rejectReason.trim());
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Rejet échoué');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Accès refusé" />
        <div className="flex flex-col items-center justify-center pt-20 gap-3 px-5 text-center">
          <Lock size={48} style={{ color: colors.textSecondary }} />
          <div className="text-base" style={{ color: colors.text }}>
            Seuls les administrateurs peuvent accéder à cette page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-4xl mx-auto">
        <GradientHeader
          title="Validation des paiements"
          subtitle="Dépôts et retraits utilisateurs"
          RightIcon={RefreshCcw}
          onRightPress={load}
        />

        <div className="px-5 mt-4 space-y-4">
          {/* Filtres */}
          <div className="card flex gap-1 p-1">
            <button
              onClick={() => setFilter('pending')}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: filter === 'pending' ? colors.primary : 'transparent',
                color: filter === 'pending' ? '#fff' : colors.textSecondary,
              }}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('all')}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: filter === 'all' ? colors.primary : 'transparent',
                color: filter === 'all' ? '#fff' : colors.textSecondary,
              }}
            >
              Toutes
            </button>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : items.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-12">
              <CheckCircle2 size={48} style={{ color: colors.success }} />
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {filter === 'pending'
                  ? 'Aucune demande en attente'
                  : 'Aucune demande enregistrée'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((r) => {
                const meta = STATUS_META[r.status];
                const StatusIcon = meta.icon;
                const isPending = r.status === 'PENDING';
                const amount = Number(r.amount);
                const detailsStr = r.details
                  ? Object.entries(r.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')
                  : '';
                return (
                  <div key={r.id} className="card p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: colors.text }}>
                          {r.user?.prenom} {r.user?.nom}
                        </div>
                        <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                          {r.user?.email}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0"
                        style={{ background: meta.color + '20' }}
                      >
                        <StatusIcon size={12} style={{ color: meta.color }} />
                        <span className="text-[10px] font-bold" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex justify-between items-center">
                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        {r.type === 'DEPOSIT' ? '⬇️ Dépôt' : '⬆️ Retrait'} · {r.method}
                      </div>
                      <div className="text-base font-extrabold" style={{ color: colors.text }}>
                        {amount.toLocaleString('fr-FR')} Ar
                      </div>
                    </div>
                    <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      Réf : {r.reference}
                    </div>
                    {detailsStr && (
                      <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        {detailsStr}
                      </div>
                    )}
                    {r.rejectionReason && (
                      <div className="text-red-400 text-xs mt-1">
                        Rejet : {r.rejectionReason}
                      </div>
                    )}

                    {/* Actions */}
                    {isPending && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setRejectModal({ id: r.id, ref: r.reference });
                            setRejectReason('');
                          }}
                          disabled={busyId === r.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold text-white text-sm"
                          style={{ background: '#ef4444' }}
                        >
                          <X size={16} />
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={busyId === r.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold text-white text-sm"
                          style={{ background: '#10b981' }}
                        >
                          {busyId === r.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <>
                              <Check size={16} />
                              Approuver
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal rejet */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-3xl p-6 space-y-4"
            style={{ background: colors.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-bold" style={{ color: colors.text }}>
                  Rejeter la demande
                </div>
                <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  Réf : {rejectModal.ref}
                </div>
              </div>
              <button onClick={() => setRejectModal(null)}>
                <X size={24} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                Raison du rejet *
              </label>
              <textarea
                className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ color: colors.text, borderColor: colors.border }}
                rows={4}
                placeholder="Documents manquants, montant incorrect..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>

            <button
              onClick={submitReject}
              disabled={!rejectReason.trim() || !!busyId}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
              style={{
                background: '#ef4444',
                opacity: !rejectReason.trim() || !!busyId ? 0.5 : 1,
              }}
            >
              {busyId ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <X size={18} />
                  Confirmer le rejet
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
