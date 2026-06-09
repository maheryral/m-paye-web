// src/pages/app/VehicleRentals.tsx
//
// Liste / recherche des annonces de location de voiture (phase 1 : lecture seule).
// Filtres : ville, type, avec/sans chauffeur. La réservation arrive en phase 2.

import {
  Car,
  ClipboardList,
  Cog,
  Fuel,
  KeyRound,
  MapPin,
  Search,
  Snowflake,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  resolveAssetUrl,
  vehicleRentalService,
  type RentalListing,
} from '../../services/api';
import { Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../ui';

type DriverFilter = 'all' | 'with' | 'self';

const TYPES = [
  { key: '', label: 'Tous' },
  { key: '4x4', label: '4×4' },
  { key: 'sedan', label: 'Berline' },
  { key: 'suv', label: 'SUV' },
  { key: 'minibus', label: 'Minibus' },
  { key: 'city', label: 'Citadine' },
];

function formatPrice(p: number | string) {
  return Number(p).toLocaleString('fr-FR') + ' Ar';
}

export default function VehicleRentals() {
  const navigate = useNavigate();

  const [items, setItems] = useState<RentalListing[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [city, setCity] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('all');

  const load = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (city) params.city = city;
      if (typeFilter) params.type = typeFilter;
      if (driverFilter === 'with') params.withDriver = true;
      if (driverFilter === 'self') params.withDriver = false;
      const res = await vehicleRentalService.search(params);
      setItems(res?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, typeFilter, driverFilter]);

  // Villes pour les chips de suggestion (chargée une fois)
  useEffect(() => {
    void vehicleRentalService
      .cities()
      .then((c) => setCities(Array.isArray(c) ? c : []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Location voiture"
        subtitle="Avec ou sans chauffeur — partenaires vérifiés"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={ClipboardList}
            onClick={() => navigate('/vehicle-rentals/my-bookings')}
          >
            Mes réservations
          </Button>
        }
      />

      {/* === Barre de filtres === */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch">
          {/* Ville */}
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Ville de prise en charge…"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* Toggle With Driver / Self */}
          <div className="flex p-1 bg-bg-elevated rounded-xl border border-bg-border gap-1 shrink-0">
            {(
              [
                { key: 'all', label: 'Tous' },
                { key: 'with', label: 'Avec chauffeur' },
                { key: 'self', label: 'Self-drive' },
              ] as { key: DriverFilter; label: string }[]
            ).map((opt) => {
              const active = driverFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setDriverFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active ? 'bg-brand-500 text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggestions villes — chips */}
        {!city && cities.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-bg-border bg-bg-elevated hover:border-brand-500/50 hover:text-brand-300"
              >
                <MapPin size={11} />
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Type véhicule */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {TYPES.map((t) => {
            const active = typeFilter === t.key;
            return (
              <button
                key={t.key || 'all'}
                onClick={() => setTypeFilter(t.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/50'
                    : 'bg-bg-elevated text-ink-muted border-bg-border hover:border-brand-500/30'
                }`}
              >
                <Car size={12} />
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* === Liste === */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg">
          <Empty
            icon={Car}
            title="Aucune annonce"
            description="Essayez d'élargir vos filtres ou de changer de ville."
            className="py-16"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((it) => (
            <ListingCard key={it.id} item={it} onClick={() => navigate(`/vehicle-rentals/${it.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ item, onClick }: { item: RentalListing; onClick: () => void }) {
  const photo = item.vehicle.photos?.[0];
  return (
    <button
      onClick={onClick}
      className="group text-left card overflow-hidden hover:border-brand-500/40 transition-colors"
    >
      {photo ? (
        <img
          src={resolveAssetUrl(photo) || photo}
          alt={`${item.vehicle.brand} ${item.vehicle.model}`}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div className="w-full h-44 bg-brand-500/10 flex items-center justify-center">
          <Car size={48} className="text-brand-300/70" />
        </div>
      )}

      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">
              {item.vehicle.brand} {item.vehicle.model}
            </div>
            <div className="text-[11px] text-ink-muted truncate">{item.partner.name}</div>
          </div>
          {item.withDriver ? (
            <Badge tone="success" className="shrink-0">
              <UserIcon size={10} className="mr-1" /> Chauffeur
            </Badge>
          ) : (
            <Badge tone="cyan" className="shrink-0">
              <KeyRound size={10} className="mr-1" /> Self-drive
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted">
          <Spec icon={Users} text={`${item.vehicle.seats} pl.`} />
          <Spec
            icon={Cog}
            text={item.vehicle.transmission === 'automatic' ? 'Auto' : 'Manuelle'}
          />
          {item.vehicle.hasAC && <Spec icon={Snowflake} text="Clim" />}
          <Spec icon={Fuel} text={item.vehicle.fuel} />
          <Spec icon={MapPin} text={item.city} />
        </div>

        <div className="flex items-end justify-between pt-2">
          <div>
            <div className="text-lg font-bold text-ink">{formatPrice(item.pricePerDay)}</div>
            <div className="text-[10px] text-ink-muted">par jour</div>
          </div>
          <span className="text-[11px] font-semibold text-brand-300 group-hover:text-brand-200">
            Détails →
          </span>
        </div>
      </div>
    </button>
  );
}

function Spec({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={11} />
      {text}
    </span>
  );
}
