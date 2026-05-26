import type { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'cyan';

const TONES: Record<Tone, string> = {
  neutral: 'bg-bg-elevated text-ink-muted border-bg-border',
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  success: 'bg-success-500/15 text-success-400 border-success-500/30',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
  danger: 'bg-danger-500/15 text-danger-400 border-danger-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export default function Badge({ tone = 'neutral', children, className = '', icon }: BadgeProps) {
  return (
    <span className={`badge border ${TONES[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
