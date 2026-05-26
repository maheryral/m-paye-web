import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard as IdCardIcon,
  FileText,
  Info,
  Phone,
  Send,
  TrendingUp,
  Upload,
  User as UserIcon,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Badge, Button, Card, Input, PageHeader } from '../../ui';

interface Step {
  id: number;
  label: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { id: 1, label: 'Identité', icon: UserIcon },
  { id: 2, label: 'Contact', icon: Phone },
  { id: 3, label: 'Pièce ID', icon: IdCardIcon },
  { id: 4, label: 'Profession', icon: Briefcase },
  { id: 5, label: 'Confirmation', icon: ClipboardCheck },
];

const ID_TYPES = [
  { id: 'cin', label: 'CIN', desc: 'Carte d\'identité nationale' },
  { id: 'passport', label: 'Passeport', desc: 'International' },
  { id: 'license', label: 'Permis', desc: 'Permis de conduire' },
] as const;

const CURRENT_LIMITS = {
  daily: '200 000 Ar',
  monthly: '1 000 000 Ar',
  transaction: '50 000 Ar',
};
const NEW_LIMITS = {
  daily: '20 000 000 Ar',
  monthly: '100 000 000 Ar',
  transaction: '5 000 000 Ar',
};

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [idDoc, setIdDoc] = useState<{ file: File | null; preview: string | null }>({
    file: null,
    preview: null,
  });

  const [form, setForm] = useState({
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

  const upd = (patch: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleFile = (file: File | null) => {
    if (!file) {
      setIdDoc({ file: null, preview: null });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Fichier > 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) =>
      setIdDoc({ file, preview: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const validate = (s: number): string | null => {
    if (s === 1) {
      if (!form.firstName.trim()) return 'Prénom requis';
      if (!form.lastName.trim()) return 'Nom requis';
      if (!form.dateOfBirth) return 'Date de naissance requise';
    }
    if (s === 2) {
      if (!form.email.includes('@')) return 'Email invalide';
      if (!form.phone.trim()) return 'Téléphone requis';
      if (!form.address.trim()) return 'Adresse requise';
      if (!form.city.trim()) return 'Ville requise';
    }
    if (s === 3) {
      if (!form.idNumber.trim()) return 'Numéro de pièce requis';
    }
    if (s === 4) {
      if (!form.profession.trim()) return 'Profession requise';
    }
    return null;
  };

  const next = () => {
    const err = validate(step);
    if (err) return alert(err);
    setStep(step + 1);
  };

  const submit = async () => {
    setLoading(true);
    try {
      await updateUser({
        prenom: form.firstName,
        nom: form.lastName,
        telephone: form.phone,
        email: form.email,
      });
      setSuccess(true);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec de la soumission');
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
          <h2 className="text-2xl font-bold mb-2">Profil envoyé en vérification</h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto mb-6">
            Nous vérifions vos informations. Vous serez notifié dans les 24-48h prochaines heures.
          </p>

          <div className="bg-bg-elevated rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-success-400" />
              <span className="text-sm font-bold">Nouveaux plafonds une fois validé</span>
            </div>
            <div className="space-y-2">
              {[
                { l: 'Par transaction', o: CURRENT_LIMITS.transaction, n: NEW_LIMITS.transaction },
                { l: 'Quotidien', o: CURRENT_LIMITS.daily, n: NEW_LIMITS.daily },
                { l: 'Mensuel', o: CURRENT_LIMITS.monthly, n: NEW_LIMITS.monthly },
              ].map((lim) => (
                <div key={lim.l} className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">{lim.l}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-ink-dim">{lim.o}</span>
                    <ArrowRight size={11} className="text-ink-dim" />
                    <span className="text-sm font-bold text-success-400">{lim.n}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </Button>
        </Card>
      </div>
    );
  }

  const current = STEPS[step - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Compléter mon profil"
        subtitle="Vérifiez votre identité pour débloquer les plafonds étendus"
        actions={
          <Badge tone="brand" icon={<Info size={11} />}>
            KYC Avancé
          </Badge>
        }
      />

      {/* Stepper */}
      <Card padding="md">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = s.id < step;
            const cur = s.id === step;
            return (
              <div key={s.id} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                    cur
                      ? 'bg-gradient-brand-soft border border-brand-500/30'
                      : done
                        ? 'bg-success-bg/30'
                        : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      done
                        ? 'bg-success-500 text-white'
                        : cur
                          ? 'bg-gradient-brand text-white shadow-glow-soft'
                          : 'bg-bg-elevated text-ink-dim border border-bg-border'
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={3} /> : <Icon size={13} />}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:inline ${
                      cur || done ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-4 sm:w-8 h-px ${
                      done ? 'bg-success-500' : 'bg-bg-border'
                    }`}
                  />
                )}
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
                <current.icon size={18} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-dim font-bold">
                  Étape {step} / {STEPS.length}
                </div>
                <h3 className="text-base font-bold">{current.label}</h3>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Prénom *"
                    icon={UserIcon}
                    placeholder="Jean"
                    value={form.firstName}
                    onChange={(e) => upd({ firstName: e.target.value })}
                  />
                  <Input
                    label="Nom *"
                    icon={UserIcon}
                    placeholder="Dupont"
                    value={form.lastName}
                    onChange={(e) => upd({ lastName: e.target.value })}
                  />
                </div>
                <Input
                  label="Date de naissance *"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => upd({ dateOfBirth: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Lieu de naissance"
                    placeholder="Antananarivo"
                    value={form.placeOfBirth}
                    onChange={(e) => upd({ placeOfBirth: e.target.value })}
                  />
                  <Input
                    label="Nationalité *"
                    value={form.nationality}
                    onChange={(e) => upd({ nationality: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email *"
                    type="email"
                    value={form.email}
                    onChange={(e) => upd({ email: e.target.value })}
                  />
                  <Input
                    label="Téléphone *"
                    type="tel"
                    icon={Phone}
                    value={form.phone}
                    onChange={(e) => upd({ phone: e.target.value })}
                  />
                </div>
                <Input
                  label="Adresse *"
                  placeholder="Lot 123, Rue de..."
                  value={form.address}
                  onChange={(e) => upd({ address: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ville *"
                    placeholder="Antananarivo"
                    value={form.city}
                    onChange={(e) => upd({ city: e.target.value })}
                  />
                  <Input
                    label="Code postal"
                    placeholder="101"
                    value={form.postalCode}
                    onChange={(e) => upd({ postalCode: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="label">Type de pièce *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ID_TYPES.map((opt) => {
                      const active = form.idType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => upd({ idType: opt.id })}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            active
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-bg-border bg-bg-elevated hover:border-ink-dim'
                          }`}
                        >
                          <div className="text-sm font-bold">{opt.label}</div>
                          <div className="text-[10px] text-ink-muted mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Numéro de pièce *"
                    placeholder="123 456 789 012"
                    value={form.idNumber}
                    onChange={(e) => upd({ idNumber: e.target.value })}
                    className="font-mono"
                  />
                  <Input
                    label="Date d'expiration"
                    type="date"
                    value={form.idExpiryDate}
                    onChange={(e) => upd({ idExpiryDate: e.target.value })}
                  />
                </div>

                {/* Upload */}
                <div>
                  <label className="label">Téléverser une photo de la pièce</label>
                  {idDoc.file ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-success-500/30">
                      {idDoc.preview && idDoc.file.type.startsWith('image/') ? (
                        <img
                          src={idDoc.preview}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-300">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {idDoc.file.name}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {(idDoc.file.size / 1024).toFixed(1)} KB · Prêt
                        </div>
                      </div>
                      <button
                        onClick={() => handleFile(null)}
                        className="w-9 h-9 rounded-lg bg-danger-bg text-danger-400 hover:bg-danger-500/30 flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="id-upload"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="id-upload"
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-bg-border hover:border-brand-500/50 hover:bg-bg-elevated/40 cursor-pointer transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-brand-300 shrink-0">
                          <Upload size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">
                            <span className="text-brand-300">Cliquez pour téléverser</span>
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            Recto + verso si possible. JPG, PNG, PDF (max 5 MB)
                          </div>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Input
                  label="Profession *"
                  icon={Briefcase}
                  placeholder="Développeur, Commerçant, Étudiant..."
                  value={form.profession}
                  onChange={(e) => upd({ profession: e.target.value })}
                />
                <Input
                  label="Employeur"
                  placeholder="Nom de l'entreprise"
                  value={form.employer}
                  onChange={(e) => upd({ employer: e.target.value })}
                />
                <Input
                  label="Revenu mensuel estimé (Ar)"
                  type="text"
                  inputMode="numeric"
                  placeholder="500 000"
                  value={form.monthlyIncome}
                  onChange={(e) =>
                    upd({ monthlyIncome: e.target.value.replace(/\D/g, '') })
                  }
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold">Récapitulatif</h4>
                <div className="rounded-xl bg-bg-elevated/40 border border-bg-border divide-y divide-bg-border">
                  <SumRow label="Identité">
                    {form.firstName} {form.lastName}
                  </SumRow>
                  <SumRow label="Date de naissance">
                    {form.dateOfBirth || '—'}
                  </SumRow>
                  <SumRow label="Email">{form.email}</SumRow>
                  <SumRow label="Téléphone">{form.phone}</SumRow>
                  <SumRow label="Adresse">{`${form.address}${form.city ? `, ${form.city}` : ''}`}</SumRow>
                  <SumRow label="Pièce">
                    {form.idType.toUpperCase()} ·{' '}
                    <span className="font-mono">{form.idNumber}</span>
                  </SumRow>
                  <SumRow label="Profession">{form.profession || '—'}</SumRow>
                  {form.monthlyIncome && (
                    <SumRow label="Revenu mensuel">
                      {Number(form.monthlyIncome).toLocaleString('fr-FR')} Ar
                    </SumRow>
                  )}
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-warning-bg border border-warning-500/30">
                  <Info size={14} className="text-warning-400 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-ink">
                    En soumettant, vous certifiez que les informations sont exactes et autorisez M'Paye à vérifier votre identité auprès des autorités compétentes.
                  </p>
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
              {step < STEPS.length ? (
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
                  Soumettre
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Side: KYC benefits */}
        <Card padding="md" className="lg:sticky lg:top-20 lg:self-start">
          <Badge tone="success" icon={<TrendingUp size={11} />}>
            Avantages
          </Badge>
          <h3 className="text-sm font-bold mt-3 mb-3">
            Pourquoi vérifier mon identité ?
          </h3>

          <div className="space-y-3 mb-5">
            {[
              { l: 'Par transaction', o: CURRENT_LIMITS.transaction, n: NEW_LIMITS.transaction },
              { l: 'Quotidien', o: CURRENT_LIMITS.daily, n: NEW_LIMITS.daily },
              { l: 'Mensuel', o: CURRENT_LIMITS.monthly, n: NEW_LIMITS.monthly },
            ].map((lim) => (
              <div key={lim.l}>
                <div className="text-[11px] text-ink-muted mb-1">{lim.l}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs line-through text-ink-dim">{lim.o}</span>
                  <ArrowRight size={11} className="text-ink-dim" />
                  <span className="text-sm font-bold text-success-400">{lim.n}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-bg-border space-y-2 text-xs text-ink-muted">
            {[
              'Conformité réglementaire',
              'Récupération du compte simplifiée',
              'Accès au mode marchand',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Check size={12} className="text-success-400" strokeWidth={3} />
                {t}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SumRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm text-right max-w-[60%] truncate">{children}</span>
    </div>
  );
}
