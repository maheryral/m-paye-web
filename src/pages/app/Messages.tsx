import { Headset, Loader2, MessageCircle, MessageSquarePlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useColors } from '../../contexts/ThemeContext';
import { messagingApi, type Conversation } from '../../services/messagingApi';

function formatTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR');
}

function getOtherParticipant(c: Conversation, currentUserId?: string) {
  return c.participants?.find((p) => p.user.id !== currentUserId)?.user;
}

function displayTitle(c: Conversation, currentUserId?: string) {
  if (c.type === 'SUPPORT') return 'Support M\'Paye';
  if (c.title) return c.title;
  const other = getOtherParticipant(c, currentUserId);
  return other ? `${other.prenom} ${other.nom}`.trim() : 'Conversation';
}

export default function Messages() {
  const navigate = useNavigate();
  const colors = useColors();
  const { user } = useAuth();
  const { onMessage } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSupport, setStartingSupport] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await messagingApi.listConversations();
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });
      setConversations(list);
    } catch (e: any) {
      console.error('Erreur conversations:', e?.response?.data || e?.message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh quand un nouveau message arrive en temps réel
  useEffect(() => {
    return onMessage(() => {
      void load();
    });
  }, [onMessage, load]);

  const openConversation = (id: string) => {
    navigate(`/messages/${id}`);
  };

  const startSupportConversation = async () => {
    setStartingSupport(true);
    try {
      const res = await messagingApi.startConversation({ type: 'SUPPORT' });
      navigate(`/messages/${res.data.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible de démarrer la conversation');
    } finally {
      setStartingSupport(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader
          title="Messages"
          subtitle={
            conversations.length > 0
              ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`
              : undefined
          }
          RightIcon={MessageSquarePlus}
          onRightPress={startSupportConversation}
        />

        <div className="px-5 mt-4 space-y-3">
          {/* Carte Support rapide */}
          <button
            onClick={startSupportConversation}
            disabled={startingSupport}
            className="card flex items-center gap-3 p-4 w-full text-left hover:bg-white/5 transition-colors"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${colors.primary}20` }}
            >
              <Headset size={22} style={{ color: colors.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: colors.text }}>
                Contacter le support
              </div>
              <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                Une question ? Notre équipe vous répond
              </div>
            </div>
            {startingSupport && (
              <Loader2 className="animate-spin" size={20} style={{ color: colors.primary }} />
            )}
          </button>

          {/* Liste conversations */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <MessageCircle size={56} style={{ color: colors.textSecondary }} />
              <div className="text-sm font-semibold" style={{ color: colors.text }}>
                Aucune conversation
              </div>
              <div className="text-xs max-w-xs" style={{ color: colors.textSecondary }}>
                Vos messages apparaîtront ici. Démarrez avec le support ou contactez un bénéficiaire.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => {
                const title = displayTitle(c, user?.id);
                const isSupport = c.type === 'SUPPORT';
                const lastMsg = c.messages?.[0];
                const unread = c.unreadCount || 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className="card w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold"
                      style={{
                        background: isSupport ? '#10b981' : colors.primary,
                      }}
                    >
                      {isSupport ? (
                        <Headset size={22} />
                      ) : (
                        title.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: colors.text }}
                        >
                          {title}
                        </div>
                        <div
                          className="text-[10px] shrink-0"
                          style={{ color: colors.textSecondary }}
                        >
                          {formatTime(c.lastMessageAt)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div
                          className="text-xs truncate"
                          style={{ color: unread > 0 ? colors.text : colors.textSecondary }}
                        >
                          {lastMsg?.content || (isSupport ? 'Démarrer la conversation' : 'Pas encore de message')}
                        </div>
                        {unread > 0 && (
                          <span
                            className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                            style={{ background: colors.primary }}
                          >
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
