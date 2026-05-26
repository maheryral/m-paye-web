import {
  Banknote,
  Calendar,
  Copy,
  Download,
  Edit3,
  Loader2,
  QrCode,
  Share2,
  Store,
  TrendingUp,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { transactionService } from '../../services/api';

interface ReceivedTx {
  id: string;
  montant: number;
  createdAt: string;
  type: string;
  isCredit: boolean;
  sender?: { fullName: string };
}

export default function SellerMode() {
  const colors = useColors();
  const { user } = useAuth();
  const { formatCurrency } = useLocale();

  const [requestedAmount, setRequestedAmount] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const [receivedTx, setReceivedTx] = useState<ReceivedTx[]>([]);
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
        amount: requestedAmount ? Number(requestedAmount) : undefined,
        timestamp: new Date().toISOString(),
      }),
    [user, requestedAmount],
  );

  const load = useCallback(async () => {
    try {
      const res = await transactionService.getTransactions({ limit: 50 });
      const list = (res?.transactions || res || []) as ReceivedTx[];
      const credits = list.filter((tx) => tx.isCredit || tx.type === 'DEPOSIT');
      setReceivedTx(credits);
    } catch (e: any) {
      console.error('Erreur chargement stats:', e?.response?.data || e?.message);
      setReceivedTx([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    let countToday = 0,
      countWeek = 0,
      countMonth = 0;
    for (const tx of receivedTx) {
      const d = new Date(tx.createdAt);
      const amt = Number(tx.montant || 0);
      total += amt;
      if (d >= startMonth) {
        month += amt;
        countMonth++;
      }
      if (d >= startWeek) {
        week += amt;
        countWeek++;
      }
      if (d >= startToday) {
        today += amt;
        countToday++;
      }
    }
    return { today, week, month, total, countToday, countWeek, countMonth };
  }, [receivedTx]);

  const getQRCanvas = (): HTMLCanvasElement | null => {
    return qrRef.current?.querySelector('canvas') || null;
  };

  const downloadQR = () => {
    const canvas = getQRCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `mpaye-qr-${user?.prenom || 'user'}.png`;
    link.click();
  };

  const shareQR = async () => {
    const canvas = getQRCanvas();
    if (!canvas) return;
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png'),
      );
      if (!blob) return;
      const file = new File([blob], 'qr-mpaye.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Paiement M'Paye",
          text: `Scannez ce QR pour payer ${
            requestedAmount ? formatCurrency(Number(requestedAmount)) : ''
          } à ${user?.prenom || user?.email}`,
        });
      } else {
        downloadQR();
      }
    } catch (e) {
      console.error('Partage annulé ou indisponible', e);
    }
  };

  const copyContactLink = async () => {
    const text = `Payez-moi sur M'Paye : ${user?.email || user?.telephone}${
      requestedAmount ? ` — ${formatCurrency(Number(requestedAmount))}` : ''
    }`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Lien copié');
    } catch {
      alert('Copie indisponible');
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Mode vendeur"
          subtitle="Recevez des paiements via QR"
        />

        <div className="px-5 mt-4 space-y-5">
          {/* QR Card */}
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
              color: '#fff',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Store size={18} />
              <div className="text-sm font-semibold opacity-90">
                {user?.prenom
                  ? `${user.prenom} ${user.nom || ''}`.trim()
                  : "Utilisateur M'Paye"}
              </div>
            </div>
            <div className="text-xs opacity-80 mb-5">{user?.email}</div>

            {/* Montant */}
            <div className="mb-5">
              {editingAmount ? (
                <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    className="flex-1 bg-white/15 px-3 py-2 rounded-xl text-center text-white text-lg font-bold outline-none placeholder:text-white/60"
                    placeholder="Montant (Ar)"
                    value={requestedAmount}
                    onChange={(e) =>
                      setRequestedAmount(e.target.value.replace(/[^\d]/g, ''))
                    }
                    onBlur={() => setEditingAmount(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setEditingAmount(false);
                      }
                    }}
                  />
                  {requestedAmount && (
                    <button
                      onClick={() => {
                        setRequestedAmount('');
                        setEditingAmount(false);
                      }}
                      className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setEditingAmount(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
                >
                  {requestedAmount ? (
                    <>
                      <span className="text-2xl font-extrabold">
                        {Number(requestedAmount).toLocaleString('fr-FR')} Ar
                      </span>
                      <Edit3 size={14} className="opacity-70" />
                    </>
                  ) : (
                    <>
                      <Edit3 size={14} />
                      <span className="text-sm font-semibold">
                        Ajouter un montant
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* QR */}
            <div
              ref={qrRef}
              className="bg-white p-4 rounded-2xl inline-block mx-auto"
            >
              <QRCodeCanvas
                value={qrData}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="text-xs opacity-80 mt-4">
              Demandez à votre client de scanner ce QR avec son app M'Paye
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5 max-w-sm mx-auto">
              <button
                onClick={shareQR}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold"
              >
                <Share2 size={16} />
                Partager
              </button>
              <button
                onClick={downloadQR}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold"
              >
                <Download size={16} />
                Télécharger
              </button>
              <button
                onClick={copyContactLink}
                className="flex items-center justify-center px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30"
                title="Copier le lien"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} style={{ color: colors.primary }} />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Vos stats
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Aujourd'hui"
                amount={stats.today}
                count={stats.countToday}
                icon={Calendar}
                color={colors.success}
                formatCurrency={formatCurrency}
                colors={colors}
              />
              <StatCard
                label="7 derniers jours"
                amount={stats.week}
                count={stats.countWeek}
                icon={Calendar}
                color={colors.primary}
                formatCurrency={formatCurrency}
                colors={colors}
              />
              <StatCard
                label="Ce mois-ci"
                amount={stats.month}
                count={stats.countMonth}
                icon={Calendar}
                color={colors.warning}
                formatCurrency={formatCurrency}
                colors={colors}
              />
            </div>
          </section>

          {/* Derniers paiements */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Derniers paiements reçus
            </h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin" size={24} style={{ color: colors.primary }} />
              </div>
            ) : receivedTx.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 py-8">
                <Banknote size={40} style={{ color: colors.textSecondary }} />
                <div className="text-sm" style={{ color: colors.textSecondary }}>
                  Aucun paiement reçu
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {receivedTx.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="card flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${colors.success}20` }}
                      >
                        <Banknote size={20} style={{ color: colors.success }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
                          {tx.sender?.fullName || 'Paiement reçu'}
                        </div>
                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                          {new Date(tx.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: colors.success }}>
                      +{Number(tx.montant).toLocaleString('fr-FR')} Ar
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  amount,
  count,
  icon: Icon,
  color,
  formatCurrency,
  colors,
}: {
  label: string;
  amount: number;
  count: number;
  icon: any;
  color: string;
  formatCurrency: (n: number) => string;
  colors: any;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <div className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
          {label}
        </div>
      </div>
      <div className="text-lg font-extrabold" style={{ color: colors.text }}>
        {formatCurrency(amount)}
      </div>
      <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
        {count} paiement{count > 1 ? 's' : ''}
      </div>
    </div>
  );
}
