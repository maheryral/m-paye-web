import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Hourglass,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { paymentApi, type PaymentRequest } from '../../services/paymentApi';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  PageHeader,
  Skeleton,
} from '../../ui';

type Filter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const STATUS_META: Record<
  string,
  { tone: 'warning' | 'brand' | 'success' | 'danger' | 'neutral'; label: string; icon: LucideIcon }
> = {
  PENDING: { tone: 'warning', label: 'En attente', icon: Clock },
  PROCESSING: { tone: 'brand', label: 'En cours', icon: RefreshCcw },
  APPROVED: { tone: 'success', label: 'Approuvé', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', label: 'Rejeté', icon: XCircle },
  CANCELLED: { tone: 'neutral', label: 'Annulé', icon: Ban },
  EXPIRED: { tone: 'neutral', label: 'Expiré', icon: Hourglass },
};

export default function AdminPayments() {
  const { user } = useAuth();
  const { formatCurrency } = useLocale();
  const isAdmin = (user as any)?.role === 'ADMIN';

  const [items, setItems] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Modal d'approbation avec saisie de la référence externe (USSD MVola, RIB, etc.)
  const [approving, setApproving] = useState<PaymentRequest | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const r =
        filter === 'PENDING' ? await paymentApi.listPending() : await paymentApi.listAll();
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filter, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  // Stats
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalAmount = 0;
    for (const r of items) {
      if (r.status === 'PENDING' || r.status === 'PROCESSING') pending++;
      if (r.status === 'APPROVED') {
        approved++;
        totalAmount += Number(r.amount) || 0;
      }
      if (r.status === 'REJECTED') rejected++;
    }
    return { pending, approved, rejected, totalAmount };
  }, [items]);

  // Filtered
  const filtered = useMemo(() => {
    let res = items;
    if (filter !== 'ALL') {
      if (filter === 'PENDING') {
        res = res.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING');
      } else {
        res = res.filter((r) => r.status === filter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          `${r.user?.prenom || ''} ${r.user?.nom || ''}`.toLowerCase().includes(q),
      );
    }
    return res;
  }, [items, filter, search]);

  /**
   * Démarre l'approbation : si c'est un retrait ou un dépôt manuel (autre que CARD),
   * ouvre le modal pour saisir la référence du payout externe (réf USSD MVola,
   * n° virement bancaire, code agent cash). Sinon (dépôt CARD), on confirme direct.
   */
  const startApprove = (r: PaymentRequest) => {
    const needsRef = r.type === 'WITHDRAWAL' || r.method !== 'CARD';
    if (!needsRef) {
      if (!confirm('Approuver cette demande ?')) return;
      void doApprove(r.id, {});
      return;
    }
    setApproving(r);
    setPayoutRef('');
    setApproveNotes('');
  };

  /** Envoie l'approbation au backend avec la référence + notes éventuelles. */
  const doApprove = async (
    id: string,
    body: { payoutReference?: string; adminNotes?: string },
  ) => {
    setBusy(id);
    try {
      await paymentApi.approve(id, body);
      await load();
      if (selected?.id === id) setSelected(null);
      setApproving(null);
      setPayoutRef('');
      setApproveNotes('');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Approbation échouée');
    } finally {
      setBusy(null);
    }
  };

  const confirmApproveWithRef = () => {
    if (!approving) return;
    void doApprove(approving.id, {
      payoutReference: payoutRef.trim() || undefined,
      adminNotes: approveNotes.trim() || undefined,
    });
  };

  const reject = async () => {
    if (!selected || !rejectReason.trim()) return alert('Raison requise');
    setBusy(selected.id);
    try {
      await paymentApi.reject(selected.id, rejectReason.trim());
      await load();
      setSelected(null);
      setRejectMode(false);
      setRejectReason('');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Rejet échoué');
    } finally {
      setBusy(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Accès refusé" />
        <Card padding="lg">
          <Empty
            icon={Lock}
            title="Réservé aux administrateurs"
            description="Cette page n'est accessible qu'aux comptes ayant le rôle ADMIN."
            className="py-16"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Validation des paiements"
        subtitle="Approuvez ou rejetez les demandes de dépôt et retrait"
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={load}>
            Actualiser
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="En attente"
          value={stats.pending.toString()}
          icon={Clock}
          tone="warning"
          highlight={stats.pending > 0}
        />
        <KpiCard
          label="Approuvées"
          value={stats.approved.toString()}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Rejetées"
          value={stats.rejected.toString()}
          icon={XCircle}
          tone="danger"
        />
        <KpiCard
          label="Volume validé"
          value={formatCurrency(stats.totalAmount)}
          icon={TrendingUp}
          tone="brand"
        />
      </div>

      {/* Filter bar */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Rechercher par référence, email, nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl shrink-0">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as Filter[]).map((f) => {
              const active = filter === f;
              const label =
                f === 'PENDING'
                  ? 'En attente'
                  : f === 'APPROVED'
                    ? 'Approuvées'
                    : f === 'REJECTED'
                      ? 'Rejetées'
                      : 'Toutes';
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={Filter}
            title={search ? 'Aucun résultat' : 'Aucune demande'}
            description={
              filter === 'PENDING'
                ? 'Toutes les demandes ont été traitées'
                : 'Aucune demande à afficher dans cette catégorie'
            }
            className="py-16"
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  <th className="text-left text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Utilisateur
                  </th>
                  <th className="text-left text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Type & méthode
                  </th>
                  <th className="text-right text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Montant
                  </th>
                  <th className="text-left text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Date
                  </th>
                  <th className="text-center text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Statut
                  </th>
                  <th className="text-right text-[11px] font-bold text-ink-dim uppercase tracking-wider px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = STATUS_META[r.status];
                  const StatusIcon = meta.icon;
                  const isPending = r.status === 'PENDING';
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-bg-border hover:bg-bg-elevated/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${r.user?.prenom || ''} ${r.user?.nom || ''}`.trim() || r.user?.email}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {`${r.user?.prenom || ''} ${r.user?.nom || ''}`.trim() || '—'}
                            </div>
                            <div className="text-xs text-ink-muted truncate">
                              {r.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold">
                          {r.type === 'DEPOSIT' ? '⬇ Dépôt' : '⬆ Retrait'}
                        </div>
                        <div className="text-xs text-ink-muted">{r.method}</div>
                        <div className="text-[10px] text-ink-dim font-mono mt-0.5">
                          {r.reference}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="text-sm font-bold">
                          {Number(r.amount).toLocaleString('fr-FR')} Ar
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-muted">
                        {new Date(r.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge tone={meta.tone} icon={<StatusIcon size={10} />}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="success"
                              size="sm"
                              icon={Check}
                              loading={busy === r.id}
                              onClick={() => startApprove(r)}
                            >
                              Approuver
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={X}
                              onClick={() => {
                                setSelected(r);
                                setRejectMode(true);
                                setRejectReason('');
                              }}
                            >
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelected(r);
                              setRejectMode(false);
                            }}
                          >
                            Détails
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-bg-border">
              {filtered.map((r) => {
                const meta = STATUS_META[r.status];
                const StatusIcon = meta.icon;
                const isPending = r.status === 'PENDING';
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={`${r.user?.prenom || ''} ${r.user?.nom || ''}`.trim()} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {`${r.user?.prenom || ''} ${r.user?.nom || ''}`.trim() || '—'}
                          </div>
                          <div className="text-[10px] text-ink-muted truncate">
                            {r.user?.email}
                          </div>
                        </div>
                      </div>
                      <Badge tone={meta.tone} icon={<StatusIcon size={10} />}>
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-ink-muted">
                        {r.type === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} · {r.method}
                      </span>
                      <span className="text-sm font-bold">
                        {Number(r.amount).toLocaleString('fr-FR')} Ar
                      </span>
                    </div>
                    {isPending && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="success"
                          size="sm"
                          fullWidth
                          icon={Check}
                          loading={busy === r.id}
                          onClick={() => startApprove(r)}
                        >
                          Approuver
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          icon={X}
                          onClick={() => {
                            setSelected(r);
                            setRejectMode(true);
                            setRejectReason('');
                          }}
                        >
                          Rejeter
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Modal d'approbation avec saisie de référence externe (USSD MVola, etc.) */}
      {approving && (
        <ApproveModal
          req={approving}
          payoutRef={payoutRef}
          setPayoutRef={setPayoutRef}
          adminNotes={approveNotes}
          setAdminNotes={setApproveNotes}
          busy={busy === approving.id}
          onClose={() => setApproving(null)}
          onConfirm={confirmApproveWithRef}
        />
      )}

      {/* Slide-over details + reject */}
      {selected && (
        <DetailsPanel
          req={selected}
          rejectMode={rejectMode}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          busy={busy === selected.id}
          onClose={() => {
            setSelected(null);
            setRejectMode(false);
          }}
          onApprove={() => startApprove(selected)}
          onReject={() => setRejectMode(true)}
          onConfirmReject={reject}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: 'warning' | 'success' | 'danger' | 'brand';
  highlight?: boolean;
}) {
  const TONES = {
    warning: 'text-warning-400 bg-warning-bg',
    success: 'text-success-400 bg-success-bg',
    danger: 'text-danger-400 bg-danger-bg',
    brand: 'text-brand-300 bg-brand-500/15',
  };
  return (
    <Card
      padding="md"
      className={highlight ? 'border-warning-500/30' : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight truncate">{value}</div>
    </Card>
  );
}

function DetailsPanel({
  req,
  rejectMode,
  rejectReason,
  setRejectReason,
  busy,
  onClose,
  onApprove,
  onReject,
  onConfirmReject,
}: {
  req: PaymentRequest;
  rejectMode: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onConfirmReject: () => void;
}) {
  const meta = STATUS_META[req.status];
  const StatusIcon = meta.icon;
  const isPending = req.status === 'PENDING';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-surface border-l border-bg-border flex flex-col animate-slide-in shadow-elevated">
        <div className="p-5 border-b border-bg-border flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs text-ink-muted">Demande de paiement</div>
            <div className="text-sm font-bold font-mono mt-0.5">{req.reference}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-bg-subtle text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 py-3">
            <Badge tone={meta.tone} icon={<StatusIcon size={11} />}>
              {meta.label.toUpperCase()}
            </Badge>
          </div>

          {/* Amount block */}
          <div className="text-center py-6 bg-bg-elevated rounded-2xl">
            <div className="text-xs text-ink-muted">
              {req.type === 'DEPOSIT' ? 'Dépôt demandé' : 'Retrait demandé'}
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              {Number(req.amount).toLocaleString('fr-FR')} Ar
            </div>
            <div className="text-xs text-ink-muted mt-1">via {req.method}</div>
          </div>

          {/* User */}
          <Card padding="md" className="bg-bg-elevated/50">
            <div className="flex items-center gap-3">
              <Avatar
                name={`${req.user?.prenom || ''} ${req.user?.nom || ''}`.trim() || req.user?.email}
                size="md"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {`${req.user?.prenom || ''} ${req.user?.nom || ''}`.trim() || '—'}
                </div>
                <div className="text-xs text-ink-muted truncate">{req.user?.email}</div>
                {req.user?.telephone && (
                  <div className="text-xs text-ink-muted truncate">{req.user.telephone}</div>
                )}
              </div>
            </div>
          </Card>

          {/* Details */}
          <div className="space-y-1">
            <DetailRow label="Date">
              {new Date(req.createdAt).toLocaleString('fr-FR')}
            </DetailRow>
            {req.details && Object.keys(req.details).length > 0 && (
              <>
                <div className="text-xs font-semibold text-ink-dim uppercase tracking-wider mt-3 mb-1">
                  Détails de la méthode
                </div>
                {Object.entries(req.details).map(([k, v]) => (
                  <DetailRow key={k} label={k}>
                    {String(v)}
                  </DetailRow>
                ))}
              </>
            )}
            {req.rejectionReason && (
              <div className="mt-3 p-3 rounded-xl bg-danger-bg border border-danger-500/30">
                <div className="text-xs font-bold text-danger-400 mb-1">
                  Raison du rejet
                </div>
                <div className="text-sm">{req.rejectionReason}</div>
              </div>
            )}
          </div>

          {rejectMode && (
            <Card padding="md" className="border-danger-500/30">
              <div className="text-sm font-bold mb-1">Confirmer le rejet</div>
              <div className="text-xs text-ink-muted mb-3">
                Indiquez la raison — l'utilisateur sera notifié
              </div>
              <textarea
                rows={3}
                placeholder="Ex: Documents incomplets, montant suspect..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input resize-none"
                autoFocus
              />
            </Card>
          )}
        </div>

        {isPending && (
          <div className="p-4 border-t border-bg-border flex gap-2 shrink-0">
            {rejectMode ? (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setRejectReason('');
                    onClose();
                  }}
                  disabled={busy}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  loading={busy}
                  disabled={!rejectReason.trim()}
                  icon={X}
                  onClick={onConfirmReject}
                >
                  Confirmer le rejet
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  icon={X}
                  onClick={onReject}
                >
                  Rejeter
                </Button>
                <Button
                  variant="success"
                  size="md"
                  fullWidth
                  icon={ShieldCheck}
                  loading={busy}
                  onClick={onApprove}
                >
                  Approuver
                </Button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-bg-border/50 last:border-0">
      <span className="text-xs text-ink-muted capitalize">{label}</span>
      <span className="text-sm text-ink text-right truncate max-w-[60%]">{children}</span>
    </div>
  );
}

/**
 * Modal d'approbation d'un retrait/dépôt manuel.
 * L'admin fait le payout HORS APP (USSD MVola depuis son téléphone, virement
 * bancaire, etc.) puis colle la référence/preuve ici. Cette référence sera :
 *  - persistée en DB (`payoutReference`)
 *  - affichée dans la notification user ("Réf : MVOLA-XXXX")
 *  - retrouvable côté opérateur en cas de litige
 */
function ApproveModal({
  req,
  payoutRef,
  setPayoutRef,
  adminNotes,
  setAdminNotes,
  busy,
  onClose,
  onConfirm,
}: {
  req: PaymentRequest;
  payoutRef: string;
  setPayoutRef: (v: string) => void;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // Suggestion contextuelle selon la méthode
  const refHints: Record<string, { label: string; placeholder: string; hint: string }> = {
    MOBILE_MONEY: {
      label: 'Référence USSD Mobile Money',
      placeholder: 'Ex: MP240115.1234.A12345',
      hint: "Numéro de transaction reçu par SMS après le transfert *111# (MVola), Airtel Money ou Orange Money.",
    },
    BANK: {
      label: 'Référence de virement bancaire',
      placeholder: 'Ex: VIR-20260603-789456',
      hint: "Référence donnée par votre banque (BNI, BFV, BOA…) après émission du virement.",
    },
    CASH: {
      label: 'Code agent / reçu cash',
      placeholder: 'Ex: AG-0042-RECU-789',
      hint: "Code remis par l'agent ou numéro du reçu d'espèces.",
    },
    CARD: {
      label: 'Référence Stripe',
      placeholder: 'Ex: pi_3OabcDeFGHi456',
      hint: 'PaymentIntent ID Stripe (optionnel — déjà tracé automatiquement).',
    },
  };
  const hint = refHints[req.method] ?? refHints.MOBILE_MONEY;
  const isWithdrawal = req.type === 'WITHDRAWAL';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card padding="lg" className="max-w-lg w-full animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-success-400" />
              <div className="text-base font-bold">
                Approuver {isWithdrawal ? 'le retrait' : 'le dépôt'}
              </div>
            </div>
            <div className="text-xs text-ink-muted mt-0.5 font-mono">
              {req.reference}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 -mr-2 rounded-lg hover:bg-bg-elevated text-ink-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Récap montant + bénéficiaire */}
        <div className="rounded-xl bg-bg-elevated p-4 mb-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Montant</span>
            <span className="font-bold">
              {Number(req.amount).toLocaleString('fr-FR')} Ar
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Méthode</span>
            <span className="font-semibold">{req.method}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Bénéficiaire</span>
            <span className="font-semibold truncate ml-2">
              {`${req.user?.prenom || ''} ${req.user?.nom || ''}`.trim() || req.user?.email}
            </span>
          </div>
          {req.details && Object.keys(req.details).length > 0 && (
            <div className="pt-2 mt-2 border-t border-bg-border space-y-1">
              {Object.entries(req.details).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-ink-dim capitalize">{k}</span>
                  <span className="text-ink truncate ml-2 font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isWithdrawal && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border border-warning-500/30 bg-warning-bg">
            <Hourglass size={14} className="text-warning-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Effectuez d'abord le transfert sur le téléphone/banque, puis collez
              la référence ci-dessous. Le wallet du user ne sera débité qu'après
              confirmation.
            </p>
          </div>
        )}

        {/* Saisie référence */}
        <div className="mb-3">
          <label className="label">{hint.label}</label>
          <Input
            placeholder={hint.placeholder}
            value={payoutRef}
            onChange={(e) => setPayoutRef(e.target.value)}
            autoFocus
          />
          <p className="text-[11px] text-ink-dim mt-1.5">{hint.hint}</p>
        </div>

        {/* Notes admin (optionnel) */}
        <div className="mb-4">
          <label className="label">Note interne (optionnel)</label>
          <textarea
            rows={2}
            placeholder="Visible uniquement par les admins…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="input resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            disabled={busy}
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            variant="success"
            size="md"
            fullWidth
            loading={busy}
            icon={Check}
            onClick={onConfirm}
          >
            Confirmer l'approbation
          </Button>
        </div>
      </Card>
    </div>
  );
}
