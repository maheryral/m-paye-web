import {
  ArrowDownLeft,
  ArrowUpRight,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Inbox,
  RefreshCcw,
  Shield,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { notificationService } from '../../services/api';
import { Badge, Button, Card, Empty, PageHeader, Skeleton } from '../../ui';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionType?: string;
  actionId?: string;
}

type Category = 'all' | 'unread' | 'transfers' | 'security' | 'system';

interface CategoryDef {
  id: Category;
  label: string;
  match: (n: Notification) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'unread', label: 'Non lues', match: (n) => !n.isRead },
  {
    id: 'transfers',
    label: 'Transferts',
    match: (n) =>
      n.type === 'TRANSFER_RECEIVED' ||
      n.type === 'TRANSFER_SENT' ||
      n.type === 'DEPOSIT_SUCCESS',
  },
  {
    id: 'security',
    label: 'Sécurité',
    match: (n) => n.type === 'SECURITY_ALERT' || n.type === 'KYC_REMINDER',
  },
  {
    id: 'system',
    label: 'Système',
    match: (n) =>
      !['TRANSFER_RECEIVED', 'TRANSFER_SENT', 'DEPOSIT_SUCCESS', 'SECURITY_ALERT', 'KYC_REMINDER'].includes(n.type),
  },
];

function iconForType(type: string): { icon: LucideIcon; tone: 'success' | 'danger' | 'warning' | 'brand' | 'neutral' } {
  switch (type) {
    case 'TRANSFER_RECEIVED':
    case 'DEPOSIT_SUCCESS':
      return { icon: ArrowDownLeft, tone: 'success' };
    case 'TRANSFER_SENT':
      return { icon: ArrowUpRight, tone: 'brand' };
    case 'SECURITY_ALERT':
      return { icon: Shield, tone: 'danger' };
    case 'KYC_REMINDER':
      return { icon: UserIcon, tone: 'warning' };
    default:
      return { icon: CheckCircle2, tone: 'neutral' };
  }
}

function formatGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Aujourd'hui";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hier';
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff < 7) return 'Cette semaine';
  if (diff < 30) return 'Ce mois-ci';
  return 'Plus ancien';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { refreshUnreadCount } = useSocket();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await notificationService.getNotifications(1, 100);
      setItems(r?.notifications || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      void refreshUnreadCount();
    } catch {
      alert('Échec du marquage');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      void refreshUnreadCount();
    } catch {
      /* */
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) void markAsRead(n.id);
    if (n.actionType === 'TRANSACTION') navigate('/history');
    else if (n.actionType === 'KYC') navigate('/complete-profile');
    else if (n.actionType === 'SECURITY') navigate('/security');
  };

  // Stats per category
  const stats = useMemo(() => {
    const s: Record<Category, number> = {
      all: items.length,
      unread: 0,
      transfers: 0,
      security: 0,
      system: 0,
    };
    for (const n of items) {
      if (!n.isRead) s.unread++;
      for (const c of CATEGORIES) {
        if (c.id === 'all' || c.id === 'unread') continue;
        if (c.match(n)) s[c.id]++;
      }
    }
    return s;
  }, [items]);

  // Filtered
  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category)!;
    return items.filter(cat.match);
  }, [items, category]);

  // Grouped by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    for (const n of filtered) {
      const label = formatGroup(n.createdAt);
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push(n);
      else groups.push({ label, items: [n] });
    }
    return groups;
  }, [filtered]);

  const unreadCount = stats.unread;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
            : 'Tout est à jour'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={load} />
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCheck}
                onClick={markAllAsRead}
              >
                Tout marquer lu
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* === Sidebar categories === */}
        <Card padding="md" className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start">
          <h3 className="section-title mb-3">Catégories</h3>
          <nav className="space-y-1">
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              const count = stats[c.id];
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gradient-brand-soft text-ink border border-brand-500/30'
                      : 'text-ink-muted hover:text-ink hover:bg-bg-subtle border border-transparent'
                  }`}
                >
                  <span>{c.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'bg-bg-elevated text-ink-muted'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* === Main list === */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card padding="lg">
              <Empty
                icon={BellOff}
                title={
                  category === 'all'
                    ? 'Aucune notification'
                    : `Aucune notification dans "${CATEGORIES.find((c) => c.id === category)?.label}"`
                }
                description="Vos notifications apparaîtront ici dès qu'il y aura quelque chose à signaler"
                className="py-16"
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <section key={g.label}>
                  <h3 className="section-title mb-2 px-1">{g.label}</h3>
                  <div className="space-y-2">
                    {g.items.map((n) => {
                      const { icon: Icon, tone } = iconForType(n.type);
                      const TONE_BG = {
                        success: 'bg-success-bg text-success-400',
                        danger: 'bg-danger-bg text-danger-400',
                        warning: 'bg-warning-bg text-warning-400',
                        brand: 'bg-brand-500/15 text-brand-300',
                        neutral: 'bg-bg-elevated text-ink-muted',
                      }[tone];
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleClick(n)}
                          className={`w-full text-left card-interactive p-4 flex items-start gap-3 relative ${
                            !n.isRead
                              ? 'bg-brand-500/5 border-l-2 border-l-brand-500'
                              : ''
                          }`}
                        >
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${TONE_BG}`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="text-sm font-semibold text-ink truncate">
                                {n.title}
                              </div>
                              <div className="text-[11px] text-ink-dim shrink-0">
                                {formatTime(n.createdAt)}
                              </div>
                            </div>
                            <div className="text-xs text-ink-muted line-clamp-2">
                              {n.message}
                            </div>
                          </div>
                          {!n.isRead && (
                            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
