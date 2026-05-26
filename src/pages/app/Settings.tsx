import {
  Bell,
  Eye,
  Globe,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors, useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import { userPreferencesService } from '../../services/api';

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

export default function Settings() {
  const navigate = useNavigate();
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const { logout, user } = useAuth();
  const { locale, setLocale } = useLocale();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    (async () => {
      try {
        const data = await userPreferencesService.get();
        setPrefs({ ...DEFAULT_PREFS, ...data });
        if (data?.theme && ['light', 'dark', 'system'].includes(data.theme)) {
          setMode(data.theme as ThemeMode);
        }
      } catch (e: any) {
        console.warn('Préférences indisponibles, valeurs par défaut.', e?.response?.data?.message);
      }
    })();
  }, [setMode]);

  const savePref = async (patch: Partial<Preferences>) => {
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      const saved = await userPreferencesService.update(patch);
      setPrefs({ ...DEFAULT_PREFS, ...saved });
    } catch (e: any) {
      setPrefs(prev);
      alert(e?.response?.data?.message || 'Impossible de sauvegarder la préférence');
    }
  };

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    void savePref({ theme: newMode });
  };

  const handleLanguageChange = (lang: 'fr' | 'en') => {
    setLocale(lang);
    void savePref({ language: lang });
  };

  const handleLogout = async () => {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    await logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-2xl mx-auto">
        <GradientHeader title="Paramètres" subtitle={user?.email} />

        <div className="px-5 mt-4 space-y-5">
          {/* Apparence */}
          <Section title="Apparence" colors={colors}>
            <div className="flex gap-2">
              <ThemeButton
                active={mode === 'light'}
                icon={Sun}
                label="Clair"
                onClick={() => handleThemeChange('light')}
                colors={colors}
              />
              <ThemeButton
                active={mode === 'dark'}
                icon={Moon}
                label="Sombre"
                onClick={() => handleThemeChange('dark')}
                colors={colors}
              />
              <ThemeButton
                active={mode === 'system'}
                icon={Monitor}
                label="Système"
                onClick={() => handleThemeChange('system')}
                colors={colors}
              />
            </div>
          </Section>

          {/* Langue */}
          <Section title="Langue" colors={colors}>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange('fr')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium"
                style={{
                  borderColor: locale === 'fr' ? colors.primary : colors.border,
                  background: locale === 'fr' ? colors.primary : 'transparent',
                  color: locale === 'fr' ? '#fff' : colors.text,
                }}
              >
                <Globe size={16} />
                Français
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium"
                style={{
                  borderColor: locale === 'en' ? colors.primary : colors.border,
                  background: locale === 'en' ? colors.primary : 'transparent',
                  color: locale === 'en' ? '#fff' : colors.text,
                }}
              >
                <Globe size={16} />
                English
              </button>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" colors={colors}>
            <ToggleRow
              icon={Mail}
              label="Email"
              description="Recevoir des alertes par email"
              checked={prefs.notifEmail}
              onChange={() => savePref({ notifEmail: !prefs.notifEmail })}
              colors={colors}
            />
            <ToggleRow
              icon={Bell}
              label="Push"
              description="Notifications push dans le navigateur"
              checked={prefs.notifPush}
              onChange={() => savePref({ notifPush: !prefs.notifPush })}
              colors={colors}
            />
            <ToggleRow
              icon={Smartphone}
              label="SMS"
              description="Alertes par SMS"
              checked={prefs.notifSms}
              onChange={() => savePref({ notifSms: !prefs.notifSms })}
              colors={colors}
            />
            <ToggleRow
              icon={Bell}
              label="Promotions"
              description="Offres et nouveautés"
              checked={prefs.notifPromotions}
              onChange={() => savePref({ notifPromotions: !prefs.notifPromotions })}
              colors={colors}
            />
          </Section>

          {/* Sécurité & vie privée */}
          <Section title="Sécurité & vie privée" colors={colors}>
            <ToggleRow
              icon={Eye}
              label="Afficher le solde"
              description="Masquer ou afficher par défaut"
              checked={prefs.showBalance}
              onChange={() => savePref({ showBalance: !prefs.showBalance })}
              colors={colors}
            />
            <ToggleRow
              icon={Lock}
              label="Authentification à deux facteurs"
              description="Renforcer la sécurité du compte"
              checked={prefs.twoFactor}
              onChange={() => savePref({ twoFactor: !prefs.twoFactor })}
              colors={colors}
            />
          </Section>

          {/* Compte */}
          <Section title="Compte" colors={colors}>
            <button
              onClick={() => navigate('/security')}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left"
              style={{ borderColor: colors.border, background: colors.card }}
            >
              <Lock size={20} style={{ color: colors.primary }} />
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: colors.text }}>
                  Changer le mot de passe
                </div>
                <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  Mettre à jour votre mot de passe
                </div>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left mt-2"
              style={{
                borderColor: '#ef4444',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
              }}
            >
              <LogOut size={20} />
              <div className="text-sm font-semibold">Se déconnecter</div>
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <div>
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: colors.textSecondary }}
      >
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ThemeButton({
  active,
  icon: Icon,
  label,
  onClick,
  colors,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  colors: any;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border"
      style={{
        borderColor: active ? colors.primary : colors.border,
        background: active ? `${colors.primary}20` : colors.card,
      }}
    >
      <Icon size={20} style={{ color: active ? colors.primary : colors.textSecondary }} />
      <span
        className="text-xs font-medium"
        style={{ color: active ? colors.primary : colors.textSecondary }}
      >
        {label}
      </span>
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  colors,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  colors: any;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-xl border"
      style={{ borderColor: colors.border, background: colors.card }}
    >
      <Icon size={20} style={{ color: colors.primary }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: colors.text }}>
          {label}
        </div>
        {description && (
          <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: checked ? colors.primary : colors.border }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}
