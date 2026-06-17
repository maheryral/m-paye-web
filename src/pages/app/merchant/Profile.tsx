import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Save,
  Store,
} from 'lucide-react';
import {
  merchantApi,
  type MerchantProfile as ApiMerchantProfile,
} from '../../../services/merchantApi';
import { resolveAssetUrl } from '../../../services/api';
import { Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';
const LABEL = 'block text-xs font-medium text-ink-muted mb-1.5';

interface FormState {
  businessName: string;
  businessType: string;
  registrationNumber: string;
  vatNumber: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
}

const EMPTY: FormState = {
  businessName: '',
  businessType: '',
  registrationNumber: '',
  vatNumber: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  description: '',
};

export default function MerchantProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [validationStatus, setValidationStatus] = useState('PENDING');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  function apply(p: ApiMerchantProfile) {
    setForm({
      businessName: p.businessName || '',
      businessType: p.businessType || '',
      registrationNumber: p.registrationNumber || '',
      vatNumber: p.vatNumber || '',
      email: p.email || '',
      phone: p.phone || '',
      address: p.address || '',
      website: p.website || '',
      description: p.description || '',
    });
    setLogo(p.logoUrl ? resolveAssetUrl(p.logoUrl) ?? null : null);
    setCover(p.coverUrl ? resolveAssetUrl(p.coverUrl) ?? null : null);
    setValidationStatus(p.validationStatus || 'PENDING');
  }

  async function load() {
    setLoading(true);
    try {
      const res = await merchantApi.getProfile();
      apply(res.data);
    } catch (e: any) {
      setMsg({
        type: 'err',
        text: e?.response?.data?.message || 'Impossible de charger le profil',
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!form.businessName.trim()) {
      setMsg({ type: 'err', text: "Le nom de l'entreprise est requis" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await merchantApi.updateProfile({
        // `nom` est le champ persisté côté backend (businessName est dérivé)
        nom: form.businessName.trim(),
        businessType: form.businessType || undefined,
        registrationNumber: form.registrationNumber || undefined,
        vatNumber: form.vatNumber || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
      } as any);
      if (res?.data) apply(res.data);
      setMsg({ type: 'ok', text: 'Profil mis à jour' });
      setEditing(false);
    } catch (e: any) {
      setMsg({
        type: 'err',
        text: e?.response?.data?.message || 'Échec de la mise à jour',
      });
    } finally {
      setSaving(false);
    }
  }

  async function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    setMsg(null);
    try {
      const res = await merchantApi.uploadLogo(file);
      setLogo(res.data.logoUrl ? resolveAssetUrl(res.data.logoUrl) ?? null : null);
    } catch (err: any) {
      setMsg({
        type: 'err',
        text: err?.response?.data?.message || 'Échec de l’envoi du logo',
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingCover(true);
    setMsg(null);
    try {
      const res = await merchantApi.uploadCover(file);
      setCover(res.data.coverUrl ? resolveAssetUrl(res.data.coverUrl) ?? null : null);
    } catch (err: any) {
      setMsg({
        type: 'err',
        text: err?.response?.data?.message || 'Échec de l’envoi de la couverture',
      });
    } finally {
      setUploadingCover(false);
    }
  }

  const verified =
    validationStatus === 'APPROVED' || validationStatus === 'VERIFIED';
  const rejected = validationStatus === 'REJECTED';
  const statusBadge = verified
    ? { c: 'text-success', bg: 'bg-success/15', label: 'Entreprise vérifiée' }
    : rejected
      ? { c: 'text-danger', bg: 'bg-danger/15', label: 'Demande rejetée' }
      : {
          c: 'text-warning',
          bg: 'bg-warning/15',
          label: 'En attente de validation',
        };

  if (loading) {
    return (
      <div>
        <PageHeader title="Mon entreprise" subtitle="Profil commerçant" />
        <Skeleton className="h-40 w-full rounded-2xl mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mon entreprise"
        subtitle="Logo, couverture et informations"
        actions={
          editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  load();
                }}
              >
                Annuler
              </Button>
              <Button size="sm" loading={saving} onClick={save} icon={Save}>
                Enregistrer
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              icon={Pencil}
            >
              Modifier
            </Button>
          )
        }
      />

      {msg && (
        <div
          className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${
            msg.type === 'ok'
              ? 'bg-success/15 text-success'
              : 'bg-danger/15 text-danger'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={logoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onLogoPick}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onCoverPick}
      />

      {/* Cover + logo */}
      <Card padding="none" className="overflow-hidden mb-6">
        <div className="relative h-44 sm:h-52 bg-bg-elevated">
          {cover ? (
            <img
              src={cover}
              alt="Couverture"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-muted">
              <ImageIcon size={36} />
              <span className="text-sm">Aucune couverture</span>
            </div>
          )}
          {/* Dégradé bas pour la profondeur, comme une vraie bannière */}
          {cover && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
          )}
          {uploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Loader2 className="animate-spin text-white" size={28} />
            </div>
          )}
          <button
            onClick={() => coverInput.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70 disabled:opacity-60"
          >
            <Camera size={14} />
            {cover ? 'Changer' : 'Ajouter'} la couverture
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-bg-surface bg-bg-elevated shadow-sm">
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store size={40} className="text-brand-500" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/35">
                    <Loader2 className="animate-spin text-white" size={22} />
                  </div>
                )}
              </div>
              <button
                onClick={() => logoInput.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-md hover:bg-brand-600 disabled:opacity-60"
                title="Changer le logo"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="flex-1 pb-1">
              <h2 className="text-xl font-bold text-ink">
                {form.businessName || 'Mon entreprise'}
              </h2>
              {form.businessType && (
                <p className="mt-0.5 text-sm text-ink-muted">
                  {form.businessType}
                </p>
              )}
              <span
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.bg} ${statusBadge.c}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusBadge.label}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Informations */}
      <Card className="mb-6">
        <h3 className="mb-4 text-base font-bold text-ink">
          Informations générales
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Nom de l'entreprise *"
            value={form.businessName}
            editing={editing}
            onChange={(v) => setForm({ ...form, businessName: v })}
          />
          <Field
            label="Type d'activité"
            value={form.businessType}
            editing={editing}
            onChange={(v) => setForm({ ...form, businessType: v })}
          />
          <Field
            label="Numéro d'enregistrement"
            value={form.registrationNumber}
            editing={editing}
            onChange={(v) => setForm({ ...form, registrationNumber: v })}
          />
          <Field
            label="NIF / Numéro fiscal"
            value={form.vatNumber}
            editing={editing}
            onChange={(v) => setForm({ ...form, vatNumber: v })}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="mb-4 text-base font-bold text-ink">Coordonnées</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            value={form.email}
            editing={editing}
            type="email"
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <Field
            label="Téléphone"
            value={form.phone}
            editing={editing}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <Field
            label="Adresse"
            value={form.address}
            editing={editing}
            onChange={(v) => setForm({ ...form, address: v })}
          />
          <Field
            label="Site web"
            value={form.website}
            editing={editing}
            onChange={(v) => setForm({ ...form, website: v })}
          />
          <div className="sm:col-span-2">
            <label className={LABEL}>Description</label>
            {editing ? (
              <textarea
                className={`${INPUT} min-h-[96px] resize-y`}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Décrivez votre activité…"
              />
            ) : (
              <p className="text-sm text-ink">{form.description || '—'}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {editing ? (
        <input
          type={type}
          className={INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-sm text-ink">{value || '—'}</p>
      )}
    </div>
  );
}
