import {
  AppWindow,
  Bell,
  Building2,
  Cable,
  CreditCard,
  FileText,
  Headset,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  MessageSquare,
  Plane,
  ScanLine,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'unread' | number;
}

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
      { to: '/cards', label: 'Mes cartes', icon: CreditCard },
      { to: '/beneficiaries', label: 'Bénéficiaires', icon: Users },
      { to: '/bills', label: 'Factures', icon: FileText },
    ],
  },
  {
    label: 'Marchand',
    items: [
      { to: '/seller-mode', label: 'Mode vendeur', icon: Store },
      { to: '/merchant-signup', label: 'Devenir marchand', icon: Building2 },
      { to: '/premium', label: 'Premium', icon: Sparkles },
    ],
  },
  {
    label: 'Services',
    items: [
      { to: '/messages', label: 'Messages', icon: MessageSquare, badge: 'unread' },
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/taxi-brousse', label: 'Taxi-brousse', icon: Cable },
      { to: '/telepherique', label: 'Téléphérique', icon: Cable },
      { to: '/train', label: 'Train', icon: AppWindow },
      { to: '/hotels', label: 'Hôtels', icon: Building2 },
      { to: '/flight-booking', label: 'Vols', icon: Plane },
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

  const isAdmin = (user as any)?.role === 'ADMIN';

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
        {/* ===== Sidebar desktop ===== */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-bg-border bg-bg-surface/80 backdrop-blur-xl">
          <SidebarContent isAdmin={isAdmin} unreadCount={unreadCount} />
        </aside>

        {/* ===== Sidebar mobile (drawer) ===== */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-bg-surface z-50 flex flex-col border-r border-bg-border lg:hidden animate-fade-in">
              <SidebarContent isAdmin={isAdmin} unreadCount={unreadCount} onClose={() => setMobileOpen(false)} />
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
  unreadCount,
  onClose,
}: {
  isAdmin: boolean;
  unreadCount: number;
  onClose?: () => void;
}) {
  const visibleGroups = GROUPS.filter((g) => !g.adminOnly || isAdmin);

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
            <Avatar name={displayName} size="sm" />
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
