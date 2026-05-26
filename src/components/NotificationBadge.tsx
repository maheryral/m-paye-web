import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/api';

interface Props {
  size?: number;
  borderColor?: string;
}

export default function NotificationBadge({ size = 18, borderColor = '#1e40af' }: Props) {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await notificationService.getUnreadCount();
        if (!cancelled) {
          setCount(Number(data?.count ?? data ?? 0) || 0);
        }
      } catch {
        /* silencieux */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (count <= 0) return null;

  return (
    <span
      className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        border: `2px solid ${borderColor}`,
      }}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
