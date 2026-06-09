// src/pages/app/MyVehicleBookings.tsx
//
// Liste des réservations de location de voiture de l'utilisateur connecté.
// Statuts paiement : pending | paid | cancelled | refunded
// Statuts booking  : pending | confirmed | cancelled | completed

import {
  Calendar,
  Car,
  CheckCircle2,
  CreditCard,
  RotateCcw,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  resolveAssetUrl,
  vehicleRentalService,
  type RentalBooking,
} from '../../services/api';
import { Badge, Button, Card, Empty, PageHeader, Skeleton } from '../../ui';

const formatPrice = (n: number | string) =>
  Number(n).toLocaleString('fr-FR') + ' Ar';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Aperçu du remboursement basé sur les heures restant avant `startDate`. */
function refundPreview(b: RentalBooking): { percent: number; amount: number } {
  if (b.paymentStatus !== 'paid') return { percent: 0, amount: 0 };
  const hours = (new Date(b.startDate).getTime() - Date.now()) / (1000 * 60 * 60);
  const percent = hours >= 24 ? 100 : hours >= 12 ? 50 : 0;
  return { percent, amount: Math.round((Number(b.totalAmount) * percent) / 100) };
}

function statusBadge(
  b: RentalBooking,
): { tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'cyan'; label: string } {
  if (b.bookingStatus === 'cancelled') {
    return {
      tone: 'danger',
      label: b.paymentStatus === 'refunded' ? 'Annulée — remboursée' : 'Annulée',
    };
  }
  if (b.bookingStatus === 'completed') return { tone: 'neutral', label: 'Terminée' };
  if (b.paymentStatus === 'paid') return { tone: 'success', label: 'Confirmée' };
  if (b.paymentStatus === 'pending') return { tone: 'warning', label: 'En attente de paiement' };
  return { tone: 'neutral', label: b.bookingStatus };
}

export default function MyVehicleBookings() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await vehicleRentalService.myBookings();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pay = async (b: RentalBooking) => {
    setBusyId(b.id);
    try {
      await vehicleRentalService.pay(b.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement refusé.');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (b: RentalBooking) => {
    const { percent, amount } = refundPreview(b);
    const msg =
      b.paymentStatus === 'paid'
        ? `Vous serez remboursé de ${amount.toLocaleString('fr-FR')} Ar (${percent}%) selon notre politique d'annulation. Confirmer ?`
        : 'Cette réservation est en attente de paiement — aucun remboursement nécessaire. Confirmer l\'annulation ?';
    if (!confirm(msg)) return;
    setBusyId(b.id);
    try {
      await vehicleRentalService.cancelBooking(b.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Annulation impossible.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Mes réservations"
        subtitle="Locations de voiture"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={Car}
            onClick={() => navigate('/vehicle-rentals')}
          >
            Voir les annonces
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg">
          <Empty
            icon={Car}
            title="Aucune réservation"
            description="Découvrez les véhicules disponibles et réservez en quelques clics."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Car}
                onClick={() => navigate('/vehicle-rentals')}
              >
                Voir les annonces
              </Button>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((b) => {
            const photo = b.listing?.vehicle.photos?.[0];
            const { tone, label } = statusBadge(b);
            const isCancellable =
              b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'completed';
            const isBusy = busyId === b.id;

            return (
              <Card key={b.id} padding="md" className="space-y-3">
                <div className="flex items-start gap-3">
                  {photo ? (
                    <img
                      src={resolveAssetUrl(photo) || photo}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                      <Car size={32} className="text-brand-300/70" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">
                      {b.listing?.vehicle.brand} {b.listing?.vehicle.model}
                    </div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {b.listing?.partner.name} · {b.pickupCity}
                    </div>
                    <Badge tone={tone} className="mt-2">
                      {label}
                    </Badge>
                  </div>
                </div>

                <div className="h-px bg-bg-border" />

                <div className="space-y-1.5 text-xs">
                  <Row icon={Calendar} label="Période">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}{' '}
                    <span className="text-ink-muted">({b.days} j)</span>
                  </Row>
                  <Row icon={CreditCard} label="Montant">
                    <span className="font-semibold text-ink">{formatPrice(b.totalAmount)}</span>
                  </Row>
                  {b.paymentStatus === 'refunded' && Number(b.refundAmount) > 0 && (
                    <Row icon={RotateCcw} label="Remboursé">
                      <span className="font-semibold text-success-400">
                        {formatPrice(b.refundAmount!)}
                      </span>
                    </Row>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-bg-elevated flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-ink-dim">
                    Code de confirmation
                  </span>
                  <span className="text-sm font-extrabold tracking-widest">
                    {b.confirmationCode}
                  </span>
                </div>

                {/* Actions */}
                {b.paymentStatus === 'pending' && b.bookingStatus !== 'cancelled' && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      loading={isBusy}
                      icon={CheckCircle2}
                      onClick={() => pay(b)}
                    >
                      Payer {formatPrice(b.totalAmount)}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={X}
                      disabled={isBusy}
                      onClick={() => cancel(b)}
                    >
                      Annuler
                    </Button>
                  </div>
                )}

                {b.paymentStatus === 'paid' && isCancellable && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    disabled={isBusy}
                    icon={X}
                    onClick={() => cancel(b)}
                  >
                    Annuler ({refundPreview(b).percent}% remboursé)
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        <Icon size={12} /> {label}
      </span>
      <span>{children}</span>
    </div>
  );
}
