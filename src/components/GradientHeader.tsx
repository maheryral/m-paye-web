import { ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  RightIcon?: LucideIcon;
  onRightPress?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export default function GradientHeader({
  title,
  subtitle,
  RightIcon,
  onRightPress,
  showBack = true,
  onBack,
}: GradientHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className="relative bg-gradient-banner px-4 pt-6 pb-7 overflow-hidden rounded-b-2xl md:rounded-b-none">
      <div className="absolute -top-12 -right-14 w-48 h-48 rounded-full bg-white/[0.07]" />
      <div className="absolute bottom-3 -left-10 w-32 h-32 rounded-full bg-white/[0.05]" />

      <div className="relative flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
            aria-label="Retour"
          >
            <ChevronLeft size={22} className="text-white" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-xl font-extrabold truncate">{title}</h1>
          {subtitle && <p className="text-white/80 text-xs mt-0.5 truncate">{subtitle}</p>}
        </div>
        {RightIcon && onRightPress && (
          <button
            onClick={onRightPress}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
          >
            <RightIcon size={20} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
