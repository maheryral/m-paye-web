// src/pages/app/TontineNew.tsx
//
// Formulaire de création d'une tontine — équivalent web du screen mobile.

import { ArrowLeft, CheckCircle2, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tontineService } from '../../services/api';
import { Button, Card, Input, PageHeader } from '../../ui';

const AMOUNT_PRESETS = [25000, 50000, 100000, 200000];
const SIZE_PRESETS = [5, 8, 10, 12, 15];

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar';
}

export default function TontineNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('50000');
  const [members, setMembers] = useState(10);
  const [cycleDay, setCycleDay] = useState(5);
  const [busy, setBusy] = useState(false);

  const monthlyN = Number(amount) || 0;
  const pot = useMemo(() => monthlyN * members, [monthlyN, members]);

  const submit = async () => {
    if (!name.trim()) return alert('Donnez un nom à votre tontine.');
    if (monthlyN < 1000) return alert('Minimum 1 000 Ar par mois.');
    if (members < 2 || members > 30) return alert('Entre 2 et 30 membres.');
    if (cycleDay < 1 || cycleDay > 28) return alert('Jour entre 1 et 28.');

    setBusy(true);
    try {
      const created = await tontineService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        monthlyAmount: monthlyN,
        totalMembers: members,
        cycleDay,
      });
      navigate(`/tontines/${created.id}`, { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Création impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Nouvelle tontine"
        subtitle="Épargne collective"
        actions={
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/tontines')}>
            Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md" className="space-y-4">
            <Input
              label="Nom de la tontine"
              placeholder="Ex: Tontine famille Rakoto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pour notre projet immobilier 2026"
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl bg-bg-elevated border border-bg-border focus:border-brand-500 focus:outline-none resize-none text-ink placeholder:text-ink-muted"
              />
            </div>
          </Card>

          <Card padding="md" className="space-y-3">
            <Input
              label="Cotisation par membre / mois (Ar)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    amount === String(p)
                      ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                      : 'border-bg-border bg-bg-elevated text-ink-muted hover:text-ink'
                  }`}
                >
                  {(p / 1000).toLocaleString('fr-FR')} k
                </button>
              ))}
            </div>
          </Card>

          <Card padding="md" className="space-y-3">
            <label className="block text-xs font-semibold text-ink-muted">
              Nombre de membres (organisateur compris)
            </label>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg-elevated">
              <button
                type="button"
                onClick={() => setMembers((m) => Math.max(2, m - 1))}
                className="p-2 rounded-lg text-brand-300 hover:bg-brand-500/10"
              >
                <Minus size={20} />
              </button>
              <div className="text-2xl font-extrabold">{members}</div>
              <button
                type="button"
                onClick={() => setMembers((m) => Math.min(30, m + 1))}
                className="p-2 rounded-lg text-brand-300 hover:bg-brand-500/10"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMembers(n)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    members === n
                      ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                      : 'border-bg-border bg-bg-elevated text-ink-muted hover:text-ink'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Card>

          <Card padding="md" className="space-y-3">
            <label className="block text-xs font-semibold text-ink-muted">
              Jour du mois pour le cycle (1-28)
            </label>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg-elevated">
              <button
                type="button"
                onClick={() => setCycleDay((d) => Math.max(1, d - 1))}
                className="p-2 rounded-lg text-brand-300 hover:bg-brand-500/10"
              >
                <Minus size={20} />
              </button>
              <div className="text-2xl font-extrabold">{cycleDay}</div>
              <button
                type="button"
                onClick={() => setCycleDay((d) => Math.min(28, d + 1))}
                className="p-2 rounded-lg text-brand-300 hover:bg-brand-500/10"
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-[11px] text-ink-muted">
              Le 1er round aura lieu le prochain {cycleDay} du mois.
            </p>
          </Card>
        </div>

        {/* Récap sticky */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <Card padding="lg">
            <h3 className="text-sm font-bold mb-3">Aperçu</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Pot mensuel</span>
                <span className="text-brand-300 font-extrabold">{formatPrice(pot)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Durée totale</span>
                <span className="font-semibold">{members} mois</span>
              </div>
              <div className="h-px bg-bg-border my-2" />
              <div className="flex justify-between">
                <span className="text-ink-muted">Vous verserez au total</span>
                <span className="font-semibold">{formatPrice(monthlyN * members)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Vous recevrez (1×)</span>
                <span className="font-semibold">{formatPrice(pot)}</span>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted mt-4 leading-relaxed">
              Après création, vous recevrez un code à partager pour inviter
              {' '}{members - 1} autres personnes. La tontine démarre quand le
              quota de {members} membres est atteint.
            </p>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={busy}
              icon={CheckCircle2}
              className="mt-4"
              onClick={submit}
            >
              Créer la tontine
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
