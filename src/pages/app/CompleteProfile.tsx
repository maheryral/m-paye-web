import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  CreditCard as IdCardIcon,
  Loader2,
  Phone,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../contexts/ThemeContext';

interface StepDef {
  id: number;
  title: string;
  icon: LucideIcon;
}

const STEPS: StepDef[] = [
  { id: 1, title: 'Identité', icon: UserIcon },
  { id: 2, title: 'Contact', icon: Phone },
  { id: 3, title: 'Pièce ID', icon: IdCardIcon },
  { id: 4, title: 'Profession', icon: Briefcase },
  { id: 5, title: 'Confirmation', icon: ClipboardCheck },
];

const currentLimits = { daily: '500 000 Ar', monthly: '2 000 000 Ar', transaction: '200 000 Ar' };
const newLimits = { daily: '5 000 000 Ar', monthly: '20 000 000 Ar', transaction: '2 000 000 Ar' };

export default function CompleteProfile() {
  const navigate = useNavigate();
  const colors = useColors();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.prenom || '',
    lastName: user?.nom || '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'Malagasy',
    email: user?.email || '',
    phone: user?.telephone || '',
    address: '',
    city: '',
    postalCode: '',
    idType: 'cin' as 'cin' | 'passport' | 'license',
    idNumber: '',
    idExpiryDate: '',
    profession: '',
    employer: '',
    monthlyIncome: '',
  });

  const update = (patch: Partial<typeof formData>) => setFormData((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await updateUser({
        prenom: formData.firstName,
        nom: formData.lastName,
        telephone: formData.phone,
        email: formData.email,
      });
      setShowSuccess(true);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
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
            Profil complété !
          </div>
          <div className="text-sm mb-6" style={{ color: colors.textSecondary }}>
            Votre profil est en cours de vérification. Vous serez notifié sous 24-48h.
          </div>

          <div
            className="rounded-2xl p-4 mb-6 text-left"
            style={{ background: colors.background }}
          >
            <div className="text-sm font-bold mb-3" style={{ color: colors.text }}>
              Nouvelles limites proposées
            </div>
            {[
              { label: 'Plafond journalier', old: currentLimits.daily, n: newLimits.daily },
              { label: 'Plafond mensuel', old: currentLimits.monthly, n: newLimits.monthly },
              { label: 'Plafond transaction', old: currentLimits.transaction, n: newLimits.transaction },
            ].map((l) => (
              <div key={l.label} className="flex justify-between items-center py-1">
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  {l.label}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs line-through"
                    style={{ color: colors.textSecondary }}
                  >
                    {l.old}
                  </span>
                  <span className="text-sm font-bold" style={{ color: colors.success }}>
                    {l.n}
                  </span>
                </div>
              </div>
            ))}
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

  const stepDef = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-2xl mx-auto">
        <GradientHeader title="Complétez votre profil" subtitle="Niveau KYC avancé" />

        {/* Stepper */}
        <div className="px-5 mt-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = s.id < step;
              const current = s.id === step;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
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
                      {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                    </div>
                    <div
                      className="text-[10px] mt-1 font-medium hidden sm:block"
                      style={{ color: current ? colors.primary : colors.textSecondary }}
                    >
                      {s.title}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mx-1.5 sm:mx-2"
                      style={{ background: done ? colors.success : colors.border }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 mt-6 space-y-4">
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>
            {stepDef.title}
          </h2>

          {step === 1 && (
            <>
              <Field label="Prénom *" value={formData.firstName} onChange={(v) => update({ firstName: v })} placeholder="Jean" colors={colors} />
              <Field label="Nom *" value={formData.lastName} onChange={(v) => update({ lastName: v })} placeholder="Dupont" colors={colors} />
              <Field label="Date de naissance *" value={formData.dateOfBirth} onChange={(v) => update({ dateOfBirth: v })} placeholder="JJ/MM/AAAA" colors={colors} type="date" />
              <Field label="Lieu de naissance" value={formData.placeOfBirth} onChange={(v) => update({ placeOfBirth: v })} placeholder="Antananarivo" colors={colors} />
              <Field label="Nationalité *" value={formData.nationality} onChange={(v) => update({ nationality: v })} colors={colors} />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Email *" value={formData.email} onChange={(v) => update({ email: v })} type="email" colors={colors} />
              <Field label="Téléphone *" value={formData.phone} onChange={(v) => update({ phone: v })} type="tel" colors={colors} />
              <Field label="Adresse *" value={formData.address} onChange={(v) => update({ address: v })} placeholder="Lot 123, Rue de..." colors={colors} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville *" value={formData.city} onChange={(v) => update({ city: v })} placeholder="Antananarivo" colors={colors} />
                <Field label="Code postal" value={formData.postalCode} onChange={(v) => update({ postalCode: v })} placeholder="101" colors={colors} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                  Type de pièce *
                </label>
                <div className="flex gap-2">
                  {([
                    { id: 'cin', label: 'CIN' },
                    { id: 'passport', label: 'Passeport' },
                    { id: 'license', label: 'Permis' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => update({ idType: opt.id })}
                      className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                      style={{
                        borderColor: formData.idType === opt.id ? colors.primary : colors.border,
                        background: formData.idType === opt.id ? colors.primary : 'transparent',
                        color: formData.idType === opt.id ? '#fff' : colors.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Numéro de pièce *" value={formData.idNumber} onChange={(v) => update({ idNumber: v })} placeholder="123 456 789 012" colors={colors} />
              <Field label="Date d'expiration" value={formData.idExpiryDate} onChange={(v) => update({ idExpiryDate: v })} type="date" colors={colors} />

              <div className="card p-4 text-center" style={{ borderStyle: 'dashed', borderColor: colors.border }}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  id="id-upload"
                />
                <label htmlFor="id-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <IdCardIcon size={32} style={{ color: colors.primary }} />
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    Téléverser une photo recto/verso
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    JPG, PNG ou PDF, max 5 MB
                  </div>
                </label>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Profession *" value={formData.profession} onChange={(v) => update({ profession: v })} placeholder="Développeur, Commerçant..." colors={colors} />
              <Field label="Employeur" value={formData.employer} onChange={(v) => update({ employer: v })} placeholder="Nom de l'entreprise" colors={colors} />
              <Field label="Revenu mensuel (Ar)" value={formData.monthlyIncome} onChange={(v) => update({ monthlyIncome: v.replace(/[^\d]/g, '') })} placeholder="500 000" colors={colors} type="text" />
            </>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="card p-4 space-y-2">
                <div className="text-sm font-bold" style={{ color: colors.text }}>
                  Récapitulatif
                </div>
                <SumRow label="Nom" value={`${formData.firstName} ${formData.lastName}`} colors={colors} />
                <SumRow label="Email" value={formData.email} colors={colors} />
                <SumRow label="Téléphone" value={formData.phone} colors={colors} />
                <SumRow label="Adresse" value={`${formData.address}, ${formData.city}`} colors={colors} />
                <SumRow
                  label="Pièce"
                  value={`${formData.idType.toUpperCase()} · ${formData.idNumber}`}
                  colors={colors}
                />
                <SumRow label="Profession" value={formData.profession || '—'} colors={colors} />
              </div>
              <div
                className="p-3 rounded-xl text-xs"
                style={{ background: `${colors.warning}15`, color: colors.warning }}
              >
                En soumettant ce formulaire, vous certifiez que les informations fournies sont exactes et autorisez M'Paye à vérifier votre identité.
              </div>
            </div>
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
            {step < STEPS.length ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
                style={{ background: colors.primary }}
              >
                Suivant
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
                style={{ background: colors.success, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Soumettre
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

function SumRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <div className="flex justify-between text-xs">
      <span style={{ color: colors.textSecondary }}>{label}</span>
      <span className="font-semibold text-right max-w-[60%] truncate" style={{ color: colors.text }}>
        {value || '—'}
      </span>
    </div>
  );
}
