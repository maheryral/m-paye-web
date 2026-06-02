import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Bell,
  CheckCheck,
  Filter,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { notificationService } from '../../../services/api';
import { Badge, Button, Card, Empty, PageHeader, Skeleton } from '../../../ui';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  icon?: string;
  color?: string;
  status?: 'READ' | 'UNREAD';
  isRead?: boolean;
  isArchived?: boolean;
  createdAt: string;
  actionType?: string;
  actionId?: string;
}

// Types orientés marchand (filtre)
const MERCHANT_TYPES = new Set([
  'QR_PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED',
  'WITHDRAWAL_PROCESSED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'REFUND_CREATED',
  'REFUND_APPROVED',
  'EMPLOYEE_ADDED',
  'EMPLOYEE_REMOVED',
  'STORE_CREATED',
  'PRODUCT_LOW_STOCK',
  'KYC_APPROVED',
  'KYC_REJECTED',
  'MERCHANT_VALIDATED',
  'MERCHANT_REJECTED',
]);

type FilterKind = 'all' | 'unread' | 'merchant';

export default function MerchantNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKind>('merchant');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(1, 50);
      const list: Notification[] = (data as any)?.items ??
        (Array.isArray(data) ? data : []);
      setItems(list);
    } catch (e: any) {
      console.error('notifications:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = items.filter((n) => {
    if (filter === 'all') return !n.isArchived;
    if (filter === 'unread') {
      return !n.isArchived && (n.status === 'UNREAD' || n.isRead === false);
    }
    // merchant
    return !n.isArchived && MERCHANT_TYPES.has(n.type);
  });

  const unreadCount = items.filter(
    (n) => !n.isArchived && (n.status === 'UNREAD' || n.isRead === false),
  ).length;

  const markRead = async (id: string) => {
    setBusy(id);
    try {
      await notificationService.markAsRead(id);
      setItems((curr) =>
        curr.map((n) =>
          n.id === id ? { ...n, status: 'READ', isRead: true } : n,
        ),
      );
    } catch (e: any) {
      console.error(e?.response?.data || e?.message);
    } finally {
      setBusy(null);
    }
  };

  const archive = async (id: string) => {
    setBusy(id);
    try {
      await notificationService.archive(id);
      setItems((curr) => curr.filter((n) => n.id !== id));
    } catch (e: any) {
      console.error(e?.response?.data || e?.message);
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    try {
      await notificationService.markAllAsRead();
      setItems((curr) =>
        curr.map((n) => ({ ...n, status: 'READ', isRead: true })),
      );
    } catch (e: any) {
      console.error(e?.response?.data || e?.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications marchand"
        subtitle="Paiements reçus, retraits, remboursements et alertes équipe"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => load()}
            >
              Rafraîchir
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCheck}
                onClick={markAll}
              >
                Tout lire
              </Button>
            )}
          </div>
        }
      />

      <Card padding="md">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter size={14} className="text-ink-muted" />
          <span className="text-xs text-ink-muted font-semibold mr-2">
            Filtrer :
          </span>
          {(
            [
              { id: 'merchant' as FilterKind, label: 'Marchand' },
              { id: 'unread' as FilterKind, label: 'Non lues' },
              { id: 'all' as FilterKind, label: 'Toutes' },
            ]
          ).map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'bg-bg-elevated text-ink-muted hover:text-ink'
                }`}
              >
                {f.label}
                {f.id === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 text-[10px]">({unreadCount})</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={Inbox}
            title="Pas de notifications"
            description="Les nouvelles activités apparaîtront ici"
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const unread = n.status === 'UNREAD' || n.isRead === false;
              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border transition flex items-start gap-3 ${
                    unread
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-bg-border bg-bg-elevated/40'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      unread
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'bg-bg-elevated text-ink-muted'
                    }`}
                  >
                    <Bell size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="text-sm font-bold truncate">{n.title}</div>
                      {unread && <Badge tone="brand">Nouveau</Badge>}
                    </div>
                    <div className="text-xs text-ink-muted line-clamp-2">
                      {n.message}
                    </div>
                    <div className="text-[10px] text-ink-dim mt-1.5">
                      {new Date(n.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {unread && (
                      <button
                        onClick={() => markRead(n.id)}
                        disabled={busy === n.id}
                        className="p-1.5 rounded-lg hover:bg-bg-base text-ink-muted hover:text-success-400"
                        title="Marquer comme lu"
                      >
                        <CheckCheck size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => archive(n.id)}
                      disabled={busy === n.id}
                      className="p-1.5 rounded-lg hover:bg-bg-base text-ink-muted hover:text-warning-400"
                      title="Archiver"
                    >
                      <Archive size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
