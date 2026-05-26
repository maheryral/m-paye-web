import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Search,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import {
  taxiBrousseApi,
  type VoyageSearchResult,
} from '../../services/taxiBrousseApi';

function fmtPrice(n: number) {
  return `${Number(n || 0).toLocaleString('fr-FR')} Ar`;
}

function fmtDateTime(date: string, time: string) {
  try {
    const d = new Date(date);
    const dayStr = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    return `${dayStr} · ${time}`;
  } catch {
    return `${date} ${time}`;
  }
}

export default function TaxiBrousse() {
  const navigate = useNavigate();
  const colors = useColors();
  const [params, setParams] = useSearchParams();

  const [depart, setDepart] = useState(params.get('depart') || '');
  const [arrivee, setArrivee] = useState(params.get('arrivee') || '');
  const [date, setDate] = useState(params.get('date') || '');

  const [departSugg, setDepartSugg] = useState<string[]>([]);
  const [arriveeSugg, setArriveeSugg] = useState<string[]>([]);
  const [showDepartSugg, setShowDepartSugg] = useState(false);
  const [showArriveeSugg, setShowArriveeSugg] = useState(false);

  const [results, setResults] = useState<VoyageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const departTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arriveeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-search if URL has params
  useEffect(() => {
    if (depart && arrivee) {
      void doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSugg = async (q: string, field: 'depart' | 'arrivee') => {
    if (!q || q.length < 2) {
      if (field === 'depart') setDepartSugg([]);
      else setArriveeSugg([]);
      return;
    }
    try {
      const res = await taxiBrousseApi.suggestCities(q, field);
      const list = Array.isArray(res.data) ? res.data : [];
      if (field === 'depart') setDepartSugg(list);
      else setArriveeSugg(list);
    } catch {
      /* silencieux */
    }
  };

  const handleDepartChange = (v: string) => {
    setDepart(v);
    setShowDepartSugg(true);
    if (departTimer.current) clearTimeout(departTimer.current);
    departTimer.current = setTimeout(() => fetchSugg(v, 'depart'), 250);
  };

  const handleArriveeChange = (v: string) => {
    setArrivee(v);
    setShowArriveeSugg(true);
    if (arriveeTimer.current) clearTimeout(arriveeTimer.current);
    arriveeTimer.current = setTimeout(() => fetchSugg(v, 'arrivee'), 250);
  };

  const swap = () => {
    setDepart(arrivee);
    setArrivee(depart);
  };

  const doSearch = async () => {
    if (!depart.trim() || !arrivee.trim()) {
      alert('Veuillez renseigner ville de départ et destination');
      return;
    }
    setShowDepartSugg(false);
    setShowArriveeSugg(false);
    setLoading(true);
    setSearched(true);
    try {
      const res = await taxiBrousseApi.searchVoyages(
        depart.trim(),
        arrivee.trim(),
        date || undefined,
      );
      setResults(Array.isArray(res.data) ? res.data : []);
      // Persist in URL
      const next = new URLSearchParams();
      next.set('depart', depart.trim());
      next.set('arrivee', arrivee.trim());
      if (date) next.set('date', date);
      setParams(next, { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Recherche échouée');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Taxi-brousse"
          subtitle="Recherchez un voyage"
          RightIcon={Ticket}
          onRightPress={() => navigate('/taxi-brousse/reservations')}
        />

        <div className="px-5 mt-4 space-y-4">
          {/* Search card */}
          <div className="card p-4 space-y-3 relative">
            <div className="relative">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                Ville de départ
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: colors.border, background: colors.background }}
              >
                <MapPin size={18} style={{ color: colors.primary }} />
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.text }}
                  placeholder="Ex : Antananarivo"
                  value={depart}
                  onChange={(e) => handleDepartChange(e.target.value)}
                  onFocus={() => setShowDepartSugg(true)}
                  onBlur={() => setTimeout(() => setShowDepartSugg(false), 150)}
                />
              </div>
              {showDepartSugg && departSugg.length > 0 && (
                <div
                  className="absolute z-10 mt-1 w-full rounded-xl border overflow-hidden shadow-xl"
                  style={{ background: colors.card, borderColor: colors.border }}
                >
                  {departSugg.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      onMouseDown={() => {
                        setDepart(s);
                        setShowDepartSugg(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
                      style={{ color: colors.text }}
                    >
                      <MapPin size={14} style={{ color: colors.textSecondary }} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={swap}
              className="mx-auto flex items-center justify-center w-9 h-9 rounded-full -my-1"
              style={{ background: `${colors.primary}20`, color: colors.primary }}
              title="Inverser"
            >
              <ArrowRight size={16} className="rotate-90" />
            </button>

            <div className="relative">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                Destination
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: colors.border, background: colors.background }}
              >
                <MapPin size={18} style={{ color: '#10b981' }} />
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.text }}
                  placeholder="Ex : Toamasina"
                  value={arrivee}
                  onChange={(e) => handleArriveeChange(e.target.value)}
                  onFocus={() => setShowArriveeSugg(true)}
                  onBlur={() => setTimeout(() => setShowArriveeSugg(false), 150)}
                />
              </div>
              {showArriveeSugg && arriveeSugg.length > 0 && (
                <div
                  className="absolute z-10 mt-1 w-full rounded-xl border overflow-hidden shadow-xl"
                  style={{ background: colors.card, borderColor: colors.border }}
                >
                  {arriveeSugg.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      onMouseDown={() => {
                        setArrivee(s);
                        setShowArriveeSugg(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
                      style={{ color: colors.text }}
                    >
                      <MapPin size={14} style={{ color: colors.textSecondary }} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.textSecondary }}>
                Date (optionnel)
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: colors.border, background: colors.background }}
              >
                <Calendar size={18} style={{ color: colors.textSecondary }} />
                <input
                  type="date"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.text }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={doSearch}
              disabled={loading || !depart || !arrivee}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white mt-2"
              style={{
                background: depart && arrivee ? colors.primary : '#475569',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Search size={18} />
                  Rechercher
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {searched && !loading && (
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: colors.text }}>
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </h3>

              {results.length === 0 ? (
                <div className="card p-8 text-center">
                  <Search size={40} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    Aucun voyage trouvé pour cette recherche
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => navigate(`/taxi-brousse/voyage/${v.id}`)}
                      className="card w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                              style={{
                                background: `${colors.primary}20`,
                                color: colors.primary,
                              }}
                            >
                              {v.classe?.type || 'Standard'}
                            </span>
                            {v.cooperative?.nom && (
                              <span
                                className="text-[11px] truncate"
                                style={{ color: colors.textSecondary }}
                              >
                                {v.cooperative.nom}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: colors.text }}>
                            <MapPin size={14} style={{ color: colors.primary }} />
                            <span className="truncate">{v.villeDepart}</span>
                            <ArrowRight size={14} className="text-slate-500" />
                            <MapPin size={14} style={{ color: '#10b981' }} />
                            <span className="truncate">{v.villeArrivee}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs mt-2" style={{ color: colors.textSecondary }}>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {fmtDateTime(v.dateDepart, v.heureDepart)}
                            </span>
                            {v.dureeEstimee && <span>· {v.dureeEstimee}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs mt-1" style={{ color: colors.textSecondary }}>
                            {v.placesDisponibles && (
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                {v.placesDisponibles.placeLibre}/{v.voiture.capacite} places libres
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-extrabold" style={{ color: colors.primary }}>
                            {fmtPrice(v.prix)}
                          </div>
                          <ChevronRight size={18} className="ml-auto mt-1" style={{ color: colors.textSecondary }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* CTA réservations */}
          <button
            onClick={() => navigate('/taxi-brousse/reservations')}
            className="card flex items-center gap-3 p-3.5 w-full text-left hover:bg-white/5"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${colors.primary}20` }}
            >
              <Wallet size={20} style={{ color: colors.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: colors.text }}>
                Mes réservations
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                Vos voyages réservés et leur statut
              </div>
            </div>
            <ChevronRight size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>
      </div>
    </div>
  );
}
