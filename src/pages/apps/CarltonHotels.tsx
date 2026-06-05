// src/pages/apps/CarltonHotels.tsx
//
// EXEMPLE COMPLET d'un mini-program M'Paye qui :
//   1. Récupère la liste des chambres depuis l'API de Carlton (via le proxy M'Paye)
//   2. Affiche le détail d'une chambre
//   3. Paye via /miniprogram/pay (débit user → crédit merchant Carlton)
//   4. Confirme la réservation côté Carlton (proxy POST)
//
// L'API Carlton est appelée à travers le proxy backend, donc :
//   - Pas de CORS à gérer
//   - Tous les appels sont signés HMAC (Carlton peut faire confiance)
//   - L'apiSecret reste côté serveur, jamais exposé au front
//
// Côté super-admin : créer un Biller avec :
//   redirectPath = '/apps/carlton'
//   apiBaseUrl   = 'https://api.carlton.mg'
//   notifyPath   = '/mpaye/payment-confirmed'
//   merchantId   = <id du merchant Carlton dans M'Paye>

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coffee,
  Loader2,
  MapPin,
  Star,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMiniprogram } from '../../hooks/useMiniprogram';
import MiniProgramLayout from './MiniProgramLayout';

// ⚠️ Remplace par l'ID Biller réel récupéré du super-admin
const BILLER_ID = 'clxxxxxxxxxxxxxxxxxx';

// Types renvoyés par l'API Carlton — à adapter au format réel du partenaire
interface Room {
  id: string;
  name: string;
  imageUrl: string;
  city: string;
  pricePerNight: number;
  rating: number;
  description: string;
  amenities: string[];
}

interface BookingDraft {
  bookingId: string;
  totalAmount: number;
}

type View =
  | { kind: 'list' }
  | { kind: 'detail'; roomId: string }
  | { kind: 'paying'; room: Room; booking: BookingDraft }
  | { kind: 'success'; transactionRef: string; room: Room };

export default function CarltonHotels() {
  const { client, loading: tokenLoading, error: tokenError } = useMiniprogram({
    billerId: BILLER_ID,
  });
  const [view, setView] = useState<View>({ kind: 'list' });

  // ─── Phase init ────────────
  if (tokenLoading) {
    return (
      <Centered>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Connexion…</p>
      </Centered>
    );
  }
  if (tokenError || !client) {
    return <ErrorScreen msg={tokenError ?? 'Token indisponible'} />;
  }

  // ─── Sub-views ─────────────
  if (view.kind === 'list') {
    return (
      <MiniProgramLayout title="Carlton Hotels">
        <RoomsList
          client={client}
          onPick={(roomId) => setView({ kind: 'detail', roomId })}
        />
      </MiniProgramLayout>
    );
  }
  if (view.kind === 'detail') {
    return (
      <MiniProgramLayout title="Détail">
        <RoomDetail
          client={client}
          roomId={view.roomId}
          onBack={() => setView({ kind: 'list' })}
          onReserve={(room, booking) => setView({ kind: 'paying', room, booking })}
        />
      </MiniProgramLayout>
    );
  }
  if (view.kind === 'paying') {
    return (
      <MiniProgramLayout title="Paiement">
        <PayScreen
          client={client}
          room={view.room}
          booking={view.booking}
          onSuccess={(transactionRef) =>
            setView({ kind: 'success', transactionRef, room: view.room })
          }
          onCancel={() => setView({ kind: 'detail', roomId: view.room.id })}
        />
      </MiniProgramLayout>
    );
  }
  // success
  return (
    <MiniProgramLayout title="Réservation confirmée">
      <SuccessScreen
        room={view.room}
        transactionRef={view.transactionRef}
        onDone={() => setView({ kind: 'list' })}
      />
    </MiniProgramLayout>
  );
}

// ═══════════════════════════════════════════════════════
//  LISTE DES CHAMBRES (proxy GET vers Carlton)
// ═══════════════════════════════════════════════════════

function RoomsList({
  client,
  onPick,
}: {
  client: ReturnType<typeof useMiniprogram>['client'];
  onPick: (roomId: string) => void;
}) {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    // ┌─ Le mini-program demande la liste à M'Paye ──────────────────────┐
    // │  M'Paye proxy → GET https://api.carlton.mg/rooms                 │
    // │  avec headers X-MPaye-Signature, X-MPaye-User, etc.              │
    // │  Carlton vérifie la signature → retourne le JSON                 │
    // └──────────────────────────────────────────────────────────────────┘
    client
      .proxyGet<{ ok: boolean; body: Room[] }>('/rooms')
      .then((res) => {
        // Selon l'implémentation : proxy retourne { status, ok, body }
        // ou directement body — adapter au besoin
        const list = Array.isArray(res.body) ? res.body : (res as any);
        setRooms(list);
      })
      .catch((e) => setError(e?.response?.data?.message ?? e?.message));
  }, [client]);

  if (error)
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Erreur API Carlton : {error}
      </div>
    );
  if (!rooms)
    return (
      <Centered>
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </Centered>
    );
  if (rooms.length === 0)
    return <p className="text-center text-slate-500 py-12">Aucune chambre dispo.</p>;

  return (
    <div className="p-4 space-y-3">
      {rooms.map((r) => (
        <button
          key={r.id}
          onClick={() => onPick(r.id)}
          className="w-full bg-white rounded-2xl overflow-hidden shadow text-left hover:shadow-lg transition-shadow"
        >
          <div className="aspect-video bg-slate-200">
            <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{r.name}</h3>
              <div className="flex items-center gap-1 text-amber-500 text-sm">
                <Star className="w-4 h-4 fill-current" />
                {r.rating.toFixed(1)}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {r.city}
            </p>
            <p className="text-blue-600 font-bold mt-2">
              {r.pricePerNight.toLocaleString('fr-FR')} Ar
              <span className="text-xs font-normal text-slate-500"> / nuit</span>
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DÉTAIL CHAMBRE + CRÉATION DE RÉSERVATION (proxy POST)
// ═══════════════════════════════════════════════════════

function RoomDetail({
  client,
  roomId,
  onBack,
  onReserve,
}: {
  client: ReturnType<typeof useMiniprogram>['client'];
  roomId: string;
  onBack: () => void;
  onReserve: (room: Room, booking: BookingDraft) => void;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client
      ?.proxyGet<{ ok: boolean; body: Room }>(`/rooms/${roomId}`)
      .then((res) => setRoom((res.body ?? res) as Room))
      .catch((e) => setError(e?.response?.data?.message ?? e?.message));
  }, [client, roomId]);

  const handleReserve = async () => {
    if (!room || !client) return;
    setSubmitting(true);
    setError(null);
    try {
      // ┌─ POST vers Carlton via le proxy (signé HMAC côté backend) ─┐
      // │  Carlton crée une réservation PENDING_PAYMENT et nous     │
      // │  renvoie un bookingId + total à payer.                    │
      // └────────────────────────────────────────────────────────────┘
      const res = await client.proxyPost<{
        ok: boolean;
        body: { bookingId: string; totalAmount: number };
      }>(`/bookings`, { roomId: room.id, nights: 1 });
      const booking = (res.body ?? res) as BookingDraft;
      onReserve(room, booking);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !room) return <ErrorScreen msg={error} onBack={onBack} />;
  if (!room)
    return (
      <Centered>
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </Centered>
    );

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-slate-600 p-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>
      <div className="aspect-video bg-slate-200 mx-4 rounded-2xl overflow-hidden">
        <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 space-y-3">
        <h1 className="text-2xl font-bold">{room.name}</h1>
        <p className="text-slate-500 text-sm flex items-center gap-1">
          <MapPin className="w-4 h-4" /> {room.city}
        </p>
        <p className="text-slate-700">{room.description}</p>

        <div className="flex flex-wrap gap-2">
          {room.amenities.includes('wifi') && <Badge icon={Wifi}>WiFi</Badge>}
          {room.amenities.includes('breakfast') && (
            <Badge icon={Coffee}>Petit-déj</Badge>
          )}
        </div>

        <div className="bg-slate-100 rounded-xl p-4 mt-4">
          <p className="text-xs text-slate-500 mb-1">Tarif / nuit</p>
          <p className="text-3xl font-bold text-blue-600">
            {room.pricePerNight.toLocaleString('fr-FR')}{' '}
            <span className="text-base font-normal">Ar</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleReserve}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl py-3 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Réserver pour {room.pricePerNight.toLocaleString('fr-FR')} Ar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAIEMENT — débit user + crédit merchant Carlton
// ═══════════════════════════════════════════════════════

function PayScreen({
  client,
  room,
  booking,
  onSuccess,
  onCancel,
}: {
  client: ReturnType<typeof useMiniprogram>['client'];
  room: Room;
  booking: BookingDraft;
  onSuccess: (txRef: string) => void;
  onCancel: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!client) return;
    setPaying(true);
    setError(null);
    try {
      // ┌─ Paiement M'Paye : débit user + crédit merchant Carlton ──┐
      // │  externalRef = bookingId Carlton (anti double-paiement)   │
      // │  M'Paye notifie /mpaye/payment-confirmed côté Carlton     │
      // │  → Carlton marque la réservation comme payée              │
      // └───────────────────────────────────────────────────────────┘
      const res = await client.pay({
        externalRef: booking.bookingId,
        amount: booking.totalAmount,
        subject: `Carlton — ${room.name}`,
        metadata: { roomId: room.id, city: room.city },
      });
      onSuccess(res.transactionRef);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-600 text-white rounded-2xl p-5">
        <p className="text-xs text-blue-100">Paiement Carlton Hotels</p>
        <p className="text-3xl font-bold mt-1">
          {booking.totalAmount.toLocaleString('fr-FR')} Ar
        </p>
        <p className="text-xs text-blue-100 mt-2">Réf : {booking.bookingId}</p>
      </div>
      <div className="bg-white rounded-2xl p-4 space-y-2 text-sm">
        <Row label="Chambre" value={room.name} />
        <Row label="Lieu" value={room.city} />
        <Row label="Source" value="Wallet M'Paye" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          disabled={paying}
          className="bg-slate-100 text-slate-900 font-medium rounded-xl py-3"
        >
          Annuler
        </button>
        <button
          onClick={handlePay}
          disabled={paying}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium rounded-xl py-3 flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Paiement…
            </>
          ) : (
            'Payer maintenant'
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  CONFIRMATION
// ═══════════════════════════════════════════════════════

function SuccessScreen({
  room,
  transactionRef,
  onDone,
}: {
  room: Room;
  transactionRef: string;
  onDone: () => void;
}) {
  return (
    <Centered>
      <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Réservation confirmée</h2>
      <p className="text-slate-600 text-center">{room.name}</p>
      <p className="text-xs text-slate-400 font-mono mt-2">{transactionRef}</p>
      <button
        onClick={onDone}
        className="mt-8 bg-blue-600 text-white font-medium rounded-xl px-6 py-3"
      >
        Retour aux chambres
      </button>
    </Centered>
  );
}

// ═══════════════════════════════════════════════════════
//  UI helpers
// ═══════════════════════════════════════════════════════

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {children}
    </div>
  );
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack?: () => void }) {
  return (
    <Centered>
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-red-600 text-center">{msg}</p>
      {onBack && (
        <button onClick={onBack} className="mt-4 text-blue-600 text-sm">
          Retour
        </button>
      )}
    </Centered>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}

function Badge({
  icon: Icon,
  children,
}: {
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
      <Icon className="w-3 h-3" />
      {children}
    </span>
  );
}
