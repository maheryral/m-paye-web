import { ArrowLeft, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Layout commun aux pages de mini-programs (`/apps/:slug`).
 *
 * Affichage plein écran (sans la sidebar globale), avec un header neutre
 * qui s'adapte selon le contexte :
 *   - ?source=mobile  → l'app a ouvert en WebView, on cache le bouton retour
 *                       (la navigation est gérée par l'app native)
 *   - sinon (web)     → bouton "Retour" navigue vers /bills
 *
 * Le mini-program enfant gère l'authentification :
 *   - source=mobile : utilise `?token=<jwt>` passé dans l'URL par l'app
 *   - source=web    : utilise les cookies / accessToken de la session web
 */
export default function MiniProgramLayout({
  children,
  title,
  accentColor,
}: {
  children: React.ReactNode;
  title: string;
  accentColor?: string;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isMobileWebView = params.get('source') === 'mobile';

  // Petit hack : on cache le scroll global du body pour éviter les double-bars
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-bg-base flex flex-col">
      <header
        className="flex items-center justify-between h-14 px-4 border-b border-bg-border shrink-0"
        style={accentColor ? { borderBottomColor: accentColor + '33' } : undefined}
      >
        {isMobileWebView ? (
          <span className="text-sm text-ink-muted">M'Paye</span>
        ) : (
          <button
            onClick={() => navigate('/bills')}
            className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
        )}

        <h1 className="text-sm font-bold tracking-tight">{title}</h1>

        {/* Espacement symétrique */}
        {isMobileWebView ? (
          <span className="w-6" />
        ) : (
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1 rounded hover:bg-bg-elevated text-ink-muted"
            title="Fermer"
          >
            <X size={16} />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
