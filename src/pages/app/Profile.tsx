import {
  Check,
  Edit3,
  Loader2,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldHalf,
  TrendingUp,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { accountService } from '../../services/api';

type KycLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

interface ProfileData {
  id: string;
  email: string;
  telephone: string;
  prenom: string;
  nom: string;
  kycLevel: KycLevel;
  isActive: boolean;
  role: string;
  memberSince: string;
}

const KYC_LIMITS: Record<KycLevel, { tx: number; daily: number; monthly: number }> = {
  BASIC: { tx: 50_000, daily: 200_000, monthly: 1_000_000 },
  INTERMEDIATE: { tx: 500_000, daily: 2_000_000, monthly: 10_000_000 },
  ADVANCED: { tx: 5_000_000, daily: 20_000_000, monthly: 100_000_000 },
};

const KYC_META: Record<KycLevel, { label: string; color: string; icon: LucideIcon }> = {
  BASIC: { label: 'Basique', color: '#f59e0b', icon: Shield },
  INTERMEDIATE: { label: 'Intermédiaire', color: '#3b82f6', icon: ShieldHalf },
  ADVANCED: { label: 'Avancé', color: '#10b981', icon: ShieldCheck },
};

export default function Profile() {
  const colors = useColors();
  const { user, updateUser } = useAuth();
  const { formatCurrency } = useLocale();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      const data = await accountService.getProfile();
      if (data) {
        setProfile(data);
        setFormData({
          prenom: data.prenom || '',
          nom: data.nom || '',
          email: data.email || '',
          telephone: data.telephone || '',
        });
      }
    } catch (e: any) {
      console.error('Erreur chargement profil:', e?.response?.data || e?.message);
      if (user) {
        const fallback: ProfileData = {
          id: user.id,
          email: user.email,
          telephone: user.telephone || '',
          prenom: user.prenom || '',
          nom: user.nom || '',
          kycLevel: (user.kycLevel as KycLevel) || 'BASIC',
          isActive: user.isActive,
          role: 'USER',
          memberSince: new Date().toISOString(),
        };
        setProfile(fallback);
        setFormData({
          prenom: fallback.prenom,
          nom: fallback.nom,
          email: fallback.email,
          telephone: fallback.telephone,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
      });
      setEditMode(false);
      await loadProfile();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible de mettre à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        prenom: profile.prenom,
        nom: profile.nom,
        email: profile.email,
        telephone: profile.telephone,
      });
    }
    setEditMode(false);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-bg">
        <GradientHeader title="Mon profil" />
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
        </div>
      </div>
    );
  }

  const initials = `${formData.prenom?.[0] || ''}${formData.nom?.[0] || ''}`.toUpperCase() ||
    formData.email?.[0]?.toUpperCase() ||
    'U';
  const kyc = KYC_META[profile.kycLevel] || KYC_META.BASIC;
  const KycIcon = kyc.icon;
  const limits = KYC_LIMITS[profile.kycLevel] || KYC_LIMITS.BASIC;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-2xl mx-auto">
        <GradientHeader
          title="Mon profil"
          subtitle={`Membre depuis ${new Date(profile.memberSince).toLocaleDateString('fr-FR')}`}
          RightIcon={editMode ? X : Edit3}
          onRightPress={() => (editMode ? handleCancel() : setEditMode(true))}
        />

        <div className="px-5 mt-4 space-y-4">
          {/* Avatar + niveau KYC */}
          <div className="card flex flex-col items-center p-6 relative">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-glow-blue"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
            >
              {initials}
            </div>
            <div className="mt-3 text-lg font-bold" style={{ color: colors.text }}>
              {profile.prenom} {profile.nom}
            </div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              {profile.email}
            </div>

            <div
              className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: `${kyc.color}20` }}
            >
              <KycIcon size={16} style={{ color: kyc.color }} />
              <span className="text-xs font-bold" style={{ color: kyc.color }}>
                Niveau {kyc.label}
              </span>
            </div>
          </div>

          {/* Limites */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} style={{ color: colors.primary }} />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Limites de transaction
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Par transaction', value: limits.tx },
                { label: 'Quotidienne', value: limits.daily },
                { label: 'Mensuelle', value: limits.monthly },
              ].map((l) => (
                <div key={l.label} className="text-center">
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {l.label}
                  </div>
                  <div className="text-sm font-bold mt-1" style={{ color: colors.text }}>
                    {formatCurrency(l.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div className="card p-4 space-y-4">
            <Field
              label="Prénom"
              value={formData.prenom}
              editing={editMode}
              onChange={(v) => setFormData((f) => ({ ...f, prenom: v }))}
              colors={colors}
            />
            <Field
              label="Nom"
              value={formData.nom}
              editing={editMode}
              onChange={(v) => setFormData((f) => ({ ...f, nom: v }))}
              colors={colors}
            />
            <Field
              label="Email"
              value={formData.email}
              editing={editMode}
              onChange={(v) => setFormData((f) => ({ ...f, email: v }))}
              icon={Mail}
              colors={colors}
              type="email"
            />
            <Field
              label="Téléphone"
              value={formData.telephone}
              editing={editMode}
              onChange={(v) => setFormData((f) => ({ ...f, telephone: v }))}
              icon={Phone}
              colors={colors}
              type="tel"
            />
          </div>

          {editMode && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white"
              style={{ background: colors.primary, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Check size={20} />
                  Enregistrer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  icon: Icon,
  colors,
  type = 'text',
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  icon?: LucideIcon;
  colors: any;
  type?: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
        {label}
      </div>
      {editing ? (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
          style={{ borderColor: colors.border, background: colors.background }}
        >
          {Icon && <Icon size={18} style={{ color: colors.textSecondary }} />}
          <input
            type={type}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: colors.text }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 py-1.5" style={{ color: colors.text }}>
          {Icon && <Icon size={18} style={{ color: colors.textSecondary }} />}
          <span className="text-sm">{value || '—'}</span>
        </div>
      )}
    </div>
  );
}
