import { useEffect, useState } from 'react';
import { Gift, Award, Coins, X, ArrowRight } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  merchantApi,
  type LoyaltyAccountSummary,
  type LoyaltyAccountDetail,
} from '../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../ui';

const HISTORY_LABEL: Record<string, string> = {
  EARN: 'Points gagnés',
  WELCOME: 'Bonus de bienvenue',
  REDEEM: 'Échange',
  ADJUST: 'Ajustement',
};

export default function Loyalty() {
  const { formatCurrency } = useLocale();
  const [accounts, setAccounts] = useState<LoyaltyAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<LoyaltyAccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [redeemPts, setRedeemPts] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await merchantApi.myLoyalty();
      setAccounts(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function openDetail(merchantId: string) {
    setDetailLoading(true);
    setErr(null);
    setRedeemPts('');
    try {
      const r = await merchantApi.getLoyaltyAccount(merchantId);
      setDetail(r.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function redeem() {
    if (!detail) return;
    const pts = Number(redeemPts);
    if (!pts || pts <= 0) {
      setErr('Nombre de points invalide');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await merchantApi.redeemLoyalty(detail.merchantId, pts);
      await openDetail(detail.merchantId);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Échec de l’échange');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fidélité"
        subtitle="Vos points de fidélité chez les marchands"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card padding="md">
          <div className="p-6 text-center">
            <Gift size={32} className="mx-auto text-ink-dim mb-2" />
            <div className="text-sm text-ink-muted">
              Aucun point pour le moment. Payez chez des marchands partenaires
              pour cumuler des points.
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((a) => (
            <button
              key={a.merchantId}
              onClick={() => openDetail(a.merchantId)}
              className="text-left"
            >
              <Card padding="md" className="hover:border-brand-500/40 transition-colors">
                <div className="flex items-center gap-3">
                  {a.merchantLogo ? (
                    <img
                      src={a.merchantLogo}
                      alt={a.merchantName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
                      <Gift size={18} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {a.merchantName}
                    </div>
                    {a.estimatedValue > 0 && (
                      <div className="text-[11px] text-ink-dim">
                        ≈ {formatCurrency(a.estimatedValue)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-brand-300">
                      {a.points}
                    </div>
                    <div className="text-[10px] text-ink-dim">points</div>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Modal détail / échange */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => setDetail(null)}
        >
          <Card
            padding="md"
            className="w-full max-w-md my-8"
            onClick={(e: any) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold">
                    {detail.merchantName || 'Marchand'}
                  </h3>
                  <button
                    onClick={() => setDetail(null)}
                    className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-brand-300">
                    {detail.points}
                  </div>
                  <div className="text-xs text-ink-muted">points disponibles</div>
                  {detail.program.pointValue > 0 && (
                    <div className="text-[11px] text-ink-dim mt-1">
                      ≈ {formatCurrency(detail.points * detail.program.pointValue)}
                    </div>
                  )}
                </div>

                {/* Échange */}
                {detail.program.exists &&
                  detail.program.isActive &&
                  detail.program.pointValue > 0 && (
                    <div className="bg-bg-elevated rounded-xl p-3 space-y-2">
                      <div className="text-xs text-ink-muted">
                        Échanger des points contre un crédit wallet
                        {detail.program.minRedeemPoints > 0 &&
                          ` (min. ${detail.program.minRedeemPoints})`}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="flex-1 bg-bg-surface border border-bg-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                          placeholder="Points à échanger"
                          value={redeemPts}
                          onChange={(e) => setRedeemPts(e.target.value)}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          icon={ArrowRight}
                          loading={busy}
                          onClick={redeem}
                        >
                          Échanger
                        </Button>
                      </div>
                      {Number(redeemPts) > 0 && (
                        <div className="text-[11px] text-ink-dim">
                          ={' '}
                          {formatCurrency(
                            Number(redeemPts) * detail.program.pointValue,
                          )}{' '}
                          crédités
                        </div>
                      )}
                      {err && (
                        <div className="text-xs text-danger-400">{err}</div>
                      )}
                    </div>
                  )}

                {/* Historique */}
                <div className="mt-4">
                  <div className="text-xs text-ink-muted mb-1">Historique</div>
                  {detail.history.length === 0 ? (
                    <div className="text-sm text-ink-dim py-4 text-center">
                      Aucun mouvement
                    </div>
                  ) : (
                    <div className="divide-y divide-bg-border max-h-56 overflow-auto">
                      {detail.history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <div className="text-sm">
                              {HISTORY_LABEL[h.type] ?? h.type}
                            </div>
                            <div className="text-[10px] text-ink-dim">
                              {new Date(h.createdAt).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <Badge tone={h.points >= 0 ? 'success' : 'warning'}>
                            {h.points >= 0 ? '+' : ''}
                            {h.points}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
