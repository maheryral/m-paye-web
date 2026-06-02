import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import jsQR from 'jsqr';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  ImageIcon,
  Mail,
  Phone,
  QrCode as QrCodeIcon,
  RotateCcw,
  Scan,
  Send,
  Share2,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import { qrService, transactionService, type QrInfo } from '../../services/api';
import { Avatar, Button, Card, PageHeader } from '../../ui';

type Mode = 'scan' | 'mine';

interface Scanned {
  type?: string;
  name?: string;
  email?: string;
  telephone?: string;
  amount?: number;
}

export default function QrPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const { formatCurrency } = useLocale();

  const [mode, setMode] = useState<Mode>('scan');
  const [scanning, setScanning] = useState(true);
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<{ amt: number; to: string } | null>(
    null,
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  // QR marchand (Mode A/B) — preview avant /qr/pay
  const [merchantQr, setMerchantQr] = useState<QrInfo | null>(null);
  const [merchantQrLoading, setMerchantQrLoading] = useState(false);

  const qrRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      const r = await transactionService.getTransactions({ limit: 6 });
      setRecent(r?.transactions || []);
    } catch {
      setRecent([]);
    }
  };

  // Extrait une référence QR marchand (format QR-<ts>-<hex>, brut ou JSON)
  const extractMerchantQrRef = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (/^QR-\d+-[A-F0-9]+$/i.test(trimmed)) return trimmed;
    try {
      const j = JSON.parse(trimmed);
      if (j?.type === 'qr_payment' && typeof j.reference === 'string') {
        return j.reference;
      }
    } catch {
      /* */
    }
    return null;
  };

  // Extrait une référence Payment Link (PL-...) depuis un payload brut ou une URL
  // (ex: "http://host/pay/PL-1780407003574-e7e7ee91" ou juste "PL-...")
  const extractPaymentLinkRef = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (/^PL-\d+-[a-z0-9]+$/i.test(trimmed)) return trimmed;
    const m = trimmed.match(/\/pay\/(PL-\d+-[a-z0-9]+)/i);
    if (m) return m[1];
    return null;
  };

  // Charge le récap d'un QR marchand pour preview
  const loadMerchantQr = async (reference: string) => {
    setMerchantQrLoading(true);
    try {
      const data = await qrService.info(reference);
      if (data.statut !== 'PENDING') {
        alert(`Ce QR est déjà ${String(data.statut).toLowerCase()}.`);
        setScanning(true);
        return;
      }
      setMerchantQr(data);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'QR introuvable');
      setScanning(true);
    } finally {
      setMerchantQrLoading(false);
    }
  };

  // Route un payload scanné vers le bon flow (QR marchand, Payment Link, JSON p2p, email)
  const processScanned = (raw: string) => {
    const merchantRef = extractMerchantQrRef(raw);
    if (merchantRef) {
      void loadMerchantQr(merchantRef);
      return;
    }
    const plRef = extractPaymentLinkRef(raw);
    if (plRef) {
      navigate(`/pay/${plRef}`);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Scanned;
      if (
        parsed.type === 'payment_request' &&
        (parsed.email || parsed.telephone)
      ) {
        setScanned(parsed);
        if (parsed.amount) setAmount(String(parsed.amount));
        return;
      }
      throw new Error();
    } catch {
      if (raw.includes('@')) {
        setScanned({ email: raw, name: raw.split('@')[0] });
        return;
      }
      // 🐛 Log le contenu brut + ses bytes pour debug (chars invisibles, BOM, etc.)
      console.warn(
        '[QR non reconnu] raw =',
        JSON.stringify(raw),
        'length =',
        raw.length,
        'codepoints =',
        Array.from(raw).slice(0, 60).map((c) => c.charCodeAt(0).toString(16)).join(' '),
      );
      alert("QR non reconnu comme un code de paiement M'Paye");
      setScanning(true);
    }
  };

  const handleScan = (detected: IDetectedBarcode[]) => {
    if (!detected.length || !scanning) return;
    setScanning(false);
    processScanned(detected[0].rawValue);
  };

  // Upload d'une image → décodage QR via jsQR
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permet de réuploader la même image
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
        alert("Aucun QR détecté dans l'image. Réessayez avec une photo plus nette.");
        return;
      }
      setScanning(false);
      processScanned(decoded.data);
    } catch (err: any) {
      alert(err?.message || "Impossible de lire l'image");
    }
  };

  const confirmMerchantQrPayment = async () => {
    if (!merchantQr) return;
    if (Number(merchantQr.montant) > balance) {
      alert('Solde insuffisant');
      return;
    }
    setMerchantQrLoading(true);
    try {
      const idem = `qr-${merchantQr.reference}-${Date.now()}`;
      await qrService.pay(merchantQr.reference, idem);
      await fetchBalance();
      await loadRecent();
      setSuccess({
        amt: Number(merchantQr.montant),
        to: merchantQr.merchant.nom,
      });
      setMerchantQr(null);
      setTimeout(() => {
        setSuccess(null);
        setScanning(true);
      }, 2500);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement refusé');
    } finally {
      setMerchantQrLoading(false);
    }
  };

  const cancelMerchantQr = () => {
    setMerchantQr(null);
    setScanning(true);
  };

  const reset = () => {
    setScanned(null);
    setAmount('');
    setScanning(true);
  };

  const pay = async () => {
    if (!scanned) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert('Montant invalide');
    if (amt > balance) return alert(`Solde insuffisant (${formatCurrency(balance)})`);
    const identifier = scanned.email || scanned.telephone;
    if (!identifier) return alert('Destinataire incomplet');
    setPaying(true);
    try {
      await transactionService.transfer({
        toPhone: identifier,
        amount: amt,
        motif: 'Paiement QR',
      });
      await fetchBalance();
      await loadRecent();
      setSuccess({ amt, to: scanned.name || identifier });
      setTimeout(() => {
        setSuccess(null);
        reset();
      }, 2500);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Paiement échoué');
    } finally {
      setPaying(false);
    }
  };

  // QR actions for "mine"
  const getCanvas = (): HTMLCanvasElement | null =>
    qrRef.current?.querySelector('canvas') || null;

  const downloadMyQR = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `mpaye-qr-${user?.prenom || 'user'}.png`;
    link.click();
  };

  const shareMyQR = async () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try {
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), 'image/png'),
      );
      if (!blob) return;
      const file = new File([blob], 'qr-mpaye.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mon QR M'Paye" });
      } else {
        downloadMyQR();
      }
    } catch {
      /* */
    }
  };

  const copyContact = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || user?.telephone || '');
      alert('Contact copié');
    } catch {
      /* */
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Paiement par QR"
        subtitle="Scannez pour payer, ou faites scanner votre QR pour recevoir"
        actions={
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl">
            {[
              { id: 'scan' as Mode, label: 'Scanner', icon: Scan },
              { id: 'mine' as Mode, label: 'Mon QR', icon: QrCodeIcon },
            ].map((t) => {
              const Icon = t.icon;
              const active = mode === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setMode(t.id);
                    reset();
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-gradient-brand text-white shadow-glow-soft'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main pane */}
        <div className="lg:col-span-2 space-y-5">
          {mode === 'scan' ? (
            !scanned ? (
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Camera size={18} className="text-brand-300" />
                  <h3 className="text-base font-bold">
                    Pointez la caméra vers un QR M'Paye
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
                        <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/40 rounded-3xl relative">
                          <Corner pos="tl" />
                          <Corner pos="tr" />
                          <Corner pos="bl" />
                          <Corner pos="br" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                  <p className="text-xs text-ink-muted flex-1">
                    La caméra démarrera après autorisation. Visez le QR du
                    marchand ou d'un utilisateur.
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
              </Card>
            ) : (
              <Card padding="md">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold">Confirmer le paiement</h3>
                  <Button variant="ghost" size="sm" icon={RotateCcw} onClick={reset}>
                    Scanner autre
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-bg-elevated mb-5">
                  <Avatar name={scanned.name || scanned.email} size="lg" />
                  <div className="min-w-0">
                    <div className="text-xs text-ink-muted">Destinataire</div>
                    <div className="text-base font-bold truncate">
                      {scanned.name || 'Bénéficiaire'}
                    </div>
                    <div className="text-xs text-ink-muted truncate flex items-center gap-1.5 mt-0.5">
                      {scanned.email ? <Mail size={11} /> : <Phone size={11} />}
                      {scanned.email || scanned.telephone}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Montant à payer</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="0"
                      className="input text-3xl font-bold py-4 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-base font-semibold">
                      Ar
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-ink-dim">
                      Solde : {formatCurrency(balance)}
                    </span>
                    {amount && parseFloat(amount) > balance && (
                      <span className="text-danger-400 font-semibold">Insuffisant</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[5000, 10000, 25000, 50000].map((p) => (
                      <button
                        key={p}
                        onClick={() => setAmount(String(p))}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-elevated border border-bg-border hover:border-brand-500/50 hover:text-brand-300"
                      >
                        {p.toLocaleString('fr-FR')} Ar
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={paying}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                  icon={Send}
                  className="mt-5"
                  onClick={pay}
                >
                  Payer
                  {amount && parseFloat(amount) > 0 && (
                    <span className="ml-1 opacity-80">
                      · {parseFloat(amount).toLocaleString('fr-FR')} Ar
                    </span>
                  )}
                </Button>
              </Card>
            )
          ) : (
            /* === Mon QR === */
            <Card padding="lg" className="text-center">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-500/15 text-brand-300 text-[10px] font-bold uppercase tracking-wider mb-4">
                <Sparkles size={11} />
                Mon code
              </div>

              <div className="flex items-center justify-center gap-2 mb-1">
                <Avatar
                  name={`${user?.prenom || ''} ${user?.nom || ''}`.trim() || user?.email}
                  size="sm"
                />
                <div className="text-base font-bold">
                  {user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : 'Mon profil'}
                </div>
              </div>
              <div className="text-xs text-ink-muted mb-6">{user?.email}</div>

              <div ref={qrRef} className="inline-block bg-white p-5 rounded-3xl shadow-elevated">
                <QRCodeCanvas value={qrData} size={240} level="H" />
              </div>

              <div className="text-xs text-ink-muted mt-5 max-w-xs mx-auto">
                Faites scanner ce QR pour recevoir un paiement instantané,
                gratuit et sécurisé.
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-5">
                <Button variant="primary" size="md" icon={Share2} onClick={shareMyQR}>
                  Partager
                </Button>
                <Button variant="secondary" size="md" icon={Download} onClick={downloadMyQR}>
                  Télécharger
                </Button>
                <Button variant="ghost" size="md" icon={Copy} onClick={copyContact}>
                  Copier contact
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          {/* Balance */}
          <Card padding="md">
            <div className="flex items-center gap-2 text-ink-muted text-xs font-semibold uppercase tracking-wider mb-2">
              <Wallet size={12} />
              Solde
            </div>
            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            <div className="text-[11px] text-ink-dim mt-1">
              Disponible immédiatement
            </div>
          </Card>

          {/* Tips */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-success-400" />
              <h3 className="text-sm font-bold">Sécurité & bonnes pratiques</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-ink-muted">
              {[
                'Vérifiez toujours le nom du destinataire avant de payer.',
                "M'Paye ne demandera jamais votre mot de passe via QR.",
                "Les QR code de paiement ne sont valables que pour des comptes M'Paye.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    className="text-success-400 mt-0.5 shrink-0"
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Recent */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Transactions récentes</h3>
            </div>
            {recent.length === 0 ? (
              <div className="text-xs text-ink-muted text-center py-6">
                Aucune activité récente
              </div>
            ) : (
              <div className="space-y-1">
                {recent.slice(0, 5).map((t: any) => {
                  const isPos = t.isCredit || t.type === 'DEPOSIT';
                  const counterpart =
                    t.sender?.fullName || t.receiver?.fullName || "M'Paye";
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-elevated"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPos
                            ? 'bg-success-bg text-success-400'
                            : 'bg-bg-elevated text-ink-muted'
                        }`}
                      >
                        {isPos ? (
                          <ArrowDownLeft size={14} />
                        ) : (
                          <ArrowUpRight size={14} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {counterpart}
                        </div>
                        <div className="text-[10px] text-ink-dim">
                          {new Date(t.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-bold shrink-0 ${
                          isPos ? 'text-success-400' : 'text-ink'
                        }`}
                      >
                        {isPos ? '+' : '−'}
                        {Number(t.montant).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal confirmation paiement QR marchand (Mode A / B) */}
      {merchantQr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full animate-slide-in">
            <div className="flex items-center gap-3 mb-4">
              {merchantQr.mode === 'DIRECT_MOBILE' ? (
                <Phone size={22} className="text-brand-300" />
              ) : (
                <Wallet size={22} className="text-brand-300" />
              )}
              <div className="text-base font-bold">Confirmer le paiement</div>
            </div>

            <div className="text-3xl font-extrabold text-center my-4">
              {formatCurrency(Number(merchantQr.montant))} {merchantQr.devise}
            </div>

            <div className="border-t border-bg-border my-3" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink-muted">Bénéficiaire</span>
                <span className="font-semibold truncate">
                  {merchantQr.merchant.nom}
                </span>
              </div>
              {merchantQr.mode === 'DIRECT_MOBILE' ? (
                <>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-muted">Mode</span>
                    <span className="font-semibold text-brand-300">
                      {merchantQr.payoutOperatorLabel}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-muted">Numéro</span>
                    <span className="font-semibold">
                      {merchantQr.payoutPhoneMasked}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-muted">Mode</span>
                  <span className="font-semibold">Wallet M'Paye</span>
                </div>
              )}
              {merchantQr.description && (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-muted">Motif</span>
                  <span className="font-semibold text-right">
                    {merchantQr.description}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3 pt-2 border-t border-bg-border">
                <span className="text-ink-muted">Votre solde</span>
                <span
                  className={`font-semibold ${
                    Number(merchantQr.montant) > balance
                      ? 'text-danger-400'
                      : 'text-success-400'
                  }`}
                >
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={cancelMerchantQr}
                disabled={merchantQrLoading}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={merchantQrLoading}
                disabled={Number(merchantQr.montant) > balance}
                icon={Send}
                onClick={confirmMerchantQrPayment}
              >
                Payer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full text-center animate-slide-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-4">
              <CheckCircle2 size={56} className="text-success-400" />
            </div>
            <div className="text-2xl font-bold mb-1">Paiement réussi !</div>
            <div className="text-3xl font-extrabold text-success-400 mb-2">
              {success.amt.toLocaleString('fr-FR')} Ar
            </div>
            <div className="text-sm text-ink-muted">
              à <span className="font-bold text-ink">{success.to}</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const cls = {
    tl: '-top-1 -left-1 border-t-4 border-l-4 rounded-tl-3xl',
    tr: '-top-1 -right-1 border-t-4 border-r-4 rounded-tr-3xl',
    bl: '-bottom-1 -left-1 border-b-4 border-l-4 rounded-bl-3xl',
    br: '-bottom-1 -right-1 border-b-4 border-r-4 rounded-br-3xl',
  }[pos];
  return <div className={`absolute w-8 h-8 border-brand-300 ${cls}`} />;
}
