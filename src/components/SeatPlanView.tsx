import {
  Armchair,
  Wind,
  Footprints,
  DoorOpen,
  UserCog,
  Square,
  Toilet,
  Accessibility,
  Crown,
} from 'lucide-react';
import type {
  SeatCellType,
  SeatInfo,
  SeatLayout,
  SeatPosition,
} from '../services/taxiBrousseApi';

interface Props {
  layout: SeatLayout | null;
  seatPositions: Record<number, SeatPosition> | null;
  seats: SeatInfo[];
  selectedSeats: number[];
  onSelectSeat: (numPlace: number) => void;
}

const COUNTABLE = new Set<SeatCellType>([
  'seat',
  'window_seat',
  'vip_seat',
  'accessible_seat',
]);

const ICON: Record<SeatCellType, any> = {
  seat: Armchair,
  window_seat: Wind,
  vip_seat: Crown,
  accessible_seat: Accessibility,
  aisle: Footprints,
  door: DoorOpen,
  driver: UserCog,
  wc: Toilet,
  empty: Square,
};

const LABEL: Record<SeatCellType, string> = {
  seat: 'Siège',
  window_seat: 'Fenêtre',
  vip_seat: 'VIP',
  accessible_seat: 'PMR',
  aisle: 'Couloir',
  door: 'Porte',
  driver: 'Chauffeur',
  wc: 'WC',
  empty: '',
};

export default function SeatPlanView({
  layout,
  seatPositions,
  seats,
  selectedSeats,
  onSelectSeat,
}: Props) {
  if (!layout || !seatPositions) {
    return (
      <FallbackGrid
        seats={seats}
        selectedSeats={selectedSeats}
        onSelectSeat={onSelectSeat}
      />
    );
  }

  const coordToSeat = new Map<string, number>();
  Object.entries(seatPositions).forEach(([n, p]) => {
    coordToSeat.set(`${p.deck}-${p.row}-${p.col}`, Number(n));
  });
  const seatByNum = new Map<number, SeatInfo>();
  seats.forEach((s) => seatByNum.set(s.numPlace, s));

  return (
    <div className="space-y-6">
      {[...layout.decks]
        .sort((a, b) => a.deckNumber - b.deckNumber)
        .map((deck) => (
          <div key={deck.deckNumber}>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-dim mb-2">
              {deck.name ?? `Étage ${deck.deckNumber}`}
            </div>
            <div className="inline-block bg-bg-elevated/50 rounded-2xl p-4 overflow-auto max-w-full">
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${deck.grid[0]?.length ?? 0}, 48px)`,
                }}
              >
                {deck.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const num = coordToSeat.get(`${deck.deckNumber}-${r}-${c}`);
                    const seat = num ? seatByNum.get(num) : undefined;
                    return (
                      <Cell
                        key={`${r}-${c}`}
                        type={cell}
                        numPlace={num}
                        seat={seat}
                        isSelected={num != null && selectedSeats.includes(num)}
                        onSelect={onSelectSeat}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        ))}

      <Legend />
    </div>
  );
}

function Cell({
  type,
  numPlace,
  seat,
  isSelected,
  onSelect,
}: {
  type: SeatCellType;
  numPlace?: number;
  seat?: SeatInfo;
  isSelected: boolean;
  onSelect: (n: number) => void;
}) {
  const Icon = ICON[type];
  const countable = COUNTABLE.has(type);

  if (!countable || !numPlace) {
    const decor: Record<string, string> = {
      driver: 'bg-danger-bg/40 text-danger-400 border-danger-500/30',
      door: 'bg-warning-bg/40 text-warning-500 border-warning-500/30',
      wc: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
      aisle: 'text-ink-dim border-bg-border/40',
      empty: 'text-ink-dim border-bg-border/30 border-dashed',
    };
    const cls = decor[type] ?? '';
    return (
      <div
        className={`w-12 h-12 rounded-lg border flex items-center justify-center ${cls}`}
        title={LABEL[type]}
      >
        <Icon size={14} />
      </div>
    );
  }

  const reserved = !!seat?.isReserved;
  const paid = !!seat?.isPaid;

  let cls = '';
  if (reserved) {
    cls = paid
      ? 'bg-success-500 text-white border-success-500'
      : 'bg-warning-500 text-white border-warning-500';
  } else if (isSelected) {
    cls = 'bg-brand-500 text-white border-brand-500 shadow-glow-soft';
  } else {
    cls = 'bg-bg-surface text-ink border-brand-500/40 hover:bg-brand-500/10 cursor-pointer';
  }

  return (
    <button
      type="button"
      onClick={() => !reserved && onSelect(numPlace)}
      disabled={reserved}
      className={`w-12 h-12 rounded-lg border flex flex-col items-center justify-center relative transition-all ${cls} ${
        reserved ? 'cursor-not-allowed' : 'hover:scale-105'
      }`}
      title={
        reserved
          ? `Place ${numPlace} — ${paid ? 'payée' : 'réservée'}`
          : `Place ${numPlace} — ${LABEL[type]}`
      }
    >
      {type === 'window_seat' && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      )}
      {type === 'vip_seat' && (
        <Crown size={9} className="absolute top-1 right-1" />
      )}
      {type === 'accessible_seat' && (
        <Accessibility size={9} className="absolute top-1 right-1" />
      )}
      <span className="text-xs font-bold">{numPlace}</span>
    </button>
  );
}

function FallbackGrid({
  seats,
  selectedSeats,
  onSelectSeat,
}: {
  seats: SeatInfo[];
  selectedSeats: number[];
  onSelectSeat: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-ink-muted mb-3">
        <UserCog size={14} /> Chauffeur en haut
      </div>
      <div className="flex flex-wrap gap-2">
        {seats.map((s) => {
          const reserved = s.isReserved;
          const selected = selectedSeats.includes(s.numPlace);
          let cls = '';
          if (reserved) {
            cls = s.isPaid
              ? 'bg-success-500 text-white'
              : 'bg-warning-500 text-white';
          } else if (selected) {
            cls = 'bg-brand-500 text-white';
          } else {
            cls = 'bg-bg-surface text-ink border border-brand-500/40 hover:bg-brand-500/10';
          }
          return (
            <button
              key={s.numPlace}
              type="button"
              onClick={() => !reserved && onSelectSeat(s.numPlace)}
              disabled={reserved}
              className={`w-12 h-12 rounded-lg text-sm font-bold transition-all ${cls} ${
                reserved ? 'cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              {s.numPlace}
            </button>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  const items = [
    { cls: 'bg-bg-surface border border-brand-500/40', label: 'Libre' },
    { cls: 'bg-brand-500', label: 'Sélectionné' },
    { cls: 'bg-warning-500', label: 'Réservé' },
    { cls: 'bg-success-500', label: 'Payé' },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-ink-muted pt-3 mt-3 border-t border-bg-border">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <div className={`w-4 h-4 rounded ${it.cls}`} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
