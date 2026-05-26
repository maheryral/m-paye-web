import {
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
import {
  taxiBrousseApi,
  type Reservation,
} from '../../services/taxiBrousseApi';

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
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement échoué');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (r: Reservation) => {
    if (!confirm('Annuler cette réservation ?')) return;
    setBusyId(r.id);
    try {
      await taxiBrousseApi.cancelReservation(r.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Annulation échouée');
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
                const canPay =
                  !paid &&
                  ['EN_ATTENTE', 'en_attente'].includes(r.statusPaiement) &&
                  ['CONFIRMEE', 'EN_ATTENTE', 'confirmee', 'en_attente'].includes(r.statusReservation);
                const canCancel = ['EN_ATTENTE', 'CONFIRMEE', 'en_attente', 'confirmee'].includes(
                  r.statusReservation,
                );

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
    </div>
  );
}
