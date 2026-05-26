import {
  ArrowRight,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  User as UserIcon,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  taxiBrousseApi,
  type SeatMap,
  type VoyageSearchResult,
} from '../../services/taxiBrousseApi';

export default function TaxiBrousseVoyage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colors = useColors();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [voyage, setVoyage] = useState<VoyageSearchResult | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<'wallet' | 'cash' | 'mobile_money'>('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ confirmCode: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [v, sm] = await Promise.all([
        taxiBrousseApi.getVoyage(id),
        taxiBrousseApi.getSeatMap(id),
      ]);
      setVoyage(v.data);
      setSeatMap(sm.data);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Voyage introuvable');
      navigate('/taxi-brousse');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBook = async () => {
    if (!voyage || !selectedSeat) return;
    if (paymentMode === 'wallet' && balance < voyage.prix) {
      alert(`Solde insuffisant. ${formatCurrency(balance)} disponible.`);
      return;
    }
    setSubmitting(true);
    try {
      // Create reservation
      const res = await taxiBrousseApi.createReservation(
        voyage.id,
        selectedSeat,
        voyage.prix,
      );
      // Immediate payment
      if (paymentMode === 'wallet') {
        await taxiBrousseApi.payReservation(res.data.id, 'wallet');
        await fetchBalance();
      } else {
        await taxiBrousseApi.payReservation(res.data.id, paymentMode);
      }
      setSuccess({ confirmCode: res.data.codeConfirmation });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Réservation échouée');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Voyage" />
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
            Réservation confirmée !
          </div>
          <div className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Place {selectedSeat} sur le voyage {voyage?.villeDepart} → {voyage?.villeArrivee}
          </div>
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: colors.background }}
          >
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              Code de confirmation
            </div>
            <div
              className="text-xl font-mono font-extrabold mt-1 tracking-wider"
              style={{ color: colors.primary }}
            >
              {success.confirmCode}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/taxi-brousse/reservations')}
              className="flex-1 py-3 rounded-xl font-bold text-white"
              style={{ background: colors.primary }}
            >
              Mes réservations
            </button>
            <button
              onClick={() => navigate('/taxi-brousse')}
              className="flex-1 py-3 rounded-xl font-semibold border"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Nouvelle recherche
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!voyage) return null;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Détails du voyage"
          subtitle={`${voyage.villeDepart} → ${voyage.villeArrivee}`}
        />

        <div className="px-5 mt-4 space-y-5">
          {/* Récap voyage */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold px-2 py-1 rounded-full uppercase"
                style={{ background: `${colors.primary}20`, color: colors.primary }}
              >
                {voyage.classe?.type || 'Standard'}
              </span>
              {voyage.cooperative?.nom && (
                <span className="text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}>
                  <Building2 size={12} />
                  {voyage.cooperative.nom}
                </span>
              )}
            </div>

            <div className="flex items-stretch gap-3">
              <div className="flex flex-col items-center pt-1">
                <MapPin size={16} style={{ color: colors.primary }} />
                <div className="flex-1 w-px my-1" style={{ background: colors.border }} />
                <MapPin size={16} style={{ color: '#10b981' }} />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    {voyage.villeDepart}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {voyage.localisationDepart}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.textSecondary }}>
                    <Clock size={12} />
                    {new Date(voyage.dateDepart).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}{' '}
                    · {voyage.heureDepart}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    {voyage.villeArrivee}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {voyage.localisationArrivee}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.textSecondary }}>
                    <Clock size={12} />
                    {new Date(voyage.dateArrivee).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}{' '}
                    · {voyage.heureArrivee}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: colors.border }}>
              <InfoRow
                icon={Car}
                label="Véhicule"
                value={`${voyage.voiture.marque || ''} ${voyage.voiture.modele || ''}`.trim() || voyage.voiture.matricule}
                sub={voyage.voiture.matricule}
                colors={colors}
              />
              <InfoRow
                icon={Users}
                label="Capacité"
                value={`${voyage.voiture.capacite} places`}
                sub={
                  voyage.placesDisponibles
                    ? `${voyage.placesDisponibles.placeLibre} libres`
                    : undefined
                }
                colors={colors}
              />
              {voyage.chauffeur && (
                <InfoRow
                  icon={UserIcon}
                  label="Chauffeur"
                  value={`${voyage.chauffeur.prenom} ${voyage.chauffeur.nom}`}
                  colors={colors}
                />
              )}
              {voyage.dureeEstimee && (
                <InfoRow
                  icon={Clock}
                  label="Durée estimée"
                  value={voyage.dureeEstimee}
                  colors={colors}
                />
              )}
            </div>
          </div>

          {/* Seat picker */}
          {seatMap && (
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
                Choisissez votre place
              </h3>
              <div className="card p-4">
                <div className="flex items-center justify-center gap-4 mb-4 text-[11px]">
                  <Legend color={colors.primary} label="Sélectionnée" />
                  <Legend color={colors.border} label="Libre" border />
                  <Legend color={colors.error} label="Réservée" />
                </div>

                {/* Chauffeur indicator */}
                <div
                  className="flex justify-end mb-3 pb-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                    style={{
                      background: `${colors.textSecondary}15`,
                      color: colors.textSecondary,
                    }}
                  >
                    <UserIcon size={12} />
                    Chauffeur
                  </div>
                </div>

                {/* Seats grid - 4 cols typical for taxi-brousse */}
                <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
                  {seatMap.seats.map((seat) => {
                    const isSelected = selectedSeat === seat.numPlace;
                    const isReserved = seat.isReserved;
                    return (
                      <button
                        key={seat.numPlace}
                        disabled={isReserved}
                        onClick={() => setSelectedSeat(seat.numPlace)}
                        className="aspect-square rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all"
                        style={{
                          background: isReserved
                            ? `${colors.error}30`
                            : isSelected
                              ? colors.primary
                              : 'transparent',
                          borderColor: isReserved
                            ? colors.error
                            : isSelected
                              ? colors.primary
                              : colors.border,
                          color: isReserved
                            ? colors.error
                            : isSelected
                              ? '#fff'
                              : colors.text,
                          cursor: isReserved ? 'not-allowed' : 'pointer',
                          opacity: isReserved ? 0.6 : 1,
                        }}
                      >
                        {seat.numPlace}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center gap-4 mt-4 text-xs" style={{ color: colors.textSecondary }}>
                  <span>
                    {seatMap.availableCount}/{seatMap.capacity} libres
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Payment + Book */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Mode de paiement
            </h3>
            <div className="space-y-2">
              <PaymentOption
                id="wallet"
                title="Wallet M'Paye"
                description={`Solde : ${formatCurrency(balance)}`}
                icon={Wallet}
                selected={paymentMode === 'wallet'}
                onSelect={() => setPaymentMode('wallet')}
                colors={colors}
              />
              <PaymentOption
                id="mobile_money"
                title="Mobile Money"
                description="MVola, Orange Money, Airtel"
                icon={CreditCard}
                selected={paymentMode === 'mobile_money'}
                onSelect={() => setPaymentMode('mobile_money')}
                colors={colors}
              />
              <PaymentOption
                id="cash"
                title="Espèces"
                description="Paiement à bord"
                icon={Wallet}
                selected={paymentMode === 'cash'}
                onSelect={() => setPaymentMode('cash')}
                colors={colors}
              />
            </div>
          </section>

          {/* Sticky CTA */}
          <div className="card p-4 sticky bottom-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  Total
                </div>
                <div className="text-2xl font-extrabold" style={{ color: colors.text }}>
                  {formatCurrency(voyage.prix)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  Place
                </div>
                <div className="text-lg font-bold" style={{ color: colors.primary }}>
                  {selectedSeat ? `n°${selectedSeat}` : '—'}
                </div>
              </div>
            </div>
            <button
              onClick={handleBook}
              disabled={!selectedSeat || submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
              style={{
                background: selectedSeat ? colors.primary : '#475569',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Réserver et payer
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

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
  colors,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  colors: any;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0" style={{ color: colors.primary }} />
      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: colors.textSecondary }}>
          {label}
        </div>
        <div className="text-sm font-semibold truncate" style={{ color: colors.text }}>
          {value}
        </div>
        {sub && (
          <div className="text-[11px]" style={{ color: colors.textSecondary }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded"
        style={
          border
            ? { borderColor: color, borderWidth: 2 }
            : { background: color }
        }
      />
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function PaymentOption({
  id,
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  colors,
}: {
  id: string;
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
