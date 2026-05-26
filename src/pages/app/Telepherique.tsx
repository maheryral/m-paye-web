import {
  Cable,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Ticket,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { telepheriqueApi, type TLPLigne } from '../../services/telepheriqueApi';

const STATUT_META: Record<string, { color: string; label: string }> = {
  actif: { color: '#10b981', label: 'En service' },
  maintenance: { color: '#f59e0b', label: 'Maintenance' },
  ferme: { color: '#ef4444', label: 'Fermé' },
};

function statutMeta(s: string) {
  return STATUT_META[s?.toLowerCase()] || { color: '#9ca3af', label: s };
}

export default function Telepherique() {
  const navigate = useNavigate();
  const colors = useColors();
  const [lignes, setLignes] = useState<TLPLigne[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await telepheriqueApi.getLignes();
      setLignes(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('Erreur lignes:', e?.response?.data || e?.message);
      setLignes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Téléphérique"
          subtitle="Choisissez votre ligne"
          RightIcon={Ticket}
          onRightPress={() => navigate('/telepherique/tickets')}
        />

        <div className="px-5 mt-4 space-y-3">
          {/* Bandeau Mes tickets */}
          <button
            onClick={() => navigate('/telepherique/tickets')}
            className="card flex items-center gap-3 p-3.5 w-full text-left hover:bg-white/5"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${colors.primary}20` }}
            >
              <Ticket size={20} style={{ color: colors.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: colors.text }}>
                Mes tickets
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                Tickets actifs et historique
              </div>
            </div>
            <ChevronRight size={18} style={{ color: colors.textSecondary }} />
          </button>

          {/* Liste lignes */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : lignes.length === 0 ? (
            <div className="card p-8 text-center">
              <Cable size={40} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                Aucune ligne disponible pour le moment
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {lignes.map((l) => {
                const meta = statutMeta(l.statut);
                const couleur = l.couleur || colors.primary;
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/telepherique/ligne/${l.id}`)}
                    className="card w-full p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
                        style={{ background: couleur }}
                      >
                        {l.code || <Cable size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-sm font-bold truncate" style={{ color: colors.text }}>
                            {l.nom}
                          </div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${meta.color}20`, color: meta.color }}
                          >
                            {meta.label.toUpperCase()}
                          </span>
                        </div>
                        {l.description && (
                          <div className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                            {l.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: colors.textSecondary }}>
                          {l.longueurKm && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {l.longueurKm} km
                            </span>
                          )}
                          {l.dureeMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {l.dureeMinutes} min
                            </span>
                          )}
                          {l.stations && (
                            <span>{l.stations.length} stations</span>
                          )}
                          {(l.horaireOuverture || l.horaireFermeture) && (
                            <span>
                              {l.horaireOuverture || '—'} – {l.horaireFermeture || '—'}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: colors.textSecondary }} className="shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
