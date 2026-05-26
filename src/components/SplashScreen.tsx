import { Wallet } from 'lucide-react';
import { useColors } from '../contexts/ThemeContext';

export default function SplashScreen() {
  const colors = useColors();
  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: colors.background }}
    >
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{ background: `${colors.primary}20` }}
        >
          <Wallet size={56} color={colors.primary} />
        </div>
        <div className="text-3xl font-bold tracking-wide" style={{ color: colors.text }}>
          M'Paye
        </div>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${colors.primary}` }}
        />
      </div>
    </div>
  );
}
