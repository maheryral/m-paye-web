import { Check, Globe, Lock, Sparkles, Wallet, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Texte petit en bas du formulaire, ex: lien "Pas encore de compte ? S'inscrire" */
  footer?: ReactNode;
}

const HIGHLIGHTS = [
  { icon: Zap, label: 'Transferts instantanés et gratuits entre comptes M\'Paye' },
  { icon: Lock, label: 'Sécurité bancaire, chiffrement de bout en bout' },
  { icon: Sparkles, label: 'Cashback 5% sur chaque paiement marchand' },
  { icon: Globe, label: 'Disponible partout à Madagascar, 24h/24' },
];

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-ink flex">
      {/* ───── Form pane ───── */}
      <div className="flex-1 flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link to="/auth/login" className="inline-flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand shadow-glow-soft flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div className="text-base font-bold">M'Paye</div>
        </Link>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm space-y-6 my-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-ink-muted mt-2">{subtitle}</p>
              )}
            </div>

            {children}

            {footer && (
              <div className="text-center text-sm text-ink-muted pt-2">{footer}</div>
            )}
          </div>
        </div>

        <p className="text-xs text-ink-dim text-center">
          © {new Date().getFullYear()} M'Paye · Wallet Pro
        </p>
      </div>

      {/* ───── Brand pane (hidden on mobile) ───── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-balance text-white">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" aria-hidden />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-white/[0.04]" />

        <div className="relative flex flex-col justify-center px-12 xl:px-20 w-full max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm w-fit mb-6">
            <Sparkles size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Nouveau</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight mb-4">
            La banque mobile<br />
            <span className="text-white/80">qui change tout.</span>
          </h2>
          <p className="text-base text-white/80 leading-relaxed mb-10 max-w-md">
            Envoyez, recevez et gérez votre argent en toute simplicité.
            Une seule app pour tous vos paiements quotidiens.
          </p>

          <ul className="space-y-4">
            {HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="text-sm leading-relaxed pt-1.5">{h.label}</div>
                </li>
              );
            })}
          </ul>

          {/* Floating proof card */}
          <div className="mt-12 inline-flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-fit">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((c) => (
                <div
                  key={c}
                  className="w-9 h-9 rounded-full bg-gradient-brand border-2 border-white/20 flex items-center justify-center text-xs font-bold"
                >
                  {c}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Check size={12} />
                <span className="text-xs font-bold">+ 100K utilisateurs</span>
              </div>
              <div className="text-[11px] text-white/70">
                nous font déjà confiance
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
