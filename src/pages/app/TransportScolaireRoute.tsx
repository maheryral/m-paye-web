// src/pages/app/TransportScolaireRoute.tsx — détail route + flow d'abonnement (web)

import {
  AlertCircle,
  Bus,
  Calendar,
  Check,
  Clock,
  Loader2,
  MapPin,
  School,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  transportScolaireApi,
  type RoutePricingPlan,
  type Student,
  type TransportRoutePublic,
} from '../../services/transportScolaireApi';

const DAYS: Record<string, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mer', THU: 'Jeu', FRI: 'Ven', SAT: 'Sam', SUN: 'Dim',
};

export default function TransportScolaireRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colors = useColors();
  const { fetchBalance } = useWallet();

  const [route, setRoute] = useState<TransportRoutePublic | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<RoutePricingPlan | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [r, s] = await Promise.all([
          transportScolaireApi.getRoute(id),
          transportScolaireApi.listStudents(),
        ]);
        setRoute(r.data);
        setStudents((s.data ?? []).filter((x) => x.isActive));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }
  if (!route) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p style={{ color: colors.text }}>Route introuvable</p>
        <button
          onClick={() => navigate('/transport-scolaire/schools')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Retour aux écoles
        </button>
      </div>
    );
  }

  const jours = (route.joursDesservis ?? []).map((d) => DAYS[d] ?? d).join(' · ');
  const capacityLeft = route.capaciteRestante ?? Math.max(0, route.capaciteMax - (route._count?.subscriptions ?? 0));

  const handlePickPlan = (plan: RoutePricingPlan) => {
    if (students.length === 0) {
      if (confirm("Vous n'avez pas encore d'enfant enregistré. Ajouter maintenant ?")) {
        navigate('/transport-scolaire/students');
      }
      return;
    }
    setSelectedPlan(plan);
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title={route.nom}
          subtitle={`${route.school?.nom ?? ''} · ${route.school?.ville ?? ''}`}
          RightIcon={Bus}
        />

        <div className="px-4 mt-6 space-y-4">
          {/* Hero école */}
          <div
            className="rounded-2xl p-5 text-white flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primary}dd)` }}
          >
            {route.school?.logoUrl ? (
              <img src={route.school.logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <School className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{route.school?.nom}</p>
              <p className="text-sm text-white/80 truncate">{route.school?.ville}</p>
            </div>
          </div>

          {/* Infos */}
          <div className="card p-4 space-y-3">
            <InfoRow icon={Clock} label="Horaires" value={`${route.heureDepartMatin ?? '—'} → ${route.heureRetourSoir ?? '—'}`} colors={colors} />
            <InfoRow icon={Calendar} label="Jours" value={jours || 'Non précisé'} colors={colors} />
            <InfoRow
              icon={Users}
              label="Capacité"
              value={`${capacityLeft} place(s) restante(s) / ${route.capaciteMax}`}
              colors={colors}
              danger={capacityLeft === 0}
            />
          </div>

          {/* Arrêts */}
          {route.stops.length > 0 && (
            <div className="card p-4">
              <p className="font-semibold mb-3" style={{ color: colors.text }}>
                Arrêts ({route.stops.length})
              </p>
              <div className="space-y-3">
                {route.stops.map((stop, idx) => (
                  <div key={stop.id} className="flex items-center gap-3 relative">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: colors.primary }}
                    >
                      {stop.ordre}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: colors.text }}>
                        {stop.nom}
                      </p>
                      {stop.heurePassage && (
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          {stop.heurePassage}
                        </p>
                      )}
                    </div>
                    {idx < route.stops.length - 1 && (
                      <div
                        className="absolute left-[13px] top-7 bottom-[-12px] w-0.5"
                        style={{ background: colors.border }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plans tarifaires */}
          <div>
            <p className="font-semibold mb-3 px-1" style={{ color: colors.text }}>
              Formules disponibles
            </p>
            {route.pricingPlans.length === 0 ? (
              <div className="card p-6 text-center" style={{ color: colors.textSecondary }}>
                Aucune formule active pour cette route.
              </div>
            ) : (
              <div className="space-y-3">
                {route.pricingPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onClick={() => handlePickPlan(plan)}
                    disabled={capacityLeft === 0}
                    colors={colors}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPlan && route && (
        <SubscribeModal
          plan={selectedPlan}
          route={route}
          students={students}
          onClose={() => setSelectedPlan(null)}
          onDone={async () => {
            setSelectedPlan(null);
            void fetchBalance?.();
            navigate('/transport-scolaire/my-subscriptions');
          }}
          colors={colors}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────

function InfoRow({
  icon: Icon, label, value, colors, danger,
}: any) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" style={{ color: danger ? colors.error : colors.textSecondary }} />
      <div className="flex-1">
        <p className="text-xs" style={{ color: colors.textSecondary }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: danger ? colors.error : colors.text }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  plan, onClick, disabled, colors,
}: {
  plan: RoutePricingPlan;
  onClick: () => void;
  disabled?: boolean;
  colors: any;
}) {
  const fratrie = plan.maxStudents > 1;
  const dureeLabel =
    plan.category === 'MONTHLY'
      ? `${Math.max(1, Math.round(plan.dureeJours / 30))} mois`
      : plan.category === 'QUARTERLY'
        ? `${Math.max(1, Math.round(plan.dureeJours / 90))} trimestre`
        : plan.category === 'PER_TRIP'
          ? '1 trajet'
          : `${plan.dureeJours} jour(s)`;

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`card p-4 w-full text-left relative ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
      style={fratrie ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
    >
      {fratrie && (
        <div
          className="absolute -top-2.5 right-3 px-2 py-0.5 rounded text-[10px] font-bold text-white"
          style={{ background: colors.primary }}
        >
          FRATRIE
        </div>
      )}
      <p className="font-bold mb-1" style={{ color: colors.text }}>
        {plan.label}
      </p>
      {plan.description && (
        <p className="text-xs mb-2" style={{ color: colors.textSecondary }}>
          {plan.description}
        </p>
      )}
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-extrabold" style={{ color: colors.primary }}>
          {Number(plan.prix).toLocaleString('fr-FR')} Ar
        </p>
        <p className="text-xs text-right" style={{ color: colors.textSecondary }}>
          {dureeLabel}
          <br />
          {plan.minStudents === plan.maxStudents
            ? `${plan.minStudents} enfant`
            : `${plan.minStudents}-${plan.maxStudents} enfants`}
        </p>
      </div>
    </button>
  );
}

function SubscribeModal({
  plan, route, students, onClose, onDone, colors,
}: {
  plan: RoutePricingPlan;
  route: TransportRoutePublic;
  students: Student[];
  onClose: () => void;
  onDone: () => void;
  colors: any;
}) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [pickupStopId, setPickupStopId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'paying' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const c = selectedStudentIds.size;
    return c >= plan.minStudents && c <= plan.maxStudents;
  }, [selectedStudentIds, plan]);

  const toggleStudent = (sid: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedStudentIds(next);
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await transportScolaireApi.createSubscription({
        routeId: route.id,
        pricingPlanId: plan.id,
        studentIds: Array.from(selectedStudentIds),
        pickupStopId: pickupStopId ?? undefined,
      });
      setCreatedId(res.data.id);
      setStep('paying');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Création échouée');
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!createdId) return;
    setSubmitting(true);
    setError(null);
    try {
      await transportScolaireApi.paySubscription(createdId);
      setStep('done');
      setTimeout(onDone, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Paiement échoué');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <p className="font-semibold text-slate-900">
            {step === 'form' ? "Confirmer l'abonnement"
              : step === 'paying' ? 'Paiement'
              : 'Confirmé'}
          </p>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-bold text-lg mb-1">Abonnement activé ✅</p>
            <p className="text-sm text-slate-600">Redirection vers Mes abonnements…</p>
          </div>
        ) : step === 'paying' ? (
          <div className="p-6 space-y-4">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: `${colors.primary}15` }}
            >
              <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Montant</p>
              <p className="text-3xl font-bold" style={{ color: colors.primary }}>
                {Number(plan.prix).toLocaleString('fr-FR')} Ar
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Débité de votre wallet M'Paye
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Paiement…
                </>
              ) : (
                'Payer maintenant'
              )}
            </button>
            <button
              onClick={onDone}
              disabled={submitting}
              className="w-full py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Payer plus tard
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Résumé du plan */}
              <div
                className="rounded-xl p-4 text-center border"
                style={{ borderColor: colors.border, background: `${colors.primary}08` }}
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider">Formule</p>
                <p className="font-bold mt-1">{plan.label}</p>
                <p className="text-2xl font-extrabold mt-2" style={{ color: colors.primary }}>
                  {Number(plan.prix).toLocaleString('fr-FR')} Ar
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {plan.minStudents === plan.maxStudents
                    ? `${plan.minStudents} enfant${plan.minStudents > 1 ? 's' : ''}`
                    : `${plan.minStudents} à ${plan.maxStudents} enfants`}
                  {' · '}
                  {plan.dureeJours} jour{plan.dureeJours > 1 ? 's' : ''}
                </p>
              </div>

              {/* Sélection enfants */}
              <div>
                <p className="font-semibold text-sm text-slate-900 mb-2">
                  Enfant(s) à abonner
                </p>
                <div className="space-y-2">
                  {students.map((s) => {
                    const sel = selectedStudentIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          sel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            sel ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                          }`}
                        >
                          {sel && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">
                            {s.prenom} {s.nom}
                          </p>
                          {s.classe && (
                            <p className="text-xs text-slate-500">{s.classe}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Choix arrêt */}
              {route.stops.length > 0 && (
                <div>
                  <p className="font-semibold text-sm text-slate-900 mb-2">
                    Arrêt de prise en charge
                  </p>
                  <div className="space-y-1">
                    <StopRadio
                      label="Pas d'arrêt précis"
                      sub="Voir avec le chauffeur"
                      selected={pickupStopId === null}
                      onClick={() => setPickupStopId(null)}
                    />
                    {route.stops.map((s) => (
                      <StopRadio
                        key={s.id}
                        label={`${s.ordre}. ${s.nom}`}
                        sub={s.heurePassage ?? undefined}
                        selected={pickupStopId === s.id}
                        onClick={() => setPickupStopId(s.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t">
              <button
                onClick={handleCreate}
                disabled={!canSubmit || submitting}
                className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                style={{
                  background: canSubmit ? colors.primary : '#cbd5e1',
                  opacity: submitting ? 0.6 : 1,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : canSubmit ? (
                  `Confirmer (${selectedStudentIds.size} enfant${selectedStudentIds.size > 1 ? 's' : ''})`
                ) : (
                  `Sélectionner ${plan.minStudents}${
                    plan.maxStudents !== plan.minStudents ? ` à ${plan.maxStudents}` : ''
                  } enfant${plan.maxStudents > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StopRadio({
  label, sub, selected, onClick,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-blue-500' : 'border-slate-300'
        }`}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-900">{label}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      <MapPin className="w-4 h-4 text-slate-400" />
    </button>
  );
}
