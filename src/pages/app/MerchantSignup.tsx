import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { merchantApi } from '../../services/merchantApi';

interface DocSlot {
  file: File | null;
  preview: string | null;
}

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
  const colors = useColors();

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

  const update = (patch: Partial<typeof info>) => setInfo((f) => ({ ...f, ...patch }));
  const updateBank = (patch: Partial<typeof bank>) => setBank((f) => ({ ...f, ...patch }));

  const handleFileChange = (key: keyof typeof docs, file: File | null) => {
    if (!file) {
      setDocs((d) => ({ ...d, [key]: { file: null, preview: null } }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier dépasse 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocs((d) => ({
        ...d,
        [key]: { file, preview: e.target?.result as string },
      }));
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (!info.businessName.trim()) return "Nom d'entreprise requis";
    if (!info.businessType) return 'Type d\'activité requis';
    if (!info.registrationNumber.trim()) return "Numéro d'enregistrement requis";
    if (!info.phone.trim()) return 'Téléphone requis';
    if (!info.email.includes('@')) return 'Email invalide';
    return null;
  };

  const validateStep2 = () => {
    if (!docs.registrationDoc.file) return "Document d'enregistrement requis";
    if (!docs.idDoc.file) return "Pièce d'identité requise";
    return null;
  };

  const validateStep3 = () => {
    if (!bank.bankName.trim()) return 'Banque requise';
    if (!bank.accountNumber.trim()) return 'Numéro de compte requis';
    if (!bank.accountHolder.trim()) return 'Titulaire requis';
    return null;
  };

  const goNext = () => {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) {
      alert(err);
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    const err = validateStep3();
    if (err) {
      alert(err);
      return;
    }
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
      <div className="min-h-screen bg-bg flex items-center justify-center p-5">
        <div className="card max-w-md w-full p-8 text-center">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: `${colors.success}20` }}
          >
            <CheckCircle2 size={56} style={{ color: colors.success }} />
          </div>
          <div className="text-2xl font-extrabold mb-2" style={{ color: colors.text }}>
            Demande envoyée !
          </div>
          <div className="text-sm mb-6" style={{ color: colors.textSecondary }}>
            Votre dossier marchand est en cours de vérification. Vous serez notifié sous 24-72h.
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: colors.primary }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, label: 'Entreprise', icon: Building2 },
    { id: 2, label: 'Documents', icon: FileText },
    { id: 3, label: 'Banque', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-2xl mx-auto">
        <GradientHeader title="Devenir marchand" subtitle="Acceptez les paiements de vos clients" />

        {/* Stepper */}
        <div className="px-5 mt-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const done = s.id < step;
              const current = s.id === step;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: done
                          ? colors.success
                          : current
                            ? colors.primary
                            : colors.card,
                        color: done || current ? '#fff' : colors.textSecondary,
                        border: `2px solid ${done ? colors.success : current ? colors.primary : colors.border}`,
                      }}
                    >
                      {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                    </div>
                    <div
                      className="text-xs mt-1.5 font-medium"
                      style={{ color: current ? colors.primary : colors.textSecondary }}
                    >
                      {s.label}
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mx-2 -mt-5"
                      style={{ background: done ? colors.success : colors.border }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 mt-6 space-y-4">
          {step === 1 && (
            <>
              <Field
                label="Nom de l'entreprise *"
                value={info.businessName}
                onChange={(v) => update({ businessName: v })}
                colors={colors}
                placeholder="Ma Société SARL"
              />
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                  Type d'activité *
                </label>
                <select
                  className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: colors.text, borderColor: colors.border, background: colors.card }}
                  value={info.businessType}
                  onChange={(e) => update({ businessType: e.target.value })}
                >
                  <option value="">Sélectionnez un type</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Numéro d'enregistrement *"
                value={info.registrationNumber}
                onChange={(v) => update({ registrationNumber: v })}
                colors={colors}
                placeholder="NIF / RCS"
              />
              <Field
                label="Numéro fiscal (TVA)"
                value={info.taxId}
                onChange={(v) => update({ taxId: v })}
                colors={colors}
              />
              <Field
                label="Adresse *"
                value={info.address}
                onChange={(v) => update({ address: v })}
                colors={colors}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Ville *"
                  value={info.city}
                  onChange={(v) => update({ city: v })}
                  colors={colors}
                />
                <Field
                  label="Téléphone *"
                  value={info.phone}
                  onChange={(v) => update({ phone: v })}
                  colors={colors}
                  type="tel"
                />
              </div>
              <Field
                label="Email *"
                value={info.email}
                onChange={(v) => update({ email: v })}
                colors={colors}
                type="email"
              />
              <Field
                label="Site web"
                value={info.website}
                onChange={(v) => update({ website: v })}
                colors={colors}
                placeholder="https://..."
              />
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                  Description
                </label>
                <textarea
                  className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ color: colors.text, borderColor: colors.border }}
                  rows={3}
                  value={info.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Décrivez brièvement votre activité"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <FileUpload
                label="Document d'enregistrement *"
                description="Statuts, RCS, etc."
                slot={docs.registrationDoc}
                onChange={(f) => handleFileChange('registrationDoc', f)}
                colors={colors}
              />
              <FileUpload
                label="Document fiscal"
                description="Attestation fiscale"
                slot={docs.taxDoc}
                onChange={(f) => handleFileChange('taxDoc', f)}
                colors={colors}
              />
              <FileUpload
                label="Pièce d'identité du dirigeant *"
                description="CIN, passeport, permis"
                slot={docs.idDoc}
                onChange={(f) => handleFileChange('idDoc', f)}
                colors={colors}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Field
                label="Banque *"
                value={bank.bankName}
                onChange={(v) => updateBank({ bankName: v })}
                colors={colors}
                placeholder="BNI, BFV, BOA..."
              />
              <Field
                label="Titulaire du compte *"
                value={bank.accountHolder}
                onChange={(v) => updateBank({ accountHolder: v })}
                colors={colors}
              />
              <Field
                label="Numéro de compte *"
                value={bank.accountNumber}
                onChange={(v) => updateBank({ accountNumber: v })}
                colors={colors}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="IBAN" value={bank.iban} onChange={(v) => updateBank({ iban: v })} colors={colors} />
                <Field label="BIC / SWIFT" value={bank.bic} onChange={(v) => updateBank({ bic: v })} colors={colors} />
              </div>
              <div
                className="p-3 rounded-xl text-xs"
                style={{ background: `${colors.warning}15`, color: colors.warning }}
              >
                Ces informations sont utilisées pour vous reverser les paiements reçus.
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <ArrowLeft size={18} />
                Précédent
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={goNext}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
                style={{ background: colors.primary }}
              >
                Suivant
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
                style={{ background: colors.success, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Envoyer la demande
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  colors: any;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <input
        type={type}
        className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ color: colors.text, borderColor: colors.border }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FileUpload({
  label,
  description,
  slot,
  onChange,
  colors,
}: {
  label: string;
  description: string;
  slot: DocSlot;
  onChange: (f: File | null) => void;
  colors: any;
}) {
  const id = `file-${label.replace(/\s/g, '-')}`;
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      {slot.file ? (
        <div className="card flex items-center gap-3 p-3">
          {slot.preview && slot.file.type.startsWith('image/') ? (
            <img src={slot.preview} alt="" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: `${colors.primary}20` }}
            >
              <FileText size={22} style={{ color: colors.primary }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: colors.text }}>
              {slot.file.name}
            </div>
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              {(slot.file.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button
            onClick={() => onChange(null)}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${colors.error}20`, color: colors.error }}
          >
            <X size={18} />
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
            className="card flex flex-col items-center gap-2 py-6 cursor-pointer hover:bg-white/5"
            style={{ borderStyle: 'dashed' }}
          >
            <Upload size={28} style={{ color: colors.primary }} />
            <div className="text-sm font-semibold" style={{ color: colors.text }}>
              Choisir un fichier
            </div>
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              {description} · JPG, PNG, PDF (max 5 MB)
            </div>
          </label>
        </>
      )}
    </div>
  );
}
