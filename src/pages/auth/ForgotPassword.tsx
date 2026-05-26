import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import ErrorModal from '../../components/ErrorModal';
import { Button, Input } from '../../ui';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Veuillez entrer votre email');
      setErrorOpen(true);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Email invalide');
      setErrorOpen(true);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 900);
  };

  if (sent) {
    return (
      <AuthLayout
        title="Email envoyé !"
        subtitle="Vérifiez votre boîte de réception"
      >
        <div className="card p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-3">
            <Mail size={32} className="text-success-400" />
          </div>
          <div className="text-sm text-ink-muted">
            Nous avons envoyé un lien de réinitialisation à
          </div>
          <div className="text-sm font-bold text-brand-300 mt-1">{email}</div>
          <div className="text-xs text-ink-dim mt-3">
            Le lien expire dans 1 heure. Vérifiez vos spams si vous ne le voyez pas.
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/auth/login')}
          icon={ArrowLeft}
        >
          Retour à la connexion
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Pas de panique. Entrez votre email et nous vous enverrons un lien de réinitialisation."
      footer={
        <>
          Vous vous en souvenez ?{' '}
          <Link
            to="/auth/login"
            className="text-brand-300 font-semibold hover:text-brand-200"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
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
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!email}
          iconEnd={ArrowRight}
        >
          Envoyer le lien
        </Button>
      </form>
      <ErrorModal open={errorOpen} message={errorMsg} onClose={() => setErrorOpen(false)} />
    </AuthLayout>
  );
}
