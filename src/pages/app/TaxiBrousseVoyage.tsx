import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Phone,
  Star,
  User as UserIcon,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  taxiBrousseApi,
  type SeatMap,
  type VoyageSearchResult,
} from '../../services/taxiBrousseApi';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Skeleton,
} from '../../ui';

type PayMethod = 'wallet' | 'cash' | 'mobile_money';

export default function TaxiBrousseVoyage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [voyage, setVoyage] = useState<VoyageSearchResult | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ code: string } | null>(null);

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

  const book = async () => {
    if (!voyage || !selectedSeat) return;
    if (payMethod === 'wallet' && balance < voyage.prix) {
      return alert(`Solde insuffisant — ${formatCurrency(balance)} disponible`);
    }
    setSubmitting(true);
    try {
      const r = await taxiBrousseApi.createReservation(voyage.id, selectedSeat, voyage.prix);
      await taxiBrousseApi.payReservation(r.data.id, payMethod);
      if (payMethod === 'wallet') await fetchBalance();
      setSuccess({ code: r.data.codeConfirmation });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Réservation échouée');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Détails du voyage" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <Card padding="lg" className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-5">
            <CheckCircle2 size={56} className="text-success-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Réservation confirmée !</h2>
          <p className="text-sm text-ink-muted mb-5">
            Place <span className="text-brand-300 font-bold">n°{selectedSeat}</span> sur le
            voyage {voyage?.villeDepart} → {voyage?.villeArrivee}
          </p>

          <div className="rounded-2xl bg-gradient-brand-soft border border-brand-500/30 p-5 mb-6">
            <div className="text-xs text-ink-muted">Code de confirmation</div>
            <div className="text-3xl font-mono font-bold tracking-widest text-brand-300 mt-2">
              {success.code}
            </div>
            <div className="text-[11px] text-ink-dim mt-2">
              Présentez ce code au chauffeur le jour du départ
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => navigate('/taxi-brousse')}
            >
              Nouvelle recherche
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => navigate('/taxi-brousse/reservations')}
            >
              Mes réservations
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!voyage) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${voyage.villeDepart} → ${voyage.villeArrivee}`}
        subtitle="Sélectionnez votre place et confirmez votre réservation"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/taxi-brousse')}
          >
            Retour aux résultats
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Main (2/3) === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Itinerary */}
          <Card padding="md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center text-white">
                <Bus size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold">Itinéraire</h3>
                <p className="text-xs text-ink-muted">
                  {voyage.cooperative?.nom} · {voyage.classe?.type}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center pt-4 border-t border-bg-border">
              {/* Departure */}
              <div className="text-center">
                <div className="text-3xl font-bold tracking-tight">
                  {voyage.heureDepart}
                </div>
                <div className="text-xs text-ink-muted mt-1 font-semibold">
                  {voyage.villeDepart}
                </div>
                <div className="text-[10px] text-ink-dim mt-0.5 truncate">
                  {voyage.localisationDepart}
                </div>
              </div>

              {/* Connector */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-300 shrink-0" />
                <div className="flex-1 h-0.5 border-t-2 border-dashed border-bg-border relative">
                  {voyage.dureeEstimee && (
                    <Badge
                      tone="brand"
                      className="absolute left-1/2 -translate-x-1/2 -top-3 whitespace-nowrap"
                    >
                      <Clock size={9} className="mr-0.5" />
                      {voyage.dureeEstimee}
                    </Badge>
                  )}
                </div>
                <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              </div>

              {/* Arrival */}
              <div className="text-center">
                <div className="text-3xl font-bold tracking-tight">
                  {voyage.heureArrivee}
                </div>
                <div className="text-xs text-ink-muted mt-1 font-semibold">
                  {voyage.villeArrivee}
                </div>
                <div className="text-[10px] text-ink-dim mt-0.5 truncate">
                  {voyage.localisationArrivee}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-ink-muted">
              <Calendar size={12} />
              <span>
                {new Date(voyage.dateDepart).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </Card>

          {/* Vehicle info */}
          <Card padding="md">
            <h3 className="text-base font-bold mb-4">Véhicule & équipage</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoTile
                icon={Bus}
                label="Modèle"
                value={`${voyage.voiture?.marque || ''} ${voyage.voiture?.modele || ''}`.trim() || '—'}
                sub={voyage.voiture?.matricule}
              />
              <InfoTile
                icon={Users}
                label="Capacité"
                value={`${voyage.voiture?.capacite || 0} places`}
                sub={
                  voyage.placesDisponibles
                    ? `${voyage.placesDisponibles.placeLibre} libres`
                    : undefined
                }
              />
              {voyage.chauffeur && (
                <InfoTile
                  icon={UserIcon}
                  label="Chauffeur"
                  value={`${voyage.chauffeur.prenom} ${voyage.chauffeur.nom}`}
                />
              )}
              {voyage.cooperative?.telephone && (
                <InfoTile
                  icon={Phone}
                  label="Contact"
                  value={voyage.cooperative.telephone}
                />
              )}
            </div>
          </Card>

          {/* Seat picker */}
          {seatMap && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Choisissez votre place</h3>
                <span className="text-xs text-ink-muted">
                  {seatMap.availableCount}/{seatMap.capacity} libres
                </span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mb-5 text-[11px]">
                <Legend label="Sélectionnée" colorClass="bg-brand-500" />
                <Legend label="Libre" border />
                <Legend label="Réservée" colorClass="bg-danger-500/30 border border-danger-500" />
              </div>

              {/* Bus body visualization */}
              <div className="max-w-md mx-auto">
                {/* Driver hint */}
                <div className="flex justify-end mb-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-bg-elevated text-ink-muted text-[10px] font-semibold">
                    <UserIcon size={11} />
                    Chauffeur
                  </div>
                </div>

                {/* Seats grid */}
                <div className="p-4 rounded-2xl border-2 border-bg-border bg-bg-elevated/30">
                  <div className="grid grid-cols-4 gap-2">
                    {seatMap.seats.map((seat) => {
                      const isSelected = selectedSeat === seat.numPlace;
                      const isReserved = seat.isReserved;
                      return (
                        <button
                          key={seat.numPlace}
                          disabled={isReserved}
                          onClick={() => setSelectedSeat(seat.numPlace)}
                          className={`aspect-square rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all ${
                            isReserved
                              ? 'bg-danger-500/20 border-danger-500/50 text-danger-400 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'bg-gradient-brand border-brand-500 text-white shadow-glow-soft scale-105'
                                : 'border-bg-border bg-bg-surface text-ink hover:border-brand-500 hover:scale-105'
                          }`}
                        >
                          {seat.numPlace}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Payment */}
          <Card padding="md">
            <h3 className="text-base font-bold mb-4">Mode de paiement</h3>
            <div className="space-y-2">
              <PayOption
                id="wallet"
                title="Wallet M'Paye"
                description={`Solde : ${formatCurrency(balance)}`}
                icon={Wallet}
                selected={payMethod === 'wallet'}
                onSelect={() => setPayMethod('wallet')}
              />
              <PayOption
                id="mobile_money"
                title="Mobile Money"
                description="MVola, Orange Money, Airtel"
                icon={CreditCard}
                selected={payMethod === 'mobile_money'}
                onSelect={() => setPayMethod('mobile_money')}
              />
              <PayOption
                id="cash"
                title="Espèces à bord"
                description="Payez directement au chauffeur"
                icon={Wallet}
                selected={payMethod === 'cash'}
                onSelect={() => setPayMethod('cash')}
              />
            </div>
          </Card>
        </div>

        {/* === Booking summary (1/3, sticky) === */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card padding="md">
            <h3 className="text-sm font-bold mb-4">Récapitulatif</h3>

            <div className="space-y-3 mb-5 pb-5 border-b border-bg-border">
              <Row label="Trajet">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-semibold">{voyage.villeDepart}</span>
                  <ArrowRight size={11} className="text-ink-dim" />
                  <span className="font-semibold">{voyage.villeArrivee}</span>
                </div>
              </Row>
              <Row label="Classe">
                <Badge tone="brand">{voyage.classe?.type || 'Standard'}</Badge>
              </Row>
              <Row label="Place">
                {selectedSeat ? (
                  <Badge tone="success">n°{selectedSeat}</Badge>
                ) : (
                  <span className="text-xs text-ink-dim italic">À choisir</span>
                )}
              </Row>
              <Row label="Paiement">
                <span className="text-xs font-semibold capitalize">
                  {payMethod === 'wallet' ? 'Wallet' : payMethod === 'mobile_money' ? 'Mobile Money' : 'Espèces'}
                </span>
              </Row>
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-ink-muted">Total à payer</span>
              <span className="text-3xl font-bold tracking-tight">
                {Number(voyage.prix).toLocaleString('fr-FR')}{' '}
                <span className="text-base font-semibold">Ar</span>
              </span>
            </div>
            <div className="text-[10px] text-ink-dim mb-5">Sans frais additionnels</div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={!selectedSeat}
              icon={Star}
              onClick={book}
            >
              {selectedSeat ? `Réserver place ${selectedSeat}` : 'Choisir une place'}
            </Button>

            <div className="text-[10px] text-ink-dim text-center mt-3">
              Annulation possible jusqu'à 24h avant le départ
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-bg-elevated/50 border border-bg-border">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-brand-300" />
        <span className="text-[10px] text-ink-dim uppercase tracking-wider font-bold">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold truncate">{value}</div>
      {sub && <div className="text-[10px] text-ink-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function Legend({
  label,
  colorClass,
  border,
}: {
  label: string;
  colorClass?: string;
  border?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-3 h-3 rounded ${
          border ? 'border-2 border-bg-border' : colorClass
        }`}
      />
      <span className="text-ink-muted">{label}</span>
    </div>
  );
}

function PayOption({
  id,
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
}: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-id={id}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
        selected
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-bg-border bg-bg-elevated/40 hover:border-ink-dim'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          selected ? 'bg-gradient-brand text-white' : 'bg-bg-elevated text-brand-300'
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-ink-muted mt-0.5">{description}</div>
      </div>
      {selected && <CheckCircle2 size={18} className="text-brand-300" />}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
