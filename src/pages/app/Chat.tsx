import {
  ArrowLeft,
  CheckCheck,
  Headset,
  Loader2,
  MoreVertical,
  Paperclip,
  Send,
  Shield,
  Smile,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import {
  messagingApi,
  type ChatMessage,
  type Conversation,
} from '../../services/messagingApi';
import { Avatar, Badge, Button, Card } from '../../ui';

function formatTime(iso: string) {
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
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onMessage, connected } = useSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
      const list = Array.isArray(msgs.data) ? [...msgs.data] : [];
      list.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(list);
      try {
        await messagingApi.markRead(id);
      } catch {
        /* */
      }
    } catch (e: any) {
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

  // Real-time
  useEffect(() => {
    return onMessage((e) => {
      if (e.conversationId !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === e.message.id)) return prev;
        return [...prev, e.message];
      });
      scrollToBottom();
      if (id) {
        messagingApi.markRead(id).catch(() => {});
      }
    });
  }, [id, onMessage, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !id || sending) return;
    setSending(true);
    setText('');
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
      const r = await messagingApi.sendMessage(id, trimmed);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? r.data : m)),
      );
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      alert(e?.response?.data?.message || 'Envoi échoué');
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

  // Conversation meta
  const isSupport = conversation?.type === 'SUPPORT';
  const other = conversation?.participants?.find((p) => p.user.id !== user?.id)?.user;
  const title = isSupport
    ? "Support M'Paye"
    : other
      ? `${other.prenom} ${other.nom}`.trim()
      : 'Conversation';
  const subtitle = isSupport
    ? 'Équipe officielle · répond en ~15 min'
    : other?.email;

  // Group messages by day
  const grouped = useMemo(() => {
    const groups: { date: string; items: ChatMessage[] }[] = [];
    let current = '';
    for (const m of messages) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== current) {
        current = day;
        groups.push({ date: m.createdAt, items: [m] });
      } else {
        groups[groups.length - 1].items.push(m);
      }
    }
    return groups;
  }, [messages]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-[calc(100vh-9rem)]">
      {/* ===== Main chat (3/4) ===== */}
      <Card padding="none" className="flex flex-col lg:col-span-3 min-h-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 p-4 border-b border-bg-border shrink-0">
          <button
            onClick={() => navigate('/messages')}
            className="lg:hidden p-1.5 rounded-lg hover:bg-bg-subtle text-ink-muted"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          {isSupport ? (
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-success-500 to-cyan-500 text-white flex items-center justify-center">
                <Headset size={18} />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success-500 border-2 border-bg-surface" />
            </div>
          ) : (
            <div className="relative shrink-0">
              <Avatar name={title} size="md" />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-surface ${
                  connected ? 'bg-success-500' : 'bg-ink-dim'
                }`}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate">{title}</span>
              {isSupport && (
                <Badge tone="success">
                  <Sparkles size={9} className="mr-0.5" />
                  Officiel
                </Badge>
              )}
            </div>
            <div
              className={`text-[11px] truncate flex items-center gap-1.5 ${
                connected ? 'text-success-400' : 'text-warning-400'
              }`}
            >
              {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {subtitle || (connected ? 'En ligne' : 'Reconnexion...')}
            </div>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-bg-subtle text-ink-muted"
            title="Plus"
          >
            <MoreVertical size={18} />
          </button>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-bg-elevated/30 p-4 space-y-3"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-brand-soft border border-brand-500/30 flex items-center justify-center mb-4">
                {isSupport ? (
                  <Headset size={26} className="text-brand-300" />
                ) : (
                  <Sparkles size={26} className="text-brand-300" />
                )}
              </div>
              <div className="text-sm font-bold mb-1">Démarrez la conversation</div>
              <div className="text-xs text-ink-muted max-w-xs">
                {isSupport
                  ? 'Décrivez votre problème en détail, notre équipe vous répond rapidement.'
                  : 'Envoyez votre premier message ci-dessous.'}
              </div>
            </div>
          ) : (
            grouped.map((g, gi) => (
              <div key={gi}>
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-bg-surface border border-bg-border text-ink-muted">
                    {formatDateLabel(g.date)}
                  </span>
                </div>
                {g.items.map((m, i) => {
                  const isMe = m.senderId === user?.id;
                  const prev = g.items[i - 1];
                  const sameSender = prev?.senderId === m.senderId;
                  const showAvatar = !isMe && !sameSender;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${
                        isMe ? 'flex-row-reverse' : ''
                      } ${sameSender ? 'mt-0.5' : 'mt-3'}`}
                    >
                      {!isMe && (
                        <div className="w-8 shrink-0">
                          {showAvatar &&
                            (isSupport ? (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success-500 to-cyan-500 text-white flex items-center justify-center">
                                <Headset size={14} />
                              </div>
                            ) : (
                              <Avatar
                                name={m.sender?.prenom || title}
                                size="xs"
                              />
                            ))}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-3.5 py-2 ${
                          isMe
                            ? `rounded-2xl ${sameSender ? 'rounded-br-md' : 'rounded-br-sm'} bg-gradient-brand text-white shadow-glow-soft`
                            : `rounded-2xl ${sameSender ? 'rounded-bl-md' : 'rounded-bl-sm'} bg-bg-surface border border-bg-border`
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {m.content}
                        </div>
                        <div
                          className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                            isMe ? 'text-white/70' : 'text-ink-dim'
                          }`}
                        >
                          {formatTime(m.createdAt)}
                          {isMe && (
                            <CheckCheck
                              size={11}
                              className={
                                m.id.startsWith('temp-')
                                  ? 'opacity-50'
                                  : 'opacity-90'
                              }
                            />
                          )}
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
        <div className="p-3 border-t border-bg-border shrink-0">
          <div className="flex items-end gap-2">
            <button
              className="p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-ink-muted hover:text-ink"
              title="Pièce jointe"
              type="button"
            >
              <Paperclip size={16} />
            </button>
            <div className="flex-1 relative flex items-end gap-2 px-3 py-2 rounded-2xl bg-bg-elevated border border-bg-border focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Écrire un message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-ink-dim leading-relaxed py-1"
                style={{ maxHeight: 140 }}
              />
              <button
                className="p-1 rounded-lg text-ink-dim hover:text-ink"
                title="Emoji"
                type="button"
              >
                <Smile size={16} />
              </button>
            </div>
            <Button
              variant="primary"
              size="lg"
              icon={Send}
              disabled={!text.trim() || sending}
              loading={sending}
              onClick={handleSend}
              className="!px-3.5 shrink-0"
            />
          </div>
          <div className="text-[10px] text-ink-dim mt-2 px-1 flex items-center gap-1">
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated border border-bg-border text-[9px] font-mono">
                ⏎
              </kbd>{' '}
              pour envoyer ·{' '}
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated border border-bg-border text-[9px] font-mono">
              ⇧⏎
            </kbd>{' '}
            pour nouvelle ligne
          </div>
        </div>
      </Card>

      {/* ===== Side rail (1/4) — hidden on mobile ===== */}
      <Card padding="md" className="hidden lg:flex flex-col gap-5">
        {/* Profile */}
        <div className="text-center pb-4 border-b border-bg-border">
          {isSupport ? (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success-500 to-cyan-500 text-white flex items-center justify-center mx-auto mb-3">
              <Headset size={32} />
            </div>
          ) : (
            <Avatar name={title} size="xl" className="mx-auto mb-3" />
          )}
          <div className="text-base font-bold">{title}</div>
          {isSupport ? (
            <Badge tone="success" className="mt-2">
              <Sparkles size={10} className="mr-0.5" />
              Compte officiel
            </Badge>
          ) : (
            <div className="text-xs text-ink-muted mt-1">{other?.email}</div>
          )}
        </div>

        {/* Info */}
        <div>
          <h3 className="section-title mb-2">À propos</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-muted">Type</span>
              <span className="text-ink font-medium">
                {isSupport ? 'Support officiel' : 'Conversation directe'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Messages</span>
              <span className="text-ink font-medium">{messages.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Statut</span>
              <span
                className={`font-medium ${
                  connected ? 'text-success-400' : 'text-warning-400'
                }`}
              >
                {connected ? '● Connecté' : '○ Hors ligne'}
              </span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="mt-auto p-3 rounded-xl bg-bg-elevated/40 border border-bg-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield size={12} className="text-success-400" />
            <span className="text-xs font-bold">Conversation chiffrée</span>
          </div>
          <p className="text-[10px] text-ink-muted leading-relaxed">
            Les messages sont chiffrés en transit. Ne partagez jamais votre mot de passe ou code PIN, même au support.
          </p>
        </div>
      </Card>
    </div>
  );
}
