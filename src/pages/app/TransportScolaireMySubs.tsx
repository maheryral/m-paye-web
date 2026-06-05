// src/pages/app/TransportScolaireMySubs.tsx — mes abonnements (web)

import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  School,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  transportScolaireApi,
  type SubscriptionStatus,
  type TransportSubscription,
} from '../../services/transportScolaireApi';

const STATUS_META: Record<SubscriptionStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING_PAYMENT: { label: 'À payer', color: '#b45309', bg: '#fef3c7', icon: Clock },
  ACTIVE:          { label: 'Actif',   color: '#047857', bg: '#d1fae5', icon: CheckCircle2 },
  EXPIRED:         { label: 'Expiré',  color: '#475569', bg: '#e2e8f0', icon: AlertCircle },
  CANCELLED:       { label: 'Annulé',  color: '#b91c1c', bg: '#fee2e2', icon: Ban },
};

const fmtAr = (n: number | string) => Number(n).toLocaleString('fr-FR') + ' Ar';
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function TransportScolaireMySubs() {
  const colors = useColors();
  const navigate = useNavigate();
  const { fetchBalance } = useWallet();

  const [items, setItems] = useState<TransportSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TransportSubscription | null>(null);
  const [banner, setBanner] = useState<{ title: string; msg: string; tone: 'success' | 'warning' | 'error' } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await transportScolaireApi.listSubscriptions();
      setItems(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePay = async (sub: TransportSubscription) => {
    if (!confirm(`Payer ${fmtAr(sub.prixApplique)} avec votre wallet ?`)) return;
    setBusyId(sub.id);
    try {
      await transportScolaireApi.paySubscription(sub.id);
      await load();
      void fetchBalance?.();
      setBanner({
        title: 'Paiement réussi ✅',
        msg: 'Abonnement activé.',
        tone: 'success',
      });
    } catch (e: any) {
      setBanner({
        title: 'Paiement échoué',
        msg: e?.response?.data?.message ?? 'Réessayez',
        tone: 'error',
      });
    } finally {
      setBusyId(null);
      setTimeout(() => setBanner(null), 6000);
    }
  };

  const doCancel = async (sub: TransportSubscription) => {
    setBusyId(sub.id);
    setCancelTarget(null);
    try {
      const res = await transportScolaireApi.cancelSubscription(sub.id);
      await load();
      void fetchBalance?.();
      const r = res.data.refund;
      if (r.amount > 0) {
        setBanner({
          title: 'Annulé — remboursé ✅',
          msg: `${fmtAr(r.amount)} recrédités. ${r.retained > 0 ? fmtAr(r.retained) + ' retenus.' : ''}`,
          tone: 'success',
        });
      } else if (sub.status === 'PENDING_PAYMENT') {
        setBanner({ title: 'Annulé', msg: 'Aucun paiement à rembourser.', tone: 'success' });
      } else {
        setBanner({ title: 'Annulé', msg: 'Aucun remboursement (période consommée).', tone: 'warning' });
      }
    } catch (e: any) {
      setBanner({
        title: 'Annulation échouée',
        msg: e?.response?.data?.message ?? 'Erreur',
        tone: 'error',
      });
    } finally {
      setBusyId(null);
      setTimeout(() => setBanner(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Mes abonnements"
          subtitle="Transport scolaire"
          RightIcon={CreditCard}
        />

        <div className="px-4 mt-6">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textSecondary }} />
              <p className="font-semibold mb-1" style={{ color: colors.text }}>
                Aucun abonnement
              </p>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Trouvez une école et abonnez vos enfants.
              </p>
              <button
                onClick={() => navigate('/transport-scolaire/schools')}
                className="px-5 py-2.5 rounded-lg text-white font-medium"
                style={{ background: colors.primary }}
              >
                Trouver une école
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((sub) => (
                <SubCard
                  key={sub.id}
                  sub={sub}
                  busy={busyId === sub.id}
                  onPay={() => handlePay(sub)}
                  onCancel={() => setCancelTarget(sub)}
                  colors={colors}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] rounded-xl shadow-lg p-4 flex items-start gap-3 ${
            banner.tone === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : banner.tone === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          {banner.tone === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5" />
            : banner.tone === 'warning' ? <AlertCircle className="w-5 h-5 mt-0.5" />
            : <Ban className="w-5 h-5 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{banner.title}</p>
            <p className="text-xs mt-0.5">{banner.msg}</p>
          </div>
          <button onClick={() => setBanner(null)}>
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

      {cancelTarget && (
        <CancelDialog
          sub={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => doCancel(cancelTarget)}
        />
      )}
    </div>
  );
}

function SubCard({
  sub, busy, onPay, onCancel, colors,
}: {
  sub: TransportSubscription;
  busy: boolean;
  onPay: () => void;
  onCancel: () => void;
  colors: any;
}) {
  const meta = STATUS_META[sub.status];
  const StatusIcon = meta.icon;
  const childrenLabel =
    sub.studentLinks
      ?.map((l) => `${l.student.prenom} ${l.student.nom.charAt(0)}.`)
      .join(', ') ?? '—';
  const dim = sub.status === 'CANCELLED' || sub.status === 'EXPIRED';

  return (
    <div className={`card p-4 ${dim ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold"
          style={{ background: meta.bg, color: meta.color }}
        >
          <StatusIcon className="w-3 h-3" />
          {meta.label}
        </span>
        <span className="text-xs font-mono" style={{ color: colors.textSecondary }}>
          {sub.codeAbonnement}
        </span>
      </div>

      <p className="font-bold" style={{ color: colors.text }}>
        {sub.route?.nom ?? '—'}
      </p>
      <p className="text-xs mb-2 flex items-center gap-1" style={{ color: colors.textSecondary }}>
        <School className="w-3 h-3" />
        {sub.route?.school?.nom} · {sub.route?.school?.ville}
      </p>

      <div className="border-t pt-3 space-y-1.5" style={{ borderColor: colors.border }}>
        <InfoLine icon={Users} text={childrenLabel} colors={colors} />
        <InfoLine
          icon={CreditCard}
          text={`${sub.pricingPlan?.label ?? '—'} · ${fmtAr(sub.prixApplique)}`}
          colors={colors}
        />
        <InfoLine
          icon={Calendar}
          text={`${fmtDate(sub.dateDebut)} → ${fmtDate(sub.dateFin)}`}
          colors={colors}
        />
        {sub.pickupStop && (
          <InfoLine
            icon={MapPin}
            text={`Arrêt : ${sub.pickupStop.nom}${sub.pickupStop.heurePassage ? ' (' + sub.pickupStop.heurePassage + ')' : ''}`}
            colors={colors}
          />
        )}
      </div>

      {sub.status === 'PENDING_PAYMENT' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2 rounded-lg border font-medium text-sm"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Annuler
          </button>
          <button
            onClick={onPay}
            disabled={busy}
            className="flex-1 py-2 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-1.5"
            style={{ background: colors.primary }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer'}
          </button>
        </div>
      )}
      {sub.status === 'ACTIVE' && (
        <button
          onClick={onCancel}
          disabled={busy}
          className="w-full mt-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium text-sm"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Annuler l'abonnement"}
        </button>
      )}
      {sub.status === 'CANCELLED' && sub.refundedAmount != null && Number(sub.refundedAmount) > 0 && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
          Remboursé : <strong>{fmtAr(sub.refundedAmount)}</strong>
        </div>
      )}
    </div>
  );
}

function InfoLine({ icon: Icon, text, colors }: any) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function CancelDialog({
  sub, onClose, onConfirm,
}: {
  sub: TransportSubscription;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // Preview pro-rata côté front (même formule que backend)
  const dureeJours = sub.pricingPlan?.dureeJours ?? 30;
  const remainingMs = new Date(sub.dateFin).getTime() - Date.now();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const ratio = Math.max(0, Math.min(1, remainingDays / dureeJours));
  const refundAmount = Math.round(Number(sub.prixApplique) * ratio);
  const retained = Number(sub.prixApplique) - refundAmount;

  const isPending = sub.status === 'PENDING_PAYMENT';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <p className="font-semibold text-slate-900">
            {isPending ? "Annuler l'abonnement" : "Confirmer l'annulation"}
          </p>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {isPending ? (
            <p className="text-slate-700">
              L'abonnement n'a pas été payé. L'annulation est gratuite.
            </p>
          ) : refundAmount > 0 ? (
            <>
              <p className="text-slate-700">
                Annulation pro-rata : <strong>{remainingDays} jour(s)</strong> restant(s) sur{' '}
                <strong>{dureeJours}</strong>.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-emerald-700">Remboursé</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {fmtAr(refundAmount)}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">Retenu</p>
                  <p className="text-lg font-bold text-red-700">
                    {fmtAr(retained)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-700">
              Période entièrement consommée. <strong>Aucun remboursement</strong> possible.
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            Garder l'abonnement
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {isPending ? 'Annuler' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
