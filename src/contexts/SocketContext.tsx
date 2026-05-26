import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { notificationService } from '../services/api';
import { secureStorage } from '../services/storage';
import { useAuth } from './AuthContext';

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  icon?: string;
  color?: string;
  actionType?: string;
  actionId?: string;
  isRead?: boolean;
  createdAt: string;
}

export interface RealtimeMessageEvent {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    sender?: { id: string; prenom: string; nom: string; role: string };
  };
}

type NotifListener = (n: RealtimeNotification) => void;
type MsgListener = (e: RealtimeMessageEvent) => void;

interface SocketContextType {
  connected: boolean;
  unreadCount: number;
  lastNotification: RealtimeNotification | null;
  onNotification: (cb: NotifListener) => () => void;
  onMessage: (cb: MsgListener) => () => void;
  refreshUnreadCount: () => Promise<void>;
}

const Ctx = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const notifListeners = useRef<Set<NotifListener>>(new Set());
  const msgListeners = useRef<Set<MsgListener>>(new Set());
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<RealtimeNotification | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res: any = await notificationService.getUnreadCount();
      const c = typeof res === 'number' ? res : (res?.count ?? 0);
      setUnreadCount(Number(c) || 0);
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      if (!user) return;
      const token = await secureStorage.getItem('accessToken');
      if (!token || cancelled) return;

      const socket = io(`${API_BASE_URL}/notifications`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: Infinity,
      });

      socket.on('connect', () => {
        setConnected(true);
        void refreshUnreadCount();
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', (err) => {
        console.warn('Socket connect_error:', err.message);
      });

      socket.on('notification:new', (n: RealtimeNotification) => {
        setLastNotification(n);
        notifListeners.current.forEach((cb) => cb(n));
      });

      socket.on('notification:unread-count', ({ count }: { count: number }) => {
        setUnreadCount(Number(count) || 0);
      });

      socket.on('message:new', (e: RealtimeMessageEvent) => {
        msgListeners.current.forEach((cb) => cb(e));
      });

      socketRef.current = socket;
    };

    void connect();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [user, refreshUnreadCount]);

  const onNotification = useCallback((cb: NotifListener) => {
    notifListeners.current.add(cb);
    return () => {
      notifListeners.current.delete(cb);
    };
  }, []);

  const onMessage = useCallback((cb: MsgListener) => {
    msgListeners.current.add(cb);
    return () => {
      msgListeners.current.delete(cb);
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        connected,
        unreadCount,
        lastNotification,
        onNotification,
        onMessage,
        refreshUnreadCount,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSocket doit être utilisé dans SocketProvider');
  return ctx;
};
