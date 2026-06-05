import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  Ticket,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  taxiBrousseApi,
  type Reservation,
} from '../../services/taxiBrousseApi';

// Mêmes seuils que le backend (REFUND_POLICY dans reservation.service.ts).
// Purement informatif côté front — le serveur reste source de vérité.
const REFUND_POLICY = {
  fullRefundHoursBefore: 24,
  partialRefundHoursBefore: 12,
  partialRefundPercent: 50,
};

function combineDateAndTime(date: string, timeStr?: string): Date {
  const base = new Date(date);
  if (!timeStr) return base;
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!match) return base;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  base.setHours(h, m, 0, 0);
  return base;
}

function previewRefund(r: Reservation): {
  percent: number;
  amount: number;
  retained: number;
  hoursBefore: number;
} {
  const prix = Number(r.prixPaye ?? 0);
  if (!r.voyage) return { percent: 0, amount: 0, retained: prix, hoursBefore: 0 };
  const departure = combineDateAndTime(
    r.voyage.dateDepart,
    r.voyage.heureDepart,
  );
  const hoursBefore =
    (departure.getTime() - Date.now()) / (1000 * 60 * 60);
  let percent: number;
  if (hoursBefore > REFUND_POLICY.fullRefundHoursBefore) percent = 100;
  else if (hoursBefore > REFUND_POLICY.partialRefundHoursBefore)
    percent = REFUND_POLICY.partialRefundPercent;
  else percent = 0;
  const amount = Math.round((prix * percent) / 100);
  return { percent, amount, retained: prix - amount, hoursBefore };
}

function fmtAr(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar';
}

/**
 * Normalise un statut pour les comparaisons.
 * Backend stocke 'confirmée' (accent), 'en_attente', 'annulee', etc.
 * Mais on tolère aussi les variantes legacy (CONFIRMEE, confirmee, etc.).
 */
function normalizeStatus(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // supprime les diacritiques (é → e)
}

const STATUS_META: Record<
  string,
  { color: string; label: string; icon: LucideIcon }
> = {
  EN_ATTENTE: { color: '#f59e0b', label: 'En attente', icon: Clock },
  CONFIRMEE: { color: '#10b981', label: 'Confirmée', icon: CheckCircle2 },
  PAYEE: { color: '#10b981', label: 'Payée', icon: CheckCircle2 },
  ANNULEE: { color: '#ef4444', label: 'Annulée', icon: XCircle },
  EXPIREE: { color: '#9ca3af', label: 'Expirée', icon: Ban },
};

function getStatusMeta(s?: string) {
  if (!s) return STATUS_META.EN_ATTENTE;
  return STATUS_META[s.toUpperCase()] || STATUS_META.EN_ATTENTE;
}

export default function TaxiBrousseReservations() {
  const navigate = useNavigate();
  const colors = useColors();
  const { fetchBalance } = useWallet();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal de confirmation d'annulation avec preview du refund
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  // Banner de résultat après annulation (refund effectif renvoyé par le backend)
  const [resultBanner, setResultBanner] = useState<{
    title: string;
    message: string;
    tone: 'success' | 'warning' | 'error';
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await taxiBrousseApi.getMyReservations();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('Erreur réservations:', e?.response?.data || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePay = async (r: Reservation) => {
    if (!confirm(`Payer ${Number(r.prixPaye || 0).toLocaleString('fr-FR')} Ar avec votre wallet ?`))
      return;
    setBusyId(r.id);
    try {
      await taxiBrousseApi.payReservation(r.id, 'wallet');
      await load();
      void fetchBalance(); // refresh solde wallet affiché ailleurs (dashboard, header…)
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement échoué');
    } finally {
      setBusyId(null);
    }
  };

  // Ouvre le modal : si non payée → confirmation simple, sinon preview refund
  const handleCancel = (r: Reservation) => {
    setCancelTarget(r);
  };

  // Appelé depuis le modal après que l'user a confirmé l'annulation
  const performCancel = async (r: Reservation) => {
    setBusyId(r.id);
    setCancelTarget(null);
    try {
      const res: any = await taxiBrousseApi.cancelReservation(r.id);
      const refund = res?.data?.refund;
      const prix = Number(r.prixPaye ?? 0);

      if (!refund) {
        // Réservation non payée — pas de refund renvoyé
        setResultBanner({
          title: 'Réservation annulée',
          message: 'Votre place a été libérée.',
          tone: 'success',
        });
      } else if (refund.percent === 100) {
        setResultBanner({
          title: 'Annulée — remboursée ✅',
          message: `${fmtAr(refund.amount)} recrédités sur votre wallet.`,
          tone: 'success',
        });
      } else if (refund.percent > 0) {
        setResultBanner({
          title: 'Annulée — remboursement partiel ⚠️',
          message: `${fmtAr(refund.amount)} recrédités (${refund.percent}%). ${fmtAr(refund.retained)} retenus comme pénalité.`,
          tone: 'warning',
        });
      } else {
        setResultBanner({
          title: 'Annulée — sans remboursement ❌',
          message: `Annulation tardive (< 12h). ${fmtAr(prix)} retenus.`,
          tone: 'error',
        });
      }
      await load();
      // Refresh du solde wallet (recrédité si refund > 0)
      void fetchBalance();
      // Auto-dismiss après 6s
      setTimeout(() => setResultBanner(null), 6000);
    } catch (e: any) {
      setResultBanner({
        title: 'Annulation échouée',
        message: e?.response?.data?.message || 'Erreur inattendue',
        tone: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Mes réservations"
          subtitle="Taxi-brousse"
          RightIcon={Search}
          onRightPress={() => navigate('/taxi-brousse')}
        />

        <div className="px-5 mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Ticket size={56} style={{ color: colors.textSecondary }} />
              <div className="text-base font-semibold" style={{ color: colors.text }}>
                Aucune réservation
              </div>
              <div className="text-xs max-w-xs" style={{ color: colors.textSecondary }}>
                Vous n'avez pas encore réservé de voyage. Lancez une recherche pour commencer.
              </div>
              <button
                onClick={() => navigate('/taxi-brousse')}
                className="mt-3 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: colors.primary }}
              >
                Rechercher un voyage
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((r) => {
                const paid = r.statusPaiement === 'PAYEE' || r.statusPaiement === 'paye';
                const meta = getStatusMeta(paid ? 'PAYEE' : r.statusReservation);
                const StatusIcon = meta.icon;
                const v = r.voyage;
                // Normalise : casse + accents (backend stocke "confirmée" avec accent
                // mais des données legacy peuvent être en CONFIRMEE / confirmee).
                const normRes = normalizeStatus(r.statusReservation);
                const normPay = normalizeStatus(r.statusPaiement);
                const canPay =
                  !paid &&
                  ['en_attente'].includes(normPay) &&
                  ['confirmee', 'en_attente'].includes(normRes);
                // Annulation possible tant que la réservation n'est pas déjà annulée.
                // Le backend appliquera la politique refund 3-tiers (100% / 50% / 0%).
                const canCancel = normRes !== 'annulee';

                return (
                  <div key={r.id} className="card p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        {v && (
                          <div className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: colors.text }}>
                            <MapPin size={14} style={{ color: colors.primary }} />
                            <span className="truncate">{v.villeDepart}</span>
                            <ArrowRight size={14} className="text-slate-500" />
                            <MapPin size={14} style={{ color: '#10b981' }} />
                            <span className="truncate">{v.villeArrivee}</span>
                          </div>
                        )}
                        <div className="text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}>
                          <Clock size={12} />
                          {v
                            ? `${new Date(v.dateDepart).toLocaleDateString('fr-FR')} · ${v.heureDepart}`
                            : new Date(r.dateReservation).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0"
                        style={{ background: `${meta.color}20` }}
                      >
                        <StatusIcon size={12} style={{ color: meta.color }} />
                        <span className="text-[10px] font-bold" style={{ color: meta.color }}>
                          {meta.label.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                          Place
                        </div>
                        <div className="text-base font-bold" style={{ color: colors.primary }}>
                          n°{r.numPlace}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                          Code
                        </div>
                        <div className="text-base font-mono font-bold" style={{ color: colors.text }}>
                          {r.codeConfirmation}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: colors.border }}>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {paid ? 'Payé' : 'À payer'}
                      </div>
                      <div className="text-lg font-extrabold" style={{ color: colors.text }}>
                        {Number(r.prixPaye || 0).toLocaleString('fr-FR')} Ar
                      </div>
                    </div>

                    {(canPay || canCancel) && (
                      <div className="flex gap-2 mt-3">
                        {canPay && (
                          <button
                            onClick={() => handlePay(r)}
                            disabled={busyId === r.id}
                            className="flex-1 py-2 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-1.5"
                            style={{ background: colors.primary }}
                          >
                            {busyId === r.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              'Payer'
                            )}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(r)}
                            disabled={busyId === r.id}
                            className="flex-1 py-2 rounded-lg font-semibold text-sm border"
                            style={{
                              borderColor: colors.error,
                              color: colors.error,
                            }}
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Banner résultat ─── */}
      {resultBanner && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] rounded-xl shadow-lg p-4 flex items-start gap-3 ${
            resultBanner.tone === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : resultBanner.tone === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          {resultBanner.tone === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : resultBanner.tone === 'warning' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{resultBanner.title}</p>
            <p className="text-xs mt-0.5">{resultBanner.message}</p>
          </div>
          <button
            onClick={() => setResultBanner(null)}
            className="text-current opacity-50 hover:opacity-100"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Modal de confirmation d'annulation ─── */}
      {cancelTarget && (
        <CancelDialog
          reservation={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => performCancel(cancelTarget)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  Modal d'annulation avec preview du refund
// ═══════════════════════════════════════════════════════

function CancelDialog({
  reservation,
  onClose,
  onConfirm,
}: {
  reservation: Reservation;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isPaid = reservation.statusPaiement === 'paye';
  const prix = Number(reservation.prixPaye ?? 0);
  const refund = isPaid ? previewRefund(reservation) : null;

  // Wording adapté au tier de refund
  let toneClasses = 'bg-emerald-50 border-emerald-200 text-emerald-900';
  let tonePill = 'bg-emerald-100 text-emerald-700';
  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  let title = 'Annuler la réservation';
  let body: React.ReactNode = (
    <p className="text-slate-600 text-sm">
      Votre place sera libérée. Cette action est irréversible.
    </p>
  );
  let confirmLabel = 'Confirmer l\'annulation';
  let confirmClass = 'bg-red-600 hover:bg-red-700';

  if (refund) {
    if (refund.percent === 100) {
      title = 'Annulation — Remboursement intégral';
      body = (
        <div className="space-y-2 text-sm">
          <p className="text-slate-700">
            Vous annulez plus de 24h avant le départ. Vous serez remboursé
            <strong className="ml-1">intégralement</strong>.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs text-emerald-700">Remboursé sur votre wallet</p>
            <p className="text-2xl font-bold text-emerald-700">
              {fmtAr(refund.amount)}
            </p>
          </div>
        </div>
      );
    } else if (refund.percent > 0) {
      toneClasses = 'bg-amber-50 border-amber-200 text-amber-900';
      tonePill = 'bg-amber-100 text-amber-800';
      icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
      title = 'Annulation — Remboursement partiel';
      body = (
        <div className="space-y-3 text-sm">
          <p className="text-slate-700">
            Annulation entre 12h et 24h avant départ → <strong>{refund.percent}%</strong> remboursés,
            le reste est retenu comme pénalité.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs text-emerald-700">Remboursé</p>
              <p className="text-lg font-bold text-emerald-700">
                {fmtAr(refund.amount)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700">Retenu</p>
              <p className="text-lg font-bold text-red-700">
                {fmtAr(refund.retained)}
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      toneClasses = 'bg-red-50 border-red-200 text-red-900';
      tonePill = 'bg-red-100 text-red-800';
      icon = <XCircle className="w-5 h-5 text-red-600" />;
      title = 'Annulation tardive — Aucun remboursement';
      body = (
        <div className="space-y-2 text-sm">
          <p className="text-slate-700">
            Moins de 12h avant le départ. Aucun remboursement n'est possible.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700">Montant retenu</p>
            <p className="text-2xl font-bold text-red-700">{fmtAr(prix)}</p>
          </div>
          <p className="text-xs text-slate-500 italic">
            Astuce : si vous savez à l'avance que vous ne pourrez pas venir,
            annulez plus de 12h en amont pour récupérer au moins 50%.
          </p>
        </div>
      );
      confirmLabel = 'Annuler quand même';
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-l-4 flex items-center gap-3 ${toneClasses}`}
        >
          {icon}
          <div className="flex-1">
            <p className="font-semibold text-sm">{title}</p>
            {refund && (
              <span
                className={`inline-block text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded ${tonePill}`}
              >
                {refund.percent === 100
                  ? `> ${REFUND_POLICY.fullRefundHoursBefore}h avant départ`
                  : refund.percent > 0
                    ? `${REFUND_POLICY.partialRefundHoursBefore}h-${REFUND_POLICY.fullRefundHoursBefore}h avant départ`
                    : `< ${REFUND_POLICY.partialRefundHoursBefore}h avant départ`}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">{body}</div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Garder ma réservation
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
