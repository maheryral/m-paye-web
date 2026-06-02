import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  QrCode as QrCodeIcon,
  Phone,
  Wallet,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { qrService, type QrGenerateResult } from '../../../services/api';
import { Button, Card, PageHeader } from '../../../ui';

/**
 * Génère un QR de paiement marchand.
 *  - Mode A : payoutPhone renseigné → payout direct vers le Mobile Money du marchand
 *  - Mode B : pas de phone → crédit du wallet M'Paye du marchand
 *
 * Le QR expire dans 5 minutes (cohérent backend) et n'est payable qu'une seule fois.
 */
export default function MerchantQrCode() {
  const { formatCurrency } = useLocale();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [useDirectMobile, setUseDirectMobile] = useState(false);
  const [payoutPhone, setPayoutPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<QrGenerateResult | null>(null);

  const qrCanvasRef = useRef<HTMLDivElement | null>(null);

  // Détection live de l'opérateur Mobile Money depuis le préfixe
  const operatorFromPhone = (raw: string): string | null => {
    const digits = raw.replace(/\D+/g, '');
    let local = digits;
    if (local.startsWith('00261')) local = local.slice(5);
    else if (local.startsWith('261')) local = local.slice(3);
    if (local.startsWith('0')) local = local.slice(1);
    if (local.length < 2) return null;
    const p = local.slice(0, 2);
    if (p === '32' || p === '37') return 'Orange Money';
    if (p === '33') return 'Airtel Money';
    if (p === '34' || p === '38') return 'MVola (Yas/Telma)';
    return null;
  };
  const detectedOperator = useDirectMobile ? operatorFromPhone(payoutPhone) : null;

  async function generate() {
    setError(null);
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      setError('Montant invalide');
      return;
    }
    if (useDirectMobile) {
      if (!payoutPhone.trim()) {
        setError('Numéro Mobile Money requis');
        return;
      }
      if (!detectedOperator) {
        setError('Préfixe non reconnu (attendu : 032/033/034/038)');
        return;
      }
    }
    setBusy(true);
    try {
      const res = await qrService.generate({
        montant: amt,
        description: description.trim() || undefined,
        payoutPhone: useDirectMobile ? payoutPhone.trim() : undefined,
      });
      setGenerated(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Génération échouée');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setGenerated(null);
    setAmount('');
    setDescription('');
    setPayoutPhone('');
    setUseDirectMobile(false);
    setError(null);
  }

  function download() {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas || !generated) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `mpaye-qr-${generated.reference}.png`;
    link.click();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="QR de paiement"
        subtitle="Générez un QR pour encaisser un montant précis — sur votre wallet ou en direct sur Mobile Money"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ---- Form de génération ---- */}
        <div className="lg:col-span-2">
          {!generated ? (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <QrCodeIcon size={18} className="text-brand-300" />
                <h3 className="text-base font-bold">Nouveau QR</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Montant à encaisser *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value.replace(/[^\d]/g, ''))
                      }
                      placeholder="0"
                      className="input text-2xl font-bold py-4 pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-sm font-semibold">
                      Ar
                    </span>
                  </div>
                  {amount && parseInt(amount, 10) > 0 && (
                    <div className="text-xs text-brand-300 mt-1.5 font-semibold">
                      {formatCurrency(parseInt(amount, 10))} Ar
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Description (optionnel)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex : Café, ticket #42…"
                    maxLength={200}
                    className="input"
                  />
                </div>

                {/* Toggle Mode A / Mode B */}
                <button
                  type="button"
                  onClick={() => setUseDirectMobile((v) => !v)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition text-left ${
                    useDirectMobile
                      ? 'border-brand-500/60 bg-brand-500/10'
                      : 'border-bg-border bg-bg-elevated hover:border-brand-500/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      useDirectMobile
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-ink-muted'
                    }`}
                  >
                    {useDirectMobile && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      Recevoir directement sur Mobile Money
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      L'argent va sur votre numéro Orange / Airtel / MVola au lieu
                      du wallet M'Paye
                    </div>
                  </div>
                </button>

                {useDirectMobile && (
                  <div>
                    <label className="label">Numéro Mobile Money *</label>
                    <input
                      type="tel"
                      value={payoutPhone}
                      onChange={(e) => setPayoutPhone(e.target.value)}
                      placeholder="034 12 345 67"
                      className="input"
                    />
                    {payoutPhone && (
                      <div
                        className={`text-xs mt-1.5 font-semibold flex items-center gap-1.5 ${
                          detectedOperator ? 'text-success-400' : 'text-danger-400'
                        }`}
                      >
                        {detectedOperator ? (
                          <>
                            <CheckCircle2 size={12} />
                            Opérateur détecté : {detectedOperator}
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} />
                            Préfixe non reconnu (attendu : 032/033/034/038)
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-elevated text-xs text-ink-muted">
                  <Clock size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Le QR expire dans <b>5 minutes</b> et ne peut être payé qu'une
                    seule fois. Générez-en un nouveau pour chaque encaissement.
                  </span>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={busy}
                  disabled={!amount || parseInt(amount, 10) <= 0}
                  icon={QrCodeIcon}
                  onClick={generate}
                >
                  Générer le QR
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="text-center">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success-bg text-success-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                <CheckCircle2 size={11} />
                QR prêt
              </div>

              <div
                ref={qrCanvasRef}
                className="inline-block bg-white p-5 rounded-3xl shadow-elevated"
              >
                <QRCodeCanvas value={generated.reference} size={260} level="H" />
              </div>

              <div className="text-3xl font-extrabold mt-5">
                {formatCurrency(generated.montant)} Ar
              </div>
              {generated.description && (
                <div className="text-sm text-ink-muted mt-1">
                  {generated.description}
                </div>
              )}

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 text-brand-300 text-xs font-semibold mt-3">
                {generated.mode === 'DIRECT_MOBILE' ? (
                  <>
                    <Phone size={12} />
                    Direct → {generated.payoutOperator}
                  </>
                ) : (
                  <>
                    <Wallet size={12} />
                    Crédit wallet M'Paye
                  </>
                )}
              </div>

              <div className="text-[11px] text-warning-400 mt-3 flex items-center justify-center gap-1.5">
                <Clock size={11} />
                Expire dans 5 minutes
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-5">
                <Button
                  variant="primary"
                  size="md"
                  icon={Download}
                  onClick={download}
                >
                  Télécharger PNG
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  icon={RotateCcw}
                  onClick={reset}
                >
                  Nouveau QR
                </Button>
              </div>

              <div className="text-[10px] text-ink-dim mt-4 font-mono">
                Référence : {generated.reference}
              </div>
            </Card>
          )}
        </div>

        {/* ---- Side rail : explications ---- */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={14} className="text-brand-300" />
              <h3 className="text-sm font-bold">Mode wallet M'Paye</h3>
            </div>
            <p className="text-xs text-ink-muted">
              Par défaut, l'argent crédité va dans votre wallet M'Paye. Vous
              pouvez ensuite le retirer vers votre banque ou votre mobile money.
            </p>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Phone size={14} className="text-success-400" />
              <h3 className="text-sm font-bold">Mode mobile direct</h3>
            </div>
            <p className="text-xs text-ink-muted">
              En activant l'option, l'argent est versé immédiatement sur le
              numéro Mobile Money que vous indiquez (Orange Money, Airtel Money,
              MVola/Yas). Idéal pour un commerçant ambulant qui veut être payé
              sur son téléphone.
            </p>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-warning-400" />
              <h3 className="text-sm font-bold">Bon à savoir</h3>
            </div>
            <ul className="space-y-2 text-xs text-ink-muted list-disc list-inside">
              <li>Un QR = un paiement</li>
              <li>Validité : 5 minutes</li>
              <li>Le client confirme par biométrie / mot de passe</li>
              <li>Vous êtes notifié dès réception</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
