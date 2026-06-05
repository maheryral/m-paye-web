// src/pages/app/TransportScolaireSchools.tsx — recherche écoles (web)

import { ChevronRight, Loader2, School, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import {
  transportScolaireApi,
  type SchoolPublic,
} from '../../services/transportScolaireApi';

export default function TransportScolaireSchools() {
  const colors = useColors();
  const navigate = useNavigate();
  const [items, setItems] = useState<SchoolPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    transportScolaireApi
      .listSchools()
      .then((r) => setItems(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) => s.nom.toLowerCase().includes(q) || s.ville.toLowerCase().includes(q),
    );
  }, [items, query]);

  const byCity = useMemo(() => {
    const map = new Map<string, SchoolPublic[]>();
    for (const s of filtered) {
      const arr = map.get(s.ville) ?? [];
      arr.push(s);
      map.set(s.ville, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title="Écoles" subtitle="Transport scolaire" RightIcon={School} />

        <div className="px-4 mt-6">
          {/* Search */}
          <div className="card p-3 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: colors.textSecondary }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher école ou ville…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.text }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1">
                <X className="w-4 h-4" style={{ color: colors.textSecondary }} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <School
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: colors.textSecondary }}
              />
              <p className="font-semibold mb-1" style={{ color: colors.text }}>
                Aucune école
              </p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {query ? 'Essayez un autre terme.' : 'Aucune école n\'est encore desservie.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {byCity.map(([ville, list]) => (
                <div key={ville}>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
                    style={{ color: colors.textSecondary }}
                  >
                    {ville}
                  </p>
                  <div className="space-y-2">
                    {list.map((school) => (
                      <button
                        key={school.id}
                        onClick={() => navigate(`/transport-scolaire/schools/${school.id}`)}
                        className="card p-3 w-full flex items-center gap-3 hover:shadow-md text-left"
                      >
                        {school.logoUrl ? (
                          <img src={school.logoUrl} alt="" className="w-11 h-11 rounded-lg object-cover" />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-lg flex items-center justify-center"
                            style={{ background: `${colors.primary}20` }}
                          >
                            <School className="w-5 h-5" style={{ color: colors.primary }} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: colors.text }}>
                            {school.nom}
                          </p>
                          {school.adresse && (
                            <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                              {school.adresse}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: colors.textSecondary }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
