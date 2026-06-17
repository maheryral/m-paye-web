import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Crown,
  Eye,
  EyeOff,
  Gift,
  Plus,
  ScanLine,
  Send,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardsModal from '../../components/CardsModal';
import ServicesScroller from '../../components/ServicesScroller';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import { transactionService } from '../../services/api';
import { cardsApi, type SavedCard } from '../../services/cardsApi';
import { Button, Card, Skeleton } from '../../ui';

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
  if (diff < 86400) return `Aujourd'hui, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 172800) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/* ───────── Mini graphes SVG ───────── */
function Sparkline({ color, down }: { color: string; down?: boolean }) {
  const pts = down
    ? '0,8 14,11 28,9 42,14 56,12 70,18 84,16 98,21'
    : '0,20 14,16 28,18 42,11 56,14 70,7 84,9 98,4';
  return (
    <svg viewBox="0 0 98 24" className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Donut({ pct, color }: { pct: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(pct, 100) / 100);
  return (
    <svg viewBox="0 0 40 40" className="w-12 h-12 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="5" className="stroke-bg-elevated" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Bars({ color }: { color: string }) {
  const hs = [9, 15, 11, 19, 13, 21, 16];
  return (
    <svg viewBox="0 0 70 24" className="w-full h-6">
      {hs.map((h, i) => (
        <rect key={i} x={i * 10} y={24 - h} width="6" height={h} rx="1.5" fill={color} opacity={0.85} />
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, fetchBalance, loading: walletLoading } = useWallet();
  const { formatCurrency } = useLocale();

  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [card, setCard] = useState<SavedCard | null>(null);
  const [cardsModalOpen, setCardsModalOpen] = useState(false);

  useEffect(() => {
    void fetchBalance();
    void loadTx();
    void loadCard();
  }, [fetchBalance]);

  const loadCard = async () => {
    try {
      const r = await cardsApi.list();
      const list = Array.isArray(r.data) ? r.data : [];
      setCard(list.find((c) => c.isDefault) ?? list[0] ?? null);
    } catch {
      setCard(null);
    }
  };

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
    const cashback = Math.round(expense * 0.05);
    return { income, expense, count, cashback };
  }, [transactions]);

  // Libellé de période "01 – 31 Mois Année"
  const periodLabel = useMemo(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const month = now.toLocaleDateString('fr-FR', { month: 'long' });
    const cap = month.charAt(0).toUpperCase() + month.slice(1);
    return `01 – ${last} ${cap} ${now.getFullYear()}`;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{greet(user?.prenom)} 👋</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
            Tableau de bord
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bg-surface border border-bg-border text-sm font-medium hover:bg-bg-elevated transition-colors">
            <Calendar size={15} className="text-ink-muted" />
            {periodLabel}
            <ChevronDown size={14} className="text-ink-dim" />
          </button>
          <Button
            variant="secondary"
            size="md"
            icon={SlidersHorizontal}
            onClick={() => navigate('/settings')}
          >
            Personnaliser
          </Button>
        </div>
      </div>

      {/* Main grid : (solde + cartes/premium) à gauche, (accès rapides + activité) à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ─── Colonne gauche (2/3) ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Balance hero */}
          <Card gradient padding="lg" className="min-h-[230px]">
            {/* Courbe décorative */}
            <svg
              className="absolute right-0 bottom-16 w-2/3 h-28 opacity-50 pointer-events-none"
              viewBox="0 0 300 80"
              preserveAspectRatio="none"
            >
              <path
                d="M0,60 C40,55 70,28 110,40 S180,10 230,26 300,18 300,18"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="298" cy="18" r="4" fill="white" />
            </svg>

            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
                <Wallet size={14} />
                Solde principal
                <button
                  onClick={() => setShowBalance((v) => !v)}
                  className="ml-1 text-white/80 hover:text-white"
                  aria-label={showBalance ? 'Masquer' : 'Afficher'}
                >
                  {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold border border-white/20">
                <Shield size={11} />
                {user?.kycLevel || 'BASIC'}
              </span>
            </div>

            <div className="relative mt-4">
              {walletLoading ? (
                <Skeleton className="h-12 w-56 bg-white/15" />
              ) : (
                <div className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  {showBalance ? formatCurrency(balance) : '••••••'}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-white/85 text-sm">
                <TrendingUp size={15} className="text-emerald-300" />
                <span className="font-bold text-white">+{formatCurrency(monthStats.income)}</span>
                <span className="text-white/70">ce mois</span>
              </div>
            </div>

            {/* Actions */}
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
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
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all active:scale-95"
                  >
                    <Icon size={20} className="text-white" />
                    <span className="text-xs font-semibold text-white">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Mes cartes + Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Mes cartes */}
            <Card padding="md">
              <h3 className="text-base font-bold mb-3">Mes cartes</h3>
              <div className="relative rounded-2xl p-4 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-800 text-white overflow-hidden h-36">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.10]" />
                <div className="absolute -bottom-10 -left-8 w-28 h-28 rounded-full bg-white/[0.06]" />
                <div className="relative flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <CreditCard size={22} />
                    <span className="text-sm font-extrabold italic tracking-wide opacity-90">
                      {card ? card.brand.toUpperCase() : 'CARTE'}
                    </span>
                  </div>
                  <div>
                    <div className="font-mono text-base tracking-[0.25em] opacity-95">
                      {card ? `•••• ${card.last4}` : '•••• ••••'}
                    </div>
                    <div className="text-[10px] text-white/70 uppercase tracking-wider mt-2">
                      {user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : 'Mon nom'}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCardsModalOpen(true)}
                className="mt-3 flex items-center justify-between w-full text-sm font-semibold text-brand-500 hover:text-brand-600"
              >
                {card ? 'Gérer mes cartes' : 'Ajouter une carte'}
                <ChevronRight size={16} />
              </button>
            </Card>

            {/* Premium */}
            <Card padding="md" className="relative overflow-hidden bg-gradient-brand-soft border-brand-500/30">
              <Gift size={120} className="absolute -right-6 -bottom-6 text-brand-500/15" />
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center mb-3">
                  <Crown size={20} className="text-white" />
                </div>
                <div className="text-base font-bold">Passer à Premium</div>
                <div className="text-xs text-ink-muted mt-1 max-w-[230px]">
                  Plafonds étendus, cashback 10%, support prioritaire et plus encore.
                </div>
                <Button size="md" variant="primary" className="mt-4" onClick={() => navigate('/premium')}>
                  Découvrir Premium
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* ─── Colonne droite (1/3) ─── */}
        <div className="space-y-5">
          {/* Accès rapides (services dynamiques) */}
          <ServicesScroller maxItems={7} />

          {/* Activité récente */}
          <Card padding="none">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-base font-bold">Activité récente</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-sm font-semibold text-brand-500 hover:text-brand-600"
              >
                Voir tout
              </button>
            </div>
            <div className="divide-y divide-bg-border">
              {loadingTx ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <div className="text-sm font-semibold">Pas encore de transactions</div>
                  <div className="text-xs text-ink-muted mt-1">
                    Effectuez votre premier transfert
                  </div>
                </div>
              ) : (
                transactions.slice(0, 4).map((t) => {
                  const isPos = t.isCredit || t.type === 'DEPOSIT';
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigate('/history')}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-bg-subtle text-left transition-colors"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPos ? 'bg-success-bg text-success-400' : 'bg-danger-bg text-danger-400'
                        }`}
                      >
                        {isPos ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{txTitle(t)}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          {isPos ? 'Reçu' : 'Envoyé'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${isPos ? 'text-success-400' : 'text-ink'}`}>
                          {isPos ? '+' : '−'}
                          {Number(t.montant).toLocaleString('fr-FR')} Ar
                        </div>
                        <div className="text-[10px] text-ink-dim mt-0.5">{timeAgo(t.createdAt)}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Vue d'ensemble ─── */}
      <div>
        <h2 className="text-lg font-bold mb-3">Vue d'ensemble</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            label="Revenus"
            value={formatCurrency(monthStats.income)}
            sub="ce mois"
            trend="↑ 12%"
            trendUp
            chart={<Sparkline color="#16a34a" />}
          />
          <OverviewCard
            label="Dépenses"
            value={formatCurrency(monthStats.expense)}
            sub="ce mois"
            trend="↓ 8%"
            chart={<Sparkline color="#ef4444" down />}
          />
          <OverviewCard
            label="Cashback"
            value={formatCurrency(monthStats.cashback)}
            sub="estimé 5%"
            chart={
              <div className="relative flex items-center justify-center">
                <Donut pct={5} color="#8b5cf6" />
                <span className="absolute text-[11px] font-bold">5%</span>
              </div>
            }
          />
          <OverviewCard
            label="Transactions"
            value={monthStats.count.toString()}
            sub="ce mois"
            trend="↑ 14%"
            trendUp
            chart={<Bars color="#8b5cf6" />}
          />
        </div>
      </div>

      {/* Modal gestion des cartes */}
      <CardsModal
        open={cardsModalOpen}
        onClose={() => setCardsModalOpen(false)}
        onChanged={loadCard}
      />
    </div>
  );
}

/* ───────── Carte "Vue d'ensemble" ───────── */
function OverviewCard({
  label,
  value,
  sub,
  trend,
  trendUp,
  chart,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: string;
  trendUp?: boolean;
  chart: React.ReactNode;
}) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        {trend && (
          <span
            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
              trendUp ? 'text-success-400 bg-success-bg' : 'text-danger-400 bg-danger-bg'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div className="min-w-0">
          <div className="text-lg font-bold truncate">{value}</div>
          <div className="text-[11px] text-ink-dim mt-0.5">{sub}</div>
        </div>
        <div className="w-20 shrink-0">{chart}</div>
      </div>
    </Card>
  );
}
