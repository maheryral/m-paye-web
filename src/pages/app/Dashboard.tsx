import {
  AppWindow,
  ArrowRight,
  Bell,
  BedDouble,
  Bus,
  Cable,
  Calendar,
  Car,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  LogOut,
  MapPin,
  MessageSquare,
  Plane,
  Plus,
  RefreshCw,
  Scan,
  Search,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  Train,
  User as UserIcon,
  Wallet,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBadge from '../../components/NotificationBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useColors } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';

type SaleCategory = 'meals' | 'clothing' | 'others';
type ActiveMenu = 'homeapps' | 'travel' | 'bank';
type BottomTab = 'home' | 'message' | 'profile';

const mealProducts = [
  { id: 'm1', name: 'Burger Classic', price: 8500, image: '🍔', restaurant: 'Fast Food Express' },
  { id: 'm2', name: 'Pizza Margherita', price: 12500, image: '🍕', restaurant: 'Pizza House' },
  { id: 'm3', name: 'Salade César', price: 7500, image: '🥗', restaurant: 'Healthy Food' },
  { id: 'm4', name: 'Plat du jour', price: 9500, image: '🍲', restaurant: 'Chez Maman' },
  { id: 'm5', name: 'Sushi Mix', price: 18500, image: '🍱', restaurant: 'Sushi Bar' },
  { id: 'm6', name: 'Tacos', price: 6500, image: '🌮', restaurant: 'Mexican Grill' },
];

const clothingProducts = [
  { id: 'c1', name: 'T-shirt Premium', price: 25000, image: '👕', brand: 'Urban Wear' },
  { id: 'c2', name: 'Jean Slim', price: 55000, image: '👖', brand: 'Denim Co' },
  { id: 'c3', name: 'Robe élégante', price: 75000, image: '👗', brand: 'Fashion Luxe' },
  { id: 'c4', name: 'Casquette', price: 15000, image: '🧢', brand: 'Sport Style' },
  { id: 'c5', name: 'Chaussures sport', price: 85000, image: '👟', brand: 'Nike' },
  { id: 'c6', name: 'Veste en cuir', price: 125000, image: '🧥', brand: 'Leather Co' },
];

const otherProducts = [
  { id: 'o1', name: 'Smartphone', price: 350000, image: '📱', seller: 'Tech Store' },
  { id: 'o2', name: 'Écouteurs BT', price: 45000, image: '🎧', seller: 'Audio Shop' },
  { id: 'o3', name: 'Montre connectée', price: 125000, image: '⌚', seller: 'Gadget World' },
  { id: 'o4', name: 'Sac à dos', price: 55000, image: '🎒', seller: 'Bag Store' },
  { id: 'o5', name: 'Lampe LED', price: 18500, image: '💡', seller: 'Home Decor' },
  { id: 'o6', name: 'Parfum', price: 65000, image: '🧴', seller: 'Beauty Shop' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const colors = useColors();
  const { t, formatCurrency } = useLocale();

  const [refreshing, setRefreshing] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('home');
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('homeapps');
  const [selectedSaleCategory, setSelectedSaleCategory] = useState<SaleCategory>('meals');
  const [showBalance, setShowBalance] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} Ar`;

  const mainActions = [
    { id: 'scan', name: 'Scanner', icon: Scan, route: '/qr-payment' },
    { id: 'pay', name: 'Payer et\nRecevoir', icon: RefreshCw, route: '/transfers' },
    { id: 'transport', name: 'Transports', icon: Bus, route: '/bills' },
    { id: 'wallet', name: 'Portefeuille', icon: WalletIcon, route: '/portfolio' },
  ];

  const menuItems = [
    { id: 'homeapps' as const, name: 'Home Apps', icon: AppWindow },
    { id: 'travel' as const, name: 'Voyage', icon: Plane },
    { id: 'bank' as const, name: 'Bank Card', icon: CreditCard },
  ];

  const homeApps = [
    { id: 'facture', name: 'Facture', icon: FileText, route: '/bills' },
    { id: 'telepherique', name: 'Téléphérique', icon: Cable, route: '/telepherique' },
    { id: 'bus', name: 'Bus', icon: Bus, route: '/bus-booking' },
    { id: 'taxi', name: 'Taxi', icon: Car, route: '/taxi-booking' },
    { id: 'evenement', name: 'Événement', icon: Calendar, route: '/events' },
  ];

  const travelApps = [
    { id: 'vols', name: 'Vols', icon: Plane, route: '/flight-booking' },
    { id: 'taxi-brousse', name: 'Taxi Brousse', icon: Bus, route: '/taxi-brousse' },
    { id: 'hotel', name: 'Hôtel', icon: BedDouble, route: '/hotels' },
    { id: 'train', name: 'Train', icon: Train, route: '/train' },
    { id: 'location', name: 'Location\nvoiture', icon: Car, route: '/car-rental' },
  ];

  const paymentMethods = [
    { id: 'visa', name: 'VISA' },
    { id: 'mastercard', name: 'Mastercard' },
    { id: 'unionpay', name: 'UnionPay' },
  ];

  const messages = [
    { id: 1, name: 'Jean Dupont', message: 'Merci pour le paiement', time: '10:30', unread: true },
    { id: 2, name: 'Marie Claire', message: 'Transfert reçu !', time: '09:15', unread: false },
    { id: 3, name: "Support M'Paye", message: 'Votre compte est vérifié', time: 'Hier', unread: false },
  ];

  const saleCategories: { id: SaleCategory; emoji: string; label: string }[] = [
    { id: 'meals', emoji: '🍽️', label: 'Repas' },
    { id: 'clothing', emoji: '👕', label: 'Vêtements' },
    { id: 'others', emoji: '📦', label: 'Autres' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  // ===== Sub-sections =====

  const renderSaleProducts = () => {
    const list =
      selectedSaleCategory === 'meals'
        ? mealProducts
        : selectedSaleCategory === 'clothing'
          ? clothingProducts
          : otherProducts;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {list.map((product) => {
          const sub =
            'restaurant' in product
              ? product.restaurant
              : 'brand' in product
                ? product.brand
                : product.seller;
          return (
            <button
              key={product.id}
              onClick={() => alert(`${product.name} ajouté au panier`)}
              className="card flex flex-col items-center text-center p-3.5 hover:scale-[1.02] transition-transform"
            >
              <div className="w-18 h-18 rounded-2xl bg-primary/10 flex items-center justify-center mb-2.5 p-3">
                <span className="text-4xl">{product.image}</span>
              </div>
              <div className="text-sm font-bold text-white truncate w-full">{product.name}</div>
              <div className="text-sm font-extrabold mt-0.5" style={{ color: colors.primary }}>
                {formatPrice(product.price)}
              </div>
              <div className="text-[10px] mt-1 truncate w-full" style={{ color: colors.textSecondary }}>
                {sub}
              </div>
              <div className="mt-2.5 w-full bg-gradient-button text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                <ShoppingCart size={12} />
                Acheter
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPromoSection = () => (
    <section className="mb-6">
      <h3 className="text-base font-semibold mb-4" style={{ color: colors.text }}>
        {t('dashboard.advantages')}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        <div className="min-w-[200px] p-4 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-2">
            <Wallet size={22} className="text-white" />
          </div>
          <div className="text-white text-xl font-extrabold">5%</div>
          <div className="text-white text-sm font-bold mt-1">{t('dashboard.cashback')}</div>
          <div className="text-white/85 text-xs mt-1">5% remboursés sur chaque paiement marchand</div>
        </div>
        <div className="min-w-[200px] p-4 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e40af] shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-2">
            <Send size={22} className="text-white" />
          </div>
          <div className="text-white text-xl font-extrabold">0 Ar</div>
          <div className="text-white text-sm font-bold mt-1">{t('dashboard.freeTransfers')}</div>
          <div className="text-white/85 text-xs mt-1">Aucun frais entre comptes M'Paye</div>
        </div>
        <div className="min-w-[200px] p-4 rounded-2xl bg-gradient-to-br from-[#1e40af] to-[#60a5fa] shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-2">
            <Gift size={22} className="text-white" />
          </div>
          <div className="text-white text-xl font-extrabold">+5 000 Ar</div>
          <div className="text-white text-sm font-bold mt-1">{t('dashboard.referral')}</div>
          <div className="text-white/85 text-xs mt-1">Invitez un proche, gagnez 5 000 Ar</div>
        </div>
      </div>
    </section>
  );

  const renderSalesSection = () => (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <div className="text-base font-semibold" style={{ color: colors.text }}>
              Vente Flash
            </div>
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              Offres limitées dans le temps
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: `${colors.primary}15`, color: colors.primary }}
        >
          Voir tout
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        {saleCategories.map((cat) => {
          const isActive = selectedSaleCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedSaleCategory(cat.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full transition-all ${
                isActive
                  ? 'bg-gradient-button text-white shadow-glow-blue font-bold'
                  : 'card text-slate-400'
              }`}
            >
              <span className="text-base">{cat.emoji}</span>
              <span className="text-sm">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {renderSaleProducts()}
    </section>
  );

  const renderServicesGrid = (
    apps: { id: string; name: string; icon: typeof FileText; route: string }[],
    title: string,
  ) => (
    <section className="mb-6">
      <h3 className="text-base font-semibold mb-4" style={{ color: colors.text }}>
        {title}
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-y-4 gap-x-2">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              onClick={() => navigate(app.route)}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors">
                <Icon size={26} className="text-primary-light" />
              </div>
              <span className="text-[11px] text-center leading-tight whitespace-pre-line" style={{ color: colors.textSecondary }}>
                {app.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderBankSection = () => (
    <section className="mb-6">
      <h3 className="text-base font-semibold mb-4" style={{ color: colors.text }}>
        Bank Card
      </h3>
      <div className="flex justify-around mb-4">
        {paymentMethods.map((method) => (
          <button key={method.id} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <CreditCard size={22} className="text-primary-light" />
            </div>
            <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              {method.name}
            </span>
          </button>
        ))}
      </div>
      <button className="card flex items-center gap-3 p-3.5 w-full">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Plus size={22} className="text-primary-light" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-bold text-white truncate">Ajouter une carte</div>
          <div className="text-xs mt-0.5 truncate" style={{ color: colors.textSecondary }}>
            Paiement rapide et sécurisé
          </div>
        </div>
        <ChevronRight size={18} className="text-primary-light" />
      </button>
    </section>
  );

  const renderMessagesSection = () => (
    <section className="mb-6">
      <h3 className="text-base font-semibold mb-4" style={{ color: colors.text }}>
        Messages
      </h3>
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {messages.map((msg) => (
          <button
            key={msg.id}
            className="flex items-center gap-3 py-3.5 w-full text-left hover:bg-white/5 px-2 -mx-2 rounded-xl"
            style={{ borderColor: colors.border }}
          >
            <div className="w-12 h-12 rounded-full bg-primary-dark flex items-center justify-center text-white font-bold">
              {msg.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-semibold text-white truncate">{msg.name}</div>
                <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                  {msg.time}
                </div>
              </div>
              <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                {msg.message}
              </div>
            </div>
            {msg.unread && <div className="w-2.5 h-2.5 rounded-full bg-primary-dark ml-2 shrink-0" />}
          </button>
        ))}
      </div>
    </section>
  );

  const renderProfileSection = () => (
    <section className="mb-6">
      <div className="flex items-center gap-4 p-4 rounded-2xl mb-6 bg-slate-700/30">
        <div
          className="w-15 h-15 rounded-full flex items-center justify-center text-white text-2xl font-bold p-4"
          style={{ background: colors.primary }}
        >
          {user?.prenom?.[0] || user?.email?.[0] || 'U'}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold text-white truncate">
            {user?.prenom ? `${user.prenom} ${user.nom}` : user?.email?.split('@')[0]}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: colors.textSecondary }}>
            {user?.email}
          </div>
        </div>
      </div>

      {[
        { icon: UserIcon, label: 'Mon Profil', route: '/profile' },
        { icon: Settings, label: 'Paramètres', route: '/settings' },
        { icon: Shield, label: 'Sécurité', route: '/security' },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.route)}
            className="flex items-center gap-3 py-3.5 w-full border-b text-left"
            style={{ borderColor: colors.border }}
          >
            <Icon size={22} className="text-primary-light" />
            <span className="flex-1 text-sm text-white">{item.label}</span>
            <ChevronRight size={18} style={{ color: colors.textSecondary }} />
          </button>
        );
      })}

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 py-3.5 w-full text-left text-red-400"
      >
        <LogOut size={22} />
        <span className="flex-1 text-sm">Se déconnecter</span>
        <ChevronRight size={18} />
      </button>
    </section>
  );

  const renderMainContent = () => {
    if (activeBottomTab === 'message') return renderMessagesSection();
    if (activeBottomTab === 'profile') return renderProfileSection();

    return (
      <>
        <div className="card flex p-1.5 gap-1 mb-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl transition-all text-xs ${
                  isActive
                    ? 'bg-gradient-button text-white font-bold shadow-glow-blue'
                    : 'text-slate-400'
                }`}
              >
                <Icon size={16} />
                {item.name}
              </button>
            );
          })}
        </div>

        {activeMenu === 'homeapps' && renderServicesGrid(homeApps, 'Home Apps')}
        {activeMenu === 'travel' && renderServicesGrid(travelApps, 'Voyage')}
        {activeMenu === 'bank' && renderBankSection()}

        {renderPromoSection()}
        {renderSalesSection()}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-bg pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header banner */}
        <div className="relative bg-gradient-banner px-4 pt-6 pb-16 overflow-hidden rounded-b-3xl md:rounded-b-none">
          <div className="absolute -top-12 -right-14 w-48 h-48 rounded-full bg-white/[0.07]" />
          <div className="absolute bottom-5 -left-10 w-36 h-36 rounded-full bg-white/[0.05]" />

          <div className="relative flex items-center gap-2 mb-3.5">
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-white/15 text-white text-xs font-semibold">
              <MapPin size={14} />
              Antananarivo
              <ChevronDown size={12} className="text-white/80" />
            </button>

            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/[0.18]">
              <Search size={16} className="text-white/70" />
              <input
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/70 outline-none min-w-0"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
            >
              <Bell size={20} className="text-white" />
              <NotificationBadge size={18} borderColor="#1e40af" />
            </button>

            <button
              onClick={onRefresh}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className={`text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative flex items-center">
            <div className="flex-1">
              <div className="text-white/80 text-[11px] mb-1">{greeting}</div>
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-xs font-medium">Solde:</span>
                <span className="text-white text-xl font-extrabold">
                  {showBalance ? formatCurrency(balance) : '••••••'}
                </span>
                <button onClick={() => setShowBalance((v) => !v)}>
                  {showBalance ? (
                    <Eye size={16} className="text-white/90" />
                  ) : (
                    <EyeOff size={16} className="text-white/90" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => navigate('/portfolio')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/20 text-white text-xs font-bold"
            >
              Détails
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Floating actions card overlapping the banner */}
        <div className="px-4 -mt-11">
          <div className="card flex justify-around py-4 px-2 shadow-xl">
            {mainActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="flex flex-col items-center gap-2 flex-1 group"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-button p-3 flex items-center justify-center shadow-glow-blue group-hover:scale-105 transition-transform">
                    <Icon size={22} className="text-white" />
                  </div>
                  <div
                    className="text-[11px] font-semibold text-center leading-tight whitespace-pre-line"
                    style={{ color: colors.text }}
                  >
                    {action.name}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6">{renderMainContent()}</div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-bg-card border-t border-bg-border">
        <div className="max-w-4xl mx-auto flex justify-around items-center px-3 py-2.5 pb-5">
          {([
            { id: 'home', label: 'Accueil', icon: AppWindow, badge: false },
            { id: 'message', label: 'Messages', icon: MessageSquare, badge: true },
            { id: 'profile', label: 'Profil', icon: UserIcon, badge: false },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeBottomTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveBottomTab(tab.id as BottomTab)}
                className="flex-1 flex items-center justify-center py-2"
              >
                {isActive ? (
                  <div className="flex items-center gap-2 bg-gradient-button px-4 py-2.5 rounded-3xl shadow-glow-blue">
                    <div className="relative">
                      <Icon size={20} className="text-white" />
                      {tab.badge && (
                        <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-primary-dark" />
                      )}
                    </div>
                    <span className="text-white text-sm font-bold">{tab.label}</span>
                  </div>
                ) : (
                  <div className="relative px-3 py-2">
                    <Icon size={22} style={{ color: colors.textSecondary }} />
                    {tab.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
