import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gradient?: boolean;
}

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({
  interactive,
  padding = 'md',
  gradient,
  className = '',
  children,
  ...rest
}: CardProps) {
  const base = interactive ? 'card-interactive' : 'card';
  const grad = gradient
    ? 'relative overflow-hidden bg-gradient-balance border-brand-500/20'
    : '';
  return (
    <div className={`${base} ${PADDING[padding]} ${grad} ${className}`} {...rest}>
      {gradient && (
        <>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-white/[0.05] pointer-events-none" />
          <div className="relative">{children}</div>
        </>
      )}
      {!gradient && children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-ink truncate">{title}</h3>
        {subtitle && (
          <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
