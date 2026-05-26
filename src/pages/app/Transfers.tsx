import {
  CheckCircle2,
  ChevronRight,
  DollarSign,
  FileText,
  Loader2,
  Search,
  Send,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { transactionService } from '../../services/api';
import { monetizationApi, type FeeCalculation } from '../../services/monetizationApi';

interface UserSuggestion {
  id: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 5_000_000;

export default function Transfers() {
  const navigate = useNavigate();
  const colors = useColors();
  const { formatCurrency } = useLocale();
  const { balance, fetchBalance } = useWallet();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [validatedRecipient, setValidatedRecipient] = useState<UserSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [toPhone, setToPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [motif, setMotif] = useState('');

  const [feeCalc, setFeeCalc] = useState<FeeCalculation | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const amountNum = useMemo(() => parseFloat(amount) || 0, [amount]);
  const fee = feeCalc?.feeAmount ?? 0;
  const feePercentLabel = feeCalc ? `${(feeCalc.feePercent * 100).toFixed(2)}%` : '0%';
  const totalDebit = amountNum + fee;
  const hasEnoughBalance = totalDebit <= balance;
  const isAmountValid = amountNum >= MIN_AMOUNT && amountNum <= MAX_AMOUNT;
  const isFormValid = !!validatedRecipient && !!amount && isAmountValid && hasEnoughBalance;

  // Fee calc debounced
  useEffect(() => {
    if (!amountNum) {
      setFeeCalc(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await monetizationApi.calculateFee('TRANSFER', amountNum);
        setFeeCalc(res.data);
      } catch {
        setFeeCalc(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [amountNum]);

  const fetchSuggestions = async (q: string) => {
    if (!q || q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    try {
      const list = await transactionService.suggestUsers(q);
      setSuggestions(Array.isArray(list) ? list : []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleToPhoneChange = (val: string) => {
    setToPhone(val);
    setValidatedRecipient(null);
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    suggestionTimer.current = setTimeout(() => fetchSuggestions(val), 250);
  };

  const pickRecipient = (r: UserSuggestion) => {
    setValidatedRecipient(r);
    setToPhone(r.email || r.telephone || '');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setToPhone('');
    setAmount('');
    setMotif('');
    setValidatedRecipient(null);
    setStep(1);
    setFeeCalc(null);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setStep(2);
    try {
      await transactionService.transfer({
        toPhone,
        amount: amountNum,
        motif: motif || 'Transfert MyWallet',
      });
      await fetchBalance();
      setStep(3);
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || 'Erreur lors du transfert');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-2xl mx-auto">
        <GradientHeader title="Transfert" subtitle={`Solde : ${formatCurrency(balance)}`} />

        {step === 1 && (
          <div className="px-5 mt-4 space-y-4">
            {/* Destinataire */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: colors.textSecondary }}>
                Email ou numéro de téléphone
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: colors.border, background: colors.card }}
              >
                <UserIcon size={20} style={{ color: colors.textSecondary }} />
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.text }}
                  placeholder="exemple@email.com ou 032 12 345 67"
                  value={toPhone}
                  onChange={(e) => handleToPhoneChange(e.target.value)}
                  autoCapitalize="none"
                />
                {searching && (
                  <Loader2 size={16} className="animate-spin" style={{ color: colors.primary }} />
                )}
              </div>

              {showSuggestions && suggestions.length > 0 && !validatedRecipient && (
                <div
                  className="mt-2 rounded-xl border overflow-hidden"
                  style={{ background: colors.card, borderColor: colors.border }}
                >
                  {suggestions.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => pickRecipient(u)}
                      className="w-full flex items-center gap-3 p-3 text-left border-b last:border-b-0 hover:bg-white/5"
                      style={{ borderColor: colors.border }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                        style={{ background: colors.primary }}
                      >
                        {(u.prenom?.[0] || u.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
                          {`${u.prenom || ''} ${u.nom || ''}`.trim() || 'Utilisateur'}
                        </div>
                        <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                          {u.email} {u.telephone ? `· ${u.telephone}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: colors.textSecondary }} />
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions &&
                suggestions.length === 0 &&
                !searching &&
                toPhone.length >= 3 &&
                !validatedRecipient && (
                  <div
                    className="mt-2 flex items-center gap-2 p-3 rounded-xl border"
                    style={{ background: colors.card, borderColor: colors.border }}
                  >
                    <Search size={16} style={{ color: colors.textSecondary }} />
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      Aucun utilisateur trouvé
                    </span>
                  </div>
                )}
            </div>

            {/* Bénéficiaire validé */}
            {validatedRecipient && (
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  background: `${colors.success}15`,
                  borderColor: colors.success,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={20} style={{ color: colors.success }} />
                  <span className="text-sm font-bold" style={{ color: colors.success }}>
                    Bénéficiaire validé
                  </span>
                </div>
                <div className="text-base font-semibold" style={{ color: colors.text }}>
                  {`${validatedRecipient.prenom || ''} ${validatedRecipient.nom || ''}`.trim()}
                </div>
                <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {validatedRecipient.email || validatedRecipient.telephone}
                </div>
              </div>
            )}

            {/* Montant */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: colors.textSecondary }}>
                Montant (Ar)
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: colors.border, background: colors.card }}
              >
                <DollarSign size={20} style={{ color: colors.textSecondary }} />
                <input
                  className="flex-1 bg-transparent outline-none text-lg font-semibold"
                  style={{ color: colors.text }}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="numeric"
                />
              </div>
              <div className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
                Min: {MIN_AMOUNT.toLocaleString('fr-FR')} Ar | Max: {MAX_AMOUNT.toLocaleString('fr-FR')} Ar
              </div>
              {amount && !isAmountValid && (
                <div className="text-red-400 text-xs mt-1">
                  Le montant doit être entre {MIN_AMOUNT.toLocaleString('fr-FR')} et{' '}
                  {MAX_AMOUNT.toLocaleString('fr-FR')} Ar
                </div>
              )}
            </div>

            {/* Aperçu des frais */}
            {amount && amountNum > 0 && isAmountValid && (
              <div className="card p-3.5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: colors.textSecondary }}>Montant</span>
                  <span style={{ color: colors.text }}>{amountNum.toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: colors.textSecondary }}>Frais ({feePercentLabel})</span>
                  <span style={{ color: fee > 0 ? colors.warning : colors.success }}>
                    {fee > 0 ? `${fee.toLocaleString('fr-FR')} Ar` : 'Gratuit ✨'}
                  </span>
                </div>
                {feeCalc?.appliedRule && (
                  <div className="text-[10px] -mt-1" style={{ color: colors.textSecondary }}>
                    {feeCalc.appliedRule}
                  </div>
                )}
                <div className="h-px" style={{ background: colors.border }} />
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: colors.text }}>
                    Total à débiter
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: hasEnoughBalance ? colors.primary : colors.error }}
                  >
                    {totalDebit.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
                {!hasEnoughBalance && (
                  <div className="text-red-400 text-xs">
                    Solde insuffisant. Solde disponible : {formatCurrency(balance)}
                  </div>
                )}
              </div>
            )}

            {/* Motif */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: colors.textSecondary }}>
                Motif (optionnel)
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: colors.border, background: colors.card }}
              >
                <FileText size={20} style={{ color: colors.textSecondary }} />
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.text }}
                  placeholder="Ex : Remboursement, Cadeau, Salaire..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                />
              </div>
            </div>

            {/* Récapitulatif */}
            {isFormValid && (
              <div
                className="p-3.5 rounded-xl border space-y-2"
                style={{
                  background: `${colors.primary}10`,
                  borderColor: colors.primary,
                }}
              >
                <div className="text-sm font-bold" style={{ color: colors.primary }}>
                  Récapitulatif du transfert
                </div>
                <SumRow label="Destinataire" value={`${validatedRecipient?.prenom || ''} ${validatedRecipient?.nom || ''}`.trim()} colors={colors} />
                <SumRow label="Contact" value={toPhone} colors={colors} />
                <SumRow label="Montant" value={`${amountNum.toLocaleString('fr-FR')} Ar`} colors={colors} bold />
                {motif && <SumRow label="Motif" value={motif} colors={colors} />}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white"
              style={{
                background: isFormValid ? colors.primary : '#475569',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Send size={20} />
                  Effectuer le transfert
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center pt-20 px-5">
            <Loader2 size={64} className="animate-spin mb-4" style={{ color: colors.primary }} />
            <div className="text-lg font-bold mb-1" style={{ color: colors.text }}>
              Transfert en cours...
            </div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Veuillez patienter
            </div>
            <div
              className="card mt-6 p-5 w-full max-w-sm text-center"
              style={{ borderColor: colors.border }}
            >
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                Détails du transfert
              </div>
              <div className="text-2xl font-extrabold mt-2" style={{ color: colors.text }}>
                {amountNum.toLocaleString('fr-FR')} Ar
              </div>
              <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                vers {validatedRecipient?.prenom || toPhone}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center pt-16 px-5">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
              style={{ background: `${colors.success}20` }}
            >
              <CheckCircle2 size={60} style={{ color: colors.success }} />
            </div>
            <div className="text-2xl font-extrabold mb-2" style={{ color: colors.text }}>
              Transfert réussi !
            </div>
            <div className="text-3xl font-extrabold" style={{ color: colors.success }}>
              {amountNum.toLocaleString('fr-FR')} Ar
            </div>
            <div className="text-sm mt-2" style={{ color: colors.textSecondary }}>
              envoyés à {validatedRecipient?.prenom || toPhone}
            </div>
            <div className="flex gap-3 mt-6 w-full max-w-sm">
              <button
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl font-semibold text-white"
                style={{ background: colors.primary }}
              >
                Nouveau transfert
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 rounded-xl font-semibold border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SumRow({
  label,
  value,
  colors,
  bold,
}: {
  label: string;
  value: string;
  colors: any;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: colors.textSecondary }}>{label}</span>
      <span style={{ color: colors.text, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
