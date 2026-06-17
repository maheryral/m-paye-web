import {
  ArrowRight,
  ArrowUpDown,
  Bus,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const INPUT =
  'flex items-center gap-2 rounded-xl border border-bg-border bg-bg px-3 py-3';
const SUGG =
  'absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-bg-border bg-bg-surface shadow-xl';

export default function TaxiBrousse() {
  const navigate = useNavigate();
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

  // Prochains départs (à venir, places dispo) — affichés à droite par défaut
  const [upcoming, setUpcoming] = useState<VoyageSearchResult[]>([]);
  const [loadingUp, setLoadingUp] = useState(true);

  const departTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arriveeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (depart && arrivee) {
      void doSearch();
    }
    void loadUpcoming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUpcoming = async () => {
    setLoadingUp(true);
    try {
      const res = await taxiBrousseApi.searchVoyages('', '');
      const list = Array.isArray(res.data) ? res.data : [];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const filtered = list
        .filter((v) => (v.placesDisponibles?.placeLibre ?? 0) > 0)
        .filter((v) => {
          const d = new Date(v.dateDepart);
          return isNaN(d.getTime()) || d >= startOfToday;
        });
      setUpcoming(filtered);
    } catch {
      setUpcoming([]);
    } finally {
      setLoadingUp(false);
    }
  };

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

  // Carte voyage réutilisable (résultats + prochains départs)
  const renderVoyage = (v: VoyageSearchResult) => (
    <button
      key={v.id}
      onClick={() => navigate(`/taxi-brousse/voyage/${v.id}`)}
      className="w-full rounded-2xl border border-bg-border bg-bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">
            {v.classe?.type || 'Standard'}
          </span>
          {v.cooperative?.nom && (
            <span className="text-xs font-medium text-ink-muted">{v.cooperative.nom}</span>
          )}
        </div>
        <div className="shrink-0 text-xl font-extrabold text-brand-500">{fmtPrice(v.prix)}</div>
      </div>

      <div className="flex items-center gap-2 text-[15px] font-bold text-ink">
        <MapPin size={16} className="shrink-0 text-brand-500" />
        <span className="truncate">{v.villeDepart}</span>
        <span className="mx-1 hidden min-w-[16px] flex-1 border-t-2 border-dotted border-bg-border sm:block" />
        <ArrowRight size={15} className="shrink-0 text-ink-muted" />
        <MapPin size={16} className="shrink-0 text-emerald-500" />
        <span className="truncate">{v.villeArrivee}</span>
        <ChevronRight size={18} className="ml-auto shrink-0 text-ink-muted" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Calendar size={14} />
          {fmtDateTime(v.dateDepart, v.heureDepart)}
        </span>
        {v.dureeEstimee && <span>· {v.dureeEstimee}</span>}
      </div>

      {v.placesDisponibles && (
        <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-success">
          <Users size={14} />
          {v.placesDisponibles.placeLibre}/{v.voiture.capacite} places libres
        </div>
      )}
    </button>
  );

  // Prochains départs groupés par catégorie (classe.type)
  const grouped = upcoming.reduce<Record<string, VoyageSearchResult[]>>((acc, v) => {
    const k = v.classe?.type || 'Standard';
    (acc[k] = acc[k] || []).push(v);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped).sort();

  const CARD_GRID =
    'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))]';

  return (
    <div className="min-h-screen bg-bg pb-10">
      <div className="w-full px-5 pt-6 lg:px-8">
        {/* ═══ Header ═══ */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
              <Bus size={24} className="text-brand-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">Taxi-brousse</h1>
              <p className="text-sm text-ink-muted">Réservez vos prochains voyages</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/taxi-brousse/reservations')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-bg-border text-ink-muted transition hover:text-brand-500"
            title="Mes réservations"
          >
            <Ticket size={18} />
          </button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[420px_1fr]">
          {/* ═══ GAUCHE ═══ */}
          <div className="space-y-4 lg:sticky lg:top-4">
            {/* Carte recherche */}
            <div className="rounded-2xl border border-bg-border bg-bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-ink">Rechercher un voyage</h2>

              <div className="relative space-y-5">
                {/* Départ */}
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Ville de départ</label>
                  <div className={INPUT}>
                    <MapPin size={18} className="text-brand-500" />
                    <input
                      className="flex-1 bg-transparent text-sm text-ink outline-none"
                      placeholder="Ex : Antananarivo"
                      value={depart}
                      onChange={(e) => handleDepartChange(e.target.value)}
                      onFocus={() => setShowDepartSugg(true)}
                      onBlur={() => setTimeout(() => setShowDepartSugg(false), 150)}
                    />
                  </div>
                  {showDepartSugg && departSugg.length > 0 && (
                    <div className={SUGG}>
                      {departSugg.slice(0, 6).map((s) => (
                        <button
                          key={s}
                          onMouseDown={() => {
                            setDepart(s);
                            setShowDepartSugg(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-brand-500/5"
                        >
                          <MapPin size={14} className="text-ink-muted" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Bouton inverser */}
                  <button
                    type="button"
                    onClick={swap}
                    title="Inverser"
                    className="absolute -bottom-[26px] right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-bg-border bg-bg-surface text-brand-500 shadow-sm transition hover:bg-brand-500/10"
                  >
                    <ArrowUpDown size={16} />
                  </button>
                </div>

                {/* Destination */}
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Destination</label>
                  <div className={INPUT}>
                    <MapPin size={18} className="text-emerald-500" />
                    <input
                      className="flex-1 bg-transparent text-sm text-ink outline-none"
                      placeholder="Ex : Toamasina"
                      value={arrivee}
                      onChange={(e) => handleArriveeChange(e.target.value)}
                      onFocus={() => setShowArriveeSugg(true)}
                      onBlur={() => setTimeout(() => setShowArriveeSugg(false), 150)}
                    />
                  </div>
                  {showArriveeSugg && arriveeSugg.length > 0 && (
                    <div className={SUGG}>
                      {arriveeSugg.slice(0, 6).map((s) => (
                        <button
                          key={s}
                          onMouseDown={() => {
                            setArrivee(s);
                            setShowArriveeSugg(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-brand-500/5"
                        >
                          <MapPin size={14} className="text-ink-muted" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Date (optionnel)</label>
                  <div className={INPUT}>
                    <Calendar size={18} className="text-ink-muted" />
                    <input
                      type="date"
                      className="flex-1 bg-transparent text-sm text-ink outline-none"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={doSearch}
                  disabled={loading || !depart || !arrivee}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3.5 font-bold text-white shadow-glow-soft transition hover:brightness-110 disabled:opacity-60"
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
            </div>

            {/* Mes réservations */}
            <button
              onClick={() => navigate('/taxi-brousse/reservations')}
              className="flex w-full items-center gap-3 rounded-2xl border border-bg-border bg-bg-surface p-4 text-left shadow-sm transition hover:border-brand-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
                <Wallet size={20} className="text-brand-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ink">Mes réservations</div>
                <div className="text-xs text-ink-muted">Vos voyages réservés et leur statut</div>
              </div>
              <ChevronRight size={18} className="text-ink-muted" />
            </button>

            {/* Promo */}
            <div className="relative overflow-hidden rounded-2xl border border-brand-500/15 bg-gradient-brand-soft p-5">
              <h3 className="text-base font-bold text-ink">Voyagez en toute sérénité</h3>
              <p className="mt-1 max-w-[72%] text-xs text-ink-muted">
                Réservez facilement vos places en ligne et gagnez du temps.
              </p>
              <Bus size={92} className="pointer-events-none absolute -bottom-3 -right-2 text-brand-500/20" />
            </div>
          </div>

          {/* ═══ DROITE ═══ */}
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">
              {searched ? 'Résultats' : 'Prochains départs'}
            </h2>
            <p className="mb-4 text-sm text-ink-muted">
              {searched
                ? `${results.length} voyage${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`
                : 'Voyages à venir avec places disponibles'}
            </p>

            {searched ? (
              loading ? (
                <div className="flex justify-center rounded-2xl border border-bg-border bg-bg-surface p-12">
                  <Loader2 className="animate-spin text-brand-500" size={26} />
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-2xl border border-bg-border bg-bg-surface p-10 text-center">
                  <Search size={40} className="mx-auto mb-2 text-ink-muted" />
                  <div className="text-sm text-ink-muted">Aucun voyage trouvé pour cette recherche</div>
                </div>
              ) : (
                <div className={CARD_GRID}>{results.map(renderVoyage)}</div>
              )
            ) : loadingUp ? (
              <div className="flex justify-center rounded-2xl border border-bg-border bg-bg-surface p-12">
                <Loader2 className="animate-spin text-brand-500" size={26} />
              </div>
            ) : groupNames.length === 0 ? (
              <div className="rounded-2xl border border-bg-border bg-bg-surface p-10 text-center">
                <Bus size={40} className="mx-auto mb-2 text-ink-muted" />
                <div className="text-sm text-ink-muted">Aucun départ à venir pour le moment</div>
              </div>
            ) : (
              <div className="space-y-7">
                {groupNames.map((cat) => (
                  <div key={cat}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-500">
                        {cat}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {grouped[cat].length} voyage{grouped[cat].length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className={CARD_GRID}>{grouped[cat].map(renderVoyage)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
