import type { LucideIcon } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  onIconEndClick?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon: Icon, iconEnd: IconEnd, onIconEndClick, className = '', id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input ${Icon ? 'pl-9' : ''} ${IconEnd ? 'pr-9' : ''} ${
            error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''
          } ${className}`}
          {...rest}
        />
        {IconEnd && (
          <button
            type="button"
            onClick={onIconEndClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink"
          >
            <IconEnd size={16} />
          </button>
        )}
      </div>
      {(error || hint) && (
        <p
          className={`text-xs mt-1 ${
            error ? 'text-danger-400' : 'text-ink-dim'
          }`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Input;
