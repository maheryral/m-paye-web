// Mini-program Hôtels — accessible via /apps/hotels
//
// Flow : Recherche → Liste résultats → Fiche hôtel → Réservation → Confirmation
//
// Aujourd'hui : données mockées en local (5 hôtels). Quand tu auras un backend
// (table Hotel + endpoint /hotels), il suffira de remplacer MOCK_HOTELS par
// un fetch et POST /hotels/reservations pour la réservation.

import {
  ArrowLeft,
  Bed,
  Calendar,
  Check,
  CheckCircle2,
  Coffee,
  Croissant,
  Heart,
  MapPin,
  Search,
  Star,
  Users,
  Waves,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import MiniProgramLayout from './MiniProgramLayout';

// ───────────────────── Données mockées ─────────────────────

interface Hotel {
  id: string;
  name: string;
  city: string;
  region: string;
  imageUrl: string;
  pricePerNight: number;
  rating: number;
  reviewsCount: number;
  description: string;
  amenities: Array<'wifi' | 'breakfast' | 'pool' | 'restaurant'>;
}

const MOCK_HOTELS: Hotel[] = [
  {
    id: 'h1',
    name: 'Le Royal Tana',
    city: 'Antananarivo',
    region: 'Analamanga',
    imageUrl:
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=70',
    pricePerNight: 180_000,
    rating: 4.7,
    reviewsCount: 234,
    description:
      "Hôtel emblématique au cœur de la capitale avec vue panoramique. Service haut de gamme et restaurant français étoilé.",
    amenities: ['wifi', 'breakfast', 'pool', 'restaurant'],
  },
  {
    id: 'h2',
    name: 'Bungalow Nosy Be',
    city: 'Nosy Be',
    region: 'Diana',
    imageUrl:
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=70',
    pricePerNight: 250_000,
    rating: 4.9,
    reviewsCount: 412,
    description:
      "Bungalows pieds dans l'eau sur la plage de Madirokely. Snorkeling, plongée et coucher de soleil inoubliables.",
    amenities: ['wifi', 'breakfast', 'pool', 'restaurant'],
  },
  {
    id: 'h3',
    name: 'Auberge des Hautes Terres',
    city: 'Antsirabe',
    region: 'Vakinankaratra',
    imageUrl:
      'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=70',
    pricePerNight: 75_000,
    rating: 4.2,
    reviewsCount: 87,
    description:
      "Auberge familiale dans le style malgache traditionnel. Sources thermales à 5 minutes, cuisine locale.",
    amenities: ['wifi', 'breakfast'],
  },
  {
    id: 'h4',
    name: 'Hôtel des Thermes',
    city: 'Diego Suarez',
    region: 'Diana',
    imageUrl:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=70',
    pricePerNight: 110_000,
    rating: 4.4,
    reviewsCount: 156,
    description:
      "Hôtel colonial rénové face à la baie. Idéal pour explorer les Tsingy Rouges et la baie des Sakalava.",
    amenities: ['wifi', 'restaurant', 'pool'],
  },
  {
    id: 'h5',
    name: 'Camp de brousse Andasibe',
    city: 'Andasibe',
    region: 'Alaotra-Mangoro',
    imageUrl:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=70',
    pricePerNight: 95_000,
    rating: 4.6,
    reviewsCount: 198,
    description:
      "Hébergement écologique en pleine forêt primaire. Observation des lémuriens Indri-Indri à l'aube.",
    amenities: ['breakfast', 'restaurant'],
  },
];

// ───────────────────── Helpers ─────────────────────

const AMENITY_META: Record<
  Hotel['amenities'][number],
  { label: string; icon: LucideIcon }
> = {
  wifi: { label: 'Wi-Fi', icon: Wifi },
  breakfast: { label: 'Petit déjeuner', icon: Croissant },
  pool: { label: 'Piscine', icon: Waves },
  restaurant: { label: 'Restaurant', icon: Coffee },
};

function fmtPrice(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' Ar';
}

function daysBetween(d1: string, d2: string): number {
  if (!d1 || !d2) return 0;
  const a = new Date(d1).getTime();
  const b = new Date(d2).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function todayISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// ───────────────────── Composant principal ─────────────────────

type View = 'search' | 'results' | 'details' | 'confirmation';

export default function HotelsMiniProgram() {
  // État de recherche
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(3));
  const [guests, setGuests] = useState(2);

  // Vue actuelle + sélection
  const [view, setView] = useState<View>('search');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);

  // Résultats filtrés
  const results = useMemo(() => {
    const q = city.trim().toLowerCase();
    if (!q) return MOCK_HOTELS;
    return MOCK_HOTELS.filter(
      (h) =>
        h.city.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q),
    );
  }, [city]);

  const nights = daysBetween(checkIn, checkOut);
  const totalPrice = selectedHotel ? selectedHotel.pricePerNight * nights : 0;

  function handleSearch() {
    if (nights <= 0) {
      alert("La date de départ doit être après la date d'arrivée");
      return;
    }
    setView('results');
  }

  function handleBook() {
    // 🚧 Plus tard : POST /hotels/reservations + /payments/wallet-debit
    // Pour la démo on génère juste une réf et on affiche la confirmation.
    const ref = `HTL-${Date.now().toString().slice(-8)}`;
    setConfirmedRef(ref);
    setView('confirmation');
  }

  return (
    <MiniProgramLayout title="Hôtels Madagascar" accentColor="#8B5CF6">
      <div className="max-w-2xl mx-auto">
        {view === 'search' && (
          <SearchView
            city={city}
            setCity={setCity}
            checkIn={checkIn}
            setCheckIn={setCheckIn}
            checkOut={checkOut}
            setCheckOut={setCheckOut}
            guests={guests}
            setGuests={setGuests}
            nights={nights}
            onSearch={handleSearch}
          />
        )}

        {view === 'results' && (
          <ResultsView
            results={results}
            nights={nights}
            onBack={() => setView('search')}
            onPick={(h) => {
              setSelectedHotel(h);
              setView('details');
            }}
          />
        )}

        {view === 'details' && selectedHotel && (
          <DetailsView
            hotel={selectedHotel}
            nights={nights}
            guests={guests}
            checkIn={checkIn}
            checkOut={checkOut}
            totalPrice={totalPrice}
            onBack={() => setView('results')}
            onBook={handleBook}
          />
        )}

        {view === 'confirmation' && selectedHotel && confirmedRef && (
          <ConfirmationView
            hotel={selectedHotel}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            guests={guests}
            totalPrice={totalPrice}
            reference={confirmedRef}
            onDone={() => {
              setView('search');
              setSelectedHotel(null);
              setConfirmedRef(null);
            }}
          />
        )}
      </div>
    </MiniProgramLayout>
  );
}

// ───────────────────── Vue : Recherche ─────────────────────

function SearchView({
  city,
  setCity,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  guests,
  setGuests,
  nights,
  onSearch,
}: {
  city: string;
  setCity: (v: string) => void;
  checkIn: string;
  setCheckIn: (v: string) => void;
  checkOut: string;
  setCheckOut: (v: string) => void;
  guests: number;
  setGuests: (n: number) => void;
  nights: number;
  onSearch: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{
          background:
            'linear-gradient(135deg, #8B5CF6 0%, #6366F1 60%, #4338CA 100%)',
        }}
      >
        <h2 className="text-2xl font-bold mb-1">Trouvez votre hôtel</h2>
        <p className="text-sm opacity-90">
          Du Nord aux Hautes Terres — réservez et payez via M'Paye.
        </p>
      </div>

      {/* Formulaire de recherche */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <MapPin size={13} />
            Ville ou région
          </label>
          <input
            type="text"
            className="input"
            placeholder="Antananarivo, Nosy Be, Diego…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar size={13} />
              Arrivée
            </label>
            <input
              type="date"
              className="input"
              min={todayISO(0)}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar size={13} />
              Départ
            </label>
            <input
              type="date"
              className="input"
              min={checkIn || todayISO(1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Users size={13} />
            Voyageurs
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuests(Math.max(1, guests - 1))}
              className="w-9 h-9 rounded-lg border border-bg-border bg-bg-elevated text-lg font-bold"
            >
              −
            </button>
            <span className="text-xl font-bold w-8 text-center">{guests}</span>
            <button
              type="button"
              onClick={() => setGuests(Math.min(10, guests + 1))}
              className="w-9 h-9 rounded-lg border border-bg-border bg-bg-elevated text-lg font-bold"
            >
              +
            </button>
            <span className="text-xs text-ink-muted ml-2">
              {guests > 1 ? 'personnes' : 'personne'}
            </span>
          </div>
        </div>

        {nights > 0 && (
          <div className="text-xs text-ink-muted bg-bg-elevated rounded-lg p-3">
            🌙 Séjour de <strong className="text-ink">{nights} nuit{nights > 1 ? 's' : ''}</strong>
          </div>
        )}

        <button
          type="button"
          onClick={onSearch}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition"
          style={{ background: '#8B5CF6' }}
        >
          <Search size={16} />
          Chercher
        </button>
      </div>

      {/* Suggestions */}
      <div>
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 px-1">
          Destinations populaires
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Nosy Be', 'Antananarivo', 'Diego Suarez', 'Antsirabe', 'Andasibe'].map(
            (c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                type="button"
                className="px-3 py-1.5 rounded-full bg-bg-elevated border border-bg-border text-xs font-semibold hover:border-brand-500/60"
              >
                {c}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────── Vue : Résultats ─────────────────────

function ResultsView({
  results,
  nights,
  onBack,
  onPick,
}: {
  results: Hotel[];
  nights: number;
  onBack: () => void;
  onPick: (h: Hotel) => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Modifier la recherche
      </button>

      <div className="text-sm text-ink-muted">
        {results.length} hôtel{results.length > 1 ? 's' : ''} trouvé
        {results.length > 1 ? 's' : ''}
      </div>

      {results.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          Aucun hôtel ne correspond à cette recherche. Essayez une autre ville.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((h) => (
            <button
              key={h.id}
              onClick={() => onPick(h)}
              className="card overflow-hidden hover:border-brand-500/60 text-left w-full transition flex"
            >
              <img
                src={h.imageUrl}
                alt={h.name}
                className="w-32 h-32 object-cover shrink-0"
                loading="lazy"
              />
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold truncate">{h.name}</h3>
                  <div className="flex items-center gap-1 shrink-0 text-warning-400">
                    <Star size={11} fill="currentColor" />
                    <span className="text-xs font-bold">{h.rating}</span>
                  </div>
                </div>
                <div className="text-[11px] text-ink-muted flex items-center gap-1">
                  <MapPin size={10} />
                  {h.city}, {h.region}
                </div>
                <div className="text-[11px] text-ink-dim line-clamp-2 mt-1">
                  {h.description}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {h.amenities.slice(0, 4).map((a) => {
                      const Meta = AMENITY_META[a];
                      const Icon = Meta.icon;
                      return (
                        <span
                          key={a}
                          className="text-ink-dim"
                          title={Meta.label}
                        >
                          <Icon size={11} />
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      {fmtPrice(h.pricePerNight)}
                    </div>
                    <div className="text-[10px] text-ink-dim">/ nuit</div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {nights > 0 && (
        <div className="text-[11px] text-ink-dim text-center py-2">
          Les prix affichés sont par nuit pour 1 chambre — pour {nights} nuit
          {nights > 1 ? 's' : ''}.
        </div>
      )}
    </div>
  );
}

// ───────────────────── Vue : Fiche hôtel + réservation ─────────────────────

function DetailsView({
  hotel,
  nights,
  guests,
  checkIn,
  checkOut,
  totalPrice,
  onBack,
  onBook,
}: {
  hotel: Hotel;
  nights: number;
  guests: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  onBack: () => void;
  onBook: () => void;
}) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Retour aux résultats
      </button>

      <img
        src={hotel.imageUrl}
        alt={hotel.name}
        className="w-full h-56 object-cover rounded-2xl"
      />

      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-2xl font-bold">{hotel.name}</h2>
          <div className="flex items-center gap-1 shrink-0 bg-warning-bg text-warning-400 rounded-full px-2 py-0.5">
            <Star size={12} fill="currentColor" />
            <span className="text-xs font-bold">{hotel.rating}</span>
            <span className="text-[10px] text-ink-dim ml-1">
              ({hotel.reviewsCount})
            </span>
          </div>
        </div>
        <div className="text-sm text-ink-muted flex items-center gap-1.5">
          <MapPin size={13} />
          {hotel.city}, {hotel.region}
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
          À propos
        </div>
        <p className="text-sm leading-relaxed">{hotel.description}</p>
      </div>

      <div className="card p-4">
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">
          Équipements
        </div>
        <div className="grid grid-cols-2 gap-2">
          {hotel.amenities.map((a) => {
            const Meta = AMENITY_META[a];
            const Icon = Meta.icon;
            return (
              <div key={a} className="flex items-center gap-2 text-sm">
                <Icon size={15} className="text-success-400" />
                {Meta.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Récap réservation */}
      <div
        className="card p-5"
        style={{ borderColor: '#8B5CF6', borderWidth: 1 }}
      >
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">
          Votre réservation
        </div>
        <div className="space-y-1.5 text-sm">
          <Row label="Arrivée" value={checkIn} />
          <Row label="Départ" value={checkOut} />
          <Row label="Voyageurs" value={`${guests} personne${guests > 1 ? 's' : ''}`} />
          <Row label="Nuits" value={`${nights} × ${fmtPrice(hotel.pricePerNight)}`} />
          <div className="border-t border-bg-border pt-2 mt-2 flex items-center justify-between">
            <span className="font-bold">Total à payer</span>
            <span className="text-lg font-extrabold" style={{ color: '#8B5CF6' }}>
              {fmtPrice(totalPrice)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition"
          style={{ background: '#8B5CF6' }}
        >
          <Bed size={16} />
          Réserver & Payer
        </button>
        <p className="text-[11px] text-ink-dim text-center mt-2">
          Paiement sécurisé via votre wallet M'Paye
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ───────────────────── Vue : Confirmation ─────────────────────

function ConfirmationView({
  hotel,
  checkIn,
  checkOut,
  nights,
  guests,
  totalPrice,
  reference,
  onDone,
}: {
  hotel: Hotel;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  reference: string;
  onDone: () => void;
}) {
  return (
    <div className="max-w-md mx-auto space-y-5 py-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-bg text-success-400">
          <CheckCircle2 size={42} />
        </div>
        <h2 className="text-xl font-bold">Réservation confirmée</h2>
        <p className="text-sm text-ink-muted">
          Un email avec votre voucher vient d'être envoyé.
        </p>
      </div>

      <div className="card overflow-hidden">
        <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-32 object-cover" />
        <div className="p-4 space-y-2">
          <div className="font-bold">{hotel.name}</div>
          <div className="text-xs text-ink-muted flex items-center gap-1">
            <MapPin size={11} />
            {hotel.city}, {hotel.region}
          </div>
          <div className="border-t border-bg-border pt-3 mt-3 space-y-1.5 text-sm">
            <Row label="Référence" value={reference} />
            <Row label="Arrivée" value={checkIn} />
            <Row label="Départ" value={checkOut} />
            <Row label="Nuits" value={String(nights)} />
            <Row label="Voyageurs" value={String(guests)} />
            <div className="flex items-center justify-between pt-2 border-t border-bg-border">
              <span className="font-bold">Total payé</span>
              <span className="font-extrabold" style={{ color: '#8B5CF6' }}>
                {fmtPrice(totalPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-elevated rounded-xl p-4 flex items-start gap-3">
        <Heart size={16} className="text-danger-400 shrink-0 mt-0.5" />
        <div className="text-xs text-ink-muted leading-relaxed">
          <strong className="text-ink">Bon voyage !</strong> Présentez votre référence{' '}
          <span className="font-mono">{reference}</span> à l'arrivée. Pour toute
          question, contactez l'hôtel directement.
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition"
        style={{ background: '#8B5CF6' }}
      >
        <Check size={16} />
        Nouvelle recherche
      </button>
    </div>
  );
}
