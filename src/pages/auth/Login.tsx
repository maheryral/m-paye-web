import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import ErrorModal from '../../components/ErrorModal';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import { asyncStorage, secureStorage } from '../../services/storage';
import { Button, Input } from '../../ui';

type Step = 'identifier' | 'method' | 'password' | 'otp';
type Mode = 'phone' | 'email';

export default function Login() {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();

  const [step, setStep] = useState<Step>('identifier');
  const [mode, setMode] = useState<Mode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [userId, setUserId] = useState('');

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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

  const identifierValue = mode === 'phone' ? phone : email;
  const canNext = !!identifierValue;

  const checkAccount = async () => {
    if (mode === 'phone' && phone.length < 9) return fail('Numéro de téléphone invalide');
    if (mode === 'email' && (!email.includes('@') || !email.includes('.')))
      return fail('Email invalide');
    setLoading(true);
    try {
      const identifier = mode === 'phone' ? fullPhone() : email;
      const r = await authService.checkAccount({
        [mode === 'phone' ? 'telephone' : 'email']: identifier,
      });
      if (r.exists) {
        setUserId(r.userId);
        setStep('method');
      } else {
        navigate('/auth/register');
      }
    } catch {
      fail('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    setLoading(true);
    try {
      const identifier = mode === 'phone' ? fullPhone() : email;
      await authService.sendOTP({
        [mode === 'phone' ? 'telephone' : 'email']: identifier,
      });
      setStep('otp');
      startTimer();
    } catch {
      fail("Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) return fail('Veuillez entrer le code à 6 chiffres');
    setLoading(true);
    try {
      const r = await authService.verifyOTP({ code, userId });
      if (r?.accessToken) {
        await secureStorage.setItem('accessToken', r.accessToken);
        await secureStorage.setItem('refreshToken', r.refreshToken);
        if (r.user) {
          await asyncStorage.setItem('user', JSON.stringify(r.user));
          setUser(r.user);
        }
      }
      navigate('/dashboard', { replace: true });
    } catch {
      fail('Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handlePwdLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) return fail('Veuillez entrer votre mot de passe');
    setLoading(true);
    try {
      const identifier = mode === 'phone' ? fullPhone() : email;
      await login(identifier, password);
      navigate('/dashboard', { replace: true });
    } catch {
      fail('Mot de passe incorrect');
    } finally {
      setLoading(false);
    }
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

  // Auto-focus otp first cell when entering step
  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus();
  }, [step]);

  const subtitleByStep = {
    identifier: 'Connectez-vous à votre compte M\'Paye',
    method: 'Comment voulez-vous vous identifier ?',
    password: 'Saisissez votre mot de passe',
    otp: `Code envoyé à ${mode === 'phone' ? phone : email}`,
  };

  return (
    <AuthLayout
      title="Bon retour"
      subtitle={subtitleByStep[step]}
      footer={
        step === 'identifier' ? (
          <>
            Pas encore de compte ?{' '}
            <Link to="/auth/register" className="text-brand-300 font-semibold hover:text-brand-200">
              Créer un compte
            </Link>
          </>
        ) : null
      }
    >
      {step === 'identifier' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void checkAccount();
          }}
          className="space-y-4"
        >
          {/* Mode tabs */}
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
                  autoComplete="tel"
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
            disabled={!canNext}
            iconEnd={ArrowRight}
          >
            Continuer
          </Button>

          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-xs text-ink-muted hover:text-ink"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
      )}

      {step === 'method' && (
        <div className="space-y-2.5">
          {[
            {
              key: 'otp' as const,
              icon: MessageSquare,
              title: 'Code de vérification',
              desc: 'Recevoir un code à 6 chiffres',
              onClick: () => void sendOTP(),
            },
            {
              key: 'password' as const,
              icon: KeyRound,
              title: 'Mot de passe',
              desc: 'Utiliser votre mot de passe habituel',
              onClick: () => setStep('password'),
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={m.onClick}
                disabled={loading}
                className="card-interactive w-full p-4 text-left flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-brand-soft border border-brand-500/20 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-brand-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{m.title}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{m.desc}</div>
                </div>
                <ArrowRight size={16} className="text-ink-dim" />
              </button>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => setStep('identifier')}
            className="mt-3"
          >
            Retour
          </Button>
        </div>
      )}

      {step === 'password' && (
        <form onSubmit={handlePwdLogin} className="space-y-4">
          <Input
            label="Mot de passe"
            type={showPwd ? 'text' : 'password'}
            icon={KeyRound}
            iconEnd={showPwd ? EyeOff : Eye}
            onIconEndClick={() => setShowPwd((v) => !v)}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!password}
          >
            Se connecter
          </Button>
          <div className="flex items-center justify-between text-xs">
            <Link
              to="/auth/forgot-password"
              className="text-brand-300 font-semibold hover:text-brand-200"
            >
              Mot de passe oublié ?
            </Link>
            <button
              type="button"
              onClick={() => setStep('method')}
              className="text-ink-muted hover:text-ink"
            >
              ← Retour
            </button>
          </div>
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
                onClick={() => void sendOTP()}
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
            onClick={() => void verifyOTP()}
          >
            Vérifier et se connecter
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => setStep('method')}
            className="mx-auto block"
          >
            Retour
          </Button>
        </div>
      )}

      <ErrorModal open={errorOpen} message={errorMsg} onClose={() => setErrorOpen(false)} />
    </AuthLayout>
  );
}
