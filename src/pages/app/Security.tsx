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
  MessageSquare,
  Monitor,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { accountService, authService, sendPasswordSetupOtp } from '../../services/api';
import { Badge, Button, Card, Input, PageHeader } from '../../ui';

interface Session {
  deviceId: string;
  deviceName: string;
  deviceType?: string;
  location?: string | null;
  ipAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationSource?: string | null;
  os?: string | null;
  osVersion?: string | null;
  browser?: string | null;
  model?: string | null;
  current: boolean;
  lastActivityAt: string;
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
  const { user, logoutAllDevices, updateUser } = useAuth();

  // Inscription OTP → `user.hasPassword=false` → mode "Création" (sans currentPassword).
  const hasPassword = !!user?.hasPassword;

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Step-up OTP — utilisé pour 2 cas :
  //  - Création initiale du mdp (compte OTP, hasPassword=false)
  //  - Réinitialisation (user qui a oublié son mdp) — `resetMode=true`
  // Empêche un JWT volé de verrouiller le compte avec un mdp inconnu.
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const [twoFactor, setTwoFactor] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);

  const loadSessions = async () => {
    try {
      const data = await authService.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      // garde liste vide
    }
  };

  // === Score de sécurité dynamique (calculé serveur) ===
  type SecurityComponent = {
    id: string;
    label: string;
    weight: number;
    achieved: boolean;
    hint?: string;
  };
  type SecurityScoreData = {
    score: number;
    level: 'weak' | 'fair' | 'good' | 'excellent';
    components: SecurityComponent[];
  };
  const [scoreData, setScoreData] = useState<SecurityScoreData | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);

  const loadSecurityScore = async () => {
    try {
      setScoreLoading(true);
      const data = await accountService.getSecurityScore();
      setScoreData(data);
    } catch {
      // Silent : on n'affiche pas un faux score
    } finally {
      setScoreLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    void loadSecurityScore();
  }, []);

  // Force de mot de passe pendant la saisie — purement visuel/local.
  const passwordStrength =
    newPwd.length === 0 ? 0 : Math.min(100, newPwd.length * 8);

  // Score / couleurs / label dérivés des données serveur.
  const score = scoreData?.score ?? 0;
  const level = scoreData?.level ?? 'weak';
  const scoreColor =
    level === 'excellent' || level === 'good'
      ? '#10B981'
      : level === 'fair'
      ? '#F59E0B'
      : '#F43F5E';
  const scoreLabel =
    level === 'excellent'
      ? 'Excellent'
      : level === 'good'
      ? 'Bon'
      : level === 'fair'
      ? 'À renforcer'
      : 'Vulnérable';

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const changePwd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // En mode reset, on ne demande pas le currentPassword (l'user l'a oublié).
    if (hasPassword && !resetMode && !currentPwd)
      return flash('error', 'Mot de passe actuel requis');
    if (!newPwd || !confirmPwd) return flash('error', 'Remplissez tous les champs');
    if (newPwd.length < 8) return flash('error', 'Au moins 8 caractères requis');
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPwd))
      return flash('error', 'Le mot de passe doit contenir au moins une lettre et un chiffre');
    if (newPwd !== confirmPwd) return flash('error', 'Les mots de passe ne correspondent pas');

    // === Chemin OTP (Création OU Réinitialisation) ===
    if (!hasPassword || resetMode) {
      setOtpSending(true);
      try {
        await sendPasswordSetupOtp();
        setOtpInput('');
        setOtpModalOpen(true);
      } catch (err: any) {
        flash('error', err?.response?.data?.message || "Impossible d'envoyer le code SMS");
      } finally {
        setOtpSending(false);
      }
      return;
    }

    // === Chemin MODIFICATION : currentPassword fait office de step-up ===
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      flash('success', 'Mot de passe mis à jour avec succès');
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Soumet la création de mdp après que l'user a saisi l'OTP step-up.
   * Garde le modal ouvert si l'OTP est invalide pour qu'il puisse redemander.
   */
  const submitCreationWithOtp = async () => {
    if (!/^\d{6}$/.test(otpInput)) return flash('error', 'Code à 6 chiffres requis');
    setLoading(true);
    try {
      await authService.changePassword({ otpCode: otpInput, newPassword: newPwd });
      if (!hasPassword) await updateUser({ hasPassword: true });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setOtpInput('');
      setOtpModalOpen(false);
      setResetMode(false);
      flash(
        'success',
        resetMode ? 'Mot de passe réinitialisé avec succès' : 'Mot de passe créé avec succès',
      );
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  /** Bascule en mode "Réinitialisation" : cache currentPassword, vide le champ. */
  const triggerResetMode = () => {
    setResetMode(true);
    setCurrentPwd('');
    flash(
      'success',
      "Mode réinitialisation : un SMS sera envoyé pour confirmer.",
    );
  };

  const resendSetupOtp = async () => {
    setOtpSending(true);
    try {
      await sendPasswordSetupOtp();
      flash('success', 'Nouveau code envoyé par SMS');
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Impossible de renvoyer le code');
    } finally {
      setOtpSending(false);
    }
  };

  const revokeAll = async () => {
    if (!confirm('Déconnecter tous les autres appareils ?')) return;
    try {
      await logoutAllDevices();
      await loadSessions();
      flash('success', 'Tous les autres appareils déconnectés');
    } catch {
      flash('error', 'Échec de la déconnexion');
    }
  };

  const revokeOne = async (deviceId: string) => {
    if (!confirm('Déconnecter cet appareil ?')) return;
    try {
      await authService.revokeDevice(deviceId);
      setSessions((prev) => prev.filter((s) => s.deviceId !== deviceId));
      flash('success', 'Appareil déconnecté');
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
                  {scoreLoading ? (
                    <div className="text-xs text-ink-muted">...</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold" style={{ color: scoreColor }}>
                        {score}
                      </div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wider">
                        /100
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 text-sm font-bold">Score de sécurité</div>
              <Badge
                tone={level === 'excellent' || level === 'good' ? 'success' : level === 'fair' ? 'warning' : 'danger'}
                className="mt-2"
              >
                {scoreLabel}
              </Badge>
            </div>

            {/* Liste dynamique des composants — vient du serveur, hint affiché
                quand non-acquis pour guider l'user sur quoi améliorer. */}
            {scoreData && (
              <div className="mt-5 pt-5 border-t border-bg-border space-y-2.5">
                {scoreData.components.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        c.achieved ? 'bg-success-500 text-white' : 'bg-bg-elevated text-ink-dim'
                      }`}
                    >
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={c.achieved ? 'text-ink' : 'text-ink-muted'}>
                          {c.label}
                        </span>
                        <span className="text-[10px] font-bold text-ink-dim shrink-0">
                          +{c.weight}
                        </span>
                      </div>
                      {!c.achieved && c.hint && (
                        <div className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                          {c.hint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* === Sections === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Change password */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">
                {!hasPassword
                  ? 'Créer un mot de passe'
                  : resetMode
                  ? 'Réinitialiser le mot de passe'
                  : 'Modifier le mot de passe'}
              </h3>
            </div>
            <p className="text-xs text-ink-muted mb-5">
              {!hasPassword
                ? "Votre compte n'a pas encore de mot de passe. En créer un permet de vous connecter sans attendre le code SMS."
                : resetMode
                ? `Un code SMS sera envoyé à ${user?.telephone || 'votre numéro'} pour confirmer la réinitialisation.`
                : 'Utilisez au moins 8 caractères, avec des lettres, chiffres et symboles.'}
            </p>

            <form onSubmit={changePwd} className="space-y-4">
              {hasPassword && !resetMode && (
                <div>
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
                </div>
              )}
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
                loading={loading || otpSending}
                icon={Check}
                disabled={(hasPassword && !resetMode && !currentPwd) || !newPwd || !confirmPwd}
              >
                {!hasPassword
                  ? 'Créer le mot de passe'
                  : resetMode
                  ? 'Envoyer le code SMS'
                  : 'Mettre à jour'}
              </Button>

              {/* Bouton secondaire "Réinitialiser via SMS" — uniquement en mode
                  Modification, pour les users qui ont oublié leur mdp. Plus
                  discoverable qu'un simple lien sous le champ currentPassword. */}
              {hasPassword && !resetMode && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px bg-bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                      ou
                    </span>
                    <div className="flex-1 h-px bg-bg-border" />
                  </div>

                  <button
                    type="button"
                    onClick={triggerResetMode}
                    disabled={loading || otpSending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-brand-500 text-brand-300 font-bold text-sm hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare size={16} />
                    Réinitialiser via code SMS
                  </button>

                  <p className="text-[11px] text-ink-muted text-center leading-relaxed">
                    Vous avez oublié votre mot de passe ? Recevez un code par SMS
                    pour le réinitialiser.
                  </p>
                </>
              )}

              {hasPassword && resetMode && (
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="block mx-auto text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  ← Annuler, je veux modifier avec mon mot de passe actuel
                </button>
              )}
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
              {sessions.length === 0 && (
                <div className="text-sm text-ink-dim text-center py-4">
                  Aucune session active
                </div>
              )}
              {sessions.map((s) => {
                const isMobile =
                  s.deviceType === 'MOBILE' || s.deviceType === 'TABLET';
                const DeviceIcon = isMobile ? Smartphone : Monitor;
                const detail = [
                  s.os && (s.osVersion ? `${s.os} ${s.osVersion}` : s.os),
                  s.browser,
                  s.model,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div
                    key={s.deviceId}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-bg-border bg-bg-elevated/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-bg-elevated text-brand-300 flex items-center justify-center shrink-0">
                      <DeviceIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold truncate">{s.deviceName}</div>
                        {s.current && <Badge tone="success">Cet appareil</Badge>}
                      </div>
                      {detail && (
                        <div className="text-[11px] text-ink-dim truncate">{detail}</div>
                      )}
                      <div className="text-xs text-ink-muted truncate">
                        📍 {s.location || 'Localisation inconnue'}
                        {s.locationSource === 'gps' ? ' (GPS)' : ''}
                      </div>
                      <div className="text-[11px] text-ink-dim mt-0.5">
                        {timeAgo(s.lastActivityAt)}
                        {s.ipAddress ? ` · ${s.ipAddress}` : ''}
                      </div>
                    </div>
                    {!s.current && (
                      <button
                        onClick={() => revokeOne(s.deviceId)}
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

      {/* === Modal step-up OTP : création initiale de mdp seulement === */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-bg-border bg-bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={20} className="text-brand-300" />
              <h3 className="text-base font-bold flex-1">Confirmer la création</h3>
              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="p-1 -mr-1 text-ink-muted hover:text-ink"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed mb-4">
              Un code à 6 chiffres a été envoyé par SMS à{' '}
              <span className="text-ink font-semibold">{user?.telephone || 'votre numéro'}</span>.
              Cette étape protège votre compte contre les accès non autorisés.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
              className="input w-full text-center text-2xl tracking-[0.4em] font-bold py-3 mb-4"
            />

            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              disabled={otpInput.length !== 6}
              onClick={submitCreationWithOtp}
              icon={Check}
            >
              Créer le mot de passe
            </Button>

            <button
              type="button"
              onClick={resendSetupOtp}
              disabled={otpSending}
              className="block mx-auto mt-3 text-xs font-semibold text-brand-300 hover:text-brand-200 disabled:opacity-50"
            >
              {otpSending ? 'Envoi…' : 'Renvoyer le code'}
            </button>
          </div>
        </div>
      )}
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
        className={`relative w-11 h-6 rounded-full overflow-hidden transition-colors shrink-0 mt-1 ${
          enabled ? 'bg-gradient-brand' : 'bg-bg-elevated border border-bg-border'
        }`}
      >
        {/* Pastille : `left-0.5` ancre le rond explicitement, puis on translate uniquement
            de l'écart utile (0 ↔ 20px). Évite le décalage observé sur certains navigateurs
            où `position:absolute` sans `left` rendait la pastille hors du bouton. */}
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}
