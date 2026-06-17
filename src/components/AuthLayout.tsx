import { ArrowRight, ShieldCheck, TrendingUp, Wallet, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PhoneMockup from './PhoneMockup';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden lg:flex-row"
      style={{ background: 'linear-gradient(120deg, #1e3a8a 0%, #2563eb 40%, #4338ca 75%, #6d28d9 100%)' }}
    >
      {/* ===== Déco anguleuse (triangles + halos) ===== */}
      <div className="pointer-events-none absolute -left-32 -top-16 h-[130%] w-[42%] -rotate-12 bg-gradient-to-b from-fuchsia-500/40 via-blue-500/20 to-transparent" />
      <div className="auth-blob pointer-events-none absolute left-10 top-1/3 h-72 w-72 -rotate-12 bg-cyan-400/20 blur-2xl" />
      <div className="auth-blob-2 pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/[0.06] blur-2xl" />

      {/* ===== VISUEL (gauche) — déborde ===== */}
      <div className="relative hidden flex-1 items-center justify-center lg:flex">
        <Link to="/" className="absolute left-8 top-8 z-20 flex items-center gap-2.5 text-white transition hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Wallet size={18} />
          </div>
          <span className="text-lg font-extrabold tracking-tight">M'Paye</span>
        </Link>

        {/* "image" = maquette fidèle du dashboard mobile, inclinée, débordante et flottante */}
        <div className="auth-float relative -mt-24">
          <div className="relative -rotate-[8deg] drop-shadow-2xl">
            <PhoneMockup className="w-[310px]" />
            {/* mini-carte flottante */}
            <div className="absolute -bottom-4 -left-10 w-40 rotate-[10deg] rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur-md">
              <div className="text-[9px] font-bold uppercase tracking-wider text-white/70">Paiement reçu</div>
              <div className="mt-0.5 text-sm font-bold text-emerald-300">+ Ar 45 000</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FORMULAIRE (droite) — coupé en OBLIQUE ===== */}
      <div
        className="relative z-10 flex w-full flex-col justify-center bg-bg px-7 py-10 text-ink sm:px-12 lg:w-[52%] lg:py-12 lg:pl-[14%] lg:pr-16 lg:[clip-path:polygon(13%_0,100%_0,100%_100%,0_100%)]"
      >
        {/* marque haut-droite (façon "FUTBALMANIA") */}
        <Link to="/" className="mb-7 flex items-center gap-2 transition hover:opacity-80 lg:justify-end">
          <span className="text-xl font-black uppercase italic tracking-tight">
            M'<span className="text-brand-500">Paye</span>
          </span>
          <span className="h-5 w-1.5 -skew-x-[20deg] bg-gradient-brand" />
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="auth-rise" style={{ animationDelay: '60ms' }}>
            <h1 className="text-3xl font-black uppercase italic leading-[1.05] tracking-tight text-ink sm:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm not-italic text-ink-muted">{subtitle}</p>}
          </div>

          {/* le formulaire réel (inputs underline + bouton oblique via auth-skin) */}
          <div className="auth-skin auth-rise space-y-5" style={{ animationDelay: '180ms' }}>{children}</div>

          {footer && <div className="pt-1 text-center text-sm text-ink-muted">{footer}</div>}

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs text-ink-muted">
            <span className="flex items-center gap-1"><Zap size={12} className="text-brand-500" /> Instantané</span>
            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-brand-500" /> Sécurisé</span>
            <span className="flex items-center gap-1"><TrendingUp size={12} className="text-brand-500" /> 100% Ariary</span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-ink-dim">© {new Date().getFullYear()} M'Paye</p>
      </div>

      {/* CTA inscription flottant */}
      <a
        href="/auth/register"
        className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 lg:left-8"
      >
        Pas de compte ? <span className="font-bold">Inscrivez-vous</span> <ArrowRight size={13} />
      </a>

      {/* Skin oblique appliqué aux champs/boutons du formulaire enfant */}
      <style>{AUTH_SKIN}</style>
    </div>
  );
}

/* Skin oblique scopé à .auth-skin : champs en soulignement + bouton en biais.
   Cible .input (composant Input) → n'affecte PAS les cases OTP (maxlength 1). */
const AUTH_SKIN = `
.auth-skin .input {
  background-color: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid rgba(100,116,139,.35) !important;
  border-radius: 0 !important;
  padding-left: .25rem !important;
}
.auth-skin .input:focus {
  border-bottom-color: #2563eb !important;
  box-shadow: none !important;
}
.auth-skin .btn-primary,
.auth-skin button[type="submit"] {
  border-radius: 4px !important;
  padding-left: 2rem !important;
  padding-right: 2rem !important;
  clip-path: polygon(6% 0, 100% 0, 94% 100%, 0% 100%);
}

/* ── Animations ── */
@keyframes authRise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
.auth-rise { opacity: 0; animation: authRise .7s cubic-bezier(.16,1,.3,1) forwards; }

@keyframes authFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
.auth-float { animation: authFloat 5s ease-in-out infinite; }

@keyframes authBlob { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(24px,-18px) scale(1.12); } }
.auth-blob { animation: authBlob 16s ease-in-out infinite; }
.auth-blob-2 { animation: authBlob 20s ease-in-out infinite reverse; }

@media (prefers-reduced-motion: reduce) {
  .auth-rise, .auth-float, .auth-blob, .auth-blob-2 { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;
