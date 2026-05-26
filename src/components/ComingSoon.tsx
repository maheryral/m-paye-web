import { ArrowLeft, Bell, Sparkles, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../contexts/ThemeContext';
import GradientHeader from './GradientHeader';

interface ComingSoonProps {
  title: string;
  subtitle?: string;
  /** Icône principale affichée dans la carte (lucide). */
  icon: LucideIcon;
  /** Couleur d'accent pour l'icône et le halo (hex). */
  accentColor?: string;
  /** Petite liste de features prévues, affichée en dessous. */
  features?: string[];
  /** Bouton CTA secondaire — par défaut "Retour à l'accueil" qui pousse vers /dashboard. */
}

export default function ComingSoon({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  features,
}: ComingSoonProps) {
  const navigate = useNavigate();
  const colors = useColors();
  const accent = accentColor || colors.primary;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-2xl mx-auto">
        <GradientHeader title={title} subtitle={subtitle} />

        <div className="px-5 mt-6">
          <div className="card p-8 text-center relative overflow-hidden">
            <div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
              style={{ background: `${accent}15` }}
            />
            <div
              className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full"
              style={{ background: `${accent}10` }}
            />

            <div className="relative">
              <div
                className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-5"
                style={{ background: `${accent}20` }}
              >
                <Icon size={52} style={{ color: accent }} />
              </div>

              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
                style={{ background: `${accent}20`, color: accent }}
              >
                <Sparkles size={12} />
                BIENTÔT DISPONIBLE
              </div>

              <h2 className="text-2xl font-extrabold mb-2" style={{ color: colors.text }}>
                Module en développement
              </h2>
              <p className="text-sm max-w-md mx-auto" style={{ color: colors.textSecondary }}>
                Cette fonctionnalité sera ajoutée prochainement. L'équipe finalise l'intégration avec nos partenaires.
              </p>

              {features && features.length > 0 && (
                <div className="mt-6 inline-block text-left">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: colors.textSecondary }}
                  >
                    Fonctionnalités prévues
                  </div>
                  <ul className="space-y-1.5">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: colors.text }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: accent }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-7 justify-center">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                  style={{ background: colors.primary }}
                >
                  <ArrowLeft size={16} />
                  Retour à l'accueil
                </button>
                <button
                  onClick={() => alert('Vous serez notifié dès que ce module sera disponible.')}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <Bell size={16} />
                  Me notifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
