import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function Empty({ icon: Icon, title, description, action, className = '' }: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 gap-3 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center text-ink-dim">
        <Icon size={26} />
      </div>
      <div className="text-base font-semibold text-ink">{title}</div>
      {description && (
        <div className="text-sm text-ink-muted max-w-xs">{description}</div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
