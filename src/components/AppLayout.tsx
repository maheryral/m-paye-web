import {
  AppWindow,
  ArrowLeft,
  Bell,
  Building2,
  Cable,
  CreditCard,
  FileText,
  Gift,
  Headset,
  History as HistoryIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  type LucideIcon,
  Menu,
  MessageSquare,
  BarChart3,
  HelpCircle,
  Car,
  Package,
  Plane,
  QrCode,
  Receipt,
  ScanLine,
  Undo2,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { merchantApi } from '../services/merchantApi';
import { secureStorage } from '../services/storage';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { resolveAssetUrl } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  merchantOnly?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'unread' | number;
  cap?: string; // capacité marchand requise (filtrage par rôle)
}

// Matrice client (miroir du backend) : rôle → capacités visibles
const ROLE_CAPS: Record<string, string[]> = {
  OWNER: ['dashboard', 'transactions', 'collect', 'products', 'stores', 'withdrawals', 'coupons'],
  MANAGER: ['dashboard', 'transactions', 'collect', 'products', 'stores', 'withdrawals', 'coupons'],
  ACCOUNTANT: ['dashboard', 'transactions'],
  CASHIER: ['transactions', 'collect'],
};

const GROUPS: NavGroup[] = [
  {
    label: 'Compte',
    items: [
      { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { to: '/portfolio', label: 'Portefeuille', icon: Wallet },
      { to: '/transfers', label: 'Transferts', icon: Send },
      { to: '/history', label: 'Historique', icon: HistoryIcon },
    ],
  },
  {
    label: 'Paiements',
    items: [
      { to: '/qr-payment', label: 'Scanner QR', icon: ScanLine },
      { to: '/beneficiaries', label: 'Bénéficiaires', icon: Users },
      { to: '/loyalty', label: 'Fidélité', icon: Gift },
      { to: '/bills', label: 'Services', icon: FileText },
    ],
  },
  {
    label: 'Marchand',
    items: [
      // ⇣ Items filtrés dynamiquement dans SidebarContent :
      //   • 'Devenir marchand' : caché si l'user a déjà un marchand
      //   • 'Passer en mode marchand' : injecté si l'user a un marchand
      { to: '/seller-mode', label: 'Mode vendeur', icon: Store },
      { to: '/merchant-signup', label: 'Devenir marchand', icon: Building2 },
      { to: '/premium', label: 'Premium', icon: Sparkles },
    ],
  },
  {
    label: 'Espace Marchand',
    merchantOnly: true,
    items: [
      { to: '/merchant', label: 'Tableau marchand', icon: LayoutDashboard, cap: 'dashboard' },
      { to: '/merchant/payment-links', label: 'Liens de paiement', icon: Link2, cap: 'collect' },
      { to: '/merchant/scanner', label: 'Scanner client', icon: ScanLine, cap: 'collect' },
      { to: '/merchant/analytics', label: 'Analytics', icon: BarChart3, cap: 'dashboard' },
      { to: '/merchant/loyalty', label: 'Fidélité', icon: Gift, cap: 'coupons' },
      { to: '/merchant/transactions', label: 'Ventes', icon: Receipt, cap: 'transactions' },
      { to: '/merchant/refunds', label: 'Remboursements', icon: Undo2, cap: 'transactions' },
      { to: '/merchant/products', label: 'Produits', icon: Package, cap: 'products' },
      { to: '/merchant/stores', label: 'Boutiques', icon: Store, cap: 'stores' },
      { to: '/merchant/balance', label: 'Solde', icon: Wallet, cap: 'withdrawals' },
      { to: '/merchant/withdraw', label: 'Retraits', icon: Wallet, cap: 'withdrawals' },
      { to: '/merchant/reports', label: 'Rapports & TVA', icon: FileText, cap: 'transactions' },
      { to: '/merchant/coupons', label: 'Coupons', icon: Ticket, cap: 'coupons' },
      { to: '/merchant/employees', label: 'Équipe', icon: Users, cap: 'employees' },
      { to: '/merchant/notifications', label: 'Notifs marchand', icon: Bell, cap: 'dashboard' },
      { to: '/merchant/help', label: 'Aide', icon: HelpCircle, cap: 'dashboard' },
    ],
  },
  {
    label: 'Services',
    items: [
      { to: '/messages', label: 'Messages', icon: MessageSquare, badge: 'unread' },
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/train', label: 'Train', icon: AppWindow },
      { to: '/hotels', label: 'Hôtels', icon: Building2 },
      { to: '/flight-booking', label: 'Vols', icon: Plane },
      { to: '/vehicle-rentals', label: 'Location voiture', icon: Car },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { to: '/admin-payments', label: 'Valider paiements', icon: ShieldCheck },
      { to: '/admin-revenue', label: 'Revenus plateforme', icon: TrendingUp },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Profil', icon: Headset },
  { to: '/settings', label: 'Paramètres', icon: Settings },
  { to: '/security', label: 'Sécurité', icon: Shield },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);
  const [merchantRole, setMerchantRole] = useState<string>('OWNER');
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const isAdmin = (user as any)?.role === 'ADMIN';
  // Mode marchand = on est sur une route /merchant/*. Filtre la sidebar pour
  // n'afficher que les items pertinents (pas mélanger client + marchand).
  const isMerchantMode = location.pathname.startsWith('/merchant');

  // Statut marchand → affiche l'espace marchand dans la nav + rôle + id
  useEffect(() => {
    let cancelled = false;
    merchantApi
      .getStatus()
      .then((r) => {
        if (!cancelled) {
          setIsMerchant(
            Boolean(r.data?.hasMerchant && r.data?.merchant?.isActive),
          );
          setMerchantRole((r.data as any)?.role || 'OWNER');
          setMerchantId(r.data?.merchant?.id ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 🔑 Switch JWT vers contexte marchand quand on entre dans /merchant/*
  // (le backend a besoin de activeMerchantId dans le JWT pour /qr/generate,
  // /merchant/* etc. Sans ça → 400 "merchantId manquant").
  // On cache l'id du dernier switch en localStorage pour ne pas re-switch
  // à chaque page interne.
  useEffect(() => {
    if (!isMerchant || !merchantId) return;
    if (!location.pathname.startsWith('/merchant')) return;
    if (localStorage.getItem('activeMerchantId') === merchantId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await merchantApi.switch(merchantId);
        if (cancelled) return;
        await secureStorage.setItem('accessToken', res.data.accessToken);
        await secureStorage.setItem('refreshToken', res.data.refreshToken);
        localStorage.setItem('activeMerchantId', merchantId);
      } catch (e: any) {
        console.warn(
          '[MERCHANT switch KO]',
          e?.response?.status,
          e?.response?.data || e?.message,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMerchant, merchantId, location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Close user menu on outside click (via Escape)
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Mesh background gradient */}
      <div
        className="fixed inset-0 bg-gradient-mesh opacity-60 pointer-events-none"
        aria-hidden
      />

      <div className="relative flex min-h-screen">
        {/* ===== Sidebar desktop — sticky, reste collée au scroll ===== */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen border-r border-bg-border bg-bg-surface/80 backdrop-blur-xl">
          <SidebarContent
            isAdmin={isAdmin}
            isMerchant={isMerchant}
            isMerchantMode={isMerchantMode}
            merchantRole={merchantRole}
            unreadCount={unreadCount}
          />
        </aside>

        {/* ===== Sidebar mobile (drawer) ===== */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-bg-surface z-50 flex flex-col border-r border-bg-border lg:hidden animate-fade-in">
              <SidebarContent
                isAdmin={isAdmin}
                isMerchant={isMerchant}
                isMerchantMode={isMerchantMode}
                merchantRole={merchantRole}
                unreadCount={unreadCount}
                onClose={() => setMobileOpen(false)}
              />
            </aside>
          </>
        )}

        {/* ===== Main content area ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            onMenuClick={() => setMobileOpen(true)}
            user={user}
            userMenuOpen={userMenuOpen}
            setUserMenuOpen={setUserMenuOpen}
            onLogout={handleLogout}
            unreadCount={unreadCount}
          />

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Sidebar content ─────────────────────── */
function SidebarContent({
  isAdmin,
  isMerchant,
  isMerchantMode,
  merchantRole,
  unreadCount,
  onClose,
}: {
  isAdmin: boolean;
  isMerchant: boolean;
  isMerchantMode: boolean;
  merchantRole: string;
  unreadCount: number;
  onClose?: () => void;
}) {
  const allowedCaps = ROLE_CAPS[merchantRole] ?? ROLE_CAPS.OWNER;

  const visibleGroups = GROUPS.filter((g) => {
    if (g.adminOnly && !isAdmin) return false;
    // Espace Marchand n'apparaît qu'en mode marchand (et que si l'user est marchand)
    if (g.merchantOnly) return isMerchant && isMerchantMode;
    // En mode marchand, on cache les groupes "client" (Comptes, Paiements, Marchand, Services)
    // pour ne pas mélanger les deux contextes. Admin reste accessible.
    if (isMerchantMode && !g.adminOnly) return false;
    return true;
  }).map((g) => {
    // Filtrage des capacités côté Espace Marchand
    if (g.merchantOnly) {
      return {
        ...g,
        items: g.items.filter((it) => !it.cap || allowedCaps.includes(it.cap)),
      };
    }
    // Groupe "Marchand" en mode client :
    //   • cache 'Devenir marchand' si l'user a déjà un marchand
    //   • injecte 'Passer en mode marchand' en tête si l'user a un marchand
    if (g.label === 'Marchand' && !isMerchantMode) {
      const items = g.items.filter(
        (it) => !(it.to === '/merchant-signup' && isMerchant),
      );
      if (isMerchant) {
        items.unshift({
          to: '/merchant',
          label: 'Passer en mode marchand',
          icon: LayoutDashboard,
        });
      }
      return { ...g, items };
    }
    return g;
  });

  return (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-bg-border shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand shadow-glow-soft flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight">M'Paye</div>
            <div className="text-[10px] text-ink-dim uppercase tracking-wider">
              Wallet Pro
            </div>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-ink-muted hover:text-ink rounded-lg hover:bg-bg-subtle"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Mode marchand : bouton de retour vers la vue client */}
        {isMerchantMode && (
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/20 transition text-sm font-semibold"
          >
            <ArrowLeft size={15} />
            Retour mode client
          </Link>
        )}
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div className="section-title px-3 mb-1.5">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} item={item} unreadCount={unreadCount} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer nav */}
      <div className="px-3 py-4 border-t border-bg-border space-y-0.5 shrink-0">
        {FOOTER_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} unreadCount={unreadCount} />
        ))}
      </div>
    </>
  );
}

function SidebarLink({ item, unreadCount }: { item: NavItem; unreadCount: number }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `nav-item ${isActive ? 'nav-item-active' : ''}`
      }
    >
      <Icon size={17} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge === 'unread' && unreadCount > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </NavLink>
  );
}

/* ─────────────────────── Topbar ─────────────────────── */
function Topbar({
  onMenuClick,
  user,
  userMenuOpen,
  setUserMenuOpen,
  onLogout,
  unreadCount,
}: {
  onMenuClick: () => void;
  user: any;
  userMenuOpen: boolean;
  setUserMenuOpen: (v: boolean) => void;
  onLogout: () => void;
  unreadCount: number;
}) {
  const navigate = useNavigate();
  const displayName = user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : user?.email || 'Utilisateur';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-bg-border bg-bg-surface/80 backdrop-blur-xl">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3 max-w-[1600px] mx-auto">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-ink-muted hover:text-ink rounded-lg hover:bg-bg-subtle"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none"
            />
            <input
              type="search"
              placeholder="Rechercher..."
              className="w-full bg-bg-elevated/60 border border-bg-border rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-ink-dim outline-none focus:border-brand-500 focus:bg-bg-elevated"
            />
          </div>
        </div>

        <div className="flex-1 hidden lg:block" />

        {/* Quick actions */}
        <Button
          variant="primary"
          size="sm"
          icon={Send}
          onClick={() => navigate('/transfers')}
          className="hidden sm:inline-flex"
        >
          Envoyer
        </Button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-xl bg-bg-elevated/60 hover:bg-bg-elevated border border-bg-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          aria-label="Notifications"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-bg-surface">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-xl pl-1 pr-2.5 py-1 bg-bg-elevated/60 hover:bg-bg-elevated border border-bg-border transition-colors"
          >
            <Avatar
              name={displayName}
              src={resolveAssetUrl(user?.avatarUrl) || undefined}
              size="sm"
            />
            <span className="hidden sm:block text-sm font-semibold max-w-[120px] truncate">
              {displayName}
            </span>
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 card shadow-elevated z-20 p-2 animate-slide-in">
                <div className="px-3 py-2.5 border-b border-bg-border mb-1.5">
                  <div className="text-sm font-bold truncate">{displayName}</div>
                  <div className="text-xs text-ink-muted truncate">{user?.email}</div>
                </div>
                {[
                  { label: 'Mon profil', to: '/profile', icon: Headset },
                  { label: 'Paramètres', to: '/settings', icon: Settings },
                  { label: 'Sécurité', to: '/security', icon: Shield },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.to}
                      onClick={() => navigate(m.to)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-bg-subtle text-left"
                    >
                      <Icon size={16} />
                      {m.label}
                    </button>
                  );
                })}
                <div className="my-1.5 border-t border-bg-border" />
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-danger-400 hover:bg-danger-500/10 text-left"
                >
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
