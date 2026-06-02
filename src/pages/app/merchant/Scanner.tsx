import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import jsQR from 'jsqr';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImageIcon,
  RotateCcw,
  ScanLine,
  Send,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useLocale } from '../../../contexts/LocaleContext';
import { merchantApi } from '../../../services/merchantApi';
import { Button, Card, PageHeader } from '../../../ui';

/**
 * Scanner caissier — encaisse en scannant le QR d'un client externe
 * (Alipay, WeChat Pay, ou autre passerelle compatible).
 *
 * Flow :
 *  1. Camera ou upload image → décodage QR
 *  2. Vérifie format (alipay/wxp/qr-link)
 *  3. Saisie montant → POST /merchant/scan/payment
 *
 * Pour un paiement entre comptes M'Paye, utilisez plutôt /merchant/qrcode
 * (génération de QR Mode A/B avec le bon flow de validation client).
 */
export default function MerchantScanner() {
  const { formatCurrency } = useLocale();
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    amount: number;
    transactionId: string;
    customerName?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAcceptedQr = (data: string): boolean => {
    const lower = data.toLowerCase();
    return (
      lower.includes('alipay') ||
      lower.includes('wxp') ||
      lower.startsWith('https://qr')
    );
  };

  const handleScan = (detected: IDetectedBarcode[]) => {
    if (!detected.length || !scanning) return;
    const raw = detected[0].rawValue;
    setScanning(false);
    if (isAcceptedQr(raw)) {
      setQrData(raw);
    } else {
      setError(
        "QR non reconnu. Formats acceptés : Alipay, WeChat Pay et passerelles compatibles. Pour un paiement M'Paye, utilisez la page QR de paiement.",
      );
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Image illisible'));
      });
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height);
      if (!decoded) {
        setError("Aucun QR détecté dans l'image. Réessayez avec une photo plus nette.");
        return;
      }
      setScanning(false);
      if (isAcceptedQr(decoded.data)) {
        setQrData(decoded.data);
      } else {
        setError('QR non reconnu (Alipay/WeChat attendu)');
      }
    } catch (err: any) {
      setError(err?.message || "Impossible de lire l'image");
    }
  };

  const processPayment = async () => {
    if (!qrData) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Montant invalide');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await merchantApi.scanPayment(qrData, amt);
      if (res.data.success) {
        setSuccess({
          amount: res.data.amount,
          transactionId: res.data.transactionId,
          customerName: res.data.customerName,
        });
      } else {
        setError('Paiement refusé par la passerelle');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Échec du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setQrData(null);
    setAmount('');
    setError(null);
    setScanning(true);
    setSuccess(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Scanner client"
        subtitle="Encaissez via Alipay, WeChat Pay et autres passerelles compatibles"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {!qrData ? (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <ScanLine size={18} className="text-brand-300" />
                <h3 className="text-base font-bold">
                  Pointez la caméra vers le QR du client
                </h3>
              </div>
              <div className="relative aspect-square sm:aspect-video w-full rounded-2xl overflow-hidden bg-black max-w-2xl mx-auto">
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                    <AlertCircle size={48} className="text-danger-400" />
                    <div className="text-sm">{cameraError}</div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCameraError(null)}
                    >
                      Réessayer
                    </Button>
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
                      components={{ finder: true, torch: true, zoom: true }}
                      styles={{
                        container: { width: '100%', height: '100%' },
                        video: { objectFit: 'cover' as const },
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/40 rounded-3xl" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <p className="text-xs text-ink-muted flex-1">
                  Le client présente le QR de son app de paiement. Pour un paiement
                  M'Paye, utilisez la page <span className="font-semibold">QR de paiement</span>.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ImageIcon}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Importer une image
                </Button>
              </div>
              {error && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </Card>
          ) : (
            <Card padding="md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold">Montant à encaisser</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={reset}
                >
                  Annuler
                </Button>
              </div>

              <div className="rounded-xl bg-bg-elevated p-3 mb-4 text-xs">
                <div className="text-ink-muted mb-1">QR client détecté</div>
                <div className="font-mono break-all line-clamp-2">{qrData}</div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="0"
                  className="input text-3xl font-bold py-4 pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-base font-semibold">
                  Ar
                </span>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {[5000, 10000, 25000, 50000, 100000].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-elevated border border-bg-border hover:border-brand-500/50 hover:text-brand-300"
                  >
                    {p.toLocaleString('fr-FR')} Ar
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
                disabled={!amount || parseFloat(amount) <= 0}
                icon={Send}
                className="mt-5"
                onClick={processPayment}
              >
                Encaisser
                {amount && parseFloat(amount) > 0 && (
                  <span className="ml-1 opacity-80">
                    · {parseFloat(amount).toLocaleString('fr-FR')} Ar
                  </span>
                )}
              </Button>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={14} className="text-brand-300" />
              <h3 className="text-sm font-bold">Comment ça marche</h3>
            </div>
            <ol className="space-y-2.5 text-xs text-ink-muted list-decimal list-inside">
              <li>Demandez au client d'afficher son QR de paiement</li>
              <li>Pointez la caméra vers le QR (ou importez une image)</li>
              <li>Saisissez le montant exact en Ariary</li>
              <li>Confirmez — le client validera côté son app</li>
            </ol>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-warning-400" />
              <h3 className="text-sm font-bold">Formats acceptés</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              <li>• Alipay</li>
              <li>• WeChat Pay</li>
              <li>• Autres passerelles compatibles</li>
            </ul>
            <div className="text-[11px] text-ink-dim mt-3 leading-relaxed">
              Pour encaisser un paiement M'Paye, génère un QR via la page{' '}
              <span className="font-semibold">QR de paiement</span> — le client
              le scanne avec son app M'Paye.
            </div>
          </Card>
        </div>
      </div>

      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full text-center animate-slide-in">
            <button
              onClick={reset}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-bg-elevated"
            >
              <X size={16} />
            </button>
            <div className="w-20 h-20 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-4">
              <CheckCircle2 size={56} className="text-success-400" />
            </div>
            <div className="text-2xl font-bold mb-1">Paiement encaissé</div>
            <div className="text-3xl font-extrabold text-success-400 mb-2">
              {formatCurrency(success.amount)}
            </div>
            {success.customerName && (
              <div className="text-sm text-ink-muted">
                Client : <span className="font-bold text-ink">{success.customerName}</span>
              </div>
            )}
            <div className="text-[11px] text-ink-dim mt-3 font-mono">
              Tx : {success.transactionId}
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              className="mt-5"
              onClick={reset}
            >
              Scanner un autre
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
