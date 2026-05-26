import {
  CheckCheck,
  Filter,
  Headset,
  MessageSquare,
  MessageSquarePlus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { messagingApi, type Conversation } from '../../services/messagingApi';
import { Avatar, Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../ui';

type Filter = 'all' | 'unread' | 'support';

function formatTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hier';
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff < 7) return `${diff}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function displayTitle(c: Conversation, uid?: string) {
  if (c.type === 'SUPPORT') return "Support M'Paye";
  if (c.title) return c.title;
  const other = c.participants?.find((p) => p.user.id !== uid)?.user;
  return other ? `${other.prenom} ${other.nom}`.trim() : 'Conversation';
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onMessage } = useSocket();

  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await messagingApi.listConversations();
      const list = Array.isArray(r.data) ? r.data : [];
      list.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time refresh
  useEffect(() => {
    return onMessage(() => {
      void load();
    });
  }, [onMessage, load]);

  const startSupport = async () => {
    setStarting(true);
    try {
      const r = await messagingApi.startConversation({ type: 'SUPPORT' });
      navigate(`/messages/${r.data.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible de démarrer');
    } finally {
      setStarting(false);
    }
  };

  // Filtered
  const filtered = useMemo(() => {
    let res = items;
    if (filter === 'unread') res = res.filter((c) => (c.unreadCount || 0) > 0);
    if (filter === 'support') res = res.filter((c) => c.type === 'SUPPORT');
    if (search) {
      const q = search.toLowerCase();
      res = res.filter((c) => {
        const title = displayTitle(c, user?.id).toLowerCase();
        const last = c.messages?.[0]?.content?.toLowerCase() || '';
        return title.includes(q) || last.includes(q);
      });
    }
    return res;
  }, [items, filter, search, user?.id]);

  const totalUnread = items.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Messages"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} message${totalUnread > 1 ? 's' : ''} non lu${totalUnread > 1 ? 's' : ''}`
            : 'Vos conversations'
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={MessageSquarePlus}
            loading={starting}
            onClick={startSupport}
          >
            Contacter le support
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Conversations list (2/3) === */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter bar */}
          <Card padding="md">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  icon={Search}
                  placeholder="Rechercher une conversation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl shrink-0">
                {[
                  { id: 'all' as Filter, label: 'Toutes' },
                  { id: 'unread' as Filter, label: 'Non lues' },
                  { id: 'support' as Filter, label: 'Support' },
                ].map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Liste */}
          <Card padding="none">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty
                icon={search || filter !== 'all' ? Filter : MessageSquare}
                title={
                  search || filter !== 'all'
                    ? 'Aucun résultat'
                    : 'Aucune conversation'
                }
                description={
                  search || filter !== 'all'
                    ? "Essayez d'ajuster vos filtres"
                    : 'Démarrez une discussion avec le support ou un bénéficiaire'
                }
                action={
                  !search && filter === 'all' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Headset}
                      onClick={startSupport}
                      loading={starting}
                    >
                      Contacter le support
                    </Button>
                  ) : undefined
                }
                className="py-16"
              />
            ) : (
              <ul className="divide-y divide-bg-border">
                {filtered.map((c) => {
                  const title = displayTitle(c, user?.id);
                  const isSupport = c.type === 'SUPPORT';
                  const last = c.messages?.[0];
                  const unread = c.unreadCount || 0;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => navigate(`/messages/${c.id}`)}
                        className={`w-full flex items-start gap-3 p-4 hover:bg-bg-elevated/50 transition-colors text-left ${
                          unread > 0 ? 'bg-brand-500/5' : ''
                        }`}
                      >
                        <div className="relative shrink-0">
                          {isSupport ? (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success-500 to-cyan-500 text-white font-bold flex items-center justify-center">
                              <Headset size={20} />
                            </div>
                          ) : (
                            <Avatar name={title} size="md" />
                          )}
                          {unread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-bg-surface">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-sm truncate ${
                                  unread > 0 ? 'font-bold text-ink' : 'font-semibold text-ink'
                                }`}
                              >
                                {title}
                              </span>
                              {isSupport && (
                                <Badge tone="success" className="shrink-0">
                                  <Sparkles size={9} className="mr-0.5" />
                                  Officiel
                                </Badge>
                              )}
                            </div>
                            <span
                              className={`text-[11px] shrink-0 ${
                                unread > 0 ? 'text-brand-300 font-semibold' : 'text-ink-dim'
                              }`}
                            >
                              {formatTime(c.lastMessageAt)}
                            </span>
                          </div>
                          <div
                            className={`text-xs truncate ${
                              unread > 0 ? 'text-ink' : 'text-ink-muted'
                            }`}
                          >
                            {last?.senderId === user?.id && (
                              <CheckCheck size={11} className="inline mr-1 text-ink-dim" />
                            )}
                            {last?.content ||
                              (isSupport
                                ? 'Démarrer la conversation'
                                : 'Pas encore de message')}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* === Side rail (1/3) === */}
        <div className="space-y-4">
          {/* Support card */}
          <Card padding="md" className="bg-gradient-to-br from-success-500/15 to-cyan-500/15 border-success-500/30">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-success-500 to-cyan-500 flex items-center justify-center shrink-0">
                <Headset size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Support M'Paye</div>
                <div className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Notre équipe est disponible 7j/7 pour vous aider.
                  Réponse en moyenne sous 15 min.
                </div>
                <Button
                  variant="success"
                  size="sm"
                  className="mt-3"
                  loading={starting}
                  onClick={startSupport}
                  fullWidth
                >
                  Démarrer une discussion
                </Button>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card padding="md">
            <h3 className="section-title mb-3">Aperçu</h3>
            <div className="space-y-3">
              <StatRow label="Conversations" value={items.length} />
              <StatRow
                label="Non lues"
                value={totalUnread}
                accent={totalUnread > 0}
              />
              <StatRow
                label="Avec support"
                value={items.filter((c) => c.type === 'SUPPORT').length}
              />
            </div>
          </Card>

          {/* Tips */}
          <Card padding="md">
            <h3 className="section-title mb-3">Bonnes pratiques</h3>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-300 mt-1.5 shrink-0" />
                <span>L'équipe officielle a un badge violet "Officiel"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-300 mt-1.5 shrink-0" />
                <span>Ne partagez jamais votre mot de passe ou code PIN</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-300 mt-1.5 shrink-0" />
                <span>Les messages sont chiffrés de bout en bout</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-muted">{label}</span>
      <span
        className={`text-sm font-bold ${accent ? 'text-brand-300' : 'text-ink'}`}
      >
        {value}
      </span>
    </div>
  );
}
