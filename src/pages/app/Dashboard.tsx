import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Plus,
  ScanLine,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import { transactionService } from '../../services/api';
import { Avatar, Badge, Button, Card, Skeleton } from '../../ui';

interface Tx {
  id: string;
  type: string;
  montant: number;
  motif: string | null;
  reference: string;
  createdAt: string;
  isCredit: boolean;
  sender?: { fullName: string };
  receiver?: { fullName: string };
}

function greet(name?: string) {
  const h = new Date().getHours();
  const base = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return name ? `${base}, ${name}` : base;
}

function txTitle(t: Tx): string {
  if (t.type === 'DEPOSIT') return 'Dépôt wallet';
  if (t.isCredit && t.sender?.fullName) return `Reçu de ${t.sender.fullName}`;
  if (!t.isCredit && t.receiver?.fullName) return `Envoyé à ${t.receiver.fullName}`;
  return t.motif || 'Transaction';
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, fetchBalance, loading: walletLoading } = useWallet();
  const { formatCurrency } = useLocale();

  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    void fetchBalance();
    void loadTx();
  }, [fetchBalance]);

  const loadTx = async () => {
    try {
      setLoadingTx(true);
      const r = await transactionService.getTransactions({ limit: 8 });
      const list = (r?.transactions || r || []) as Tx[];
      setTransactions(Array.isArray(list) ? list : []);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  };

  const monthStats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let income = 0;
    let expense = 0;
    let count = 0;
    for (const t of transactions) {
      if (new Date(t.createdAt).getTime() < startMonth) continue;
      count++;
      if (t.isCredit || t.type === 'DEPOSIT') income += Number(t.montant) || 0;
      else expense += Number(t.montant) || 0;
    }
    const cashback = Math.round(expense * 0.05); // 5% cashback marketing
    return { income, expense, count, cashback };
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-sm text-ink-muted">{greet(user?.prenom)}</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
          Tableau de bord
        </h1>
      </div>

      {/* Hero row: balance card (2/3) + quick actions panel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Balance hero */}
        <Card gradient padding="lg" className="lg:col-span-2 min-h-[200px]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
                <Wallet size={14} />
                Solde principal
              </div>
              <div className="flex items-baseline gap-3 mt-3">
                {walletLoading ? (
                  <Skeleton className="h-12 w-48 bg-white/15" />
                ) : (
                  <>
                    <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                      {showBalance ? formatCurrency(balance) : '••••••'}
                    </span>
                  </>
                )}
                <button
                  onClick={() => setShowBalance((v) => !v)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                  aria-label={showBalance ? 'Masquer' : 'Afficher'}
                >
                  {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 text-white/80 text-sm">
                <TrendingUp size={14} className="text-success-400" />
                <span>
                  <span className="font-bold text-white">
                    +{formatCurrency(monthStats.income)}
                  </span>{' '}
                  ce mois
                </span>
              </div>
            </div>
            <Badge
              tone="brand"
              className="bg-white/15 text-white border-white/20"
              icon={<Sparkles size={10} />}
            >
              {user?.kycLevel || 'BASIC'}
            </Badge>
          </div>

          {/* Action chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-8">
            {[
              { icon: Send, label: 'Envoyer', to: '/transfers' },
              { icon: ArrowDownLeft, label: 'Recevoir', to: '/seller-mode' },
              { icon: Plus, label: 'Dépôt', to: '/portfolio' },
              { icon: ScanLine, label: 'Scanner', to: '/qr-payment' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white">{a.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right rail: cards preview + premium upsell */}
        <div className="space-y-4">
          <Card padding="md" interactive className="cursor-pointer" onClick={() => navigate('/cards')}>
            <div className="flex items-center justify-between mb-3">
              <span className="section-title">Mes cartes</span>
              <ChevronRight size={16} className="text-ink-dim" />
            </div>
            <div
              className="relative rounded-2xl p-4 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white overflow-hidden h-32"
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.08]" />
              <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/[0.06]" />
              <div className="relative flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <CreditCard size={20} />
                  <span className="text-[10px] font-bold opacity-80">VISA</span>
                </div>
                <div>
                  <div className="font-mono text-sm tracking-widest opacity-90">
                    •••• 4242
                  </div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider mt-1">
                    {user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : 'Mon nom'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md" className="bg-gradient-brand-soft border-brand-500/30">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Passer à Premium</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Plafonds étendus, cashback 10%, support prioritaire
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-3"
                  onClick={() => navigate('/premium')}
                >
                  Découvrir
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenus"
          value={formatCurrency(monthStats.income)}
          sub="ce mois"
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Dépenses"
          value={formatCurrency(monthStats.expense)}
          sub="ce mois"
          icon={TrendingDown}
          tone="danger"
        />
        <KpiCard
          label="Cashback"
          value={formatCurrency(monthStats.cashback)}
          sub="estimé 5%"
          icon={Gift}
          tone="brand"
        />
        <KpiCard
          label="Transactions"
          value={monthStats.count.toString()}
          sub="ce mois"
          icon={Zap}
          tone="cyan"
        />
      </div>

      {/* Two-column row: activity feed + side widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity feed (2/3) */}
        <Card padding="none" className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="text-base font-bold">Activité récente</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Vos dernières transactions
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconEnd={ChevronRight}
              onClick={() => navigate('/history')}
            >
              Voir tout
            </Button>
          </div>

          <div className="divide-y divide-bg-border">
            {loadingTx ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-bg-elevated flex items-center justify-center text-ink-dim mb-3">
                  <Zap size={20} />
                </div>
                <div className="text-sm font-semibold">Pas encore de transactions</div>
                <div className="text-xs text-ink-muted mt-1">
                  Effectuez votre premier transfert pour commencer
                </div>
              </div>
            ) : (
              transactions.slice(0, 6).map((t) => {
                const isPos = t.isCredit || t.type === 'DEPOSIT';
                const counterpart =
                  t.sender?.fullName || t.receiver?.fullName || 'M\'Paye';
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate('/history')}
                    className="w-full flex items-center gap-3 p-4 hover:bg-bg-subtle text-left transition-colors"
                  >
                    <Avatar name={counterpart} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {txTitle(t)}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5 truncate">
                        {timeAgo(t.createdAt)} · {t.reference.slice(0, 8)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`text-sm font-bold ${
                          isPos ? 'text-success-400' : 'text-ink'
                        }`}
                      >
                        {isPos ? '+' : '−'}
                        {Number(t.montant).toLocaleString('fr-FR')} Ar
                      </div>
                      {isPos ? (
                        <ArrowDownLeft size={14} className="text-success-400" />
                      ) : (
                        <ArrowUpRight size={14} className="text-ink-dim" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Side rail */}
        <div className="space-y-4">
          {/* Quick links */}
          <Card padding="md">
            <h3 className="section-title mb-3">Raccourcis</h3>
            <div className="space-y-1">
              {[
                { label: 'Bénéficiaires', icon: Users, to: '/beneficiaries' },
                { label: 'Factures', icon: CreditCard, to: '/bills' },
                { label: 'Mes notifications', icon: Bell, to: '/notifications' },
                { label: 'Sécurité', icon: ScanLine, to: '/security' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => navigate(s.to)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-subtle text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-brand-300">
                      <Icon size={15} />
                    </div>
                    <span className="text-sm flex-1">{s.label}</span>
                    <ChevronRight size={14} className="text-ink-dim" />
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Promo */}
          <Card
            padding="md"
            className="bg-gradient-cyan border-cyan-500/30 text-white overflow-hidden relative"
          >
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/[0.1]" />
            <div className="relative">
              <Gift size={22} className="mb-2" />
              <div className="text-sm font-bold">Parrainez un proche</div>
              <div className="text-xs opacity-90 mt-1">
                Gagnez 5 000 Ar pour chaque ami qui rejoint M'Paye
              </div>
              <button className="mt-3 text-xs font-bold underline underline-offset-2 hover:no-underline">
                Inviter maintenant →
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───────── KPI Card ───────── */
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone: 'success' | 'danger' | 'brand' | 'cyan';
}) {
  const TONES = {
    success: 'text-success-400 bg-success-bg',
    danger: 'text-danger-400 bg-danger-bg',
    brand: 'text-brand-300 bg-brand-500/15',
    cyan: 'text-cyan-400 bg-cyan-500/15',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-ink-muted font-medium">{label}</div>
          <div className="text-xl font-bold mt-2 truncate">{value}</div>
          <div className="text-[11px] text-ink-dim mt-1">{sub}</div>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}
