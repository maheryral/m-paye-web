// src/pages/partner-portal/Settings.tsx
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePartnerAuth } from '../../contexts/PartnerAuthContext';
import { partnerPortalApi } from '../../services/partnerPortal/partnerPortalApi';

export default function PartnerSettings() {
  const { partner, refresh } = usePartnerAuth();
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [rotateModal, setRotateModal] = useState(false);

  useEffect(() => {
    if (partner) {
      setLogoUrl(partner.logoUrl ?? '');
      setDescription(partner.description ?? '');
      setWebhookUrl(partner.webhookUrl ?? '');
    }
  }, [partner]);

  if (!partner) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveOk(false);
    setSaveError(null);
    try {
      await partnerPortalApi.updateMe({
        logoUrl: logoUrl.trim() || null,
        description: description.trim() || null,
        webhookUrl: webhookUrl.trim() || null,
      });
      await refresh();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configurez votre compte partenaire
        </p>
      </div>

      {/* Identité (lecture seule) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Identité</h2>
        <div className="space-y-3 text-sm">
          <ReadOnly label="Nom" value={partner.name} />
          <ReadOnly label="App ID" value={partner.appId} mono />
          <ReadOnly
            label="Scopes autorisés"
            value={partner.allowedScopes.join(', ') || '(aucun)'}
          />
          <ReadOnly
            label="Redirect URIs"
            value={partner.redirectUris.join(', ') || '(aucune)'}
          />
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Pour modifier ces informations, contactez votre administrateur M'Paye.
        </p>
      </section>

      {/* Profil modifiable */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-900">Profil public</h2>

        <Field
          label="Logo (URL)"
          value={logoUrl}
          onChange={setLogoUrl}
          placeholder="https://votre-site.mg/logo.png"
        />
        <Field
          label="Description"
          value={description}
          onChange={setDescription}
          textarea
          placeholder="Une courte description affichée aux utilisateurs lors du consent"
        />
        <Field
          label="Webhook URL"
          value={webhookUrl}
          onChange={setWebhookUrl}
          placeholder="https://votre-api.mg/mpaye/webhook"
          help="M'Paye enverra POST signé HMAC-SHA256 sur cette URL pour chaque événement (trade.paid, trade.refunded, etc.)"
        />

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </button>
          {saveOk && (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Enregistré
            </span>
          )}
        </div>
      </form>

      {/* Zone dangereuse */}
      <section className="bg-red-50/40 border border-red-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-red-900 flex items-center gap-2">
          <Key className="w-5 h-5" />
          Rotation du App Secret
        </h2>
        <p className="text-sm text-red-700 mt-2 mb-4">
          Génère un nouveau secret. L'ancien deviendra invalide{' '}
          <strong>immédiatement</strong> — assurez-vous de mettre à jour vos
          serveurs avec le nouveau avant de l'utiliser.
        </p>
        <button
          onClick={() => setRotateModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Régénérer le secret
        </button>
      </section>

      {rotateModal && (
        <RotateSecretModal onClose={() => setRotateModal(false)} />
      )}
    </div>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
      {help && <p className="text-xs text-slate-500 mt-1">{help}</p>}
    </div>
  );
}

function RotateSecretModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'confirm' | 'loading' | 'done' | 'error'>('confirm');
  const [newSecret, setNewSecret] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConfirm = async () => {
    setStep('loading');
    try {
      const res = await partnerPortalApi.rotateSecret();
      setNewSecret(res.appSecret);
      setStep('done');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message);
      setStep('error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        {step === 'confirm' && (
          <>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              Confirmer la rotation
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Cette action est <strong>irréversible</strong>. L'ancien
              app_secret cessera de fonctionner dès maintenant.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Générer un nouveau secret
              </button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {step === 'done' && (
          <>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              Nouveau App Secret
            </h3>
            <p className="text-sm text-red-700 mb-4">
              ⚠️ Copiez-le maintenant — il ne sera plus jamais affiché.
            </p>
            <div className="bg-slate-900 text-white rounded-lg p-3 font-mono text-xs break-all relative">
              {show ? newSecret : '•'.repeat(newSecret.length)}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => setShow(!show)}
                  className="p-1 hover:bg-white/10 rounded"
                  title={show ? 'Cacher' : 'Afficher'}
                >
                  {show ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-white/10 rounded"
                  title="Copier"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg"
            >
              J'ai copié le secret
            </button>
          </>
        )}

        {step === 'error' && (
          <>
            <h3 className="font-bold text-red-900 text-lg mb-2">Erreur</h3>
            <p className="text-sm text-slate-700 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded-lg"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
