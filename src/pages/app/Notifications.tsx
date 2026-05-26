import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Loader2,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import { notificationService } from '../../services/api';

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

const PAGE_SIZE = 20;

function iconForType(type: string): LucideIcon {
  switch (type) {
    case 'TRANSFER_RECEIVED':
      return ArrowDownCircle;
    case 'TRANSFER_SENT':
      return ArrowUpCircle;
    case 'DEPOSIT_SUCCESS':
      return CheckCircle2;
    case 'SECURITY_ALERT':
      return Shield;
    case 'KYC_REMINDER':
      return UserIcon;
    default:
      return Bell;
  }
}

function colorForType(type: string): string {
  switch (type) {
    case 'TRANSFER_RECEIVED':
    case 'TRANSFER_SENT':
    case 'DEPOSIT_SUCCESS':
      return '#3b82f6';
    case 'SECURITY_ALERT':
      return '#ef4444';
    case 'KYC_REMINDER':
      return '#f59e0b';
    default:
      return '#64748b';
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours} h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return date.toLocaleDateString('fr-FR');
}

export default function Notifications() {
  const navigate = useNavigate();
  const colors = useColors();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadNotifications(true);
  }, []);

  const loadNotifications = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }
      const currentPage = reset ? 1 : page;
      const response = await notificationService.getNotifications(currentPage, PAGE_SIZE);
      const data: Notification[] = response?.notifications || [];
      const totalCount: number = response?.total || 0;
      setTotal(totalCount);
      setHasMore(
        data.length === PAGE_SIZE &&
          notifications.length + data.length < totalCount,
      );
      if (reset) {
        setNotifications(data);
        setPage(2);
      } else {
        setNotifications((prev) => [...prev, ...data]);
        setPage((p) => p + 1);
      }
    } catch (error: any) {
      console.error('Erreur chargement notifications:', error?.response?.data || error?.message);
      if (reset) {
        setNotifications([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (e) {
      console.error('Erreur marquage lu:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Erreur marquage tout lu:', e);
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) void markAsRead(n.id);
    if (n.actionType === 'TRANSACTION') navigate('/history');
    else if (n.actionType === 'KYC') navigate('/complete-profile');
    else if (n.actionType === 'SECURITY') navigate('/security');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Notifications"
          subtitle={total > 0 ? `${total} notification${total > 1 ? 's' : ''}` : undefined}
          RightIcon={unreadCount > 0 ? CheckCheck : undefined}
          onRightPress={unreadCount > 0 ? markAllAsRead : undefined}
        />

        <div className="px-5 mt-4">
          {unreadCount > 0 && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-4"
              style={{ background: `${colors.primary}15` }}
            >
              <Bell size={18} style={{ color: colors.primary }} />
              <span className="text-sm font-medium" style={{ color: colors.primary }}>
                {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue
                {unreadCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <BellOff size={64} style={{ color: colors.textSecondary }} />
              <div className="text-base" style={{ color: colors.textSecondary }}>
                Aucune notification
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                {notifications.map((n) => {
                  const Icon = iconForType(n.type);
                  const color = colorForType(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className="card flex items-center gap-3 p-3.5 text-left hover:bg-bg-card/70 transition-colors"
                      style={
                        !n.isRead
                          ? {
                              background: `${colors.primary}10`,
                              borderLeftWidth: 3,
                              borderLeftColor: colors.primary,
                            }
                          : undefined
                      }
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${color}20` }}
                      >
                        <Icon size={22} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{n.title}</div>
                        <div
                          className="text-xs mt-0.5 line-clamp-2"
                          style={{ color: colors.textSecondary }}
                        >
                          {n.message}
                        </div>
                        <div
                          className="text-[11px] mt-1"
                          style={{ color: colors.textSecondary }}
                        >
                          {formatDate(n.createdAt)}
                        </div>
                      </div>
                      {!n.isRead && (
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: colors.primary }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {hasMore && (
                <button
                  onClick={() => loadNotifications(false)}
                  disabled={loadingMore}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: `${colors.primary}15`,
                    color: colors.primary,
                  }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
