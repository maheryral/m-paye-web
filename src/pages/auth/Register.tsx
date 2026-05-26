import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Phone,
  UserPlus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import ErrorModal from '../../components/ErrorModal';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import { Button, Input } from '../../ui';

type Step = 'identifier' | 'otp';
type Mode = 'phone' | 'email';

export default function Register() {
  const navigate = useNavigate();
  const { setUserFromTokens } = useAuth();

  const [step, setStep] = useState<Step>('identifier');
  const [mode, setMode] = useState<Mode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fail = (msg: string) => {
    setErrorMsg(msg);
    setErrorOpen(true);
  };
  const fullPhone = () => {
    const c = phone.replace(/\s/g, '');
    return c.startsWith('+') ? c : `+261${c}`;
  };
  const formatPhone = (v: string) => {
    let c = v.replace(/\D/g, '').slice(0, 10);
    if (c.length > 2)
      return `${c.slice(0, 2)} ${c.slice(2, 4)} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8, 10)}`.trim();
    return c;
  };

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
    const id = setInterval(() => {
      setTimer((p) => {
        if (p <= 1) {
          clearInterval(id);
          setCanResend(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (step === 'otp') {
      startTimer();
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const sendIdentifier = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = mode === 'phone' ? fullPhone() : email;
    if (mode === 'phone' && phone.length < 9) return fail('Numéro invalide');
    if (mode === 'email' && (!email.includes('@') || !email.includes('.')))
      return fail('Email invalide');
    setLoading(true);
    try {
      const r = await authService.initiateRegistration(
        mode === 'phone' ? { telephone: value } : { email: value },
      );
      setIdentifier(r.identifier);
      setStep('otp');
    } catch (e: any) {
      fail(e?.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) return fail('Code à 6 chiffres requis');
    setLoading(true);
    try {
      const r = await authService.verifyRegistration({ code, identifier });
      await setUserFromTokens(r.accessToken, r.refreshToken, r.user);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (e: any) {
      fail(e?.response?.data?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    const value = mode === 'phone' ? fullPhone() : email;
    setLoading(true);
    try {
      await authService.initiateRegistration({
        [mode === 'phone' ? 'telephone' : 'email']: value,
      } as any);
      startTimer();
    } catch {
      fail('Erreur lors du renvoi');
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (val: string, idx: number) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = d;
    setOtp(next);
    if (d && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const onOtpKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  return (
    <AuthLayout
      title={step === 'identifier' ? 'Créer un compte' : 'Vérification'}
      subtitle={
        step === 'identifier'
          ? "Rejoignez M'Paye en moins d'une minute"
          : `Code envoyé à ${mode === 'phone' ? phone : email}`
      }
      footer={
        step === 'identifier' ? (
          <>
            Déjà un compte ?{' '}
            <Link to="/auth/login" className="text-brand-300 font-semibold hover:text-brand-200">
              Se connecter
            </Link>
          </>
        ) : null
      }
    >
      {step === 'identifier' && (
        <form onSubmit={sendIdentifier} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-bg-elevated/50 rounded-xl border border-bg-border">
            {[
              { id: 'phone' as Mode, label: 'Téléphone', icon: Phone },
              { id: 'email' as Mode, label: 'Email', icon: Mail },
            ].map((t) => {
              const Icon = t.icon;
              const active = mode === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setMode(t.id)}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? 'bg-gradient-brand text-white shadow-glow-soft'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {mode === 'phone' ? (
            <div>
              <label className="label">Numéro de téléphone</label>
              <div className="flex">
                <div className="px-3 flex items-center bg-bg-elevated border border-bg-border border-r-0 rounded-l-xl text-brand-300 font-bold text-sm">
                  +261
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  placeholder="32 12 345 67"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="input rounded-l-none flex-1"
                />
              </div>
            </div>
          ) : (
            <Input
              label="Adresse email"
              type="email"
              icon={Mail}
              autoComplete="email"
              autoFocus
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={mode === 'phone' ? !phone : !email}
            icon={UserPlus}
          >
            Créer mon compte
          </Button>

          <p className="text-[11px] text-ink-dim text-center leading-relaxed">
            En continuant, vous acceptez nos{' '}
            <a className="text-brand-300 hover:underline" href="#">
              conditions d'utilisation
            </a>{' '}
            et notre{' '}
            <a className="text-brand-300 hover:underline" href="#">
              politique de confidentialité
            </a>
            .
          </p>
        </form>
      )}

      {step === 'otp' && (
        <div className="space-y-5">
          <div>
            <label className="label text-center">Code à 6 chiffres</label>
            <div className="grid grid-cols-6 gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  value={d}
                  onChange={(e) => onOtpChange(e.target.value, i)}
                  onKeyDown={(e) => onOtpKey(e, i)}
                  inputMode="numeric"
                  maxLength={1}
                  className="aspect-square text-center text-xl font-bold bg-bg-elevated border border-bg-border rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              ))}
            </div>
          </div>

          <div className="text-center text-xs">
            {!canResend ? (
              <span className="text-ink-muted">
                Renvoyer dans{' '}
                <span className="text-brand-300 font-bold">{timer}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-brand-300 font-semibold hover:text-brand-200"
              >
                Renvoyer le code
              </button>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={otp.join('').length !== 6}
            icon={CheckCircle2}
            onClick={verifyOTP}
          >
            Créer mon compte
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => setStep('identifier')}
            className="mx-auto block"
          >
            Retour
          </Button>
        </div>
      )}

      <ErrorModal open={errorOpen} message={errorMsg} onClose={() => setErrorOpen(false)} />

      {success && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="card p-6 max-w-sm w-full text-center animate-slide-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-3">
              <CheckCircle2 size={40} className="text-success-400" />
            </div>
            <div className="text-lg font-bold">Compte créé !</div>
            <div className="text-sm text-ink-muted mt-1">
              Bienvenue sur M'Paye. Redirection...
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
