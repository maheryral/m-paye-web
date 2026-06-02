import { useEffect, useState } from 'react';
import { Gift, Users, Award, Coins, Save } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type LoyaltyMerchantView,
  type LoyaltyMember,
} from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export default function MerchantLoyalty() {
  const { formatCurrency } = useLocale();
  const [view, setView] = useState<LoyaltyMerchantView | null>(null);
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    isActive: true,
    earnRate: '',
    pointValue: '',
    welcomeBonus: '',
    minRedeemPoints: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [v, m] = await Promise.all([
        merchantApi.getLoyalty(),
        merchantApi.getLoyaltyMembers(),
      ]);
      setView(v.data);
      setMembers(Array.isArray(m.data) ? m.data : []);
      const p = v.data.program;
      setForm({
        isActive: p.isActive,
        earnRate: p.earnRate ? String(p.earnRate) : '',
        pointValue: p.pointValue ? String(p.pointValue) : '',
        welcomeBonus: p.welcomeBonus ? String(p.welcomeBonus) : '',
        minRedeemPoints: p.minRedeemPoints ? String(p.minRedeemPoints) : '',
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await merchantApi.updateLoyalty({
        isActive: form.isActive,
        earnRate: form.earnRate ? Number(form.earnRate) : 0,
        pointValue: form.pointValue ? Number(form.pointValue) : 0,
        welcomeBonus: form.welcomeBonus ? Number(form.welcomeBonus) : 0,
        minRedeemPoints: form.minRedeemPoints
          ? Number(form.minRedeemPoints)
          : 0,
      });
      setMsg('Programme enregistré');
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  // Aperçu : points gagnés pour un achat de 10 000 Ar
  const sampleSpend = 10000;
  const samplePoints = Math.floor(sampleSpend * (Number(form.earnRate) || 0));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Programme de fidélité"
        subtitle="Récompensez vos clients à chaque achat"
        actions={
          view?.program.exists ? (
            <Badge tone={form.isActive ? 'success' : 'neutral'}>
              {form.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          ) : undefined
        }
      />

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md">
              <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
                <Users size={14} /> Membres
              </div>
              <div className="text-2xl font-bold">{view?.stats.members ?? 0}</div>
            </Card>
            <Card padding="md">
              <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
                <Award size={14} /> Points émis
              </div>
              <div className="text-2xl font-bold">
                {view?.stats.pointsIssued ?? 0}
              </div>
            </Card>
            <Card padding="md">
              <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
                <Coins size={14} /> Points en circulation
              </div>
              <div className="text-2xl font-bold">
                {view?.stats.pointsOutstanding ?? 0}
              </div>
            </Card>
          </div>

          {/* Config */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <Gift size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">Configuration</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Programme activé</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Points par Ar dépensé
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className={INPUT}
                    placeholder="ex: 0.01 (1 pt / 100 Ar)"
                    value={form.earnRate}
                    onChange={(e) =>
                      setForm({ ...form, earnRate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Valeur d'un point (Ar)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className={INPUT}
                    placeholder="ex: 1"
                    value={form.pointValue}
                    onChange={(e) =>
                      setForm({ ...form, pointValue: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Bonus de bienvenue (points)
                  </label>
                  <input
                    type="number"
                    className={INPUT}
                    placeholder="0"
                    value={form.welcomeBonus}
                    onChange={(e) =>
                      setForm({ ...form, welcomeBonus: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Minimum pour échanger (points)
                  </label>
                  <input
                    type="number"
                    className={INPUT}
                    placeholder="0"
                    value={form.minRedeemPoints}
                    onChange={(e) =>
                      setForm({ ...form, minRedeemPoints: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="text-xs text-ink-muted bg-bg-elevated rounded-lg p-3">
                Aperçu : un achat de {formatCurrency(sampleSpend)} rapporte{' '}
                <span className="font-semibold text-ink-base">
                  {samplePoints} points
                </span>
                {Number(form.pointValue) > 0 && (
                  <>
                    {' '}
                    (≈{' '}
                    {formatCurrency(samplePoints * Number(form.pointValue))} de
                    récompense)
                  </>
                )}
                .
              </div>

              {msg && (
                <div className="text-xs text-ink-muted bg-bg-elevated rounded-lg p-2">
                  {msg}
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                icon={Save}
                loading={saving}
                onClick={save}
              >
                Enregistrer le programme
              </Button>
            </div>
          </Card>

          {/* Members */}
          <Card padding="none">
            <div className="p-4 border-b border-bg-border">
              <h3 className="text-base font-bold">Clients fidèles</h3>
            </div>
            {members.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-muted">
                Aucun membre pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-bg-border">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3.5">
                    <div className="w-9 h-9 rounded-full bg-brand-500/15 text-brand-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-ink-dim">
                        Dépensé : {formatCurrency(m.lifetimeSpend)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-brand-300">
                        {m.points} pts
                      </div>
                      <div className="text-[10px] text-ink-dim">
                        {m.totalEarned} gagnés
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
