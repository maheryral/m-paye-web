import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Info,
  Loader2,
  Lock,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { merchantApi, type PaymentLink } from '../../../services/merchantApi';
import { Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';
const LABEL = 'block text-xs font-medium text-ink-muted mb-1.5';

export default function MerchantQrcode() {
  const { formatCurrency } = useLocale();
  const [staticLink, setStaticLink] = useState<PaymentLink | null>(null);
  const [dynamicLink, setDynamicLink] = useState<PaymentLink | null>(null);
  const [loadingStatic, setLoadingStatic] = useState(true);
  const [businessName, setBusinessName] = useState('Marchand M\'Paye');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', description: '' });
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lien réutilisable à montant libre (QR statique du marchand)
  const ensureStaticLink = useCallback(async () => {
    setLoadingStatic(true);
    try {
      const r = await merchantApi.listPaymentLinks('ACTIVE');
      const list = Array.isArray(r.data) ? r.data : [];
      const existing = list.find(
        (l) => l.reusable && l.openAmount && l.status === 'ACTIVE',
      );
      if (existing) {
        setStaticLink(existing);
        return;
      }
      const created = await merchantApi.createPaymentLink({
        label: 'Paiement QR',
        reusable: true,
      });
      setStaticLink(created.data);
    } catch (e: any) {
      console.error('static link:', e?.response?.data || e?.message);
    } finally {
      setLoadingStatic(false);
    }
  }, []);

  useEffect(() => {
    ensureStaticLink();
    merchantApi
      .getProfile()
      .then((r) => {
        if (r.data?.businessName) setBusinessName(r.data.businessName);
      })
      .catch(() => {});
  }, [ensureStaticLink]);

  async function generateDynamicQR(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.title.trim()) {
      setErr('Veuillez saisir un titre.');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setErr('Veuillez saisir un montant valide.');
      return;
    }
    setGenerating(true);
    try {
      const created = await merchantApi.createPaymentLink({
        label: form.title.trim(),
        description: form.description || undefined,
        amount: Number(form.amount),
        reusable: false,
      });
      setDynamicLink(created.data);
      setShowForm(false);
      setForm({ title: '', amount: '', description: '' });
    } catch (e: any) {
      setErr(
        e?.response?.data?.message?.toString() ||
          'Impossible de générer le QR code.',
      );
    } finally {
      setGenerating(false);
    }
  }

  function resetQR() {
    setDynamicLink(null);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function shareLink(link: PaymentLink) {
    const msg = link.openAmount
      ? `Payez ${businessName} via M'Paye : ${link.payUrl}`
      : `Payez ${formatCurrency(link.amount ?? 0)} à ${businessName} via M'Paye : ${link.payUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Paiement M\'Paye', text: msg, url: link.payUrl });
        return;
      } catch {
        /* annulé */
      }
    }
    copyLink(link.payUrl);
  }

  const shownLink = dynamicLink ?? staticLink;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Encaisser"
        subtitle="Faites scanner votre QR code pour être payé"
        actions={
          !dynamicLink ? (
            <Button size="sm" icon={Plus} onClick={() => setShowForm(true)}>
              QR dynamique
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={resetQR}
            >
              Nouveau
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte QR */}
        <Card className="flex flex-col items-center text-center">
          {loadingStatic && !shownLink ? (
            <Skeleton className="h-52 w-52 rounded-2xl" />
          ) : shownLink ? (
            <>
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={shownLink.payUrl} size={196} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-ink">
                {dynamicLink ? dynamicLink.label || 'Paiement' : businessName}
              </h2>

              {dynamicLink ? (
                <>
                  <div className="mt-1 text-2xl font-extrabold text-success">
                    {formatCurrency(dynamicLink.amount ?? 0)}
                  </div>
                  {dynamicLink.description && (
                    <p className="mt-1 text-sm text-ink-muted">
                      {dynamicLink.description}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                    <Lock size={12} /> Montant figé
                  </span>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-muted">
                    Scannez ce code pour payer (solde ou carte)
                  </p>
                  <div className="mt-2 text-sm font-semibold text-brand-500">
                    Montant libre
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="mt-5 flex w-full gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  icon={copied ? Check : Copy}
                  onClick={() => copyLink(shownLink.payUrl)}
                >
                  {copied ? 'Copié' : 'Copier le lien'}
                </Button>
                <Button fullWidth icon={Share2} onClick={() => shareLink(shownLink)}>
                  Partager
                </Button>
              </div>
            </>
          ) : (
            <div className="py-10 text-sm text-ink-muted">
              QR indisponible. Réessayez.
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card>
          <h3 className="mb-4 text-base font-bold text-ink">
            Comment encaisser ?
          </h3>
          <ul className="space-y-4">
            <Step
              icon={<QrCode size={18} className="text-brand-500" />}
              text="Affichez votre QR statique pour des paiements à montant libre."
            />
            <Step
              icon={<Plus size={18} className="text-brand-500" />}
              text="Générez un QR dynamique pour un montant précis (commande, facture)."
            />
            <Step
              icon={<Share2 size={18} className="text-brand-500" />}
              text="Partagez ou copiez le lien pour encaisser à distance."
            />
          </ul>

          <div className="mt-5 flex gap-2 rounded-xl bg-brand-500/10 p-3 text-xs text-ink-muted">
            <Info size={16} className="shrink-0 text-brand-500" />
            <span>
              Le client règle par solde M'Paye ou carte en scannant le QR. Le
              QR dynamique crée un lien de paiement à montant figé (usage
              unique).
            </span>
          </div>
        </Card>
      </div>

      {/* Modal QR dynamique */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Générer un QR code</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={generateDynamicQR} className="space-y-4">
              <div>
                <label className={LABEL}>Titre *</label>
                <input
                  className={INPUT}
                  placeholder="Ex : Paiement commande #1234"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL}>Montant *</label>
                <input
                  className={`${INPUT} text-lg font-bold`}
                  type="number"
                  min="1"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                {form.amount && (
                  <div className="mt-1 text-right text-sm text-brand-500">
                    {formatCurrency(Number(form.amount) || 0)}
                  </div>
                )}
              </div>
              <div>
                <label className={LABEL}>Description (optionnel)</label>
                <textarea
                  className={`${INPUT} min-h-[72px] resize-y`}
                  placeholder="Ex : Acompte, solde, remboursement…"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              {err && (
                <div className="rounded-xl bg-danger/15 px-3 py-2.5 text-sm text-danger">
                  {err}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                loading={generating}
                icon={generating ? Loader2 : QrCode}
              >
                {generating ? 'Génération…' : 'Générer le QR code'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
        {icon}
      </div>
      <span className="text-sm text-ink-muted">{text}</span>
    </li>
  );
}
