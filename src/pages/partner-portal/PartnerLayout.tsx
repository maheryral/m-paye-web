// src/pages/partner-portal/PartnerLayout.tsx
// Shell du portail partenaire : sidebar + topbar + <Outlet />.

import {
  Activity,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../contexts/PartnerAuthContext';

const NAV = [
  { to: '/partner-portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/partner-portal/trades', label: 'Paiements', icon: CreditCard },
  { to: '/partner-portal/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/partner-portal/activities', label: 'Audit log', icon: Activity },
  { to: '/partner-portal/settings', label: 'Paramètres', icon: Settings },
];

export default function PartnerLayout() {
  const { partner, logout } = usePartnerAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/partner-portal/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800">
          <Link to="/partner-portal" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-bold leading-tight">M'Paye</p>
              <p className="text-xs text-slate-400">Partner Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Partner identity + logout */}
        <div className="p-4 border-t border-slate-800">
          {partner && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">
                {partner.name}
              </p>
              <p className="text-xs text-slate-400 font-mono truncate">
                {partner.appId}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
