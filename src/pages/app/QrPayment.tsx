import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  QrCode as QrCodeIcon,
  RotateCcw,
  Scan,
  Send,
  Share2,
  Wallet,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { transactionService } from '../../services/api';

type Mode = 'scan' | 'mine';

interface ScannedData {
  type?: string;
  name?: string;
  email?: string;
  telephone?: string;
  amount?: number;
}

export default function QrPayment() {
  const colors = useColors();
  const { user } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [mode, setMode] = useState<Mode>('scan');
  const [scanning, setScanning] = useState(true);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [success, setSuccess] = useState<{ amount: number; to: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
        timestamp: new Date().toISOString(),
      }),
    [user],
  );

  useEffect(() => {
    void fetchBalance();
    void loadRecent();
  }, [fetchBalance]);

  const loadRecent = async () => {
    try {
      setLoadingTx(true);
      const res = await transactionService.getTransactions({ limit: 5 });
      const list = res?.transactions || res || [];
      setRecent(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error('Erreur transactions:', e?.response?.data || e?.message);
      setRecent([]);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleScan = (detected: IDetectedBarcode[]) => {
    if (!detected || detected.length === 0 || !scanning) return;
    const raw = detected[0].rawValue;
    setScanning(false);
    try {
      const parsed = JSON.parse(raw) as ScannedData;
      if (parsed.type === 'payment_request' && (parsed.email || parsed.telephone)) {
        setScannedData(parsed);
        if (parsed.amount) setAmount(String(parsed.amount));
        return;
      }
      throw new Error('Invalid QR');
    } catch {
      if (raw.includes('@')) {
        setScannedData({ email: raw, name: raw.split('@')[0] });
      } else {
        alert("Ce QR n'est pas un code de paiement M'Paye valide");
        setScanning(true);
      }
    }
  };

  const resetScan = () => {
    setScannedData(null);
    setAmount('');
    setScanning(true);
  };

  const handlePay = async () => {
    if (!scannedData) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }
    if (amt > balance) {
      alert(`Solde insuffisant (${formatCurrency(balance)} disponible)`);
      return;
    }
    const identifier = scannedData.email || scannedData.telephone;
    if (!identifier) {
      alert('Informations du destinataire manquantes');
      return;
    }
    setPaying(true);
    try {
      await transactionService.transfer({
        toPhone: identifier,
        amount: amt,
        motif: 'Transfert QR code',
      });
      await Promise.all([fetchBalance(), loadRecent()]);
      setSuccess({ amount: amt, to: scannedData.name || identifier });
      setTimeout(() => {
        setSuccess(null);
        resetScan();
      }, 2500);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement échoué');
    } finally {
      setPaying(false);
    }
  };

  const getQRCanvas = (): HTMLCanvasElement | null => {
    return qrRef.current?.querySelector('canvas') || null;
  };

  const downloadMyQR = () => {
    const canvas = getQRCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `mpaye-qr-${user?.prenom || 'user'}.png`;
    link.click();
  };

  const shareMyQR = async () => {
    const canvas = getQRCanvas();
    if (!canvas) return;
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png'),
      );
      if (!blob) return;
      const file = new File([blob], 'qr-mpaye.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mon QR M'Paye" });
      } else {
        downloadMyQR();
      }
    } catch {
      /* annulé */
    }
  };

  const copyMyContact = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || user?.telephone || '');
      alert('Contact copié');
    } catch {
      /* indisponible */
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title="Paiement QR" subtitle={`Solde : ${formatCurrency(balance)}`} />

        <div className="px-5 mt-4 space-y-4">
          {/* Mode toggle */}
          <div className="card flex gap-1 p-1">
            <button
              onClick={() => {
                setMode('scan');
                resetScan();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: mode === 'scan' ? colors.primary : 'transparent',
                color: mode === 'scan' ? '#fff' : colors.textSecondary,
              }}
            >
              <Scan size={16} />
              Scanner pour payer
            </button>
            <button
              onClick={() => setMode('mine')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: mode === 'mine' ? colors.primary : 'transparent',
                color: mode === 'mine' ? '#fff' : colors.textSecondary,
              }}
            >
              <QrCodeIcon size={16} />
              Mon QR
            </button>
          </div>

          {/* Mode SCAN */}
          {mode === 'scan' && (
            <>
              {!scannedData ? (
                <div className="card p-4">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                    <Camera size={18} style={{ color: colors.primary }} />
                    Pointez la caméra vers un QR M'Paye
                  </div>
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-md mx-auto">
                    {cameraError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                        <AlertCircle size={48} className="text-red-400" />
                        <div className="text-sm">{cameraError}</div>
                        <button
                          onClick={() => setCameraError(null)}
                          className="px-4 py-2 rounded-lg bg-white/15 text-sm font-semibold"
                        >
                          Réessayer
                        </button>
                      </div>
                    ) : (
                      <>
                        <Scanner
                          onScan={handleScan}
                          onError={(err: any) =>
                            setCameraError(
                              err?.message ||
                                "Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.",
                            )
                          }
                          formats={['qr_code']}
                          sound={false}
                          components={{
                            finder: true,
                            torch: true,
                            zoom: true,
                          }}
                          styles={{
                            container: { width: '100%', height: '100%' },
                            video: { objectFit: 'cover' as const },
                          }}
                        />
                        {/* Overlay viseur */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="w-60 h-60 border-2 border-white/70 rounded-2xl relative">
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-light rounded-tl-2xl" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-light rounded-tr-2xl" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-light rounded-bl-2xl" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-light rounded-br-2xl" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Formulaire de paiement */
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white text-lg font-bold"
                        style={{ background: colors.primary }}
                      >
                        {(scannedData.name?.[0] || scannedData.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: colors.text }}>
                          {scannedData.name || 'Destinataire'}
                        </div>
                        <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                          {scannedData.email || scannedData.telephone}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={resetScan}
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${colors.textSecondary}20`, color: colors.text }}
                      title="Scanner un autre QR"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  <div>
                    <label
                      className="text-xs font-semibold mb-1.5 block"
                      style={{ color: colors.textSecondary }}
                    >
                      Montant à payer (Ar)
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                      style={{ borderColor: colors.border, background: colors.background }}
                    >
                      <Wallet size={20} style={{ color: colors.textSecondary }} />
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        className="flex-1 bg-transparent outline-none text-xl font-bold"
                        style={{ color: colors.text }}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={paying || !amount || parseFloat(amount) <= 0}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white"
                    style={{
                      background:
                        amount && parseFloat(amount) > 0 ? colors.primary : '#475569',
                      opacity: paying ? 0.7 : 1,
                    }}
                  >
                    {paying ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Send size={18} />
                        Payer {amount ? `${parseFloat(amount).toLocaleString('fr-FR')} Ar` : ''}
                      </>
                    )}
                  </button>

                  <button
                    onClick={resetScan}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold"
                    style={{ color: colors.textSecondary }}
                  >
                    <ArrowLeft size={14} />
                    Annuler et scanner un autre code
                  </button>
                </div>
              )}
            </>
          )}

          {/* Mode MINE */}
          {mode === 'mine' && (
            <div
              className="rounded-2xl p-6 text-center text-white"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)' }}
            >
              <div className="text-sm font-semibold mb-1">
                {user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : 'Mon QR'}
              </div>
              <div className="text-xs opacity-80 mb-5">{user?.email}</div>
              <div ref={qrRef} className="inline-block bg-white p-4 rounded-2xl">
                <QRCodeCanvas value={qrData} size={220} level="H" />
              </div>
              <div className="text-xs opacity-80 mt-4">
                Faites scanner ce QR pour être payé
              </div>
              <div className="flex gap-2 mt-5 max-w-sm mx-auto">
                <button
                  onClick={shareMyQR}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold"
                >
                  <Share2 size={16} />
                  Partager
                </button>
                <button
                  onClick={downloadMyQR}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold"
                >
                  <Download size={16} />
                  Télécharger
                </button>
                <button
                  onClick={copyMyContact}
                  className="flex items-center justify-center px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Transactions récentes */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Transactions récentes
            </h3>
            {loadingTx ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin" size={24} style={{ color: colors.primary }} />
              </div>
            ) : recent.length === 0 ? (
              <div className="card p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                Aucune transaction récente
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((tx: any) => {
                  const isPos = tx.isCredit || tx.type === 'DEPOSIT';
                  return (
                    <div
                      key={tx.id}
                      className="card flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: isPos
                              ? `${colors.success}20`
                              : `${colors.error}20`,
                          }}
                        >
                          {isPos ? (
                            <Wallet size={18} style={{ color: colors.success }} />
                          ) : (
                            <Send size={18} style={{ color: colors.error }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
                            {tx.sender?.fullName ||
                              tx.receiver?.fullName ||
                              tx.motif ||
                              'Transaction'}
                          </div>
                          <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                            {new Date(tx.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div
                        className="text-sm font-bold shrink-0"
                        style={{ color: isPos ? colors.success : colors.error }}
                      >
                        {isPos ? '+' : '-'}
                        {Number(tx.montant).toLocaleString('fr-FR')} Ar
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal succès */}
      {success && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="bg-bg-card rounded-3xl p-6 flex flex-col items-center gap-3 max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={56} className="text-green-400" />
            </div>
            <div className="text-xl font-bold text-white">Paiement réussi !</div>
            <div className="text-2xl font-extrabold text-green-400">
              {success.amount.toLocaleString('fr-FR')} Ar
            </div>
            <div className="text-sm text-slate-400 text-center">
              à <span className="text-white font-semibold">{success.to}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
