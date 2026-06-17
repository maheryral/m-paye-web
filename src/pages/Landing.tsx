import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Apple,
  ArrowRight,
  CreditCard,
  Moon,
  Play,
  QrCode,
  Receipt,
  Send,
  ShieldCheck,
  Store,
  Sun,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PhoneMockup from '../components/PhoneMockup';

/* Apparition au scroll (IntersectionObserver) */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`lp-reveal ${shown ? 'lp-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: Send, title: 'Transferts instantanés', text: "Envoyez de l'argent par numéro ou email, en quelques secondes." },
  { icon: QrCode, title: 'Paiement par QR', text: 'Payez et encaissez en scannant — montant libre ou figé.' },
  { icon: CreditCard, title: 'Carte & Mobile Money', text: 'Carte bancaire, MVola, Orange Money, Airtel Money.' },
  { icon: Store, title: 'Espace marchand', text: 'Ventes, boutiques, coupons, fidélité et retraits.' },
  { icon: Receipt, title: 'Factures & services', text: 'Réglez vos factures et forfaits au même endroit.' },
  { icon: ShieldCheck, title: 'Sécurité', text: 'Biométrie, 2FA et chiffrement de bout en bout.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-bg text-ink">
      <style>{LP_CSS}</style>

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-bg-border/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow-soft">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              M'<span className="text-brand-500">Paye</span>
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-muted lg:flex">
            <a href="#features" className="transition hover:text-brand-500">Fonctionnalités</a>
            <a href="#how" className="transition hover:text-brand-500">Comment ça marche</a>
            <a href="#merchant" className="transition hover:text-brand-500">Marchands</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-xl border border-bg-border text-ink-muted transition hover:text-brand-500" aria-label="Thème">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/auth/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink">Connexion</Link>
            <Link to="/auth/register" className="lp-cta inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-white shadow-glow-soft">
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
        <div className="relative mx-auto grid max-w-[1500px] items-center gap-12 px-5 pb-24 pt-16 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pt-24">
          {/* COLONNE TEXTE (gauche) */}
          <div className="text-center lg:text-left">
            <span className="lp-rise inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-gradient-brand-soft px-3 py-1 text-xs font-semibold text-brand-500" style={{ animationDelay: '0ms' }}>
              <Zap size={13} /> Le portefeuille mobile de Madagascar
            </span>
            <h1 className="lp-rise mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl" style={{ animationDelay: '80ms' }}>
              Payez, transférez,{' '}
              <span className="bg-gradient-brand bg-clip-text text-transparent">encaissez</span>{' '}
              en un instant
            </h1>
            <p className="lp-rise mt-6 max-w-lg text-base text-ink-muted md:text-lg lg:mx-0 mx-auto" style={{ animationDelay: '160ms' }}>
              Transferts, paiement QR, carte, mobile money, factures et un espace
              marchand complet — réunis dans une seule application sécurisée.
            </p>
            <div className="lp-rise mt-9 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ animationDelay: '240ms' }}>
              <Link to="/auth/register" className="lp-cta inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-7 py-4 text-sm font-bold text-white shadow-glow">
                Créer un compte gratuit <ArrowRight size={16} />
              </Link>
              <Link to="/auth/login" className="inline-flex items-center rounded-2xl border border-bg-border bg-bg-surface px-7 py-4 text-sm font-bold text-ink transition hover:border-brand-500/40">
                J'ai déjà un compte
              </Link>
            </div>
            <div className="lp-rise mt-7 flex flex-wrap items-center justify-center gap-5 text-xs text-ink-muted lg:justify-start" style={{ animationDelay: '320ms' }}>
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-success" /> Sécurisé</span>
              <span className="flex items-center gap-1.5"><Zap size={14} className="text-brand-500" /> Instantané</span>
              <span className="flex items-center gap-1.5"><Wallet size={14} className="text-brand-500" /> 100% Ariary</span>
            </div>
          </div>

          {/* COLONNE MAQUETTE (droite) */}
          <div className="lp-rise relative mx-auto w-full max-w-md lg:max-w-lg lg:justify-self-end" style={{ animationDelay: '300ms' }}>
            {/* Maquette téléphone — réplique du dashboard mobile (composant partagé) */}
            <PhoneMockup className="mx-auto w-[330px]" />

            {/* mini-carte flottante gauche */}
            <div className="lp-float absolute -bottom-5 -left-4 hidden w-52 items-center gap-2.5 rounded-2xl border border-bg-border bg-bg-surface p-3 shadow-elevated sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15">
                <ArrowRight size={16} className="text-success" />
              </div>
              <div>
                <div className="text-xs font-bold">Paiement reçu</div>
                <div className="text-[10px] text-ink-muted">+ Ar 45 000 · à l'instant</div>
              </div>
            </div>
            {/* mini-carte flottante droite */}
            <div className="lp-float-slow absolute -right-4 -top-5 hidden w-44 rounded-2xl border border-bg-border bg-bg-surface p-3 shadow-elevated sm:block">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Payer avec</div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5"><CreditCard size={12} className="text-brand-500" /> Carte</div>
                <div className="flex items-center gap-1.5"><Wallet size={12} className="text-brand-500" /> Wallet</div>
                <div className="flex items-center gap-1.5"><TrendingUp size={12} className="text-brand-500" /> Mobile Money</div>
              </div>
            </div>

            {/* Télécharger l'application */}
            <div className="mt-10 text-center">
              <p className="mb-3 text-sm font-semibold text-ink-muted">
                Téléchargez l'application
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="#"
                  className="flex items-center gap-2.5 rounded-xl bg-[#0b1220] px-4 py-2.5 text-white transition hover:brightness-125"
                >
                  <Apple size={24} />
                  <span className="text-left leading-none">
                    <span className="block text-[9px] opacity-80">Télécharger sur</span>
                    <span className="mt-0.5 block text-base font-bold">App Store</span>
                  </span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2.5 rounded-xl bg-[#0b1220] px-4 py-2.5 text-white transition hover:brightness-125"
                >
                  <Play size={22} fill="currentColor" />
                  <span className="text-left leading-none">
                    <span className="block text-[9px] opacity-80">Disponible sur</span>
                    <span className="mt-0.5 block text-base font-bold">Google Play</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="border-y border-bg-border bg-bg-surface">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-6 px-5 py-9 md:grid-cols-4 lg:px-8">
          {[
            { v: 'Instantané', l: 'Transferts en temps réel' },
            { v: '3 réseaux', l: 'MVola · Orange · Airtel' },
            { v: '100% Ar', l: 'Pensé pour Madagascar' },
            { v: '24/7', l: 'Disponible partout' },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 80} className="text-center">
              <div className="text-2xl font-extrabold text-brand-500">{s.v}</div>
              <div className="mt-1 text-xs text-ink-muted">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="mx-auto max-w-[1500px] px-5 py-24 lg:px-8">
        <Reveal className="max-w-2xl">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-500">Fonctionnalités</div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">Tout au même endroit</h2>
          <p className="mt-3 text-ink-muted">Un portefeuille, des dizaines d'usages — pour les particuliers comme les commerçants.</p>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="lp-card group h-full rounded-2xl border border-bg-border bg-bg-surface p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-500 transition group-hover:scale-110">
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="border-y border-bg-border bg-bg-surface">
        <div className="mx-auto max-w-[1500px] px-5 py-24 lg:px-8">
          <Reveal className="max-w-2xl">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-500">Comment ça marche</div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">Démarrez en 3 étapes</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Wallet, t: 'Créez votre compte', d: 'En quelques minutes, avec votre numéro.' },
              { icon: CreditCard, t: 'Approvisionnez', d: 'Par carte ou mobile money.' },
              { icon: Zap, t: 'Payez & encaissez', d: 'Transferts, QR, factures, commerce.' },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 120}>
                <div className="relative rounded-2xl border border-bg-border bg-bg p-6">
                  <div className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white shadow-glow-soft">{i + 1}</div>
                  <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-500"><s.icon size={20} /></div>
                  <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MERCHANT ===== */}
      <section id="merchant" className="mx-auto max-w-[1500px] px-5 py-24 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-balance p-8 text-white shadow-glow md:p-14">
            <div className="lp-blob lp-blob-white" />
            <div className="relative grid items-center gap-8 md:grid-cols-2">
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Espace commerçant</div>
                <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Vous êtes commerçant ?</h2>
                <p className="mt-3 max-w-md text-white/85">QR d'encaissement, liens de paiement, statistiques, multi-boutiques, coupons et fidélité — tout pour développer votre activité.</p>
                <Link to="/auth/register" className="lp-cta mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-brand-600">
                  Devenir marchand <ArrowRight size={16} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: QrCode, label: 'Encaissement QR' },
                  { icon: TrendingUp, label: 'Statistiques' },
                  { icon: Receipt, label: 'Liens de paiement' },
                  { icon: Store, label: 'Multi-boutiques' },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-4 transition hover:bg-white/20">
                    <b.icon size={18} className="shrink-0" />
                    <span className="text-sm font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="mx-auto max-w-[1500px] px-5 pb-28 lg:px-8">
        <Reveal>
          <div className="rounded-3xl border border-bg-border bg-bg-surface px-6 py-16 text-center">
            <h2 className="mx-auto max-w-xl text-3xl font-extrabold tracking-tight md:text-5xl">Prêt à passer au paiement mobile ?</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-muted">Rejoignez M'Paye — c'est gratuit et ça prend deux minutes.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth/register" className="lp-cta inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-7 py-4 text-sm font-bold text-white shadow-glow">
                Créer mon compte <ArrowRight size={16} />
              </Link>
              <Link to="/auth/login" className="inline-flex items-center rounded-2xl border border-bg-border px-7 py-4 text-sm font-bold text-ink transition hover:border-brand-500/40">Se connecter</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-bg-border">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-ink-muted sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand"><Wallet size={14} className="text-white" /></div>
            <span className="font-bold text-ink">M'<span className="text-brand-500">Paye</span></span>
          </div>
          <span>© 2026 M'Paye · Madagascar</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Animations (scopées via préfixe lp-) ─────────────────────── */
const LP_CSS = `
.lp-reveal { opacity: 0; transform: translateY(28px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
.lp-reveal.lp-in { opacity: 1; transform: none; }

@keyframes lpRise { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
.lp-rise { opacity: 0; animation: lpRise .8s cubic-bezier(.16,1,.3,1) forwards; }

@keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.lp-float { animation: lpFloat 4s ease-in-out infinite; }
.lp-float-slow { animation: lpFloat 5.5s ease-in-out infinite; }

@keyframes lpBlob { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-25px) scale(1.12); } 66% { transform: translate(-25px,18px) scale(.92); } }
.lp-blob { position: absolute; border-radius: 9999px; filter: blur(64px); opacity: .35; pointer-events: none; }
.lp-blob-1 { top: -80px; right: -60px; width: 360px; height: 360px; background: #2563eb; animation: lpBlob 14s ease-in-out infinite; }
.lp-blob-2 { top: 120px; left: -80px; width: 300px; height: 300px; background: #3b82f6; animation: lpBlob 18s ease-in-out infinite reverse; }
.lp-blob-3 { bottom: -60px; left: 40%; width: 260px; height: 260px; background: #1e40af; opacity: .25; animation: lpBlob 16s ease-in-out infinite; }
.lp-blob-white { top: -40px; right: -40px; width: 220px; height: 220px; background: #fff; opacity: .12; filter: blur(50px); animation: lpBlob 12s ease-in-out infinite; }

.lp-card { transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
.lp-card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px -16px rgba(37,99,235,.35); border-color: rgba(37,99,235,.4); }

.lp-cta { transition: transform .25s ease, filter .25s ease, box-shadow .25s ease; }
.lp-cta:hover { transform: translateY(-2px); filter: brightness(1.08); }
.lp-cta:active { transform: translateY(0) scale(.98); }

@media (prefers-reduced-motion: reduce) {
  .lp-reveal, .lp-rise, .lp-float, .lp-float-slow, .lp-blob { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
}
`;
