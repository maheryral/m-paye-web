import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../contexts/ThemeContext';
import { authService } from '../../services/api';

interface Session {
  id: string;
  deviceName: string;
  location: string;
  ipAddress: string;
  current: boolean;
  lastActivity: string;
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
}

export default function Security() {
  const colors = useColors();
  const { logoutAllDevices } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [twoFactor, setTwoFactor] = useState(false);
  const [biometric, setBiometric] = useState(false);

  // Sessions de démonstration — le backend pourrait exposer GET /auth/sessions
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 'current',
      deviceName: 'Navigateur web',
      location: 'Antananarivo, Madagascar',
      ipAddress: '—',
      current: true,
      lastActivity: new Date().toISOString(),
    },
  ]);

  const securityScore =
    50 +
    (twoFactor ? 25 : 0) +
    (biometric ? 15 : 0) +
    (sessions.length === 1 ? 10 : 0);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('error', 'Veuillez remplir tous les champs');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('error', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('error', 'Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showMessage('success', 'Mot de passe mis à jour avec succès');
    } catch (e: any) {
      showMessage('error', e?.response?.data?.message || 'Erreur lors du changement');
    } finally {
      setLoading(false);
    }
  };

  const revokeAll = async () => {
    if (!confirm('Déconnecter tous les autres appareils ?')) return;
    try {
      await logoutAllDevices();
      setSessions((prev) => prev.filter((s) => s.current));
      showMessage('success', 'Tous les autres appareils ont été déconnectés');
    } catch {
      showMessage('error', 'Erreur lors de la déconnexion');
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title="Sécurité" subtitle="Protégez votre compte" />

        <div className="px-5 mt-4 space-y-5">
          {/* Score de sécurité */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: `${colors.primary}20` }}
              >
                <Shield size={24} style={{ color: colors.primary }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: colors.text }}>
                  Score de sécurité
                </div>
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  {securityScore >= 80
                    ? 'Excellent'
                    : securityScore >= 60
                      ? 'Bon'
                      : 'À améliorer'}
                </div>
              </div>
              <div className="text-2xl font-extrabold" style={{ color: colors.primary }}>
                {securityScore}
              </div>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${securityScore}%`,
                  background:
                    securityScore >= 80
                      ? colors.success
                      : securityScore >= 60
                        ? colors.warning
                        : colors.error,
                }}
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{
                background:
                  message.type === 'success' ? `${colors.success}15` : `${colors.error}15`,
                color: message.type === 'success' ? colors.success : colors.error,
              }}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          {/* Changer mot de passe */}
          <section>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: colors.textSecondary }}
            >
              Changer le mot de passe
            </h3>
            <div className="card p-4 space-y-3">
              <PasswordField
                label="Mot de passe actuel"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showPwd}
                colors={colors}
              />
              <PasswordField
                label="Nouveau mot de passe"
                value={newPassword}
                onChange={setNewPassword}
                show={showPwd}
                colors={colors}
              />
              <PasswordField
                label="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showPwd}
                colors={colors}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: colors.primary }}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPwd ? 'Masquer' : 'Afficher'} les mots de passe
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white"
                style={{ background: colors.primary, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <KeyRound size={18} />
                    Mettre à jour
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Options sécurité */}
          <section>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: colors.textSecondary }}
            >
              Options de sécurité
            </h3>
            <div className="space-y-2">
              <SecurityToggle
                icon={Lock}
                title="Authentification à 2 facteurs"
                description="Ajoutez une couche de sécurité supplémentaire"
                enabled={twoFactor}
                onToggle={() => setTwoFactor((v) => !v)}
                colors={colors}
              />
              <SecurityToggle
                icon={Fingerprint}
                title="Authentification biométrique"
                description="WebAuthn (Touch ID, Face ID, clé matérielle)"
                enabled={biometric}
                onToggle={() => setBiometric((v) => !v)}
                colors={colors}
              />
            </div>
          </section>

          {/* Sessions actives */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.textSecondary }}
              >
                Sessions actives
              </h3>
              {sessions.length > 1 && (
                <button
                  onClick={revokeAll}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: colors.error }}
                >
                  <LogOut size={12} />
                  Déconnecter tous
                </button>
              )}
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="card p-3.5 flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${colors.primary}20` }}
                  >
                    {s.deviceName.toLowerCase().includes('iphone') ||
                    s.deviceName.toLowerCase().includes('android') ? (
                      <Smartphone size={22} style={{ color: colors.primary }} />
                    ) : (
                      <Monitor size={22} style={{ color: colors.primary }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                        {s.deviceName}
                      </div>
                      {s.current && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${colors.success}20`, color: colors.success }}
                        >
                          ACTUEL
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                      {s.location}
                    </div>
                    <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                      {formatRelativeDate(s.lastActivity)} · {s.ipAddress}
                    </div>
                  </div>
                  {!s.current && (
                    <button
                      onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${colors.error}20`, color: colors.error }}
                      title="Déconnecter cet appareil"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  colors: any;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <input
        type={show ? 'text' : 'password'}
        className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ color: colors.text, borderColor: colors.border }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SecurityToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  colors,
}: {
  icon: any;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  colors: any;
}) {
  return (
    <div className="card p-3.5 flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: enabled ? `${colors.success}20` : `${colors.primary}20` }}
      >
        <Icon size={22} style={{ color: enabled ? colors.success : colors.primary }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold" style={{ color: colors.text }}>
            {title}
          </div>
          {enabled && <Check size={14} style={{ color: colors.success }} />}
        </div>
        <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: enabled ? colors.primary : colors.border }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}
