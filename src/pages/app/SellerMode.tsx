import {
  ArrowDownLeft,
  Calendar,
  Copy,
  Download,
  Edit3,
  Receipt,
  Share2,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useSocket } from '../../contexts/SocketContext';
import { transactionService } from '../../services/api';
import { Avatar, Badge, Button, Card, Empty, PageHeader, Skeleton } from '../../ui';

interface Received {
  id: string;
  montant: number;
  createdAt: string;
  type: string;
  isCredit: boolean;
  sender?: { fullName: string };
}

export default function SellerMode() {
  const { user } = useAuth();
  const { formatCurrency } = useLocale();
  const { onMessage } = useSocket();

  const [amount, setAmount] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const [received, setReceived] = useState<Received[]>([]);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const qrData = useMemo(
    () =>
      JSON.stringify({
        type: 'payment_request',
        userId: user?.id,
        name: user?.prenom
          ? `${user.prenom} ${user.nom || ''}`.trim()
          : "Utilisateur M'Paye",
        email: user?.email,
        telephone: user?.telephone || '',
        amount: amount ? Number(amount) : undefined,
        timestamp: new Date().toISOString(),
      }),
    [user, amount],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await transactionService.getTransactions({ limit: 50 });
      const list = (r?.transactions || r || []) as Received[];
      const credits = list.filter((t) => t.isCredit || t.type === 'DEPOSIT');
      setReceived(credits);
    } catch {
      setReceived([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh on real-time payment notification
  useEffect(() => {
    return onMessage(() => {
      void load();
    });
  }, [onMessage, load]);

  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(startToday);
    startWeek.setDate(startToday.getDate() - 7);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let today = 0,
      week = 0,
      month = 0,
      total = 0;
    let ct = 0,
      cw = 0,
      cm = 0;
    for (const t of received) {
      const d = new Date(t.createdAt);
      const a = Number(t.montant) || 0;
      total += a;
      if (d >= startMonth) {
        month += a;
        cm++;
      }
      if (d >= startWeek) {
        week += a;
        cw++;
      }
      if (d >= startToday) {
        today += a;
        ct++;
      }
    }
    return { today, week, month, total, ct, cw, cm };
  }, [received]);

  const getCanvas = (): HTMLCanvasElement | null =>
    qrRef.current?.querySelector('canvas') || null;

  const download = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `mpaye-receive-${user?.prenom || 'qr'}.png`;
    link.click();
  };

  const share = async () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try {
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), 'image/png'),
      );
      if (!blob) return;
      const file = new File([blob], 'qr-mpaye.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Paiement M'Paye",
          text: amount
            ? `Payez-moi ${formatCurrency(Number(amount))} sur M'Paye`
            : 'Payez-moi sur M\'Paye',
        });
      } else {
        download();
      }
    } catch {
      /* */
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `Payez-moi sur M'Paye : ${user?.email || user?.telephone}${
          amount ? ` — ${formatCurrency(Number(amount))}` : ''
        }`,
      );
      alert('Lien copié');
    } catch {
      /* */
    }
  };

  const displayName = user?.prenom
    ? `${user.prenom} ${user.nom || ''}`.trim()
    : 'Mon compte';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mode vendeur"
        subtitle="Recevez des paiements via votre QR personnel — sans frais, instantané"
        actions={
          <Badge tone="brand" icon={<Sparkles size={11} />}>
            <Store size={11} className="mr-1" />
            Vendeur
          </Badge>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aujourd'hui"
          amount={stats.today}
          count={stats.ct}
          icon={Calendar}
          tone="success"
          formatCurrency={formatCurrency}
        />
        <StatCard
          label="7 derniers jours"
          amount={stats.week}
          count={stats.cw}
          icon={Calendar}
          tone="brand"
          formatCurrency={formatCurrency}
        />
        <StatCard
          label="Ce mois-ci"
          amount={stats.month}
          count={stats.cm}
          icon={Calendar}
          tone="warning"
          formatCurrency={formatCurrency}
        />
        <StatCard
          label="Total reçu"
          amount={stats.total}
          count={received.length}
          icon={TrendingUp}
          tone="cyan"
          formatCurrency={formatCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === QR Card (2/3) === */}
        <Card padding="lg" className="lg:col-span-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Avatar name={displayName} size="md" />
            <div className="text-left">
              <div className="text-base font-bold">{displayName}</div>
              <div className="text-xs text-ink-muted">{user?.email}</div>
            </div>
          </div>

          {/* Amount editor */}
          <div className="mt-5 mb-6">
            {editingAmount ? (
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="Montant (Ar)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => setEditingAmount(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setEditingAmount(false);
                  }}
                  className="input text-center text-2xl font-bold py-3"
                />
                {amount && (
                  <button
                    onClick={() => {
                      setAmount('');
                      setEditingAmount(false);
                    }}
                    className="p-2.5 rounded-xl bg-bg-elevated text-ink-muted hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setEditingAmount(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-brand-soft border border-brand-500/30 hover:border-brand-500 transition-colors"
              >
                {amount ? (
                  <>
                    <span className="text-3xl font-bold text-ink">
                      {Number(amount).toLocaleString('fr-FR')} Ar
                    </span>
                    <Edit3 size={14} className="text-brand-300" />
                  </>
                ) : (
                  <>
                    <Edit3 size={14} className="text-brand-300" />
                    <span className="text-sm font-semibold text-ink-muted">
                      Définir un montant (optionnel)
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* QR */}
          <div className="inline-block bg-white p-5 rounded-3xl shadow-elevated">
            <div ref={qrRef}>
              <QRCodeCanvas value={qrData} size={260} level="H" />
            </div>
          </div>

          <p className="text-xs text-ink-muted mt-5 max-w-sm mx-auto">
            Demandez à votre client de scanner ce QR avec son app M'Paye.
            {amount && ' Le montant sera pré-rempli automatiquement.'}
          </p>

          <div className="flex flex-wrap gap-2 justify-center mt-5">
            <Button variant="primary" size="md" icon={Share2} onClick={share}>
              Partager
            </Button>
            <Button variant="secondary" size="md" icon={Download} onClick={download}>
              Télécharger
            </Button>
            <Button variant="ghost" size="md" icon={Copy} onClick={copyLink}>
              Copier le lien
            </Button>
          </div>
        </Card>

        {/* === Recent payments (1/3) === */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={16} className="text-brand-300" />
            <h3 className="text-sm font-bold">Paiements reçus</h3>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Mis à jour en temps réel
          </p>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : received.length === 0 ? (
            <Empty
              icon={Wallet}
              title="Aucun paiement"
              description="Les paiements reçus apparaîtront ici"
              className="py-8"
            />
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 -mr-1">
              {received.slice(0, 12).map((t) => {
                const name = t.sender?.fullName || 'Paiement reçu';
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-bg-border bg-bg-elevated/40"
                  >
                    <div className="w-9 h-9 rounded-xl bg-success-bg text-success-400 flex items-center justify-center shrink-0">
                      <ArrowDownLeft size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{name}</div>
                      <div className="text-[10px] text-ink-dim">
                        {new Date(t.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-success-400 shrink-0">
                      +{Number(t.montant).toLocaleString('fr-FR')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  amount,
  count,
  icon: Icon,
  tone,
  formatCurrency,
}: {
  label: string;
  amount: number;
  count: number;
  icon: LucideIcon;
  tone: 'success' | 'brand' | 'warning' | 'cyan';
  formatCurrency: (n: number) => string;
}) {
  const TONES = {
    success: 'text-success-400 bg-success-bg',
    brand: 'text-brand-300 bg-brand-500/15',
    warning: 'text-warning-400 bg-warning-bg',
    cyan: 'text-cyan-400 bg-cyan-500/15',
  };
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight truncate">
        {formatCurrency(amount)}
      </div>
      <div className="text-[11px] text-ink-dim mt-0.5">
        {count} paiement{count > 1 ? 's' : ''}
      </div>
    </Card>
  );
}
