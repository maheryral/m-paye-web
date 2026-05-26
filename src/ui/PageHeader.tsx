import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Boutons d'action à droite (Button[]) */
  actions?: ReactNode;
  /** Onglets ou filtres affichés sous le titre */
  tabs?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, tabs }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-muted mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </header>
  );
}
