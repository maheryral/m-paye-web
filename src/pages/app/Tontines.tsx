// src/pages/app/Tontines.tsx
//
// Mes tontines — section invitations + section actives + CTA "Rejoindre par code".
// Inspirée du pattern Bénéficiaires : grille de cards responsive.

import {
  Check,
  KeyRound,
  Plus,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tontineService, type Tontine } from '../../services/api';
import { Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../ui';

function formatPrice(n: string | number) {
  return Number(n).toLocaleString('fr-FR') + ' Ar';
}

export default function Tontines() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Tontine[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await tontineService.list());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const accept = async (id: string) => {
    try {
      await tontineService.accept(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Impossible d'accepter.");
    }
  };

  const decline = async (id: string) => {
    if (!confirm("Refuser cette invitation ?")) return;
    try {
      await tontineService.decline(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec.');
    }
  };

  const joinSubmit = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinBusy(true);
    try {
      await tontineService.joinByCode(code);
      setJoinOpen(false);
      setJoinCode('');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Code invalide.');
    } finally {
      setJoinBusy(false);
    }
  };

  const invitations = items.filter((t) => t.myMembership?.status === 'invited');
  const active = items.filter((t) => t.myMembership?.status === 'joined');

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Mes tontines"
        subtitle="Épargne collective rotative"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => setJoinOpen(true)}>
              Rejoindre
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/tontines/new')}>
              Créer
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {invitations.length > 0 && (
            <section>
              <h3 className="text-sm font-bold mb-3 text-ink">📨 Invitations ({invitations.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.map((t) => (
                  <TontineCard
                    key={t.id}
                    t={t}
                    isInvite
                    onAccept={() => accept(t.id)}
                    onDecline={() => decline(t.id)}
                    onClick={() => navigate(`/tontines/${t.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section>
              <h3 className="text-sm font-bold mb-3 text-ink">Mes tontines ({active.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((t) => (
                  <TontineCard key={t.id} t={t} onClick={() => navigate(`/tontines/${t.id}`)} />
                ))}
              </div>
            </section>
          )}

          {invitations.length === 0 && active.length === 0 && (
            <Card padding="lg">
              <Empty
                icon={Users}
                title="Aucune tontine"
                description="Créez votre première tontine pour épargner en groupe, ou rejoignez-en une avec un code d'invitation."
                action={
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/tontines/new')}>
                    Créer ma première tontine
                  </Button>
                }
                className="py-16"
              />
            </Card>
          )}
        </>
      )}

      {/* === Modal Rejoindre par code === */}
      {joinOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setJoinOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md card shadow-elevated rounded-t-2xl sm:rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Rejoindre une tontine</h3>
              <button
                onClick={() => setJoinOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-bg-subtle"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Saisissez le code d'invitation partagé par l'organisateur.
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="TONT-XXXXXX"
              className="input w-full text-center text-xl tracking-widest font-bold py-3 mb-4"
              maxLength={20}
              autoFocus
            />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={joinBusy}
              disabled={!joinCode}
              onClick={joinSubmit}
            >
              Rejoindre
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TontineCard({
  t,
  isInvite = false,
  onAccept,
  onDecline,
  onClick,
}: {
  t: Tontine;
  isInvite?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onClick: () => void;
}) {
  const joinedCount = t.members.filter((m) => m.status === 'joined').length;
  const progress = (joinedCount / t.totalMembers) * 100;
  const statusBadge =
    t.status === 'active'
      ? { tone: 'success' as const, label: 'En cours' }
      : t.status === 'completed'
      ? { tone: 'neutral' as const, label: 'Terminée' }
      : t.status === 'cancelled'
      ? { tone: 'danger' as const, label: 'Annulée' }
      : { tone: 'warning' as const, label: 'Recrutement' };

  return (
    <Card padding="md" className="space-y-3">
      <div
        className={`flex items-start gap-3 ${!isInvite ? 'cursor-pointer' : ''}`}
        onClick={!isInvite ? onClick : undefined}
      >
        <div className="w-11 h-11 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
          <Users size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{t.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
            <span className="text-[11px] text-ink-muted">
              {joinedCount}/{t.totalMembers} membres
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xl font-extrabold text-ink">{formatPrice(t.monthlyAmount)}</div>
        <div className="text-[11px] text-ink-muted">par mois / membre</div>
      </div>

      {t.status === 'pending' && (
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {t.status === 'active' && t.myMembership?.orderInCycle && (
        <div className="flex items-center gap-2 text-xs text-ink-muted bg-bg-elevated rounded-lg p-2.5">
          <Trophy size={12} className="text-brand-300" />
          Vous recevrez au round{' '}
          <span className="text-ink font-bold">
            {t.myMembership.orderInCycle}/{t.totalMembers}
          </span>
        </div>
      )}

      {isInvite && (
        <div className="flex gap-2">
          <Button variant="primary" size="sm" fullWidth icon={Check} onClick={onAccept}>
            Accepter
          </Button>
          <Button variant="secondary" size="sm" icon={X} onClick={onDecline}>
            Refuser
          </Button>
        </div>
      )}
    </Card>
  );
}
