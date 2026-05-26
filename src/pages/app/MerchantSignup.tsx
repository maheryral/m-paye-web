import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Info,
  Send,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchantApi } from '../../services/merchantApi';
import { Badge, Button, Card, Input, PageHeader } from '../../ui';

interface DocSlot {
  file: File | null;
  preview: string | null;
}

interface Step {
  id: number;
  label: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { id: 1, label: 'Entreprise', description: 'Informations légales', icon: Building2 },
  { id: 2, label: 'Documents', description: 'Pièces justificatives', icon: FileText },
  { id: 3, label: 'Banque', description: 'Coordonnées de paiement', icon: CreditCard },
];

const BUSINESS_TYPES = [
  'Commerce de détail',
  'Restauration',
  'Services',
  'Artisanat',
  'Hôtellerie',
  'Transport',
  'Agence de voyage',
  'E-commerce',
  'Autre',
];

export default function MerchantSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [info, setInfo] = useState({
    businessName: '',
    businessType: '',
    registrationNumber: '',
    taxId: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    description: '',
  });

  const [docs, setDocs] = useState<Record<string, DocSlot>>({
    registrationDoc: { file: null, preview: null },
    taxDoc: { file: null, preview: null },
    idDoc: { file: null, preview: null },
  });

  const [bank, setBank] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    iban: '',
    bic: '',
  });

  const upd = (patch: Partial<typeof info>) => setInfo((f) => ({ ...f, ...patch }));
  const updBank = (patch: Partial<typeof bank>) => setBank((f) => ({ ...f, ...patch }));

  const onFile = (key: keyof typeof docs, file: File | null) => {
    if (!file) {
      setDocs((d) => ({ ...d, [key]: { file: null, preview: null } }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier dépasse 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) =>
      setDocs((d) => ({
        ...d,
        [key]: { file, preview: e.target?.result as string },
      }));
    reader.readAsDataURL(file);
  };

  const validate = (s: number): string | null => {
    if (s === 1) {
      if (!info.businessName.trim()) return "Nom d'entreprise requis";
      if (!info.businessType) return "Type d'activité requis";
      if (!info.registrationNumber.trim()) return "Numéro d'enregistrement requis";
      if (!info.phone.trim()) return 'Téléphone requis';
      if (!info.email.includes('@')) return 'Email invalide';
    }
    if (s === 2) {
      if (!docs.registrationDoc.file) return "Document d'enregistrement requis";
      if (!docs.idDoc.file) return "Pièce d'identité requise";
    }
    if (s === 3) {
      if (!bank.bankName.trim()) return 'Banque requise';
      if (!bank.accountNumber.trim()) return 'Numéro de compte requis';
      if (!bank.accountHolder.trim()) return 'Titulaire requis';
    }
    return null;
  };

  const next = () => {
    const err = validate(step);
    if (err) return alert(err);
    setStep(step + 1);
  };

  const submit = async () => {
    const err = validate(3);
    if (err) return alert(err);
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(info).forEach(([k, v]) => fd.append(k, v));
      Object.entries(bank).forEach(([k, v]) => fd.append(`bank_${k}`, v));
      Object.entries(docs).forEach(([k, slot]) => {
        if (slot.file) fd.append(k, slot.file);
      });
      await merchantApi.upgradeRequest(fd);
      setSuccess(true);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de l'inscription marchand");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <Card padding="lg" className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-5">
            <CheckCircle2 size={56} className="text-success-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Demande envoyée !</h2>
          <p className="text-sm text-ink-muted max-w-sm mx-auto mb-6">
            Votre dossier marchand est en cours de vérification.
            Vous recevrez une notification sous 24-72h.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
            {[
              { label: 'Soumis', done: true },
              { label: 'En vérification', done: false, active: true },
              { label: 'Activé', done: false },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`p-3 rounded-xl text-xs font-semibold ${
                  s.done
                    ? 'bg-success-bg text-success-400'
                    : (s as any).active
                      ? 'bg-warning-bg text-warning-400'
                      : 'bg-bg-elevated text-ink-dim'
                }`}
              >
                {i + 1}. {s.label}
              </div>
            ))}
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </Button>
        </Card>
      </div>
    );
  }

  const currentStep = STEPS[step - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Devenir marchand"
        subtitle="Acceptez des paiements en ligne et en boutique avec M'Paye Pro"
      />

      {/* Stepper */}
      <Card padding="md">
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = s.id < step;
            const current = s.id === step;
            return (
              <div key={s.id} className="relative">
                <div
                  className={`p-3.5 rounded-xl flex items-center gap-3 transition-all ${
                    current
                      ? 'bg-gradient-brand-soft border border-brand-500/30'
                      : done
                        ? 'bg-success-bg/40 border border-success-500/20'
                        : 'bg-bg-elevated/40 border border-bg-border'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      done
                        ? 'bg-success-500 text-white'
                        : current
                          ? 'bg-gradient-brand text-white shadow-glow-soft'
                          : 'bg-bg-elevated text-ink-dim border border-bg-border'
                    }`}
                  >
                    {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <div className="text-[10px] uppercase tracking-wider text-ink-dim font-bold">
                      Étape {s.id}
                    </div>
                    <div
                      className={`text-sm font-bold truncate ${
                        current || done ? 'text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {s.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form (2/3) */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-bg-border">
              <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center text-white">
                <currentStep.icon size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold">{currentStep.label}</h3>
                <p className="text-xs text-ink-muted">{currentStep.description}</p>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <Input
                  label="Nom de l'entreprise *"
                  placeholder="Ma Société SARL"
                  value={info.businessName}
                  onChange={(e) => upd({ businessName: e.target.value })}
                />
                <div>
                  <label className="label">Type d'activité *</label>
                  <select
                    className="input"
                    value={info.businessType}
                    onChange={(e) => upd({ businessType: e.target.value })}
                  >
                    <option value="">Sélectionnez un type</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Numéro d'enregistrement *"
                    placeholder="NIF / RCS"
                    value={info.registrationNumber}
                    onChange={(e) => upd({ registrationNumber: e.target.value })}
                  />
                  <Input
                    label="Numéro fiscal (TVA)"
                    value={info.taxId}
                    onChange={(e) => upd({ taxId: e.target.value })}
                  />
                </div>
                <Input
                  label="Adresse *"
                  value={info.address}
                  onChange={(e) => upd({ address: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ville *"
                    value={info.city}
                    onChange={(e) => upd({ city: e.target.value })}
                  />
                  <Input
                    label="Téléphone *"
                    type="tel"
                    value={info.phone}
                    onChange={(e) => upd({ phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email *"
                    type="email"
                    value={info.email}
                    onChange={(e) => upd({ email: e.target.value })}
                  />
                  <Input
                    label="Site web"
                    placeholder="https://..."
                    value={info.website}
                    onChange={(e) => upd({ website: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    placeholder="Décrivez brièvement votre activité"
                    value={info.description}
                    onChange={(e) => upd({ description: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <FileDrop
                  id="registrationDoc"
                  label="Document d'enregistrement *"
                  description="Statuts de la société, RCS, K-bis…"
                  slot={docs.registrationDoc}
                  onChange={(f) => onFile('registrationDoc', f)}
                />
                <FileDrop
                  id="taxDoc"
                  label="Document fiscal"
                  description="Attestation fiscale (optionnel)"
                  slot={docs.taxDoc}
                  onChange={(f) => onFile('taxDoc', f)}
                />
                <FileDrop
                  id="idDoc"
                  label="Pièce d'identité du dirigeant *"
                  description="CIN, passeport, permis de conduire"
                  slot={docs.idDoc}
                  onChange={(f) => onFile('idDoc', f)}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Input
                  label="Nom de la banque *"
                  placeholder="BNI, BFV, BOA..."
                  value={bank.bankName}
                  onChange={(e) => updBank({ bankName: e.target.value })}
                />
                <Input
                  label="Titulaire du compte *"
                  placeholder="Identique au nom de l'entreprise"
                  value={bank.accountHolder}
                  onChange={(e) => updBank({ accountHolder: e.target.value })}
                />
                <Input
                  label="Numéro de compte *"
                  placeholder="00012 3456 78901234567"
                  value={bank.accountNumber}
                  onChange={(e) => updBank({ accountNumber: e.target.value })}
                  className="font-mono"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="IBAN"
                    value={bank.iban}
                    onChange={(e) => updBank({ iban: e.target.value })}
                    className="font-mono"
                  />
                  <Input
                    label="BIC / SWIFT"
                    value={bank.bic}
                    onChange={(e) => updBank({ bic: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between gap-2 pt-5 mt-5 border-t border-bg-border">
              <Button
                variant="ghost"
                size="md"
                icon={ArrowLeft}
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                Précédent
              </Button>
              {step < 3 ? (
                <Button variant="primary" size="md" iconEnd={ArrowRight} onClick={next}>
                  Continuer
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="md"
                  icon={Send}
                  loading={loading}
                  onClick={submit}
                >
                  Soumettre le dossier
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Side info (1/3) */}
        <Card padding="md" className="lg:sticky lg:top-20 lg:self-start">
          <Badge tone="brand" icon={<Info size={11} />}>
            Important
          </Badge>
          <h3 className="text-sm font-bold mt-3 mb-2">À savoir avant de soumettre</h3>
          <ul className="space-y-2.5 text-xs text-ink-muted">
            {[
              'La vérification prend 24 à 72h ouvrées',
              'Vous serez notifié par email et dans l\'app',
              'Les frais marchand sont 0,8% par transaction',
              'Versement automatique chaque semaine',
              'Tableau de bord dédié dès activation',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check size={12} className="text-success-400 mt-0.5 shrink-0" strokeWidth={3} />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-5 border-t border-bg-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-dim mb-2">
              Besoin d'aide ?
            </h4>
            <button
              onClick={() => navigate('/messages')}
              className="text-xs text-brand-300 font-semibold hover:text-brand-200"
            >
              Contacter le support →
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FileDrop({
  id,
  label,
  description,
  slot,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  slot: DocSlot;
  onChange: (f: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onChange(f);
  };

  return (
    <div>
      <label className="label">{label}</label>
      {slot.file ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-success-500/30">
          {slot.preview && slot.file.type.startsWith('image/') ? (
            <img
              src={slot.preview}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-300">
              <FileText size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{slot.file.name}</div>
            <div className="text-[11px] text-ink-muted">
              {(slot.file.size / 1024).toFixed(1)} KB · Téléchargé
            </div>
          </div>
          <button
            onClick={() => onChange(null)}
            className="w-9 h-9 rounded-lg bg-danger-bg text-danger-400 hover:bg-danger-500/30 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
          <label
            htmlFor={id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              dragging
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-bg-border hover:border-brand-500/50 hover:bg-bg-elevated/40'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-brand-300 shrink-0">
              <Upload size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                <span className="text-brand-300">Cliquez pour choisir</span> ou glissez ici
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {description} · JPG, PNG, PDF (max 5 MB)
              </div>
            </div>
            <ImageIcon size={18} className="text-ink-dim shrink-0 hidden sm:block" />
          </label>
        </>
      )}
    </div>
  );
}
