import { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Star,
  Building2,
  X,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  merchantApi,
  type Withdrawal,
  type BankAccount,
} from '../../../services/merchantApi';
import { Badge, Button, Card, PageHeader, Skeleton } from '../../../ui';

const INPUT =
  'w-full bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export default function MerchantBalance() {
  const { formatCurrency } = useLocale();
  const [balance, setBalance] = useState<{
    balance: number;
    pendingBalance: number;
    totalReceived: number;
  } | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Ajout de compte
  const [showAcctForm, setShowAcctForm] = useState(false);
  const [acct, setAcct] = useState<Partial<BankAccount>>({});
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctErr, setAcctErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [b, w, a] = await Promise.all([
        merchantApi.getBalance(),
        merchantApi.getWithdrawalHistory(1, 30),
        merchantApi.listBankAccounts(),
      ]);
      setBalance(b.data);
      const list = Array.isArray(w.data)
        ? w.data
        : (w.data?.items ?? w.data?.withdrawals ?? []);
      setHistory(list);
      const accs = Array.isArray(a.data) ? a.data : [];
      setAccounts(accs);
      const def = accs.find((x) => x.isDefault) ?? accs[0];
      if (def) setBankAccountId(def.id);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function withdraw() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setErr('Montant invalide');
      return;
    }
    if (!bankAccountId) {
      setErr('Sélectionnez un compte bancaire');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await merchantApi.withdraw(amt, bankAccountId);
      setShowForm(false);
      setAmount('');
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Échec du retrait');
    } finally {
      setBusy(false);
    }
  }

  async function saveAccount() {
    if (!acct.bankName || !acct.accountNumber || !acct.accountHolder) {
      setAcctErr('Banque, numéro de compte et titulaire requis');
      return;
    }
    setAcctBusy(true);
    setAcctErr(null);
    try {
      await merchantApi.createBankAccount({
        label: acct.label || undefined,
        bankName: acct.bankName!,
        accountNumber: acct.accountNumber!,
        accountHolder: acct.accountHolder!,
        iban: acct.iban || undefined,
        bic: acct.bic || undefined,
      });
      setShowAcctForm(false);
      setAcct({});
      load();
    } catch (e: any) {
      setAcctErr(e?.response?.data?.message || 'Erreur');
    } finally {
      setAcctBusy(false);
    }
  }

  async function setDefaultAcct(id: string) {
    await merchantApi.setDefaultBankAccount(id);
    load();
  }
  async function removeAcct(id: string) {
    if (!confirm('Supprimer ce compte bancaire ?')) return;
    await merchantApi.deleteBankAccount(id);
    load();
  }

  const statusTone = (raw: string) => {
    const s = (raw || '').toUpperCase();
    return s === 'COMPLETED'
      ? 'success'
      : s === 'FAILED' || s === 'CANCELLED'
        ? 'danger'
        : 'warning';
  };
  const statusIcon = (raw: string) => {
    const s = (raw || '').toUpperCase();
    return s === 'COMPLETED' ? CheckCircle2 : s === 'FAILED' ? XCircle : Clock;
  };
  const statusLabel = (raw: string) => {
    const s = (raw || '').toUpperCase();
    return s === 'COMPLETED'
      ? 'Viré'
      : s === 'FAILED'
        ? 'Refusé'
        : s === 'CANCELLED'
          ? 'Annulé'
          : s === 'PROCESSING'
            ? 'En traitement'
            : 'En attente';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Solde & retraits"
        subtitle="Gérez vos revenus marchands"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={ArrowDownToLine}
            onClick={() => setShowForm(true)}
            disabled={!balance || balance.balance <= 0}
          >
            Retirer
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading || !balance ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <Card padding="md" className="sm:col-span-1">
              <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
                <Wallet size={14} /> Disponible
              </div>
              <div className="text-2xl font-bold text-success-400">
                {formatCurrency(balance.balance)}
              </div>
            </Card>
            <Card padding="md">
              <div className="text-xs text-ink-muted mb-1">En attente</div>
              <div className="text-2xl font-bold">
                {formatCurrency(balance.pendingBalance)}
              </div>
            </Card>
            <Card padding="md">
              <div className="text-xs text-ink-muted mb-1">Total reçu</div>
              <div className="text-2xl font-bold">
                {formatCurrency(balance.totalReceived)}
              </div>
            </Card>
          </>
        )}
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-bg-border">
          <h3 className="text-base font-bold">Historique des retraits</h3>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Aucun retrait
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {history.map((w) => {
              const Icon = statusIcon(w.status);
              return (
                <div key={w.id} className="flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-bg-elevated text-ink-muted flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {formatCurrency(w.amount)}
                    </div>
                    <div className="text-[11px] text-ink-dim">
                      {w.bankName || ''} {w.accountNumber || ''} ·{' '}
                      {new Date(w.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    {w.failureReason && (
                      <div className="text-[11px] text-danger-400">
                        {w.failureReason}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge tone={statusTone(w.status) as any}>
                      {statusLabel(w.status)}
                    </Badge>
                    {w.fee > 0 && (
                      <div className="text-[10px] text-ink-dim mt-1">
                        frais {formatCurrency(w.fee)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Comptes bancaires enregistrés */}
      <Card padding="none">
        <div className="p-4 border-b border-bg-border flex items-center justify-between">
          <h3 className="text-base font-bold">Comptes bancaires</h3>
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setAcct({});
              setAcctErr(null);
              setShowAcctForm(true);
            }}
          >
            Ajouter
          </Button>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Aucun compte enregistré. Ajoutez-en un pour retirer rapidement.
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {a.label || a.bankName}
                    {a.isDefault && <Badge tone="success">Par défaut</Badge>}
                  </div>
                  <div className="text-[11px] text-ink-dim">
                    {a.accountHolder} · {a.iban || a.accountNumber}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!a.isDefault && (
                    <button
                      onClick={() => setDefaultAcct(a.id)}
                      className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
                      title="Définir par défaut"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => removeAcct(a.id)}
                    className="p-1.5 rounded-lg hover:bg-danger-bg text-ink-muted hover:text-danger-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal retrait */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !busy && setShowForm(false)}
        >
          <Card
            padding="md"
            className="w-full max-w-md"
            onClick={(e: any) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-4">Demande de retrait</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Montant (disponible : {formatCurrency(balance?.balance ?? 0)})
                </label>
                <input
                  type="number"
                  className={INPUT}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Compte bancaire
                </label>
                {accounts.length === 0 ? (
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setAcct({});
                      setShowAcctForm(true);
                    }}
                    className="text-sm text-brand-300 hover:underline"
                  >
                    + Enregistrer un compte bancaire d'abord
                  </button>
                ) : (
                  <select
                    className={INPUT}
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {(a.label || a.bankName) +
                          ' · ' +
                          (a.iban || a.accountNumber)}
                        {a.isDefault ? ' (défaut)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {err && (
                <div className="text-xs text-danger-400 bg-danger-bg rounded-lg p-2">
                  {err}
                </div>
              )}
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={busy}
                disabled={accounts.length === 0}
                onClick={withdraw}
              >
                Confirmer le retrait
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal ajout compte bancaire */}
      {showAcctForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => !acctBusy && setShowAcctForm(false)}
        >
          <Card
            padding="md"
            className="w-full max-w-md my-8"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Nouveau compte bancaire</h3>
              <button
                onClick={() => setShowAcctForm(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                className={INPUT}
                placeholder="Libellé (ex: Compte principal)"
                value={acct.label ?? ''}
                onChange={(e) => setAcct({ ...acct, label: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Banque *"
                value={acct.bankName ?? ''}
                onChange={(e) => setAcct({ ...acct, bankName: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Titulaire du compte *"
                value={acct.accountHolder ?? ''}
                onChange={(e) =>
                  setAcct({ ...acct, accountHolder: e.target.value })
                }
              />
              <input
                className={INPUT}
                placeholder="Numéro de compte *"
                value={acct.accountNumber ?? ''}
                onChange={(e) =>
                  setAcct({ ...acct, accountNumber: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={INPUT}
                  placeholder="IBAN (optionnel)"
                  value={acct.iban ?? ''}
                  onChange={(e) => setAcct({ ...acct, iban: e.target.value })}
                />
                <input
                  className={INPUT}
                  placeholder="BIC (optionnel)"
                  value={acct.bic ?? ''}
                  onChange={(e) => setAcct({ ...acct, bic: e.target.value })}
                />
              </div>
              {acctErr && (
                <div className="text-xs text-danger-400 bg-danger-bg rounded-lg p-2">
                  {acctErr}
                </div>
              )}
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={acctBusy}
                onClick={saveAccount}
              >
                Enregistrer le compte
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
