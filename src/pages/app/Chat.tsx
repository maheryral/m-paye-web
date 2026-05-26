import { Headset, Loader2, Send, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GradientHeader from '../../components/GradientHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useColors } from '../../contexts/ThemeContext';
import {
  messagingApi,
  type ChatMessage,
  type Conversation,
} from '../../services/messagingApi';

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colors = useColors();
  const { user } = useAuth();
  const { onMessage, connected } = useSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Scroll to bottom on new message
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      }
    });
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [conv, msgs] = await Promise.all([
        messagingApi.getConversation(id),
        messagingApi.listMessages(id, 1, 100),
      ]);
      setConversation(conv.data);
      // L'API renvoie probablement les derniers en premier — on remet dans l'ordre chronologique
      const list = Array.isArray(msgs.data) ? [...msgs.data] : [];
      list.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(list);
      // Mark as read
      try {
        await messagingApi.markRead(id);
      } catch {
        /* silencieux */
      }
    } catch (e: any) {
      console.error('Erreur chat:', e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'Conversation introuvable');
      navigate('/messages');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  // Temps réel : ajoute le message reçu s'il appartient à cette conversation
  useEffect(() => {
    return onMessage((e) => {
      if (e.conversationId !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === e.message.id)) return prev;
        return [...prev, e.message];
      });
      scrollToBottom();
      // Mark as read (l'utilisateur regarde le chat)
      if (id) {
        messagingApi.markRead(id).catch(() => {});
      }
    });
  }, [id, onMessage, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !id || sending) return;
    setSending(true);
    setText('');
    // Optimistic
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId: id,
      senderId: user?.id || 'me',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();
    try {
      const res = await messagingApi.sendMessage(id, trimmed);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? res.data : m)),
      );
    } catch (e: any) {
      // Rollback
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      alert(e?.response?.data?.message || "Envoi échoué");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  // Titre + sous-titre
  const isSupport = conversation?.type === 'SUPPORT';
  const other = conversation?.participants?.find((p) => p.user.id !== user?.id)?.user;
  const title = isSupport ? "Support M'Paye" : other ? `${other.prenom} ${other.nom}`.trim() : 'Conversation';
  const subtitle = connected ? 'En ligne' : 'Reconnexion...';

  // Group messages by day
  const groupedMessages = (() => {
    const groups: { date: string; items: ChatMessage[] }[] = [];
    let currentDay = '';
    for (const m of messages) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== currentDay) {
        currentDay = day;
        groups.push({ date: m.createdAt, items: [m] });
      } else {
        groups[groups.length - 1].items.push(m);
      }
    }
    return groups;
  })();

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div className="max-w-3xl w-full mx-auto flex flex-col flex-1 min-h-0">
        <GradientHeader
          title={title}
          subtitle={subtitle}
          showBack
          onBack={() => navigate('/messages')}
          RightIcon={connected ? Wifi : WifiOff}
        />

        {/* Avatar bar */}
        {!loading && (
          <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: colors.border, background: colors.background }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: isSupport ? '#10b981' : colors.primary }}
            >
              {isSupport ? <Headset size={20} /> : title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                {title}
              </div>
              <div className="text-xs" style={{ color: connected ? colors.success : colors.warning }}>
                {connected ? '● Connecté' : '○ Hors ligne'}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: `${colors.primary}20` }}
              >
                <Headset size={28} style={{ color: colors.primary }} />
              </div>
              <div className="text-sm font-semibold" style={{ color: colors.text }}>
                Démarrez la conversation
              </div>
              <div className="text-xs text-center max-w-xs" style={{ color: colors.textSecondary }}>
                {isSupport
                  ? 'Décrivez votre problème, notre équipe vous répond rapidement.'
                  : 'Envoyez un premier message ci-dessous.'}
              </div>
            </div>
          ) : (
            groupedMessages.map((group, gi) => (
              <div key={gi}>
                <div className="flex justify-center my-3">
                  <span
                    className="text-[11px] font-medium px-3 py-1 rounded-full"
                    style={{ background: colors.card, color: colors.textSecondary }}
                  >
                    {formatDateLabel(group.date)}
                  </span>
                </div>
                {group.items.map((m, i) => {
                  const isMe = m.senderId === user?.id;
                  const prev = group.items[i - 1];
                  const showAvatar = !isMe && (!prev || prev.senderId !== m.senderId);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      {!isMe && (
                        <div className="w-7 shrink-0">
                          {showAvatar && (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                              style={{ background: isSupport ? '#10b981' : colors.primary }}
                            >
                              {(m.sender?.prenom?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-3.5 py-2 ${
                          isMe
                            ? 'rounded-2xl rounded-br-md text-white'
                            : 'rounded-2xl rounded-bl-md'
                        }`}
                        style={{
                          background: isMe ? colors.primary : colors.card,
                          color: isMe ? '#fff' : colors.text,
                        }}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                        <div
                          className="text-[10px] mt-0.5 text-right"
                          style={{
                            color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                          }}
                        >
                          {formatMessageTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div
          className="border-t p-3"
          style={{ borderColor: colors.border, background: colors.background }}
        >
          <div
            className="flex items-end gap-2 px-3 py-2 rounded-2xl border"
            style={{ borderColor: colors.border, background: colors.card }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Écrire un message..."
              className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-slate-500"
              style={{ color: colors.text, maxHeight: 120 }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-opacity"
              style={{
                background: colors.primary,
                opacity: !text.trim() || sending ? 0.5 : 1,
              }}
              aria-label="Envoyer"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
