// src/pages/app/TransportScolaire.tsx — hub transport scolaire (web)

import { Bus, ChevronRight, CreditCard, School, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';

const ITEMS = [
  {
    label: 'Mes enfants',
    description: 'Gérer les enfants à abonner',
    icon: Users,
    color: '#3b82f6',
    route: '/transport-scolaire/students',
  },
  {
    label: 'Trouver une école',
    description: 'Voir les routes desservies',
    icon: School,
    color: '#10b981',
    route: '/transport-scolaire/schools',
  },
  {
    label: 'Mes abonnements',
    description: 'Voir / payer / annuler',
    icon: CreditCard,
    color: '#8b5cf6',
    route: '/transport-scolaire/my-subscriptions',
  },
];

const STEPS = [
  'Ajoutez vos enfants dans Mes enfants',
  'Trouvez l\'école dans Trouver une école',
  'Choisissez une route + une formule (mensuel, trimestriel, par trajet)',
  "Payez avec votre wallet M'Paye",
];

export default function TransportScolaire() {
  const navigate = useNavigate();
  const colors = useColors();

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Transport scolaire"
          subtitle="Bus scolaire pour vos enfants"
          RightIcon={Bus}
        />

        <div className="px-4 mt-6">
          {/* Hero */}
          <div
            className="rounded-2xl p-6 text-white mb-6"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primary}dd)` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">Bus scolaire</p>
                <p className="text-xs text-white/80">
                  Abonnement mensuel / trimestriel / par trajet
                </p>
              </div>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              Abonnez vos enfants au ramassage scolaire. Paiement en quelques
              clics depuis votre wallet M'Paye.
            </p>
          </div>

          {/* Hub cards */}
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className="card p-4 w-full flex items-center gap-3 hover:shadow-md transition-shadow text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}20` }}
                >
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: colors.text }}>
                    {item.label}
                  </p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: colors.textSecondary }}
                />
              </button>
            ))}
          </div>

          {/* Tutoriel */}
          <div className="card p-5 mt-6 space-y-3">
            <p className="font-semibold" style={{ color: colors.text }}>
              Comment ça marche ?
            </p>
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: `${colors.primary}20`,
                    color: colors.primary,
                  }}
                >
                  {i + 1}
                </div>
                <p className="text-sm flex-1" style={{ color: colors.textSecondary }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
