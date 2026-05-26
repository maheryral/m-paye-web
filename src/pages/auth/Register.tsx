import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Mail,
  Phone,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorModal from '../../components/ErrorModal';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';

type Step = 'identifier' | 'otp';
type Mode = 'phone' | 'email';

export default function Register() {
  const navigate = useNavigate();
  const { setUserFromTokens } = useAuth();

  const [step, setStep] = useState<Step>('identifier');
  const [mode, setMode] = useState<Mode>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
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
    let cleaned = text.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length > 2) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`.trim();
    }
    return cleaned;
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

  useEffect(() => {
    if (step === 'otp') startTimer();
  }, [step]);

  const handleSendIdentifier = async () => {
    const value = mode === 'phone' ? getFullPhoneNumber() : email;
    if (mode === 'phone' && phoneNumber.length < 9) {
      triggerError('Numéro de téléphone invalide');
      return;
    }
    if (mode === 'email' && (!email.includes('@') || !email.includes('.'))) {
      triggerError('Email invalide');
      return;
    }
    setLoading(true);
    try {
      const data = mode === 'phone' ? { telephone: value } : { email: value };
      const response = await authService.initiateRegistration(data);
      setIdentifier(response.identifier);
      setStep('otp');
    } catch (e: any) {
      triggerError(e?.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      triggerError('Veuillez entrer le code à 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.verifyRegistration({ code, identifier });
      await setUserFromTokens(response.accessToken, response.refreshToken, response.user);
      setShowSuccess(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (e: any) {
      triggerError(e?.response?.data?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    const value = mode === 'phone' ? getFullPhoneNumber() : email;
    setLoading(true);
    try {
      await authService.initiateRegistration({
        [mode === 'phone' ? 'telephone' : 'email']: value,
      } as any);
      startTimer();
    } catch {
      triggerError('Erreur lors du renvoi');
    } finally {
      setLoading(false);
    }
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

  const canSubmit = mode === 'phone' ? !!phoneNumber : !!email;

  return (
    <div className="min-h-screen relative bg-bg text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[350px] bg-gradient-to-b from-[#1e3a8a33] to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-5 pt-14 pb-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-5"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex flex-col items-center mb-9">
          <div className="w-22 h-22 rounded-3xl bg-gradient-primary p-5 flex items-center justify-center mb-4 shadow-glow-blue">
            <Wallet size={42} className="text-white" />
          </div>
          <div className="text-3xl font-extrabold tracking-wide mb-1">M'Paye</div>
          <div className="text-sm text-slate-400 font-medium">
            {step === 'identifier' ? 'Créez votre compte' : 'Vérifiez votre code'}
          </div>
        </div>

        {step === 'identifier' && (
          <>
            <div className="flex gap-1 bg-bg-card border border-bg-border rounded-full p-1 mb-6">
              <button
                onClick={() => setMode('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  mode === 'phone'
                    ? 'bg-gradient-primary text-white shadow-glow-blue'
                    : 'text-slate-400'
                }`}
              >
                <Phone size={16} />
                Téléphone
              </button>
              <button
                onClick={() => setMode('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  mode === 'email'
                    ? 'bg-gradient-primary text-white shadow-glow-blue'
                    : 'text-slate-400'
                }`}
              >
                <Mail size={16} />
                E-mail
              </button>
            </div>

            {mode === 'phone' ? (
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
                />
              </div>
            )}

            <button
              onClick={handleSendIdentifier}
              disabled={loading || !canSubmit}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all ${
                canSubmit ? 'bg-gradient-button shadow-glow-blue' : 'bg-slate-600'
              } ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <UserPlus size={18} />
                  S'inscrire
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex justify-center items-center gap-3 mt-5 text-sm">
              <span className="text-slate-400">Déjà un compte ?</span>
              <button
                className="text-accent-violet font-semibold"
                onClick={() => navigate('/auth/login')}
              >
                Se connecter
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="text-xl font-extrabold text-center mb-2">Vérification</div>
            <div className="text-sm text-slate-400 text-center mb-7">
              Nous avons envoyé un code à
              <br />
              <span className="text-accent-violet font-bold">
                {mode === 'phone' ? phoneNumber : email}
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
                  onClick={handleResendCode}
                  className="text-accent-violet font-semibold text-sm"
                >
                  Renvoyer le code
                </button>
              )}
            </div>

            <button
              onClick={handleVerifyOTP}
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
                  Vérifier et créer le compte
                </>
              )}
            </button>

            <button
              onClick={() => setStep('identifier')}
              className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 text-accent-violet text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </>
        )}
      </div>

      <ErrorModal open={showError} message={errorMsg} onClose={() => setShowError(false)} />

      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="bg-bg-card rounded-3xl p-6 flex flex-col items-center gap-3 max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={44} className="text-green-400" />
            </div>
            <div className="text-xl font-bold text-white">Compte créé !</div>
            <div className="text-sm text-slate-400 text-center">
              Bienvenue sur M'Paye. Redirection en cours...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
