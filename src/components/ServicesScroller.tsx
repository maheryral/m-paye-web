// src/components/ServicesScroller.tsx
// Section dynamique du dashboard web :
//   1. Chips horizontaux : Home Apps + chaque type de service actif
//   2. Grille dessous : billers filtrés (Home Apps = essentiels)
//   3. Limite `maxItems` + tuile "Tout" qui navigue vers /bills

import * as Icons from 'lucide-react';
import {
  AppWindow,
  Grid3x3,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billersApi, type PublicBiller, type PublicServiceType } from '../services/billersApi';
import { Card } from '../ui';

const HOME_APPS_KEY = '__HOME_APPS__';

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return AppWindow;
  const Comp = (Icons as any)[name];
  return Comp ?? AppWindow;
}

export default function ServicesScroller({ maxItems = 7 }: { maxItems?: number }) {
  const navigate = useNavigate();
  const [billers, setBillers] = useState<PublicBiller[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>(HOME_APPS_KEY);

  useEffect(() => {
    let cancelled = false;
    billersApi
      .list()
      .then((list) => {
        if (!cancelled) setBillers(list);
      })
      .catch(() => {
        // silencieux : si erreur, section reste vide
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const types = useMemo<PublicServiceType[]>(() => {
    const seen = new Map<string, PublicServiceType>();
    for (const b of billers) {
      if (!seen.has(b.serviceType.id)) seen.set(b.serviceType.id, b.serviceType);
    }
    return Array.from(seen.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [billers]);

  const filtered = useMemo<PublicBiller[]>(() => {
    if (active === HOME_APPS_KEY) return billers.filter((b) => b.isEssential);
    return billers.filter((b) => b.serviceType.id === active);
  }, [billers, active]);

  const displayed = filtered.slice(0, maxItems);
  const showTout = filtered.length > 0;

  function openBiller(b: PublicBiller) {
    const path = b.redirectPath;
    if (!/^https?:\/\//i.test(path)) {
      navigate(path);
      return;
    }
    // Same-origin → navigation interne (pas de full reload)
    try {
      const u = new URL(path);
      if (u.origin === window.location.origin) {
        navigate(u.pathname + u.search + u.hash);
        return;
      }
    } catch {
      /* URL invalide */
    }
    window.open(path, '_blank', 'noopener,noreferrer');
  }

  // Le chip "Home Apps" reste affiché même quand aucun biller n'est encore
  // configuré, pour que la section soit présente visuellement de manière prévisible.
  if (loading) return null;

  return (
    <Card padding="md" className="space-y-4">
      {/* Chips : "Home Apps" reste fixe à gauche, les autres types scrollent
          horizontalement dans leur propre conteneur. */}
      <div className="flex items-center gap-2">
        <div className="shrink-0">
          <Chip
            label="Home Apps"
            icon={Star}
            color="#FBBF24"
            active={active === HOME_APPS_KEY}
            onClick={() => setActive(HOME_APPS_KEY)}
          />
        </div>
        {types.length > 0 && (
          <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
            {types.map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                icon={resolveIcon(t.iconName)}
                color={t.color || '#6366F1'}
                active={active === t.id}
                onClick={() => setActive(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-xs text-ink-muted">
          {active === HOME_APPS_KEY
            ? 'Aucun service essentiel pour le moment'
            : 'Aucun service dans cette catégorie'}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {displayed.map((b) => {
            const BillerIcon = resolveIcon(b.iconName);
            return (
              <button
                key={b.id}
                onClick={() => openBiller(b)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-bg-elevated transition group"
              >
                {b.logoUrl ? (
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition group-hover:scale-105"
                    style={{ background: b.color || '#6366F1' }}
                  >
                    <BillerIcon size={22} className="text-white" />
                  </div>
                )}
                <span className="text-[11px] font-semibold text-center line-clamp-1 max-w-[80px]">
                  {b.name}
                </span>
              </button>
            );
          })}

          {/* Tuile "Tout" */}
          {showTout && (
            <button
              onClick={() => navigate('/bills')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-bg-elevated transition group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-bg-border group-hover:border-brand-500 transition">
                <Grid3x3 size={22} className="text-brand-300" />
              </div>
              <span className="text-[11px] font-bold text-brand-300">Tout</span>
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function Chip({
  label,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border whitespace-nowrap text-xs transition ${
        active
          ? 'font-bold'
          : 'font-medium text-ink-muted border-bg-border hover:border-ink-dim'
      }`}
      style={
        active
          ? { background: color + '22', borderColor: color, color }
          : undefined
      }
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
