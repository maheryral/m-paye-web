import * as Icons from 'lucide-react';
import { type LucideIcon, AppWindow, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billersApi, type PublicBiller } from '../../services/billersApi';
import { Card, Empty, PageHeader, Skeleton } from '../../ui';

/**
 * Page Services / Factures.
 *
 * Liste 100 % dynamique : c'est l'admin qui crée les types de service
 * (Factures, Voyage, …) et les billers (JIRAMA, Canal+, …) via
 * /super-admin/billers. L'app fetch /billers et les affiche groupés par type.
 *
 * Click sur un biller :
 *   - Web → navigate vers redirectPath (ex: /apps/jirama)
 *   - Mobile → ouvre redirectPath dans WebView plein écran (avec token)
 */
export default function Bills() {
  const navigate = useNavigate();
  const [billers, setBillers] = useState<PublicBiller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    billersApi
      .list()
      .then((list) => {
        if (!cancelled) setBillers(list);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.response?.data?.message || 'Impossible de charger les services');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Regroupe les billers par type (en respectant l'ordre du type, puis du biller). */
  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      { type: PublicBiller['serviceType']; items: PublicBiller[] }
    >();
    for (const b of billers) {
      const key = b.serviceType.id;
      const existing = groups.get(key);
      if (existing) existing.items.push(b);
      else groups.set(key, { type: b.serviceType, items: [b] });
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.type.sortOrder - b.type.sortOrder,
    );
  }, [billers]);

  function openBiller(b: PublicBiller) {
    const path = b.redirectPath;
    // Chemin relatif → navigation interne React Router.
    if (!/^https?:\/\//i.test(path)) {
      navigate(path);
      return;
    }
    // URL absolue : si même origin que le site → on navigate en interne
    // (extrait juste pathname+search+hash, pas de full reload). Sinon → nouvel onglet.
    try {
      const u = new URL(path);
      if (u.origin === window.location.origin) {
        navigate(u.pathname + u.search + u.hash);
        return;
      }
    } catch {
      /* URL malformée — on tombe sur window.open */
    }
    window.open(path, '_blank', 'noopener,noreferrer');
  }

  /** Résolution dynamique de l'icône lucide. Fallback sur AppWindow si introuvable. */
  function resolveIcon(name: string | null): LucideIcon {
    if (!name) return AppWindow;
    const Comp = (Icons as any)[name];
    return Comp ?? AppWindow;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Services & Factures"
        subtitle="Payez vos factures, voyagez, commandez à manger… sans quitter M'Paye"
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card padding="lg">
          <Empty
            icon={AppWindow}
            title="Erreur de chargement"
            description={error}
          />
        </Card>
      ) : grouped.length === 0 ? (
        <Card padding="lg">
          <Empty
            icon={AppWindow}
            title="Aucun service disponible"
            description="Revenez plus tard, ou contactez M'Paye pour proposer un service."
          />
        </Card>
      ) : (
        grouped.map((group) => {
          const TypeIcon = resolveIcon(group.type.iconName);
          const typeColor = group.type.color || '#6366F1';
          return (
            <section key={group.type.id} className="space-y-4">
              {/* Bandeau de type — large, coloré, séparateur visible */}
              <div className="flex items-center gap-3 pb-2 border-b border-bg-border">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: typeColor + '22' }}
                >
                  <TypeIcon size={22} style={{ color: typeColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold tracking-tight leading-tight">
                    {group.type.label}
                  </h2>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {group.items.length} service{group.items.length > 1 ? 's' : ''}{' '}
                    disponible{group.items.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.items.map((b) => {
                  const BillerIcon = resolveIcon(b.iconName);
                  const isExternal = /^https?:\/\//i.test(b.redirectPath);
                  return (
                    <button
                      key={b.id}
                      onClick={() => openBiller(b)}
                      className="group p-4 rounded-2xl border border-bg-border bg-bg-elevated hover:border-brand-500/60 hover:shadow-glow-soft transition text-left"
                    >
                      <div className="flex items-start justify-between mb-3">
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="w-11 h-11 rounded-xl object-contain bg-white p-1"
                          />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: b.color || '#6366F1' }}
                          >
                            <BillerIcon size={20} className="text-white" />
                          </div>
                        )}
                        {isExternal && (
                          <ExternalLink size={12} className="text-ink-dim mt-1" />
                        )}
                      </div>
                      <div className="text-sm font-bold leading-tight">
                        {b.name}
                      </div>
                      {b.description && (
                        <div className="text-[11px] text-ink-muted mt-1 line-clamp-2">
                          {b.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
