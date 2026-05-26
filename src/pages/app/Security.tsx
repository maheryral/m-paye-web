import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  Monitor,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import { Badge, Button, Card, Input, PageHeader } from '../../ui';

interface Session {
  id: string;
  deviceName: string;
  location: string;
  ipAddress: string;
  current: boolean;
  lastActivity: string;
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "À l'instant";
  if (d < 3600) return `Il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `Il y a ${Math.floor(d / 3600)} h`;
  if (d < 172800) return 'Hier';
  return `Il y a ${Math.floor(d / 86400)} jours`;
}

export default function Security() {
  const { logoutAllDevices } = useAuth();

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [twoFactor, setTwoFactor] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 'current',
      deviceName: 'Navigateur web (Chrome)',
      location: 'Antananarivo, Madagascar',
      ipAddress: '—',
      current: true,
      lastActivity: new Date().toISOString(),
    },
  ]);

  // Security score: max 100
  const passwordStrength = newPwd.length === 0 ? 0 : Math.min(100, newPwd.length * 8);
  const score =
    50 +
    (twoFactor ? 25 : 0) +
    (biometric ? 15 : 0) +
    (sessions.length === 1 ? 10 : 0);

  const scoreColor =
    score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#F43F5E';
  const scoreLabel =
    score >= 80 ? 'Excellent' : score >= 60 ? 'Bon' : 'À renforcer';

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const changePwd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) return flash('error', 'Remplissez tous les champs');
    if (newPwd.length < 8) return flash('error', 'Au moins 8 caractères requis');
    if (newPwd !== confirmPwd) return flash('error', 'Les mots de passe ne correspondent pas');
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      flash('success', 'Mot de passe mis à jour avec succès');
    } catch (e: any) {
      flash('error', e?.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const revokeAll = async () => {
    if (!confirm('Déconnecter tous les autres appareils ?')) return;
    try {
      await logoutAllDevices();
      setSessions((prev) => prev.filter((s) => s.current));
      flash('success', 'Tous les autres appareils déconnectés');
    } catch {
      flash('error', 'Échec de la déconnexion');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sécurité"
        subtitle="Protégez votre compte et vos transactions"
      />

      {msg && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium animate-slide-in ${
            msg.type === 'success'
              ? 'bg-success-bg text-success-400 border border-success-500/30'
              : 'bg-danger-bg text-danger-400 border border-danger-500/30'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Score + summary (sticky) === */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card padding="lg">
            <div className="text-center">
              <div
                className="relative w-32 h-32 mx-auto"
                style={{
                  background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #262F4A 0deg)`,
                  borderRadius: '50%',
                }}
              >
                <div className="absolute inset-2 rounded-full bg-bg-surface flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold" style={{ color: scoreColor }}>
                    {score}
                  </div>
                  <div className="text-[10px] text-ink-muted uppercase tracking-wider">
                    /100
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-bold">Score de sécurité</div>
              <Badge tone={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'} className="mt-2">
                {scoreLabel}
              </Badge>
            </div>

            <div className="mt-5 pt-5 border-t border-bg-border space-y-2.5">
              <Checkmark done label="Mot de passe défini" />
              <Checkmark done={twoFactor} label="Auth 2FA activée" />
              <Checkmark done={biometric} label="Biométrie WebAuthn" />
              <Checkmark done={sessions.length === 1} label="Une seule session" />
            </div>
          </Card>
        </div>

        {/* === Sections === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Change password */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">Mot de passe</h3>
            </div>
            <p className="text-xs text-ink-muted mb-5">
              Utilisez au moins 8 caractères, avec des lettres, chiffres et symboles
            </p>

            <form onSubmit={changePwd} className="space-y-4">
              <Input
                label="Mot de passe actuel"
                type={showPwd ? 'text' : 'password'}
                icon={Lock}
                iconEnd={showPwd ? EyeOff : Eye}
                onIconEndClick={() => setShowPwd((v) => !v)}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
              />
              <Input
                label="Nouveau mot de passe"
                type={showPwd ? 'text' : 'password'}
                icon={KeyRound}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
              />
              {newPwd.length > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1">
                    <span className="text-ink-dim">Force</span>
                    <span
                      style={{
                        color: passwordStrength >= 80 ? '#10B981' : passwordStrength >= 50 ? '#F59E0B' : '#F43F5E',
                      }}
                      className="font-bold"
                    >
                      {passwordStrength >= 80
                        ? 'Forte'
                        : passwordStrength >= 50
                          ? 'Moyenne'
                          : 'Faible'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${passwordStrength}%`,
                        background:
                          passwordStrength >= 80
                            ? '#10B981'
                            : passwordStrength >= 50
                              ? '#F59E0B'
                              : '#F43F5E',
                      }}
                    />
                  </div>
                </div>
              )}
              <Input
                label="Confirmer le mot de passe"
                type={showPwd ? 'text' : 'password'}
                icon={KeyRound}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                error={confirmPwd && newPwd !== confirmPwd ? 'Les mots de passe ne correspondent pas' : undefined}
                autoComplete="new-password"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={Check}
                disabled={!currentPwd || !newPwd || !confirmPwd}
              >
                Mettre à jour
              </Button>
            </form>
          </Card>

          {/* Toggles */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">Méthodes de vérification</h3>
            </div>
            <div className="divide-y divide-bg-border">
              <SecurityToggle
                icon={Lock}
                title="Authentification à 2 facteurs (2FA)"
                description="Code unique envoyé par SMS ou app authenticator à chaque connexion"
                enabled={twoFactor}
                onToggle={() => setTwoFactor((v) => !v)}
              />
              <SecurityToggle
                icon={Fingerprint}
                title="WebAuthn (Touch ID, Face ID, clé matérielle)"
                description="Authentification biométrique du navigateur ou clé physique FIDO2"
                enabled={biometric}
                onToggle={() => setBiometric((v) => !v)}
              />
            </div>
          </Card>

          {/* Sessions */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-brand-300" />
                <h3 className="text-base font-bold">Sessions actives</h3>
              </div>
              {sessions.length > 1 && (
                <Button variant="danger" size="sm" icon={LogOut} onClick={revokeAll}>
                  Tout déconnecter
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {sessions.map((s) => {
                const isMobile =
                  s.deviceName.toLowerCase().includes('iphone') ||
                  s.deviceName.toLowerCase().includes('android');
                const DeviceIcon = isMobile ? Smartphone : Monitor;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-bg-border bg-bg-elevated/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-bg-elevated text-brand-300 flex items-center justify-center shrink-0">
                      <DeviceIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold truncate">{s.deviceName}</div>
                        {s.current && (
                          <Badge tone="success">Cet appareil</Badge>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted truncate">{s.location}</div>
                      <div className="text-[11px] text-ink-dim mt-0.5">
                        {timeAgo(s.lastActivity)} · {s.ipAddress}
                      </div>
                    </div>
                    {!s.current && (
                      <button
                        onClick={() =>
                          setSessions((prev) => prev.filter((x) => x.id !== s.id))
                        }
                        className="p-2 rounded-lg hover:bg-danger-bg text-ink-muted hover:text-danger-400"
                        title="Déconnecter"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Checkmark({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
          done ? 'bg-success-500 text-white' : 'bg-bg-elevated text-ink-dim'
        }`}
      >
        <Check size={10} strokeWidth={3} />
      </div>
      <span className={done ? 'text-ink' : 'text-ink-muted'}>{label}</span>
    </div>
  );
}

function SecurityToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          enabled
            ? 'bg-success-bg text-success-400'
            : 'bg-bg-elevated text-ink-muted'
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-ink-muted mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 ${
          enabled ? 'bg-gradient-brand' : 'bg-bg-elevated border border-bg-border'
        }`}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}
