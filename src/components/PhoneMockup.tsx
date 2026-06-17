import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Car,
  Clock,
  Droplets,
  Eye,
  LayoutGrid,
  Plus,
  QrCode,
  Search,
  Tv,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';

/**
 * Maquette fidèle du dashboard mobile M'Paye (m-paye_front) :
 * bloc bleu (header + carte solde), actions rapides, catégories, transaction.
 * Réutilisée sur la landing et l'écran d'authentification.
 */
export default function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`w-[290px] ${className}`}>
      <div className="rounded-[2.8rem] border-[11px] border-[#0b1220] bg-[#0b1220] shadow-2xl">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-bg pb-4">
          {/* encoche */}
          <div className="absolute left-1/2 top-2.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0b1220]" />

          {/* ===== Bloc bleu (header + carte solde) ===== */}
          <div
            className="px-4 pb-9 pt-9 text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af 60%, #1e3a8a)' }}
          >
            {/* header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">M</div>
                <div className="leading-tight">
                  <div className="text-[10px] text-white/80">Bonjour,</div>
                  <div className="text-sm font-bold">Mahery 👋</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15"><Search size={14} /></div>
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <Bell size={14} />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                </div>
              </div>
            </div>

            {/* carte solde translucide */}
            <div className="relative mt-4 rounded-2xl border border-white/15 bg-white/10 p-3.5">
              {/* mini-carte bancaire en haut à droite */}
              <div className="absolute right-3 top-3 w-16 rounded-lg bg-white/15 px-1.5 py-1">
                <div className="mb-1 h-2 w-3 rounded-sm bg-amber-300/80" />
                <div className="text-[7px] font-bold leading-none">VISA</div>
                <div className="text-[7px] leading-none text-white/80">•••• 4242</div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/80">Solde disponible</span>
                <Eye size={11} className="text-white/80" />
              </div>
              <div className="mt-1 text-[22px] font-extrabold tracking-tight">Ar 1 250 000</div>

              <div className="mt-3 flex gap-2">
                <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white py-1.5 text-[10px] font-bold text-[#1e40af]">
                  <Plus size={12} /> Recharger
                </div>
                <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/40 py-1.5 text-[10px] font-bold">
                  <Clock size={11} /> Historique
                </div>
              </div>
            </div>
          </div>

          {/* ===== Actions rapides (carte flottante) ===== */}
          <div className="mx-3 -mt-5 flex items-center justify-between rounded-2xl border border-bg-border bg-bg-surface px-2 py-3 shadow-lg">
            {[
              { icon: QrCode, label: 'Scanner', c: '#2563eb' },
              { icon: ArrowLeftRight, label: 'Payer', c: '#10b981' },
              { icon: LayoutGrid, label: 'Services', c: '#f59e0b' },
              { icon: Wallet, label: 'Wallet', c: '#8b5cf6' },
            ].map((a) => (
              <div key={a.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${a.c}1a` }}>
                  <a.icon size={16} style={{ color: a.c }} />
                </div>
                <span className="text-[8px] font-medium text-ink">{a.label}</span>
              </div>
            ))}
          </div>

          {/* ===== Catégories ===== */}
          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink">Catégories</span>
              <span className="text-[9px] font-semibold text-brand-500">Voir tout</span>
            </div>
            <div className="flex justify-between">
              {[
                { icon: Zap, c: '#f59e0b', n: 3 },
                { icon: Tv, c: '#8b5cf6', n: 5 },
                { icon: Wifi, c: '#2563eb', n: 4 },
                { icon: Droplets, c: '#06b6d4', n: 2 },
                { icon: Car, c: '#10b981', n: 6 },
              ].map((cat, i) => (
                <div key={i} className="relative flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${cat.c}1a` }}>
                  <cat.icon size={18} style={{ color: cat.c }} />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: cat.c }}>{cat.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Transactions ===== */}
          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink">Transactions récentes</span>
              <span className="text-[9px] font-semibold text-brand-500">Voir tout</span>
            </div>
            <div className="space-y-2">
              {[
                { n: 'Reçu de Rakoto', a: '+ Ar 45 000', up: true },
                { n: 'Paiement QR', a: '- Ar 12 000', up: false },
                { n: 'Forfait Telma', a: '- Ar 5 000', up: false },
              ].map((t) => (
                <div key={t.n} className="flex items-center gap-2.5 rounded-xl border border-bg-border bg-bg-surface px-2.5 py-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.up ? 'bg-success/15 text-success' : 'bg-brand-500/10 text-brand-500'}`}>
                    <ArrowRight size={13} className={t.up ? 'rotate-[-45deg]' : 'rotate-[135deg]'} />
                  </div>
                  <span className="flex-1 truncate text-[10px] font-medium text-ink">{t.n}</span>
                  <span className={`text-[10px] font-bold ${t.up ? 'text-success' : 'text-ink'}`}>{t.a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
