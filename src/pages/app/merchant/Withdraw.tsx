import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpFromLine,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type BankAccount,
  type Withdrawal,
} from '../../../services/merchantApi';
import { Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../../ui';

const MIN_AMOUNT = 5000;
const MAX_AMOUNT = 5_000_000;

const STATUS_META: Record<
  string,
  { tone: 'warning' | 'brand' | 'success' | 'danger' | 'neutral'; label: string; icon: LucideIcon }
> = {
  PENDING: { tone: 'warning', label: 'En attente', icon: Clock },
  PROCESSING: { tone: 'brand', label: 'En cours', icon: RefreshCcw },
  APPROVED: { tone: 'success', label: 'Approuvé', icon: CheckCircle2 },
  COMPLETED: { tone: 'success', label: 'Versé', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', label: 'Rejeté', icon: XCircle },
  CANCELLED: { tone: 'neutral', label: 'Annulé', icon: Ban },
  EXPIRED: { tone: 'neutral', label: 'Expiré', icon: Hourglass },
  FAILED: { tone: 'danger', label: 'Échec', icon: XCircle },
};

// Frais : 1% min 500 Ar (aligné sur la grille backend par défaut)
function computeFee(amount: number): number {
  if (amount <= 0) return 0;
  return Math.max(Math.round(amount * 0.01), 500);
}

export default function MerchantWithdraw() {
  const { formatCurrency } = useLocale();

  const [balance, setBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add bank account modal
  const [addModal, setAddModal] = useState(false);
  const [newAcct, setNewAcct] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    iban: '',
  });
  const [savingAcct, setSavingAcct] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadingHistory(true);
    try {
      const [balRes, banksRes, histRes] = await Promise.all([
        merchantApi.getBalance(),
        merchantApi.listBankAccounts(),
        merchantApi.getWithdrawalHistory(1, 20),
      ]);
      setBalance(Number(balRes.data?.balance ?? 0));
      const banks = Array.isArray(banksRes.data) ? banksRes.data : [];
      setBankAccounts(banks);
      const def = banks.find((b) => b.isDefault) ?? banks[0];
      if (def) setSelectedBankId(def.id);
      const hist = histRes.data;
      setHistory(Array.isArray(hist) ? hist : (hist as any)?.items ?? []);
    } catch (e: any) {
      console.error('withdraw load:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const amt = parseFloat(amount) || 0;
  const fee = useMemo(() => computeFee(amt), [amt]);
  const net = Math.max(0, amt - fee);

  const validate = (): string | null => {
    if (!amt) return 'Montant requis';
    if (amt < MIN_AMOUNT) return `Minimum ${MIN_AMOUNT.toLocaleString('fr-FR')} Ar`;
    if (amt > MAX_AMOUNT) return `Maximum ${MAX_AMOUNT.toLocaleString('fr-FR')} Ar`;
    if (amt > balance) return 'Solde insuffisant';
    if (!selectedBankId) return 'Choisissez un compte bancaire';
    return null;
  };

  const submit = async () => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      await merchantApi.withdraw(amt, selectedBankId!);
      setAmount('');
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Échec de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const addBankAccount = async () => {
    if (
      !newAcct.bankName.trim() ||
      !newAcct.accountHolder.trim() ||
      !newAcct.accountNumber.trim()
    ) {
      alert('Banque, titulaire et numéro de compte requis');
      return;
    }
    setSavingAcct(true);
    try {
      await merchantApi.createBankAccount({
        bankName: newAcct.bankName.trim(),
        accountHolder: newAcct.accountHolder.trim(),
        accountNumber: newAcct.accountNumber.trim(),
        iban: newAcct.iban.trim() || undefined,
      });
      setNewAcct({ bankName: '', accountHolder: '', accountNumber: '', iban: '' });
      setAddModal(false);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec ajout compte');
    } finally {
      setSavingAcct(false);
    }
  };

  const removeBankAccount = async (id: string) => {
    if (!confirm('Supprimer ce compte bancaire ?')) return;
    try {
      await merchantApi.deleteBankAccount(id);
      if (selectedBankId === id) setSelectedBankId(null);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Suppression impossible');
    }
  };

  const setDefault = async (id: string) => {
    try {
      await merchantApi.setDefaultBankAccount(id);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Retraits"
        subtitle="Transférez votre solde marchand vers votre compte bancaire"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Left: form === */}
        <div className="lg:col-span-2 space-y-4">
          {/* Solde disponible */}
          <Card gradient padding="lg">
            <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
              <Wallet size={14} />
              Solde marchand
            </div>
            {loading ? (
              <Skeleton className="h-12 w-48 mt-3" />
            ) : (
              <div className="text-4xl md:text-5xl font-bold text-white tracking-tight mt-3">
                {formatCurrency(balance)}
              </div>
            )}
            <div className="text-xs text-white/70 mt-2">
              Disponible pour retrait immédiat
            </div>
          </Card>

          {/* Form retrait */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpFromLine size={18} className="text-brand-300" />
              <h3 className="text-base font-bold">Nouveau retrait</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Montant à retirer</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="0"
                    className="input text-2xl font-bold py-4 pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dim text-sm font-semibold">
                    Ar
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-ink-muted">
                    Min : {MIN_AMOUNT.toLocaleString('fr-FR')} Ar · Max : {MAX_AMOUNT.toLocaleString('fr-FR')} Ar
                  </span>
                  <button
                    onClick={() => setAmount(String(Math.floor(balance)))}
                    className="text-brand-300 font-semibold hover:underline"
                  >
                    Tout retirer
                  </button>
                </div>
              </div>

              {amt > 0 && (
                <div className="rounded-xl bg-bg-elevated p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Montant</span>
                    <span className="font-semibold">
                      {amt.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Frais (1% min 500)</span>
                    <span className="font-semibold text-warning-400">
                      − {fee.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-bg-border">
                    <span className="font-semibold">Vous recevrez</span>
                    <span className="font-bold text-success-400">
                      {net.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                </div>
              )}

              {/* Comptes bancaires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Compte de réception</label>
                  <button
                    onClick={() => setAddModal(true)}
                    className="text-xs font-semibold text-brand-300 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Ajouter
                  </button>
                </div>

                {bankAccounts.length === 0 ? (
                  <div className="rounded-xl border border-bg-border bg-bg-elevated p-4 text-center">
                    <Building2 size={24} className="mx-auto text-ink-muted mb-2" />
                    <div className="text-sm text-ink-muted">
                      Aucun compte bancaire enregistré
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      className="mt-3"
                      onClick={() => setAddModal(true)}
                    >
                      Ajouter un compte
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bankAccounts.map((b) => {
                      const selected = selectedBankId === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBankId(b.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                            selected
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-bg-border bg-bg-elevated hover:border-brand-500/40'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              selected ? 'bg-brand-500/30' : 'bg-bg-base'
                            }`}
                          >
                            <Building2
                              size={18}
                              className={selected ? 'text-brand-300' : 'text-ink-muted'}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate flex items-center gap-2">
                              {b.bankName}
                              {b.isDefault && (
                                <Star
                                  size={11}
                                  className="text-warning-400 fill-warning-400"
                                />
                              )}
                            </div>
                            <div className="text-[11px] text-ink-muted truncate">
                              {b.accountHolder} · {b.accountNumber}
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!b.isDefault && (
                              <button
                                onClick={() => setDefault(b.id)}
                                className="p-1.5 rounded-lg hover:bg-bg-base text-ink-muted hover:text-warning-400"
                                title="Définir par défaut"
                              >
                                <Star size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => removeBankAccount(b.id)}
                              className="p-1.5 rounded-lg hover:bg-bg-base text-ink-muted hover:text-danger-400"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
                disabled={!amt || !selectedBankId}
                icon={Check}
                onClick={submit}
              >
                Demander le retrait
                {amt > 0 && (
                  <span className="ml-1 opacity-80">
                    · {amt.toLocaleString('fr-FR')} Ar
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* === Right: history === */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Historique des retraits</h3>
            </div>
            {loadingHistory ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <Empty
                icon={ArrowUpFromLine}
                title="Aucun retrait"
                description="Vos demandes de retrait apparaîtront ici"
              />
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 -mr-1">
                {history.map((w) => {
                  const meta = STATUS_META[w.status] ?? STATUS_META.PENDING;
                  const StatusIcon = meta.icon;
                  return (
                    <div
                      key={w.id}
                      className="p-3 rounded-xl border border-bg-border bg-bg-elevated/40"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-ink-muted font-mono truncate">
                            {w.reference}
                          </div>
                          <div className="text-base font-bold mt-0.5">
                            {Number(w.amount).toLocaleString('fr-FR')} Ar
                          </div>
                        </div>
                        <Badge tone={meta.tone} icon={<StatusIcon size={10} />}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-muted">
                        <span>Net : {Number(w.netAmount ?? w.amount - (w.fee ?? 0)).toLocaleString('fr-FR')} Ar</span>
                        <span>
                          {new Date(w.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* === Modal ajout compte bancaire === */}
      {addModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-brand-300" />
                <div className="text-base font-bold">Ajouter un compte bancaire</div>
              </div>
              <button
                onClick={() => setAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-bg-elevated"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                label="Banque *"
                placeholder="BNI, BFV, BOA…"
                value={newAcct.bankName}
                onChange={(e) =>
                  setNewAcct({ ...newAcct, bankName: e.target.value })
                }
              />
              <Input
                label="Titulaire *"
                placeholder="Nom du titulaire"
                value={newAcct.accountHolder}
                onChange={(e) =>
                  setNewAcct({ ...newAcct, accountHolder: e.target.value })
                }
              />
              <Input
                label="Numéro de compte *"
                placeholder="00012 3456 78901234567"
                value={newAcct.accountNumber}
                onChange={(e) =>
                  setNewAcct({ ...newAcct, accountNumber: e.target.value })
                }
              />
              <Input
                label="IBAN (optionnel)"
                placeholder="MG46 0000 ..."
                value={newAcct.iban}
                onChange={(e) =>
                  setNewAcct({ ...newAcct, iban: e.target.value.toUpperCase() })
                }
              />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setAddModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={savingAcct}
                  onClick={addBankAccount}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
