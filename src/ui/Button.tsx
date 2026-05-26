import { Loader2, type LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    icon: Icon,
    iconEnd: IconEnd,
    fullWidth,
    children,
    className = '',
    disabled,
    ...rest
  },
  ref,
) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`btn btn-${size} btn-${variant} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : (
        Icon && <Icon size={iconSize} />
      )}
      {children}
      {!loading && IconEnd && <IconEnd size={iconSize} />}
    </button>
  );
});

export default Button;
