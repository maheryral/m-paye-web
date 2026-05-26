import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Phone,
  Search,
  Send,
  Sparkles,
  Star,
  User as UserIcon,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';
import { useWallet } from '../../contexts/WalletContext';
import { beneficiaryService, transactionService } from '../../services/api';
import {
  monetizationApi,
  type FeeCalculation,
} from '../../services/monetizationApi';
import { Avatar, Badge, Button, Card, Empty, Input, PageHeader } from '../../ui';

interface UserSuggestion {
  id: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

interface SavedBeneficiary {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isFavorite: boolean;
  lastAmount?: number;
}

const MIN = 1000;
const MAX = 5_000_000;

export default function Transfers() {
  const navigate = useNavigate();
  const { formatCurrency } = useLocale();
  const { balance, fetchBalance } = useWallet();

  const [recipient, setRecipient] = useState<UserSuggestion | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [amount, setAmount] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [success, setSuccess] = useState<{ amt: number; to: string } | null>(null);

  const [feeCalc, setFeeCalc] = useState<FeeCalculation | null>(null);

  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>([]);

  // Load beneficiaries on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await beneficiaryService.list();
        setBeneficiaries(Array.isArray(data) ? data : []);
      } catch {
        setBeneficiaries([]);
      }
    })();
  }, []);

  // Live fee calculation
  const amountNum = useMemo(() => parseFloat(amount) || 0, [amount]);
  useEffect(() => {
    if (!amountNum) {
      setFeeCalc(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await monetizationApi.calculateFee('TRANSFER', amountNum);
        setFeeCalc(r.data);
      } catch {
        setFeeCalc(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [amountNum]);

  const fee = feeCalc?.feeAmount ?? 0;
  const feePct = feeCalc ? `${(feeCalc.feePercent * 100).toFixed(2)}%` : '0%';
  const total = amountNum + fee;
  const hasBalance = total <= balance;
  const isAmountOk = amountNum >= MIN && amountNum <= MAX;
  const canSend = !!recipient && !!amount && isAmountOk && hasBalance;

  // Autocomplete search
  const onQueryChange = (val: string) => {
    setQuery(val);
    setRecipient(null);
    if (queryTimer.current) clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => void doSearch(val), 250);
  };

  const doSearch = async (q: string) => {
    if (!q || q.length < 3) {
      setSuggestions([]);
      setShowSugg(false);
      return;
    }
    setSearching(true);
    try {
      const list = await transactionService.suggestUsers(q);
      setSuggestions(Array.isArray(list) ? list : []);
      setShowSugg(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const pickRecipient = (u: UserSuggestion) => {
    setRecipient(u);
    setQuery(u.email || u.telephone || '');
    setSuggestions([]);
    setShowSugg(false);
  };

  const pickFromBeneficiary = (b: SavedBeneficiary) => {
    const [prenom, ...rest] = b.name.split(' ');
    pickRecipient({
      id: b.id,
      prenom,
      nom: rest.join(' '),
      email: b.email,
      telephone: b.phone,
    });
  };

  const doSend = async () => {
    if (!recipient || !canSend) return;
    setLoading(true);
    try {
      const to = recipient.email || recipient.telephone || '';
      await transactionService.transfer({
        toPhone: to,
        amount: amountNum,
        motif: motif || 'Transfert M\'Paye',
      });
      await fetchBalance();
      setConfirmOpen(false);
      setSuccess({
        amt: amountNum,
        to: `${recipient.prenom || ''} ${recipient.nom || ''}`.trim() || to,
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec du transfert');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRecipient(null);
    setQuery('');
    setAmount('');
    setMotif('');
    setSuccess(null);
    setFeeCalc(null);
  };

  const favorites = beneficiaries.filter((b) => b.isFavorite).slice(0, 6);
  const recents = beneficiaries.filter((b) => !b.isFavorite).slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Envoyer de l'argent"
        subtitle="Transfert instantané et gratuit entre comptes M'Paye"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={Users}
            onClick={() => navigate('/beneficiaries')}
          >
            Gérer bénéficiaires
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Left: form (2/3) === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recipient */}
          <Card padding="md">
            <h3 className="text-sm font-bold mb-1">Destinataire</h3>
            <p className="text-xs text-ink-muted mb-4">
              Recherchez par nom, email ou numéro de téléphone
            </p>

            <div className="relative">
              <Input
                icon={Search}
                placeholder="Tapez au moins 3 caractères..."
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                autoComplete="off"
                iconEnd={searching ? Loader2 : undefined}
              />
              {showSugg && suggestions.length > 0 && !recipient && (
                <div className="absolute z-20 left-0 right-0 top-full mt-2 card shadow-elevated max-h-72 overflow-y-auto p-1">
                  {suggestions.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => pickRecipient(u)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-elevated text-left"
                    >
                      <Avatar name={`${u.prenom || ''} ${u.nom || ''}`.trim() || u.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {`${u.prenom || ''} ${u.nom || ''}`.trim() || 'Utilisateur'}
                        </div>
                        <div className="text-xs text-ink-muted truncate">
                          {u.email} {u.telephone ? `· ${u.telephone}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-ink-dim" />
                    </button>
                  ))}
                </div>
              )}
              {showSugg && !searching && suggestions.length === 0 && query.length >= 3 && !recipient && (
                <div className="absolute z-20 left-0 right-0 top-full mt-2 card p-3 text-center text-xs text-ink-muted">
                  Aucun utilisateur trouvé
                </div>
              )}
            </div>

            {/* Recipient validated chip */}
            {recipient && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-success-bg border border-success-500/30">
                <Avatar
                  name={`${recipient.prenom || ''} ${recipient.nom || ''}`.trim() || recipient.email}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-success-400" />
                    <span className="text-sm font-bold">
                      {`${recipient.prenom || ''} ${recipient.nom || ''}`.trim() || 'Bénéficiaire'}
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {recipient.email || recipient.telephone}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRecipient(null);
                    setQuery('');
                  }}
                  className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
                  aria-label="Retirer"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </Card>

          {/* Amount + motif */}
          <Card padding="md">
            <h3 className="text-sm font-bold mb-4">Montant & motif</h3>

            <div>
              <label className="label">Montant à envoyer</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0"
                  className="input text-3xl font-bold py-4 pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-base font-semibold">
                  Ar
                </span>
              </div>

              <div className="flex justify-between text-xs mt-2">
                <span className="text-ink-dim">
                  Min : {MIN.toLocaleString('fr-FR')} Ar · Max : {MAX.toLocaleString('fr-FR')} Ar
                </span>
                {amount && !isAmountOk && (
                  <span className="text-danger-400 font-semibold">
                    Montant hors limites
                  </span>
                )}
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {[5000, 10000, 25000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(String(preset))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-elevated border border-bg-border hover:border-brand-500/50 hover:text-brand-300"
                  >
                    {preset.toLocaleString('fr-FR')} Ar
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <Input
                label="Motif (optionnel)"
                icon={FileText}
                placeholder="Remboursement, cadeau, salaire..."
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                maxLength={120}
              />
            </div>
          </Card>

          {/* Submit button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSend}
            icon={Send}
            onClick={() => setConfirmOpen(true)}
          >
            Continuer
            {amount && isAmountOk && (
              <span className="ml-1 opacity-80">
                · {amountNum.toLocaleString('fr-FR')} Ar
              </span>
            )}
          </Button>
        </div>

        {/* === Right rail (1/3) === */}
        <div className="space-y-4">
          {/* Live receipt */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-brand-300" />
              <h3 className="text-sm font-bold">Aperçu</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <Row label="Solde" value={formatCurrency(balance)} mute />
              <div className="h-px bg-bg-border" />
              <Row
                label="Montant"
                value={amount ? `${amountNum.toLocaleString('fr-FR')} Ar` : '—'}
              />
              <Row
                label={`Frais (${feePct})`}
                value={
                  fee > 0 ? (
                    <span className="text-warning-400">
                      {fee.toLocaleString('fr-FR')} Ar
                    </span>
                  ) : (
                    <span className="text-success-400">Gratuit ✨</span>
                  )
                }
              />
              {feeCalc?.appliedRule && (
                <div className="text-[10px] text-ink-dim -mt-1">
                  {feeCalc.appliedRule}
                </div>
              )}
              <div className="h-px bg-bg-border" />
              <Row
                label="Total débité"
                value={
                  <span
                    className={`font-bold text-base ${
                      hasBalance ? 'text-ink' : 'text-danger-400'
                    }`}
                  >
                    {total > 0 ? `${total.toLocaleString('fr-FR')} Ar` : '—'}
                  </span>
                }
                bold
              />
              {!hasBalance && amount && (
                <div className="text-[11px] text-danger-400 font-semibold mt-1">
                  Solde insuffisant
                </div>
              )}
            </div>
          </Card>

          {/* Favorites */}
          {favorites.length > 0 && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Star size={14} className="text-warning-400" fill="currentColor" />
                  Favoris
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {favorites.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => pickFromBeneficiary(b)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-bg-subtle"
                  >
                    <Avatar name={b.name} size="md" />
                    <span className="text-[10px] font-medium text-center truncate w-full">
                      {b.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recent beneficiaries */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Bénéficiaires</h3>
              <button
                onClick={() => navigate('/beneficiaries')}
                className="text-xs text-brand-300 font-semibold hover:text-brand-200"
              >
                Tout
              </button>
            </div>
            {recents.length === 0 ? (
              <Empty
                icon={Users}
                title="Aucun bénéficiaire"
                description="Ajoutez-en pour les retrouver ici"
                className="py-6"
              />
            ) : (
              <div className="space-y-1">
                {recents.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => pickFromBeneficiary(b)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-elevated text-left"
                  >
                    <Avatar name={b.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {b.name}
                      </div>
                      <div className="text-[10px] text-ink-muted truncate">
                        {b.phone}
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-ink-dim" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* === Confirmation modal === */}
      {confirmOpen && recipient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Confirmer le transfert</h3>
              <button
                onClick={() => setConfirmOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated mb-4">
              <Avatar
                name={`${recipient.prenom || ''} ${recipient.nom || ''}`.trim() || recipient.email}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-muted">Destinataire</div>
                <div className="text-base font-bold truncate">
                  {`${recipient.prenom || ''} ${recipient.nom || ''}`.trim() || 'Bénéficiaire'}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {recipient.email || recipient.telephone}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-sm mb-5">
              <Row
                label="Montant"
                value={`${amountNum.toLocaleString('fr-FR')} Ar`}
              />
              <Row
                label="Frais"
                value={
                  fee > 0 ? (
                    <span className="text-warning-400">
                      {fee.toLocaleString('fr-FR')} Ar
                    </span>
                  ) : (
                    <span className="text-success-400">Gratuit</span>
                  )
                }
              />
              {motif && <Row label="Motif" value={motif} />}
              <div className="h-px bg-bg-border my-2" />
              <Row
                label="Total"
                value={
                  <span className="font-bold text-base">
                    {total.toLocaleString('fr-FR')} Ar
                  </span>
                }
                bold
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={loading}
                icon={Check}
                onClick={doSend}
              >
                Confirmer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* === Success modal === */}
      {success && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full text-center animate-slide-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-4">
              <CheckCircle2 size={56} className="text-success-400" />
            </div>
            <div className="text-2xl font-bold mb-1">Transfert réussi !</div>
            <div className="text-3xl font-extrabold text-success-400 mb-2">
              {success.amt.toLocaleString('fr-FR')} Ar
            </div>
            <div className="text-sm text-ink-muted mb-6">
              envoyés à <span className="font-bold text-ink">{success.to}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => navigate('/dashboard')}
              >
                Tableau de bord
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={reset}
              >
                Nouveau transfert
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mute,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  mute?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${mute ? 'text-ink-dim' : 'text-ink-muted'} ${bold ? 'text-ink' : ''}`}>
        {label}
      </span>
      <span className={`text-right ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}
