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
import SeatPlanView from '../../components/SeatPlanView';
import RouteMap from '../../components/RouteMap';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Skeleton,
} from '../../ui';

type PayMethod = 'wallet' | 'cash' | 'mobile_money' | 'card';

export default function TaxiBrousseVoyage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [voyage, setVoyage] = useState<VoyageSearchResult | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('wallet');
  // Méthode de paiement de l'acompte 50% quand "Espèces" est choisi
  const [advanceMethod, setAdvanceMethod] = useState<'wallet' | 'mobile_money' | 'card'>('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ seats: number[]; count: number } | null>(
    null,
  );

  const toggleSeat = (n: number) =>
    setSelectedSeats((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n],
    );

  const totalPrice = voyage ? Number(voyage.prix) * selectedSeats.length : 0;
  // Espèces → acompte 50 % maintenant, reste en espèces à bord
  const isCash = payMethod === 'cash';
  const advance = Math.round(totalPrice * 0.5);
  const amountNow = isCash ? advance : totalPrice;
  // Méthode qui paie réellement maintenant (wallet/mobile money)
  const payNow: 'wallet' | 'mobile_money' | 'card' = isCash
    ? advanceMethod
    : (payMethod as 'wallet' | 'mobile_money' | 'card');

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
    if (!voyage || selectedSeats.length === 0) return;
    // On ne paie maintenant que l'acompte si espèces ; vérif solde sur ce montant
    if (payNow === 'wallet' && balance < amountNow) {
      return alert(`Solde insuffisant — ${formatCurrency(balance)} disponible`);
    }
    setSubmitting(true);
    try {
      const r = await taxiBrousseApi.createReservationBatch(
        voyage.id,
        selectedSeats,
        voyage.prix,
      );
      const ids = r.data.map((res) => res.id);
      await taxiBrousseApi.payReservationBatch(ids, payMethod, advanceMethod);
      if (payNow === 'wallet') await fetchBalance();
      setSuccess({ seats: [...selectedSeats], count: selectedSeats.length });
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
            {success.count} place(s){' '}
            <span className="text-brand-300 font-bold">
              n°{success.seats.join(', ')}
            </span>{' '}
            sur le voyage {voyage?.villeDepart} → {voyage?.villeArrivee}
          </p>

          <div className="rounded-2xl bg-gradient-brand-soft border border-brand-500/30 p-5 mb-6">
            <div className="text-xs text-ink-muted">
              {success.count} place(s) réservée(s) et payée(s)
            </div>
            <div className="text-3xl font-mono font-bold tracking-widest text-brand-300 mt-2">
              {success.seats.map((s) => `n°${s}`).join(' · ')}
            </div>
            <div className="text-[11px] text-ink-dim mt-2">
              Retrouvez vos codes de confirmation dans « Mes réservations »
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

          {/* Carte itinéraire */}
          <Card padding="md">
            <h3 className="text-base font-bold mb-3">Itinéraire sur la carte</h3>
            <RouteMap
              height={360}
              departure={{
                lat: voyage.latitudeDepart,
                lng: voyage.longitudeDepart,
                label: voyage.localisationDepart,
              }}
              arrival={{
                lat: voyage.latitudeArrivee,
                lng: voyage.longitudeArrivee,
                label: voyage.localisationArrivee,
              }}
            />
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
                <h3 className="text-base font-bold">
                  Choisissez vos places
                  {selectedSeats.length > 0 && (
                    <span className="text-brand-300">
                      {' '}
                      ({selectedSeats.length})
                    </span>
                  )}
                </h3>
                <span className="text-xs text-ink-muted">
                  {seatMap.availableCount}/{seatMap.capacity} libres
                </span>
              </div>

              <div className="p-4 rounded-2xl border-2 border-bg-border bg-bg-elevated/30 overflow-auto">
                <SeatPlanView
                  layout={seatMap.layout}
                  seatPositions={seatMap.seatPositions}
                  seats={seatMap.seats}
                  selectedSeats={selectedSeats}
                  onSelectSeat={toggleSeat}
                />
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
                id="card"
                title="Carte bancaire"
                description="Débit sur votre carte par défaut"
                icon={CreditCard}
                selected={payMethod === 'card'}
                onSelect={() => setPayMethod('card')}
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
                description="Acompte 50% maintenant, le reste en espèces"
                icon={Wallet}
                selected={payMethod === 'cash'}
                onSelect={() => setPayMethod('cash')}
              />
            </div>

            {/* Acompte 50% : choix de la méthode quand espèces */}
            {isCash && (
              <div className="mt-4 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold">Acompte à payer maintenant (50%)</span>
                  <span className="font-extrabold text-brand-300">
                    {advance.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
                <div className="mb-3 text-xs text-ink-muted">
                  Reste {(totalPrice - advance).toLocaleString('fr-FR')} Ar à régler
                  en espèces au chauffeur.
                </div>
                <div className="text-[11px] font-semibold text-ink-muted mb-1.5">
                  Payer l'acompte avec
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdvanceMethod('wallet')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      advanceMethod === 'wallet'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-bg-border text-ink-muted'
                    }`}
                  >
                    Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceMethod('mobile_money')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      advanceMethod === 'mobile_money'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-bg-border text-ink-muted'
                    }`}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceMethod('card')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      advanceMethod === 'card'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-bg-border text-ink-muted'
                    }`}
                  >
                    Carte
                  </button>
                </div>
              </div>
            )}
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
              <Row label="Places">
                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {[...selectedSeats]
                      .sort((a, b) => a - b)
                      .map((s) => (
                        <Badge key={s} tone="success">
                          n°{s}
                        </Badge>
                      ))}
                  </div>
                ) : (
                  <span className="text-xs text-ink-dim italic">À choisir</span>
                )}
              </Row>
              <Row label="Paiement">
                <span className="text-xs font-semibold capitalize">
                  {payMethod === 'wallet'
                    ? 'Wallet'
                    : payMethod === 'card'
                      ? 'Carte'
                      : payMethod === 'mobile_money'
                        ? 'Mobile Money'
                        : 'Espèces'}
                </span>
              </Row>
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-ink-muted">
                {isCash ? 'Acompte à payer maintenant' : 'Total à payer'}
              </span>
              <span className="text-3xl font-bold tracking-tight">
                {amountNow.toLocaleString('fr-FR')}{' '}
                <span className="text-base font-semibold">Ar</span>
              </span>
            </div>
            <div className="text-[10px] text-ink-dim mb-5">
              {isCash
                ? `Total ${totalPrice.toLocaleString('fr-FR')} Ar · reste ${(totalPrice - advance).toLocaleString('fr-FR')} Ar en espèces à bord`
                : selectedSeats.length > 1
                  ? `${Number(voyage.prix).toLocaleString('fr-FR')} Ar × ${selectedSeats.length} places`
                  : 'Sans frais additionnels'}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={selectedSeats.length === 0}
              icon={Star}
              onClick={book}
            >
              {selectedSeats.length > 0
                ? `Réserver ${selectedSeats.length} place(s)`
                : 'Choisir une place'}
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
