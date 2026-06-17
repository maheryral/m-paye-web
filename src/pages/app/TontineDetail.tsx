// src/pages/app/TontineDetail.tsx
//
// Détail d'une tontine. L'organisateur voit le code partageable + actions
// d'invitation, les membres voient juste leur statut et l'ordre du cycle.

import {
  ArrowLeft,
  Calendar,
  Copy,
  LogOut,
  Send,
  Share2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tontineService, type Tontine } from '../../services/api';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../ui';

const formatPrice = (n: string | number) => Number(n).toLocaleString('fr-FR') + ' Ar';
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function TontineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<Tontine | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteIds, setInviteIds] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const t = await tontineService.detail(id);
      setData(t);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }
  if (!data) {
    return (
      <Card padding="lg" className="text-center py-16">
        <Users size={48} className="mx-auto text-ink-muted" />
        <div className="mt-3 text-lg font-bold">Tontine introuvable</div>
        <Button
          variant="primary"
          size="md"
          icon={ArrowLeft}
          className="mt-4 mx-auto"
          onClick={() => navigate('/tontines')}
        >
          Retour
        </Button>
      </Card>
    );
  }

  const isOrganizer = data.organizerId === user?.id;
  const myMember = data.members.find((m) => m.userId === user?.id);
  const joinedCount = data.members.filter((m) => m.status === 'joined').length;

  const statusBadge =
    data.status === 'active'
      ? { tone: 'success' as const, label: 'En cours' }
      : data.status === 'completed'
      ? { tone: 'neutral' as const, label: 'Terminée' }
      : data.status === 'cancelled'
      ? { tone: 'danger' as const, label: 'Annulée' }
      : { tone: 'warning' as const, label: 'Recrutement' };

  const handleShare = async () => {
    const msg = `Rejoignez la tontine "${data.name}" sur M'Paye !\n\nCode : ${data.inviteCode}\nCotisation : ${formatPrice(data.monthlyAmount)}/mois`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tontine M\'Paye', text: msg });
        return;
      } catch { /* cancelled */ return; }
    }
    try {
      await navigator.clipboard.writeText(msg);
      alert('Texte d\'invitation copié dans le presse-papier.');
    } catch {
      alert(msg);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(data.inviteCode);
    alert(`Code "${data.inviteCode}" copié.`);
  };

  const handleInvite = async () => {
    const ids = inviteIds
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await tontineService.invite(data.id, ids);
      setInviteOpen(false);
      setInviteIds('');
      await load();
      const parts: string[] = [];
      if (res.invited.length) parts.push(`${res.invited.length} invité(s).`);
      if (res.alreadyMember.length) parts.push(`${res.alreadyMember.length} déjà membre(s).`);
      if (res.notFound.length) parts.push(`${res.notFound.length} non trouvé(s).`);
      alert(parts.join('\n') || 'Aucun envoi.');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Quitter cette tontine ?')) return;
    try {
      await tontineService.leave(data.id);
      navigate('/tontines', { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible.');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Annuler définitivement cette tontine ?')) return;
    try {
      await tontineService.cancel(data.id);
      navigate('/tontines', { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={data.name}
        subtitle={isOrganizer ? 'Vous êtes organisateur' : 'Membre'}
        actions={
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/tontines')}>
            Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Colonne principale === */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="lg">
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
            <div className="mt-3 text-3xl font-extrabold">{formatPrice(data.monthlyAmount)}</div>
            <div className="text-xs text-ink-muted">par mois / membre</div>
            <div className="text-xs text-ink-muted mt-2">
              Pot mensuel :{' '}
              <span className="text-ink font-bold">
                {formatPrice(Number(data.monthlyAmount) * data.totalMembers)}
              </span>
              {' '}· Cycle le {data.cycleDay} du mois
            </div>
            {data.description && (
              <p className="text-sm text-ink-muted mt-3 leading-relaxed">{data.description}</p>
            )}
          </Card>

          {/* Membres */}
          <Card padding="md">
            <h3 className="text-sm font-bold mb-3">
              Membres ({joinedCount}/{data.totalMembers})
            </h3>
            <div className="divide-y divide-bg-border">
              {data.members
                .filter((m) => m.status === 'invited' || m.status === 'joined')
                .sort((a, b) => (a.orderInCycle ?? 999) - (b.orderInCycle ?? 999))
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                      {m.orderInCycle ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {m.userId === user?.id ? 'Vous' : `Membre #${m.userId.slice(-6)}`}
                        {m.userId === data.organizerId && (
                          <span className="ml-1 text-[10px] font-bold text-brand-300">
                            · ORGANISATEUR
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          m.status === 'joined' ? 'text-success-400' : 'text-warning-400'
                        }`}
                      >
                        {m.status === 'joined' ? '✓ A rejoint' : '⏳ Invité, en attente'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Rounds à venir */}
          {data.status === 'active' && data.rounds.length > 0 && (
            <Card padding="md">
              <h3 className="text-sm font-bold mb-3">Prochains rounds</h3>
              <div className="divide-y divide-bg-border">
                {data.rounds.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center text-brand-300 font-extrabold text-xs">
                      #{r.roundNumber}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{formatDate(r.scheduledDate)}</div>
                      <div className="text-[11px] text-ink-muted">
                        Bénéficiaire :{' '}
                        {r.beneficiaryUserId === user?.id ? 'Vous' : `#${r.beneficiaryUserId.slice(-6)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* === Sidebar : code + actions === */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {data.status === 'pending' && (
            <Card padding="lg" className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink-dim">
                Code d'invitation
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-widest">{data.inviteCode}</div>
              <div className="text-[11px] text-ink-muted mt-2">
                {data.totalMembers - joinedCount > 0
                  ? `${data.totalMembers - joinedCount} place(s) disponible(s)`
                  : 'Quota atteint — démarrage imminent'}
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="primary" size="sm" fullWidth icon={Share2} onClick={handleShare}>
                  Partager
                </Button>
                <Button variant="secondary" size="sm" icon={Copy} onClick={handleCopyCode}>
                  Copier
                </Button>
              </div>

              {isOrganizer && (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={UserPlus}
                  className="mt-2"
                  onClick={() => setInviteOpen(true)}
                >
                  Inviter par téléphone / email
                </Button>
              )}
            </Card>
          )}

          {data.status === 'active' && myMember?.orderInCycle && (
            <Card padding="md">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-300">
                <Trophy size={16} />
                Votre tour : round {myMember.orderInCycle}
              </div>
              <div className="text-xs text-ink-muted mt-2">
                Vous recevrez{' '}
                <span className="text-ink font-bold">
                  {formatPrice(Number(data.monthlyAmount) * data.totalMembers)}
                </span>{' '}
                au round #{myMember.orderInCycle} sur {data.totalMembers}.
              </div>
            </Card>
          )}

          {data.status === 'pending' && (
            <Card padding="md" className="border-danger-500/30">
              {isOrganizer ? (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={Trash2}
                  onClick={handleCancel}
                >
                  Annuler la tontine
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={LogOut}
                  onClick={handleLeave}
                >
                  Quitter
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* === Modal Inviter par contacts === */}
      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setInviteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md card shadow-elevated rounded-t-2xl sm:rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">Inviter des membres</h3>
              <button
                onClick={() => setInviteOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-bg-subtle"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-ink-muted mb-3 leading-relaxed">
              Téléphones ou emails séparés par des virgules. Les contacts non
              encore inscrits seront listés pour que vous puissiez leur envoyer
              le code à part.
            </p>
            <textarea
              value={inviteIds}
              onChange={(e) => setInviteIds(e.target.value)}
              placeholder="0341234567, 0349876543, jean@example.com"
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-xl bg-bg-elevated border border-bg-border focus:border-brand-500 focus:outline-none resize-none text-ink placeholder:text-ink-muted mb-4"
            />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={busy}
              icon={Send}
              onClick={handleInvite}
            >
              Envoyer les invitations
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
