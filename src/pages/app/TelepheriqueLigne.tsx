import {
  ArrowRight,
  Cable,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  telepheriqueApi,
  type TLPLigne,
  type TLPStation,
  type TLPTarif,
} from '../../services/telepheriqueApi';

export default function TelepheriqueLigne() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colors = useColors();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [ligne, setLigne] = useState<TLPLigne | null>(null);
  const [stations, setStations] = useState<TLPStation[]>([]);
  const [tarifs, setTarifs] = useState<TLPTarif[]>([]);
  const [loading, setLoading] = useState(true);

  const [departId, setDepartId] = useState<string>('');
  const [arriveeId, setArriveeId] = useState<string>('');
  const [tarifId, setTarifId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'wallet' | 'cash' | 'mobile_money'>('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ codeQR: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [ligneRes, statRes, tarifRes] = await Promise.all([
        telepheriqueApi.getLigne(id),
        telepheriqueApi.getStationsByLigne(id),
        telepheriqueApi.getTarifsByLigne(id),
      ]);
      setLigne(ligneRes.data);
      const ss = Array.isArray(statRes.data) ? [...statRes.data] : [];
      ss.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      setStations(ss);
      const ts = Array.isArray(tarifRes.data) ? tarifRes.data : [];
      setTarifs(ts);
      // Defaults
      if (ss.length >= 2) {
        setDepartId(ss[0].id);
        setArriveeId(ss[ss.length - 1].id);
      }
      if (ts.length > 0) setTarifId(ts[0].id);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ligne introuvable');
      navigate('/telepherique');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedTarif = tarifs.find((t) => t.id === tarifId);

  const handleBuy = async () => {
    if (!ligne || !departId || !arriveeId || !tarifId) {
      alert('Sélectionnez départ, arrivée et tarif');
      return;
    }
    if (departId === arriveeId) {
      alert('Choisissez deux stations différentes');
      return;
    }
    if (paymentMode === 'wallet' && selectedTarif && balance < selectedTarif.prix) {
      alert(`Solde insuffisant. ${formatCurrency(balance)} disponible.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await telepheriqueApi.createTicket({
        ligneId: ligne.id,
        tarifId,
        stationDepartId: departId,
        stationArriveeId: arriveeId,
      });
      // Immediate payment
      try {
        await telepheriqueApi.payTicket(res.data.id, paymentMode);
        if (paymentMode === 'wallet') await fetchBalance();
      } catch (e: any) {
        // Si le paiement échoue, on quand même renvoie l'utilisateur vers ses tickets
        console.warn('Paiement échoué', e);
      }
      setSuccess({ codeQR: res.data.codeQR });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Achat échoué');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Ligne" />
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-5">
        <div className="card max-w-md w-full p-8 text-center">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: `${colors.success}20` }}
          >
            <CheckCircle2 size={56} style={{ color: colors.success }} />
          </div>
          <div className="text-2xl font-extrabold mb-2" style={{ color: colors.text }}>
            Ticket acheté !
          </div>
          <div className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Votre QR de validation est prêt dans "Mes tickets"
          </div>
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: colors.background }}
          >
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              Code ticket
            </div>
            <div
              className="text-lg font-mono font-extrabold mt-1 tracking-wider"
              style={{ color: colors.primary }}
            >
              {success.codeQR}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/telepherique/tickets')}
              className="flex-1 py-3 rounded-xl font-bold text-white"
              style={{ background: colors.primary }}
            >
              Voir mes tickets
            </button>
            <button
              onClick={() => navigate('/telepherique')}
              className="flex-1 py-3 rounded-xl font-semibold border"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ligne) return null;
  const couleur = ligne.couleur || colors.primary;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title={ligne.nom} subtitle={ligne.description || ligne.code} />

        <div className="px-5 mt-4 space-y-5">
          {/* Ligne summary */}
          <div className="card p-4 flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: couleur }}
            >
              {ligne.code || <Cable size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: colors.text }}>
                {ligne.nom}
              </div>
              <div className="flex items-center gap-3 text-xs mt-1 flex-wrap" style={{ color: colors.textSecondary }}>
                {ligne.longueurKm && <span>{ligne.longueurKm} km</span>}
                {ligne.dureeMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {ligne.dureeMinutes} min
                  </span>
                )}
                {stations.length > 0 && <span>{stations.length} stations</span>}
              </div>
            </div>
          </div>

          {/* Stations */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Stations
            </h3>
            {stations.length === 0 ? (
              <div className="card p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                Aucune station déclarée
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                      Départ
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      style={{
                        background: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                      value={departId}
                      onChange={(e) => setDepartId(e.target.value)}
                    >
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                      Arrivée
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      style={{
                        background: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                      value={arriveeId}
                      onChange={(e) => setArriveeId(e.target.value)}
                    >
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stations chain */}
                <div className="card p-4">
                  <div className="space-y-3">
                    {stations.map((s, i) => {
                      const isDepart = s.id === departId;
                      const isArrivee = s.id === arriveeId;
                      const active = isDepart || isArrivee;
                      return (
                        <div key={s.id} className="flex items-stretch gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                background: active ? couleur : colors.border,
                                boxShadow: active ? `0 0 0 4px ${couleur}30` : 'none',
                              }}
                            />
                            {i < stations.length - 1 && (
                              <div
                                className="flex-1 w-0.5 my-1"
                                style={{ background: colors.border }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm font-semibold truncate"
                                style={{ color: active ? colors.text : colors.textSecondary }}
                              >
                                {s.nom}
                              </span>
                              {isDepart && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${couleur}20`, color: couleur }}
                                >
                                  DÉPART
                                </span>
                              )}
                              {isArrivee && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `#10b98120`, color: '#10b981' }}
                                >
                                  ARRIVÉE
                                </span>
                              )}
                            </div>
                            <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                              <MapPin size={10} className="inline mr-1" />
                              {s.localisation}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Tarifs */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Choisissez un tarif
            </h3>
            {tarifs.length === 0 ? (
              <div className="card p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                Aucun tarif disponible
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tarifs.map((t) => {
                  const selected = tarifId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTarifId(t.id)}
                      className="card p-3.5 text-left transition-all"
                      style={{
                        borderColor: selected ? couleur : colors.border,
                        borderWidth: selected ? 2 : 1,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: couleur }}>
                          {t.type}
                        </div>
                        {selected && <CheckCircle2 size={18} style={{ color: couleur }} />}
                      </div>
                      <div className="text-sm font-semibold mt-1" style={{ color: colors.text }}>
                        {t.libelle}
                      </div>
                      <div className="text-lg font-extrabold mt-1" style={{ color: colors.text }}>
                        {Number(t.prix).toLocaleString('fr-FR')} Ar
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                        Valide {t.validiteHeures}h
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Paiement */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Mode de paiement
            </h3>
            <div className="space-y-2">
              <PaymentOption
                title="Wallet M'Paye"
                description={`Solde : ${formatCurrency(balance)}`}
                icon={Wallet}
                selected={paymentMode === 'wallet'}
                onSelect={() => setPaymentMode('wallet')}
                colors={colors}
              />
              <PaymentOption
                title="Mobile Money"
                description="MVola, Orange Money, Airtel"
                icon={CreditCard}
                selected={paymentMode === 'mobile_money'}
                onSelect={() => setPaymentMode('mobile_money')}
                colors={colors}
              />
              <PaymentOption
                title="Espèces"
                description="Paiement à la station"
                icon={Wallet}
                selected={paymentMode === 'cash'}
                onSelect={() => setPaymentMode('cash')}
                colors={colors}
              />
            </div>
          </section>

          {/* CTA */}
          <div className="card p-4 sticky bottom-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  Total
                </div>
                <div className="text-2xl font-extrabold" style={{ color: colors.text }}>
                  {selectedTarif ? formatCurrency(selectedTarif.prix) : '—'}
                </div>
              </div>
            </div>
            <button
              onClick={handleBuy}
              disabled={submitting || !selectedTarif || !departId || !arriveeId}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
              style={{
                background: selectedTarif ? colors.primary : '#475569',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Acheter le ticket
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  colors,
}: {
  title: string;
  description: string;
  icon: any;
  selected: boolean;
  onSelect: () => void;
  colors: any;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full card flex items-center gap-3 p-3.5 text-left transition-all"
      style={{
        borderColor: selected ? colors.primary : undefined,
        borderWidth: selected ? 2 : 1,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: selected ? colors.primary : `${colors.primary}20` }}
      >
        <Icon size={20} style={{ color: selected ? '#fff' : colors.primary }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: colors.text }}>
          {title}
        </div>
        <div className="text-xs" style={{ color: colors.textSecondary }}>
          {description}
        </div>
      </div>
      {selected && <CheckCircle2 size={20} style={{ color: colors.primary }} />}
    </button>
  );
}
