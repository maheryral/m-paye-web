// src/pages/app/VehicleRentalDetail.tsx
//
// Détail d'une annonce. Phase 1 : lecture seule.
// CTA "Réserver" affiche pour l'instant un message — la réservation arrive en phase 2.

import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Cog,
  Fuel,
  KeyRound,
  MapPin,
  Phone,
  Shield,
  Snowflake,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icônes Leaflet — Webpack ne résout pas les chemins par défaut.
// On utilise les CDN officiels pour le marker. Sinon affichage cassé.
const DEFAULT_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
import {
  resolveAssetUrl,
  vehicleRentalService,
  type RentalListing,
} from '../../services/api';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../ui';

function formatPrice(p: number | string) {
  return Number(p).toLocaleString('fr-FR') + ' Ar';
}

export default function VehicleRentalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RentalListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  // === Booking flow ===
  // 3 phases dans le modal : (1) choix dates → (2) récap booking → (3) succès.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(tomorrow);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingDays, setBookingDays] = useState(0);
  const [bookingConfirm, setBookingConfirm] = useState<string | null>(null);
  const [bookingPaid, setBookingPaid] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const computedDays = useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const computedTotal = useMemo(
    () => (data ? Number(data.pricePerDay) * computedDays : 0),
    [data, computedDays],
  );

  const openBooking = () => {
    setBookingId(null);
    setBookingTotal(0);
    setBookingDays(0);
    setBookingConfirm(null);
    setBookingPaid(false);
    setBookingError(null);
    setBookingOpen(true);
  };

  const submitBooking = async () => {
    if (!data) return;
    setBookingBusy(true);
    setBookingError(null);
    try {
      const res = await vehicleRentalService.book(data.id, {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      setBookingId(res.id);
      setBookingTotal(Number(res.totalAmount));
      setBookingDays(res.days);
      setBookingConfirm(res.confirmationCode);
    } catch (e: any) {
      setBookingError(e?.response?.data?.message || 'Impossible de créer la réservation.');
    } finally {
      setBookingBusy(false);
    }
  };

  const payBooking = async () => {
    if (!bookingId) return;
    setBookingBusy(true);
    setBookingError(null);
    try {
      await vehicleRentalService.pay(bookingId);
      setBookingPaid(true);
    } catch (e: any) {
      setBookingError(e?.response?.data?.message || 'Paiement refusé. Vérifiez votre solde.');
    } finally {
      setBookingBusy(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    vehicleRentalService
      .detail(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card padding="lg" className="text-center py-16">
        <Car size={48} className="mx-auto text-ink-muted" />
        <div className="mt-3 text-lg font-bold">Annonce introuvable</div>
        <Button
          variant="primary"
          size="md"
          icon={ArrowLeft}
          className="mt-4 mx-auto"
          onClick={() => navigate('/vehicle-rentals')}
        >
          Retour aux annonces
        </Button>
      </Card>
    );
  }

  const photos = data.vehicle.photos?.length ? data.vehicle.photos : [];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={`${data.vehicle.brand} ${data.vehicle.model}`}
        subtitle={data.partner.name}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/vehicle-rentals')}
          >
            Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Photos + infos véhicule === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Carrousel photos */}
          <Card padding="none" className="overflow-hidden">
            {photos.length > 0 ? (
              <>
                <img
                  src={resolveAssetUrl(photos[activePhoto]) || photos[activePhoto]}
                  alt=""
                  className="w-full h-72 object-cover"
                />
                {photos.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto bg-bg-elevated">
                    {photos.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          i === activePhoto ? 'border-brand-500' : 'border-transparent'
                        }`}
                      >
                        <img src={resolveAssetUrl(p) || p} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-72 bg-brand-500/10 flex items-center justify-center">
                <Car size={72} className="text-brand-300/70" />
              </div>
            )}
          </Card>

          {/* Caractéristiques */}
          <Card padding="md">
            <h3 className="text-sm font-bold mb-3">Caractéristiques</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SpecBlock icon={Users} label="Places" value={`${data.vehicle.seats}`} />
              <SpecBlock
                icon={Cog}
                label="Transmission"
                value={data.vehicle.transmission === 'automatic' ? 'Automatique' : 'Manuelle'}
              />
              <SpecBlock icon={Fuel} label="Carburant" value={data.vehicle.fuel} />
              <SpecBlock
                icon={Snowflake}
                label="Climatisation"
                value={data.vehicle.hasAC ? 'Oui' : 'Non'}
              />
              {data.vehicle.year && (
                <SpecBlock icon={Calendar} label="Année" value={String(data.vehicle.year)} />
              )}
              <SpecBlock icon={MapPin} label="Prise en charge" value={data.city} />
            </div>
          </Card>

          {/* Description */}
          {data.vehicle.description && (
            <Card padding="md">
              <h3 className="text-sm font-bold mb-2">À propos du véhicule</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{data.vehicle.description}</p>
            </Card>
          )}

          {/* Notes annonce */}
          {data.notes && (
            <Card padding="md">
              <h3 className="text-sm font-bold mb-2">Détails de l'annonce</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{data.notes}</p>
            </Card>
          )}
        </div>

        {/* === Sidebar : prix + partenaire === */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Prix + CTA */}
          <Card padding="lg">
            <div className="text-3xl font-extrabold">{formatPrice(data.pricePerDay)}</div>
            <div className="text-xs text-ink-muted">par jour</div>

            <div className="mt-4">
              {data.withDriver ? (
                <Badge tone="success">
                  <UserIcon size={11} className="mr-1" /> Avec chauffeur
                </Badge>
              ) : (
                <Badge tone="cyan">
                  <KeyRound size={11} className="mr-1" /> Self-drive
                </Badge>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <Row icon={Calendar} label="Durée minimum" value={`${data.minDays} jour(s)`} />
              {Number(data.deposit) > 0 && (
                <Row icon={Shield} label="Caution" value={formatPrice(data.deposit)} />
              )}
              <Row icon={MapPin} label="Lieu" value={data.city} />
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={Calendar}
              className="mt-5"
              onClick={openBooking}
            >
              Réserver
            </Button>
            <p className="text-[11px] text-ink-dim text-center mt-2">
              Paiement via votre wallet M'Paye — annulation jusqu'à 24h avant.
            </p>
          </Card>

          {/* Partenaire */}
          <Card padding="md">
            <h3 className="text-sm font-bold mb-3">Partenaire</h3>
            <div className="flex items-center gap-3">
              {data.partner.logoUrl ? (
                <img
                  src={resolveAssetUrl(data.partner.logoUrl) || data.partner.logoUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">
                  {data.partner.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{data.partner.name}</div>
                <div className="text-[11px] text-ink-muted truncate">{data.partner.city}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Phone size={13} className="text-ink-muted" />
              <a
                href={`tel:${data.partner.phone}`}
                className="text-brand-300 hover:text-brand-200 font-semibold"
              >
                {data.partner.phone}
              </a>
            </div>
            {data.partner.description && (
              <p className="text-[12px] text-ink-muted mt-3 leading-relaxed">
                {data.partner.description}
              </p>
            )}
          </Card>

          {/* Carte du lieu de prise en charge — affichée uniquement si coords */}
          {data.partner.latitude != null && data.partner.longitude != null && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-brand-300" />
                <h3 className="text-sm font-bold">Lieu de prise en charge</h3>
              </div>
              <div className="h-56 rounded-xl overflow-hidden">
                <MapContainer
                  center={[Number(data.partner.latitude), Number(data.partner.longitude)]}
                  zoom={14}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap"
                  />
                  <Marker
                    position={[Number(data.partner.latitude), Number(data.partner.longitude)]}
                    icon={DEFAULT_ICON}
                  >
                    <Popup>
                      <div className="text-sm font-bold">{data.partner.name}</div>
                      <div className="text-xs">{data.partner.city}</div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
                {data.partner.city} · contactez le partenaire pour les détails du
                point de rendez-vous exact.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* === Modal booking — 3 phases : dates → récap → succès === */}
      {bookingOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setBookingOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md card shadow-elevated rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">
                {bookingPaid
                  ? 'Réservation confirmée'
                  : bookingId
                  ? 'Confirmer le paiement'
                  : 'Réserver le véhicule'}
              </h3>
              <button
                onClick={() => setBookingOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-bg-subtle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Étape 1 — dates */}
            {!bookingId && !bookingPaid && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-ink-muted">Date de début</label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  className="input"
                />

                <label className="block text-xs font-semibold text-ink-muted">Date de fin</label>
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />

                <div className="p-3 rounded-xl bg-bg-elevated space-y-1.5 text-sm">
                  <div className="flex justify-between text-ink-muted">
                    <span>Durée</span>
                    <span className="text-ink font-semibold">{computedDays} jour(s)</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>
                      {formatPrice(data.pricePerDay)} × {computedDays}
                    </span>
                    <span className="text-ink font-semibold">{formatPrice(computedTotal)}</span>
                  </div>
                  {Number(data.deposit) > 0 && (
                    <div className="flex justify-between text-ink-muted text-xs">
                      <span>Caution sur place</span>
                      <span>{formatPrice(data.deposit)}</span>
                    </div>
                  )}
                  <div className="h-px bg-bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="font-bold">Total à payer</span>
                    <span className="font-bold text-base">{formatPrice(computedTotal)}</span>
                  </div>
                </div>

                {data.minDays > 1 && computedDays < data.minDays && (
                  <p className="text-xs text-danger-400 font-semibold">
                    ⚠ Durée minimum : {data.minDays} jour(s).
                  </p>
                )}
              </div>
            )}

            {/* Étape 2 — récap booking créée */}
            {bookingId && !bookingPaid && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-bg-elevated">
                  <div className="inline-flex items-center gap-2 text-success-400 text-xs font-bold">
                    <CheckCircle2 size={14} /> Réservation créée
                  </div>
                  <div className="mt-2 text-2xl font-extrabold tracking-widest">
                    {bookingConfirm}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">
                    {bookingDays} jour(s) · {data.city}
                  </div>
                  <div className="h-px bg-bg-border my-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">Montant à débiter</span>
                    <span className="text-base font-bold">{formatPrice(bookingTotal)}</span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-2">
                    Le montant sera prélevé sur votre wallet M'Paye.
                  </p>
                </div>
              </div>
            )}

            {/* Étape 3 — succès */}
            {bookingPaid && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-success-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-success-400" />
                </div>
                <div className="mt-4 text-lg font-bold">Paiement confirmé !</div>
                <div className="mt-2 text-2xl font-extrabold tracking-widest">{bookingConfirm}</div>
                <p className="text-xs text-ink-muted mt-3 px-4">
                  Présentez ce code au partenaire à la prise en charge.
                </p>
              </div>
            )}

            {bookingError && (
              <div className="mt-3 p-3 rounded-xl border border-danger-500 bg-danger-bg text-xs text-danger-400">
                {bookingError}
              </div>
            )}

            {/* Actions selon l'étape */}
            <div className="mt-5 space-y-2">
              {!bookingId && !bookingPaid && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={bookingBusy}
                  disabled={computedDays < data.minDays || computedDays === 0}
                  onClick={submitBooking}
                >
                  Continuer ({formatPrice(computedTotal)})
                </Button>
              )}

              {bookingId && !bookingPaid && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={bookingBusy}
                    onClick={payBooking}
                  >
                    Payer {formatPrice(bookingTotal)}
                  </Button>
                  <button
                    onClick={() => setBookingOpen(false)}
                    className="block w-full text-center text-[11px] text-ink-muted hover:text-ink py-2"
                  >
                    Fermer — la réservation est gardée en pending
                  </button>
                </>
              )}

              {bookingPaid && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setBookingOpen(false);
                    navigate('/vehicle-rentals/my-bookings');
                  }}
                >
                  Voir mes réservations
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-bg-elevated">
      <Icon size={16} className="text-brand-300 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-ink-muted">
      <span className="inline-flex items-center gap-2">
        <Icon size={13} /> {label}
      </span>
      <span className="text-ink font-semibold">{value}</span>
    </div>
  );
}
