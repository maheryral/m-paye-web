import {
  Calendar,
  Check,
  Edit3,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Sparkles,
  TrendingUp,
  User as UserIcon,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { accountService } from '../../services/api';
import { Avatar, Badge, Button, Card, Input, PageHeader, Skeleton } from '../../ui';

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

const KYC_META: Record<KycLevel, { label: string; tone: 'warning' | 'brand' | 'success'; icon: LucideIcon; level: number }> = {
  BASIC: { label: 'Basique', tone: 'warning', icon: Shield, level: 1 },
  INTERMEDIATE: { label: 'Intermédiaire', tone: 'brand', icon: ShieldHalf, level: 2 },
  ADVANCED: { label: 'Avancé', tone: 'success', icon: ShieldCheck, level: 3 },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { formatCurrency } = useLocale();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accountService.getProfile();
      if (data) {
        setProfile(data);
        setForm({
          prenom: data.prenom || '',
          nom: data.nom || '',
          email: data.email || '',
          telephone: data.telephone || '',
        });
      }
    } catch {
      if (user) {
        const fb: ProfileData = {
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
        setProfile(fb);
        setForm({
          prenom: fb.prenom,
          nom: fb.nom,
          email: fb.email,
          telephone: fb.telephone,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await updateUser({
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
      });
      setEditing(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (profile) {
      setForm({
        prenom: profile.prenom,
        nom: profile.nom,
        email: profile.email,
        telephone: profile.telephone,
      });
    }
    setEditing(false);
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Mon profil" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-96 rounded-2xl lg:col-span-1" />
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const fullName = `${form.prenom} ${form.nom}`.trim() || form.email;
  const kyc = KYC_META[profile.kycLevel] || KYC_META.BASIC;
  const KycIcon = kyc.icon;
  const limits = KYC_LIMITS[profile.kycLevel] || KYC_LIMITS.BASIC;
  const nextLevel = profile.kycLevel === 'BASIC' ? 'INTERMEDIATE' : profile.kycLevel === 'INTERMEDIATE' ? 'ADVANCED' : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et votre niveau de vérification"
        actions={
          editing ? (
            <>
              <Button variant="ghost" size="sm" icon={X} onClick={cancelEdit}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={save}>
                Enregistrer
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" icon={Edit3} onClick={() => setEditing(true)}>
              Modifier
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Profile card (sticky on desktop) === */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card padding="lg" className="text-center">
            <Avatar name={fullName} size="xl" className="mx-auto" />
            <div className="mt-4 text-lg font-bold truncate">{fullName}</div>
            <div className="text-xs text-ink-muted truncate">{profile.email}</div>

            <div className="mt-4">
              <Badge tone={kyc.tone} icon={<KycIcon size={11} />}>
                Niveau {kyc.label}
              </Badge>
            </div>

            <div className="text-[11px] text-ink-dim mt-4 flex items-center justify-center gap-1.5">
              <Calendar size={11} />
              Membre depuis{' '}
              {new Date(profile.memberSince).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </Card>

          {/* KYC progress + upgrade CTA */}
          <Card padding="md">
            <h3 className="text-sm font-bold mb-3">Niveau de vérification</h3>
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3].map((lvl) => (
                <div
                  key={lvl}
                  className={`flex-1 h-1.5 rounded-full ${
                    lvl <= kyc.level
                      ? 'bg-gradient-brand'
                      : 'bg-bg-elevated'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider">
              <span className={kyc.level >= 1 ? 'text-brand-300' : 'text-ink-dim'}>
                Basique
              </span>
              <span className={kyc.level >= 2 ? 'text-brand-300' : 'text-ink-dim'}>
                Inter.
              </span>
              <span className={kyc.level >= 3 ? 'text-brand-300' : 'text-ink-dim'}>
                Avancé
              </span>
            </div>

            {nextLevel && (
              <div className="mt-4 p-3 rounded-xl bg-gradient-brand-soft border border-brand-500/20">
                <div className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Passer au niveau {KYC_META[nextLevel].label}
                </div>
                <div className="text-[11px] text-ink-muted mt-1">
                  Plafonds étendus jusqu'à{' '}
                  {formatCurrency(KYC_LIMITS[nextLevel].monthly)}/mois
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2.5 w-full"
                  onClick={() => navigate('/complete-profile')}
                >
                  Vérifier mon identité
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* === Right column === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Limits */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">Limites de transaction</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Par transaction', value: limits.tx },
                { label: 'Quotidienne', value: limits.daily },
                { label: 'Mensuelle', value: limits.monthly },
              ].map((l) => (
                <div
                  key={l.label}
                  className="p-4 rounded-xl bg-bg-elevated border border-bg-border"
                >
                  <div className="text-xs text-ink-muted">{l.label}</div>
                  <div className="text-lg font-bold mt-1">
                    {formatCurrency(l.value)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Personal info */}
          <Card padding="md">
            <h3 className="text-base font-bold mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editing ? (
                <>
                  <Input
                    label="Prénom"
                    icon={UserIcon}
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  />
                  <Input
                    label="Nom"
                    icon={UserIcon}
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    type="email"
                    icon={Mail}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    icon={Phone}
                    value={form.telephone}
                    onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                  />
                </>
              ) : (
                <>
                  <InfoField label="Prénom" icon={UserIcon} value={form.prenom || '—'} />
                  <InfoField label="Nom" icon={UserIcon} value={form.nom || '—'} />
                  <InfoField label="Email" icon={Mail} value={form.email} />
                  <InfoField
                    label="Téléphone"
                    icon={Phone}
                    value={form.telephone || '—'}
                  />
                </>
              )}
            </div>
          </Card>

          {/* Account meta */}
          <Card padding="md">
            <h3 className="text-base font-bold mb-4">Compte</h3>
            <div className="space-y-3">
              <MetaRow label="Identifiant utilisateur" mono value={profile.id} />
              <MetaRow
                label="Statut du compte"
                value={
                  <Badge tone={profile.isActive ? 'success' : 'danger'}>
                    {profile.isActive ? 'Actif' : 'Désactivé'}
                  </Badge>
                }
              />
              <MetaRow label="Rôle" value={profile.role || 'USER'} />
              <MetaRow
                label="Membre depuis"
                value={new Date(profile.memberSince).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-ink-muted font-semibold mb-1">{label}</div>
      <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl bg-bg-elevated/50 text-sm text-ink">
        <Icon size={14} className="text-ink-dim shrink-0" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-bg-border/50 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span
        className={`text-sm text-right truncate ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
