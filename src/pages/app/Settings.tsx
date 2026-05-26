import {
  Bell,
  Eye,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Smartphone,
  Sun,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors, useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import { userPreferencesService } from '../../services/api';
import { Avatar, Card, PageHeader } from '../../ui';

interface Preferences {
  notifEmail: boolean;
  notifPush: boolean;
  notifSms: boolean;
  notifPromotions: boolean;
  showBalance: boolean;
  twoFactor: boolean;
  language: string;
  theme: string;
}

const DEFAULT_PREFS: Preferences = {
  notifEmail: true,
  notifPush: true,
  notifSms: false,
  notifPromotions: false,
  showBalance: true,
  twoFactor: false,
  language: 'fr',
  theme: 'dark',
};

type Section = 'appearance' | 'language' | 'notifications' | 'privacy' | 'account';

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'language', label: 'Langue & région', icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Vie privée', icon: Eye },
  { id: 'account', label: 'Compte', icon: UserIcon },
];

export default function Settings() {
  const navigate = useNavigate();
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const { logout, user } = useAuth();
  const { locale, setLocale } = useLocale();

  const [section, setSection] = useState<Section>('appearance');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    (async () => {
      try {
        const data = await userPreferencesService.get();
        setPrefs({ ...DEFAULT_PREFS, ...data });
        if (data?.theme && ['light', 'dark', 'system'].includes(data.theme)) {
          setMode(data.theme as ThemeMode);
        }
      } catch {
        /* */
      }
    })();
  }, [setMode]);

  const save = async (patch: Partial<Preferences>) => {
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      const saved = await userPreferencesService.update(patch);
      setPrefs({ ...DEFAULT_PREFS, ...saved });
    } catch (e: any) {
      setPrefs(prev);
      alert(e?.response?.data?.message || 'Erreur de sauvegarde');
    }
  };

  const setTheme = (m: ThemeMode) => {
    setMode(m);
    void save({ theme: m });
  };

  const setLang = (l: 'fr' | 'en') => {
    setLocale(l);
    void save({ language: l });
  };

  const handleLogout = async () => {
    if (!confirm('Vous déconnecter ?')) return;
    await logout();
    navigate('/auth/login', { replace: true });
  };

  const fullName = `${user?.prenom || ''} ${user?.nom || ''}`.trim() || user?.email || 'Utilisateur';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Paramètres"
        subtitle="Personnalisez votre expérience M'Paye"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* ===== Sidebar nav ===== */}
        <Card padding="md" className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-bg-border">
            <Avatar name={fullName} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{fullName}</div>
              <div className="text-[11px] text-ink-muted truncate">{user?.email}</div>
            </div>
          </div>

          <nav className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gradient-brand-soft text-ink border border-brand-500/30'
                      : 'text-ink-muted hover:text-ink hover:bg-bg-subtle border border-transparent'
                  }`}
                >
                  <Icon size={15} />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* ===== Panel ===== */}
        <div className="lg:col-span-3 space-y-5">
          {section === 'appearance' && (
            <Card padding="md">
              <SectionTitle title="Thème" subtitle="Choisissez l'apparence de l'interface" />
              <div className="grid grid-cols-3 gap-3 mt-4">
                <ThemeOption mode="light" active={mode === 'light'} onClick={() => setTheme('light')} />
                <ThemeOption mode="dark" active={mode === 'dark'} onClick={() => setTheme('dark')} />
                <ThemeOption mode="system" active={mode === 'system'} onClick={() => setTheme('system')} />
              </div>
            </Card>
          )}

          {section === 'language' && (
            <Card padding="md">
              <SectionTitle title="Langue" subtitle="L'app et les notifications s'afficheront dans cette langue" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { id: 'fr' as const, label: 'Français', flag: '🇫🇷' },
                  { id: 'en' as const, label: 'English', flag: '🇬🇧' },
                ].map((l) => {
                  const active = locale === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLang(l.id)}
                      className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-bg-border bg-bg-elevated hover:border-ink-dim'
                      }`}
                    >
                      <div className="text-2xl">{l.flag}</div>
                      <div>
                        <div className="text-sm font-bold">{l.label}</div>
                        <div className="text-[11px] text-ink-muted uppercase">{l.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card padding="md">
              <SectionTitle title="Canaux de notification" subtitle="Choisissez comment vous voulez être informé" />
              <div className="mt-4 divide-y divide-bg-border">
                <ToggleRow
                  icon={Mail}
                  title="Email"
                  description="Recevez des alertes par email"
                  checked={prefs.notifEmail}
                  onChange={() => save({ notifEmail: !prefs.notifEmail })}
                  colors={colors}
                />
                <ToggleRow
                  icon={Bell}
                  title="Push web"
                  description="Notifications natives dans le navigateur"
                  checked={prefs.notifPush}
                  onChange={() => save({ notifPush: !prefs.notifPush })}
                  colors={colors}
                />
                <ToggleRow
                  icon={Smartphone}
                  title="SMS"
                  description="Alertes critiques par SMS (peut entraîner des frais)"
                  checked={prefs.notifSms}
                  onChange={() => save({ notifSms: !prefs.notifSms })}
                  colors={colors}
                />
                <ToggleRow
                  icon={Bell}
                  title="Offres et promotions"
                  description="Cashback, parrainage et nouveautés produit"
                  checked={prefs.notifPromotions}
                  onChange={() => save({ notifPromotions: !prefs.notifPromotions })}
                  colors={colors}
                />
              </div>
            </Card>
          )}

          {section === 'privacy' && (
            <Card padding="md">
              <SectionTitle title="Confidentialité & sécurité" subtitle="Contrôlez ce qui est visible et activez les protections" />
              <div className="mt-4 divide-y divide-bg-border">
                <ToggleRow
                  icon={Eye}
                  title="Afficher le solde par défaut"
                  description="Masquer le solde au démarrage de l'app"
                  checked={prefs.showBalance}
                  onChange={() => save({ showBalance: !prefs.showBalance })}
                  colors={colors}
                />
                <ToggleRow
                  icon={Lock}
                  title="Authentification à 2 facteurs"
                  description="Une seconde vérification à chaque connexion"
                  checked={prefs.twoFactor}
                  onChange={() => save({ twoFactor: !prefs.twoFactor })}
                  colors={colors}
                />
              </div>
            </Card>
          )}

          {section === 'account' && (
            <div className="space-y-4">
              <Card padding="md">
                <SectionTitle title="Compte" />
                <div className="mt-3 space-y-2">
                  <ActionRow
                    icon={UserIcon}
                    title="Mon profil"
                    description="Nom, email, photo et préférences"
                    onClick={() => navigate('/profile')}
                  />
                  <ActionRow
                    icon={KeyRound}
                    title="Changer le mot de passe"
                    description="Mettre à jour votre mot de passe"
                    onClick={() => navigate('/security')}
                  />
                </div>
              </Card>

              <Card padding="md" className="border-danger-500/30">
                <SectionTitle title="Zone dangereuse" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-danger-500/30 bg-danger-bg text-danger-400 hover:bg-danger-500/20 transition-colors text-left mt-3"
                >
                  <LogOut size={18} />
                  <div className="flex-1">
                    <div className="text-sm font-bold">Se déconnecter</div>
                    <div className="text-[11px] opacity-80">
                      Fermer cette session sur ce navigateur
                    </div>
                  </div>
                </button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-bold">{title}</h2>
      {subtitle && <p className="text-xs text-ink-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function ThemeOption({
  mode,
  active,
  onClick,
}: {
  mode: ThemeMode;
  active: boolean;
  onClick: () => void;
}) {
  const META = {
    light: { icon: Sun, label: 'Clair' },
    dark: { icon: Moon, label: 'Sombre' },
    system: { icon: Monitor, label: 'Système' },
  }[mode];
  const Icon = META.icon;
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border transition-all overflow-hidden ${
        active
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-bg-border bg-bg-elevated hover:border-ink-dim'
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            active ? 'bg-gradient-brand text-white' : 'bg-bg-surface text-ink-muted'
          }`}
        >
          <Icon size={20} />
        </div>
        <div className="text-sm font-bold">{META.label}</div>
      </div>
      {active && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      )}
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  colors?: any;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          checked
            ? 'bg-gradient-brand-soft text-brand-300'
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
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 ${
          checked ? 'bg-gradient-brand' : 'bg-bg-elevated border border-bg-border'
        }`}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-bg-border bg-bg-elevated/40 hover:bg-bg-elevated transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-brand-soft text-brand-300 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-ink-muted mt-0.5">{description}</div>
      </div>
    </button>
  );
}
