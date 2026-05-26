import {
  Ban,
  Cable,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  MapPin,
  Search,
  Ticket,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { telepheriqueApi, type TLPTicket } from '../../services/telepheriqueApi';

const TICKET_STATUS_META: Record<
  string,
  { color: string; label: string; icon: LucideIcon }
> = {
  valide: { color: '#10b981', label: 'Valide', icon: CheckCircle2 },
  utilise: { color: '#3b82f6', label: 'Utilisé', icon: CheckCircle2 },
  expire: { color: '#9ca3af', label: 'Expiré', icon: Hourglass },
  annule: { color: '#ef4444', label: 'Annulé', icon: XCircle },
};

const PAYMENT_STATUS_META: Record<string, { color: string; label: string; icon: LucideIcon }> = {
  paye: { color: '#10b981', label: 'Payé', icon: CheckCircle2 },
  en_attente: { color: '#f59e0b', label: 'En attente', icon: Clock },
  annule: { color: '#9ca3af', label: 'Annulé', icon: Ban },
};

function metaTicket(s?: string) {
  return TICKET_STATUS_META[s?.toLowerCase() || ''] || TICKET_STATUS_META.valide;
}
function metaPayment(s?: string) {
  return PAYMENT_STATUS_META[s?.toLowerCase() || ''] || PAYMENT_STATUS_META.en_attente;
}

export default function TelepheriqueTickets() {
  const navigate = useNavigate();
  const colors = useColors();
  const [items, setItems] = useState<TLPTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<TLPTicket | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await telepheriqueApi.getMyTickets();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('Erreur tickets:', e?.response?.data || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePay = async (t: TLPTicket) => {
    if (!confirm(`Payer ${Number(t.prixPaye || 0).toLocaleString('fr-FR')} Ar avec votre wallet ?`))
      return;
    setBusyId(t.id);
    try {
      await telepheriqueApi.payTicket(t.id, 'wallet');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement échoué');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (t: TLPTicket) => {
    if (!confirm('Annuler ce ticket ?')) return;
    setBusyId(t.id);
    try {
      await telepheriqueApi.cancelTicket(t.id);
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
          title="Mes tickets"
          subtitle="Téléphérique"
          RightIcon={Search}
          onRightPress={() => navigate('/telepherique')}
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
                Aucun ticket
              </div>
              <div className="text-xs max-w-xs" style={{ color: colors.textSecondary }}>
                Achetez votre premier ticket de téléphérique depuis la liste des lignes.
              </div>
              <button
                onClick={() => navigate('/telepherique')}
                className="mt-3 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: colors.primary }}
              >
                Voir les lignes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((t) => {
                const tm = metaTicket(t.statusTicket);
                const pm = metaPayment(t.statusPaiement);
                const TStatusIcon = tm.icon;
                const PStatusIcon = pm.icon;
                const couleur = t.ligne?.couleur || colors.primary;
                const canPay = t.statusPaiement?.toLowerCase() === 'en_attente';
                const canCancel =
                  t.statusTicket?.toLowerCase() === 'valide' &&
                  t.statusPaiement?.toLowerCase() === 'en_attente';
                const isValid = t.statusTicket?.toLowerCase() === 'valide' && t.statusPaiement?.toLowerCase() === 'paye';

                return (
                  <div key={t.id} className="card overflow-hidden">
                    {/* Bandeau ligne */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: couleur }}
                    >
                      <div className="flex items-center gap-2 text-white text-sm font-bold min-w-0">
                        <Cable size={16} />
                        <span className="truncate">{t.ligne?.nom || 'Ligne téléphérique'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-bold text-white">
                        <TStatusIcon size={10} />
                        {tm.label.toUpperCase()}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Stations */}
                      <div className="flex items-stretch gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <MapPin size={14} style={{ color: couleur }} />
                          <div className="flex-1 w-px my-1" style={{ background: colors.border }} />
                          <MapPin size={14} style={{ color: '#10b981' }} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="text-sm font-semibold" style={{ color: colors.text }}>
                            {t.stationDepart?.nom || 'Départ'}
                          </div>
                          <div className="text-sm font-semibold" style={{ color: colors.text }}>
                            {t.stationArrivee?.nom || 'Arrivée'}
                          </div>
                        </div>
                      </div>

                      {/* Tarif + paiement */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: colors.border }}>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                            Tarif
                          </div>
                          <div className="text-sm font-semibold" style={{ color: colors.text }}>
                            {t.tarif?.libelle || t.tarif?.type || '—'}
                          </div>
                          <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                            Valide jusqu'au {new Date(t.dateValidite).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                            Paiement
                          </div>
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
                            style={{ background: `${pm.color}20`, color: pm.color }}
                          >
                            <PStatusIcon size={10} />
                            {pm.label.toUpperCase()}
                          </div>
                          <div className="text-base font-extrabold mt-0.5" style={{ color: colors.text }}>
                            {Number(t.prixPaye || 0).toLocaleString('fr-FR')} Ar
                          </div>
                        </div>
                      </div>

                      {/* QR */}
                      {isValid && t.codeQR && (
                        <button
                          onClick={() => setZoom(t)}
                          className="w-full flex items-center gap-3 p-2 rounded-xl border hover:bg-white/5"
                          style={{ borderColor: colors.border }}
                        >
                          <div className="bg-white p-1.5 rounded-lg shrink-0">
                            <QRCodeCanvas value={t.codeQR} size={56} level="M" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-semibold" style={{ color: colors.text }}>
                              Présenter le QR
                            </div>
                            <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                              Cliquez pour agrandir
                            </div>
                          </div>
                        </button>
                      )}

                      {(canPay || canCancel) && (
                        <div className="flex gap-2">
                          {canPay && (
                            <button
                              onClick={() => handlePay(t)}
                              disabled={busyId === t.id}
                              className="flex-1 py-2 rounded-lg font-semibold text-white text-sm flex items-center justify-center"
                              style={{ background: colors.primary }}
                            >
                              {busyId === t.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                'Payer'
                              )}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(t)}
                              disabled={busyId === t.id}
                              className="flex-1 py-2 rounded-lg font-semibold text-sm border"
                              style={{ borderColor: colors.error, color: colors.error }}
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Zoom QR */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-5"
          onClick={() => setZoom(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-bold text-slate-900">{zoom.ligne?.nom}</div>
              <button onClick={() => setZoom(null)}>
                <X size={22} className="text-slate-500" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <QRCodeCanvas value={zoom.codeQR} size={260} level="H" />
            </div>
            <div className="text-xs text-slate-600 mb-1">
              {zoom.stationDepart?.nom} → {zoom.stationArrivee?.nom}
            </div>
            <div className="font-mono text-xs text-slate-500 break-all">{zoom.codeQR}</div>
          </div>
        </div>
      )}
    </div>
  );
}
