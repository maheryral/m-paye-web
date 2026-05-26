import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Phone,
  Wallet,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorModal from '../../components/ErrorModal';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import { asyncStorage, secureStorage } from '../../services/storage';

type Step = 'identifier' | 'method' | 'password' | 'otp';
type Mode = 'phone' | 'email';

export default function Login() {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();

  const [step, setStep] = useState<Step>('identifier');
  const [loginMode, setLoginMode] = useState<Mode>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [userId, setUserId] = useState('');

  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShowError(true);
  };

  const getFullPhoneNumber = () => {
    const clean = phoneNumber.replace(/\s/g, '');
    return clean.startsWith('+') ? clean : `+261${clean}`;
  };

  const formatPhone = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    if (cleaned.length > 2) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`.trim();
    }
    return cleaned;
  };

  const checkAccountExists = async () => {
    const identifier = loginMode === 'phone' ? getFullPhoneNumber() : email;
    if (loginMode === 'phone' && phoneNumber.length < 9) {
      triggerError('Numéro de téléphone invalide');
      return;
    }
    if (loginMode === 'email' && (!email.includes('@') || !email.includes('.'))) {
      triggerError('Email invalide');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.checkAccount({
        [loginMode === 'phone' ? 'telephone' : 'email']: identifier,
      });
      if (response.exists) {
        setUserId(response.userId);
        setStep('method');
      } else {
        navigate('/auth/register');
      }
    } catch {
      triggerError('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    const identifier = loginMode === 'phone' ? getFullPhoneNumber() : email;
    setLoading(true);
    try {
      await authService.sendOTP({
        [loginMode === 'phone' ? 'telephone' : 'email']: identifier,
      });
      setStep('otp');
      startTimer();
    } catch {
      triggerError("Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      triggerError('Veuillez entrer le code à 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.verifyOTP({ code, userId });
      if (response?.accessToken) {
        await secureStorage.setItem('accessToken', response.accessToken);
        await secureStorage.setItem('refreshToken', response.refreshToken);
        if (response.user) {
          await asyncStorage.setItem('user', JSON.stringify(response.user));
          setUser(response.user);
        }
      }
      navigate('/dashboard', { replace: true });
    } catch {
      triggerError('Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password) {
      triggerError('Veuillez entrer votre mot de passe');
      return;
    }
    setLoading(true);
    try {
      const identifier = loginMode === 'phone' ? getFullPhoneNumber() : email;
      await login(identifier, password);
      navigate('/dashboard', { replace: true });
    } catch {
      triggerError('Mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otpCode];
    next[index] = digit;
    setOtpCode(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKey = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const subtitle = {
    identifier: 'Connectez-vous à votre compte',
    method: 'Choisissez votre méthode',
    password: 'Entrez votre mot de passe',
    otp: 'Saisissez le code reçu',
  }[step];

  const identifierValue = loginMode === 'phone' ? phoneNumber : email;
  const canNext = !!identifierValue;

  return (
    <div className="min-h-screen relative bg-bg text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[350px] bg-gradient-to-b from-[#1e3a8a33] to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-5 pt-14 pb-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-5"
          type="button"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex flex-col items-center mb-9">
          <div className="w-22 h-22 rounded-3xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow-blue p-5">
            <Wallet size={42} className="text-white" />
          </div>
          <div className="text-3xl font-extrabold tracking-wide mb-1">M'Paye</div>
          <div className="text-sm text-slate-400 font-medium">{subtitle}</div>
        </div>

        {step === 'identifier' && (
          <>
            <div className="flex gap-1 bg-bg-card border border-bg-border rounded-full p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMode('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  loginMode === 'phone'
                    ? 'bg-gradient-primary text-white shadow-glow-blue'
                    : 'text-slate-400'
                }`}
              >
                <Phone size={16} />
                Téléphone
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  loginMode === 'email'
                    ? 'bg-gradient-primary text-white shadow-glow-blue'
                    : 'text-slate-400'
                }`}
              >
                <Mail size={16} />
                E-mail
              </button>
            </div>

            {loginMode === 'phone' ? (
              <div className="flex items-center bg-bg-card border border-bg-border rounded-2xl overflow-hidden mb-4">
                <div className="px-4 py-4 bg-primary/10 border-r border-bg-border">
                  <span className="text-accent-violet font-bold">+261</span>
                </div>
                <input
                  type="tel"
                  className="flex-1 bg-transparent px-4 py-4 text-white font-medium outline-none placeholder:text-slate-500"
                  placeholder="32 12 345 67"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                  inputMode="numeric"
                />
              </div>
            ) : (
              <div className="flex items-center bg-bg-card border border-bg-border rounded-2xl px-4 mb-4">
                <Mail size={20} className="text-slate-500 mr-2" />
                <input
                  type="email"
                  className="flex-1 bg-transparent py-4 text-white font-medium outline-none placeholder:text-slate-500"
                  placeholder="Adresse e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  autoCapitalize="none"
                />
              </div>
            )}

            <button
              type="button"
              onClick={checkAccountExists}
              disabled={loading || !canNext}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all ${
                canNext ? 'bg-gradient-button shadow-glow-blue' : 'bg-slate-600'
              } ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Suivant
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex justify-center items-center gap-3 mt-5 text-sm">
              <button
                type="button"
                className="text-accent-violet font-semibold"
                onClick={() => navigate('/auth/register')}
              >
                Créer un compte
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                className="text-accent-violet font-semibold"
                onClick={() => navigate('/auth/forgot-password')}
              >
                Récupérer un compte
              </button>
            </div>
          </>
        )}

        {step === 'method' && (
          <>
            <button
              type="button"
              onClick={sendOTP}
              className="w-full flex items-center bg-bg-card border border-bg-border rounded-2xl p-4 mb-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] flex items-center justify-center mr-3">
                <MessageSquareText size={22} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-bold">Code SMS</div>
                <div className="text-xs text-slate-400 mt-0.5">Recevez un code à 6 chiffres</div>
              </div>
              <ArrowRight size={20} className="text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => setStep('password')}
              className="w-full flex items-center bg-bg-card border border-bg-border rounded-2xl p-4 mb-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center mr-3">
                <Lock size={22} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-bold">Mot de passe</div>
                <div className="text-xs text-slate-400 mt-0.5">Utilisez votre mot de passe</div>
              </div>
              <ArrowRight size={20} className="text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => setStep('identifier')}
              className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 text-accent-violet text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </>
        )}

        {step === 'password' && (
          <>
            <div className="flex items-center bg-bg-card border border-bg-border rounded-2xl px-4 mb-4">
              <Lock size={20} className="text-slate-500 mr-2" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="flex-1 bg-transparent py-4 text-white font-medium outline-none placeholder:text-slate-500"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? (
                  <EyeOff size={20} className="text-slate-500" />
                ) : (
                  <Eye size={20} className="text-slate-500" />
                )}
              </button>
            </div>

            <div className="text-right mb-5">
              <button
                type="button"
                onClick={() => navigate('/auth/forgot-password')}
                className="text-accent-violet text-xs font-semibold"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="button"
              onClick={handlePasswordLogin}
              disabled={loading || !password}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all ${
                password ? 'bg-gradient-button shadow-glow-blue' : 'bg-slate-600'
              } ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <LockKeyhole size={18} />
                  Se connecter
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('method')}
              className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 text-accent-violet text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="text-xl font-extrabold text-center mb-2">Vérification</div>
            <div className="text-sm text-slate-400 text-center mb-7">
              Nous avons envoyé un code à
              <br />
              <span className="text-accent-violet font-bold">
                {loginMode === 'phone' ? phoneNumber : email}
              </span>
            </div>

            <div className="flex justify-between gap-2 mb-6">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKey(e, index)}
                  inputMode="numeric"
                  maxLength={1}
                  className="flex-1 h-14 bg-bg-card border border-bg-border rounded-2xl text-white text-2xl font-bold text-center outline-none focus:border-accent-violet"
                />
              ))}
            </div>

            <div className="text-center mb-6">
              {!canResend ? (
                <span className="text-slate-400 text-sm">
                  Renvoyer dans <span className="text-accent-violet font-bold">{timer}</span> secondes
                </span>
              ) : (
                <button
                  type="button"
                  onClick={sendOTP}
                  className="text-accent-violet font-semibold text-sm"
                >
                  Renvoyer le code
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={verifyOTP}
              disabled={loading || otpCode.join('').length !== 6}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all ${
                otpCode.join('').length === 6 ? 'bg-gradient-button shadow-glow-blue' : 'bg-slate-600'
              } ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Vérifier
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('method')}
              className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 text-accent-violet text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </>
        )}
      </div>

      <ErrorModal
        open={showError}
        message={errorMsg}
        onClose={() => setShowError(false)}
      />
    </div>
  );
}
