import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorModal from '../../components/ErrorModal';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShowError(true);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      triggerError('Veuillez entrer votre email');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      triggerError('Email invalide');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1200);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-bg text-white">
        <div className="max-w-md mx-auto px-5 pt-14 pb-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-5"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col items-center text-center gap-4 mt-12">
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <Mail size={48} className="text-green-400" />
            </div>
            <div className="text-2xl font-extrabold">Email envoyé !</div>
            <div className="text-slate-400 leading-relaxed">
              Nous vous avons envoyé un email à{' '}
              <span className="text-accent-violet font-semibold">{email}</span> avec les
              instructions pour réinitialiser votre mot de passe.
            </div>
            <button
              onClick={() => navigate('/auth/login')}
              className="mt-6 w-full bg-gradient-button py-4 rounded-2xl font-bold shadow-glow-blue"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-bg text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[350px] bg-gradient-to-b from-[#1e3a8a33] to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-5 pt-14 pb-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-5"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="flex flex-col items-center mb-9">
          <div className="w-22 h-22 rounded-3xl bg-gradient-primary p-5 flex items-center justify-center mb-4 shadow-glow-blue">
            <KeyRound size={42} className="text-white" />
          </div>
          <div className="text-2xl font-extrabold tracking-wide mb-1">Mot de passe oublié</div>
          <div className="text-sm text-slate-400 font-medium text-center px-4">
            Entrez votre email pour recevoir un lien de réinitialisation
          </div>
        </div>

        <div className="flex items-center bg-bg-card border border-bg-border rounded-2xl px-4 mb-5">
          <Mail size={20} className="text-slate-500 mr-2" />
          <input
            type="email"
            className="flex-1 bg-transparent py-4 text-white font-medium outline-none placeholder:text-slate-500"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all ${
            email ? 'bg-gradient-button shadow-glow-blue' : 'bg-slate-600'
          } ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Envoyer le lien'}
        </button>

        <button
          onClick={() => navigate('/auth/login')}
          className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 text-accent-violet text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Retour à la connexion
        </button>
      </div>

      <ErrorModal open={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </div>
  );
}
