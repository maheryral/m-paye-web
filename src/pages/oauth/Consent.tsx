// src/pages/oauth/Consent.tsx
// Page de consentement OAuth pour les partenaires externes.
//
// URL d'entrée :
//   /oauth/consent?app_id=...&scopes=auth_user,auth_phone&redirect_uri=...&state=...
//
// Comportement :
//   1. Charge les infos publiques du partenaire (nom, logo) via /oauth/partner-info
//   2. Vérifie que redirect_uri est dans la liste blanche
//   3. Affiche les scopes demandés
//   4. User clique "Autoriser" → POST /oauth/authorize → reçoit un code
//      → redirige vers `${redirect_uri}?code=...&state=...`
//   5. User clique "Refuser" → redirige vers `${redirect_uri}?error=access_denied&state=...`

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  Receipt,
  ShieldCheck,
  User,
  Undo2,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  oauthApi,
  type OAuthScope,
  type PartnerPublicInfo,
} from '../../services/oauthApi';
import { useAuth } from '../../contexts/AuthContext';

/** Métadonnées d'affichage des scopes. */
const SCOPE_META: Record<
  OAuthScope,
  { label: string; description: string; icon: typeof User }
> = {
  auth_user: {
    label: 'Votre identifiant',
    description: 'Pour vous identifier (sans révéler email/téléphone)',
    icon: User,
  },
  auth_phone: {
    label: 'Votre numéro de téléphone',
    description: 'Pour vous contacter au sujet de vos commandes',
    icon: Phone,
  },
  auth_email: {
    label: 'Votre email',
    description: 'Pour vous envoyer reçus et confirmations',
    icon: Mail,
  },
  trade: {
    label: 'Initier des paiements',
    description: 'Le partenaire pourra demander des paiements (vous validerez chaque fois)',
    icon: Receipt,
  },
  trade_refund: {
    label: 'Initier des remboursements',
    description: 'Le partenaire pourra vous rembourser sans intervention de votre part',
    icon: Undo2,
  },
  wallet_balance: {
    label: 'Voir votre solde',
    description: 'Le partenaire pourra consulter le solde de votre wallet',
    icon: Wallet,
  },
};

export default function OauthConsent() {
  const [params] = useSearchParams();
  const { user } = useAuth();

  // Extraction des params OAuth
  const appId = params.get('app_id') ?? '';
  const scopesRaw = params.get('scopes') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const state = params.get('state') ?? undefined;

  const scopes = useMemo<OAuthScope[]>(
    () =>
      scopesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is OAuthScope => s in SCOPE_META),
    [scopesRaw],
  );

  const [partner, setPartner] = useState<PartnerPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!appId) {
      setError('Paramètre app_id manquant');
      setLoading(false);
      return;
    }
    if (!redirectUri) {
      setError('Paramètre redirect_uri manquant');
      setLoading(false);
      return;
    }
    if (scopes.length === 0) {
      setError('Au moins un scope est requis');
      setLoading(false);
      return;
    }

    oauthApi
      .partnerInfo(appId)
      .then((p) => {
        if (cancelled) return;
        // Validation côté front : redirect_uri whitelist + scopes ⊂ allowedScopes
        if (!p.redirectUris.includes(redirectUri)) {
          setError(
            `redirect_uri "${redirectUri}" n'est pas autorisé pour ce partenaire`,
          );
          return;
        }
        const unauthorized = scopes.filter((s) => !p.allowedScopes.includes(s));
        if (unauthorized.length > 0) {
          setError(
            `Scopes non autorisés pour ce partenaire : ${unauthorized.join(', ')}`,
          );
          return;
        }
        setPartner(p);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(
            e?.response?.data?.message || 'Partenaire introuvable ou désactivé',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appId, redirectUri, scopes]);

  /** Construit l'URL de redirection en préservant le state. */
  function buildRedirect(params: Record<string, string>): string {
    try {
      const u = new URL(redirectUri);
      for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
      if (state) u.searchParams.set('state', state);
      return u.toString();
    } catch {
      return redirectUri;
    }
  }

  async function handleAllow() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await oauthApi.authorize({
        app_id: appId,
        scopes,
        redirect_uri: redirectUri,
        state,
      });
      // Redirige le navigateur vers le partenaire avec ?code=...&state=...
      window.location.href = buildRedirect({ code: result.code });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'autorisation");
      setSubmitting(false);
    }
  }

  function handleDeny() {
    window.location.href = buildRedirect({ error: 'access_denied' });
  }

  // ─── Renders ───

  if (loading) {
    return (
      <CenteredCard>
        <Loader2 className="animate-spin text-brand-300" size={32} />
        <p className="text-sm text-ink-muted mt-3">Chargement…</p>
      </CenteredCard>
    );
  }

  if (error || !partner) {
    return (
      <CenteredCard>
        <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mb-3">
          <AlertTriangle className="text-danger-400" size={24} />
        </div>
        <h2 className="text-lg font-bold mb-1">Demande invalide</h2>
        <p className="text-sm text-ink-muted text-center">
          {error || 'Une erreur est survenue'}
        </p>
      </CenteredCard>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="card max-w-md w-full p-6 space-y-5">
        {/* Header avec logos */}
        <div className="flex items-center justify-center gap-3">
          {partner.logoUrl ? (
            <img
              src={partner.logoUrl}
              alt={partner.name}
              className="w-14 h-14 rounded-xl object-contain bg-white p-1.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <Lock size={22} className="text-brand-300" />
            </div>
          )}
          <ArrowRight size={20} className="text-ink-dim" />
          <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Wallet size={22} className="text-white" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold">
            {partner.name} demande l'accès
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            à votre compte M'Paye
            {user ? ` (${user.email ?? user.prenom})` : ''}
          </p>
        </div>

        {partner.description && (
          <p className="text-xs text-ink-muted bg-bg-elevated rounded-lg p-3 text-center">
            {partner.description}
          </p>
        )}

        {/* Liste des permissions demandées */}
        <div>
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
            Permissions demandées
          </div>
          <div className="space-y-2">
            {scopes.map((s) => {
              const meta = SCOPE_META[s];
              const Icon = meta.icon;
              return (
                <div
                  key={s}
                  className="flex items-start gap-3 p-3 rounded-lg bg-bg-elevated border border-bg-border"
                >
                  <Icon size={16} className="text-success-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-[11px] text-ink-muted">
                      {meta.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Garanties M'Paye */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-success-bg/30 border border-success-500/30">
          <ShieldCheck
            size={14}
            className="text-success-400 shrink-0 mt-0.5"
          />
          <div className="text-[11px] text-ink leading-relaxed">
            Vous pourrez révoquer cet accès à tout moment depuis vos paramètres.
            M'Paye ne partage jamais votre mot de passe.
          </div>
        </div>

        {error && (
          <div className="p-2 rounded bg-danger-bg text-danger-400 text-xs">
            {error}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDeny}
            disabled={submitting}
            className="btn-secondary flex-1"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Autoriser
          </button>
        </div>

        <div className="text-[10px] text-ink-dim text-center">
          Vous serez redirigé vers <code className="font-mono">{new URL(redirectUri).host}</code>
        </div>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="card max-w-md w-full p-8 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
