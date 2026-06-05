// src/pages/app/TransportScolaireSchool.tsx — détail école → routes (web)

import { Bus, ChevronRight, Clock, Loader2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import {
  transportScolaireApi,
  type TransportRoutePublic,
  type SchoolPublic,
} from '../../services/transportScolaireApi';

const DAYS: Record<string, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mer', THU: 'Jeu', FRI: 'Ven', SAT: 'Sam', SUN: 'Dim',
};

export default function TransportScolaireSchool() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colors = useColors();

  const [routes, setRoutes] = useState<TransportRoutePublic[]>([]);
  const [school, setSchool] = useState<SchoolPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [r, all] = await Promise.all([
          transportScolaireApi.listRoutesOfSchool(id),
          transportScolaireApi.listSchools(),
        ]);
        setRoutes(r.data ?? []);
        setSchool((all.data ?? []).find((s) => s.id === id) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title={school?.nom ?? 'École'}
          subtitle={school?.ville ?? 'Transport scolaire'}
          RightIcon={Bus}
        />

        <div className="px-4 mt-6">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
            </div>
          ) : routes.length === 0 ? (
            <div className="card p-8 text-center">
              <Bus className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textSecondary }} />
              <p className="font-semibold mb-1" style={{ color: colors.text }}>
                Aucune route
              </p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Cette école n'a pas encore de bus scolaire configuré.
              </p>
            </div>
          ) : (
            <>
              <p
                className="text-xs font-medium mb-3"
                style={{ color: colors.textSecondary }}
              >
                {routes.length} ligne{routes.length > 1 ? 's' : ''} disponible
                {routes.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    onClick={() => navigate(`/transport-scolaire/routes/${route.id}`)}
                    colors={colors}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteCard({
  route, onClick, colors,
}: {
  route: TransportRoutePublic;
  onClick: () => void;
  colors: any;
}) {
  const subscribed = route._count?.subscriptions ?? 0;
  const capacityLeft = Math.max(0, route.capaciteMax - subscribed);
  const minPrix =
    route.pricingPlans.length > 0
      ? Math.min(...route.pricingPlans.map((p) => Number(p.prix)))
      : null;
  const jours = (route.joursDesservis ?? []).map((d) => DAYS[d] ?? d).join(' · ');

  const capColor =
    capacityLeft === 0 ? 'bg-red-100 text-red-700' :
    capacityLeft < 5 ? 'bg-amber-100 text-amber-700' :
    'bg-emerald-100 text-emerald-700';

  return (
    <button
      onClick={onClick}
      className="card p-4 w-full text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${colors.primary}20` }}
        >
          <Bus className="w-5 h-5" style={{ color: colors.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: colors.text }}>
            {route.nom}
          </p>
          {jours && (
            <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
              {jours}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${capColor}`}>
          {capacityLeft === 0 ? 'Complet' : `${capacityLeft} place${capacityLeft > 1 ? 's' : ''}`}
        </span>
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-bg-border text-xs" style={{ color: colors.textSecondary }}>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {route.heureDepartMatin ?? '—'} → {route.heureRetourSoir ?? '—'}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {route.stops.length} arrêt{route.stops.length > 1 ? 's' : ''}
        </div>
        {minPrix != null && (
          <div className="ml-auto flex items-center gap-1 font-semibold" style={{ color: colors.primary }}>
            dès {minPrix.toLocaleString('fr-FR')} Ar
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </button>
  );
}
