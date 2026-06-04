// src/pages/trade/TradePay.tsx
// Page de confirmation de paiement Trade (initiée par un partenaire OAuth).
//
// URL : /trade/pay?trade_no=TR-XXXXXX&return_url=https://partner.example/...
//
// Flow :
//   1. L'user (déjà loggé) arrive depuis le site partenaire.
//   2. On affiche le détail (montant, subject, partenaire).
//   3. Click "Payer" → POST /trade/:tradeNo/pay → débit wallet
//   4. Click "Annuler" → retour vers return_url avec ?status=cancelled

import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tradeApi, type TradeDto } from '../../services/tradeApi';
import { useAuth } from '../../contexts/AuthContext';

type Phase = 'loading' | 'ready' | 'paying' | 'success' | 'error';

export default function TradePay() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tradeNo = params.get('trade_no') ?? '';
  const returnUrl = params.get('return_url') ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [trade, setTrade] = useState<TradeDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Garde-fou : si pas de trade_no, on ne fait rien.
  useEffect(() => {
    if (!tradeNo) {
      setError('Paramètre trade_no manquant.');
      setPhase('error');
      return;
    }
    if (!user) {
      // Redirection vers login avec return URL
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    tradeApi
      .getOne(tradeNo)
      .then((t) => {
        setTrade(t);
        if (t.status !== 'PENDING') {
          setError(`Ce paiement est déjà ${labelStatus(t.status)}.`);
          setPhase('error');
        } else {
          setPhase('ready');
        }
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            'Trade introuvable ou expiré.',
        );
        setPhase('error');
      });
  }, [tradeNo, user, navigate]);

  const handlePay = useCallback(async () => {
    if (!trade) return;
    setPhase('paying');
    setError(null);
    try {
      await tradeApi.pay(trade.trade_no);
      setPhase('success');
      // Redirection automatique après 2s si return_url fourni
      if (returnUrl) {
        setTimeout(() => {
          const url = new URL(returnUrl);
          url.searchParams.set('status', 'paid');
          url.searchParams.set('trade_no', trade.trade_no);
          window.location.href = url.toString();
        }, 2000);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          'Le paiement a échoué. Réessayez.',
      );
      setPhase('error');
    }
  }, [trade, returnUrl]);

  const handleCancel = useCallback(() => {
    if (returnUrl) {
      const url = new URL(returnUrl);
      url.searchParams.set('status', 'cancelled');
      if (trade) url.searchParams.set('trade_no', trade.trade_no);
      window.location.href = url.toString();
    } else {
      navigate(-1);
    }
  }, [returnUrl, trade, navigate]);

  if (phase === 'loading') {
    return <FullPageLoader label="Chargement du paiement…" />;
  }

  if (phase === 'success' && trade) {
    return (
      <Centered>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement confirmé</h2>
          <p className="text-gray-600 mb-1">
            {fmtAmount(trade.amount)} {trade.currency} à <strong>{trade.partner.name}</strong>
          </p>
          <p className="text-xs text-gray-400 mb-6">Référence : {trade.trade_no}</p>
          {returnUrl ? (
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirection vers {new URL(returnUrl).host}…
            </p>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl py-3"
            >
              Retour à M'Paye
            </button>
          )}
        </div>
      </Centered>
    );
  }

  if (phase === 'error' && !trade) {
    return (
      <Centered>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-9 h-9 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement impossible</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl py-3"
          >
            Retour à M'Paye
          </button>
        </div>
      </Centered>
    );
  }

  // phase === 'ready' | 'paying' | (error avec trade chargé)
  if (!trade) return null;
  return (
    <Centered>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header partenaire */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            {trade.partner.logoUrl ? (
              <img
                src={trade.partner.logoUrl}
                alt={trade.partner.name}
                className="w-12 h-12 rounded-lg object-cover bg-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                {trade.partner.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-100">Paiement à</p>
              <p className="font-semibold truncate">{trade.partner.name}</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-100" />
          </div>
          <div>
            <p className="text-xs text-blue-100 mb-1">Montant</p>
            <p className="text-4xl font-bold">
              {fmtAmount(trade.amount)} <span className="text-2xl font-normal">{trade.currency}</span>
            </p>
          </div>
        </div>

        {/* Détails */}
        <div className="p-6 space-y-4">
          <Row label="Description" value={trade.subject} />
          {trade.body && <Row label="Détails" value={trade.body} />}
          <Row label="Référence partenaire" value={trade.out_trade_no} mono />
          <Row label="Expire le" value={fmtDate(trade.expires_at)} />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <p>
              Vous serez débité depuis votre solde M'Paye. {trade.partner.name} ne voit
              pas votre numéro de téléphone.
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="p-6 pt-0 grid grid-cols-2 gap-3">
          <button
            onClick={handleCancel}
            disabled={phase === 'paying'}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-900 font-medium rounded-xl py-3"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
          <button
            onClick={handlePay}
            disabled={phase === 'paying'}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl py-3"
          >
            {phase === 'paying' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Paiement…
              </>
            ) : (
              <>
                Payer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </Centered>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function FullPageLoader({ label }: { label: string }) {
  return (
    <Centered>
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">{label}</p>
      </div>
    </Centered>
  );
}

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR');
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
function labelStatus(s: string) {
  switch (s) {
    case 'PAID':
      return 'payé';
    case 'REFUNDED':
      return 'remboursé';
    case 'EXPIRED':
      return 'expiré';
    case 'CANCELLED':
      return 'annulé';
    case 'FAILED':
      return 'en échec';
    default:
      return s.toLowerCase();
  }
}
