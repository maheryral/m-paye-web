import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ScanFace,
  Smile,
  X,
} from 'lucide-react';
import { kycService } from '../../services/api';
import { Button, Card, PageHeader } from '../../ui';

type Dir = 'front' | 'right' | 'left' | 'up' | 'down';

const META: Record<
  Dir,
  { label: string; hint: string; icon: typeof Smile }
> = {
  front: { label: 'Regardez droit devant', hint: 'Visage centré, bien éclairé', icon: Smile },
  right: { label: 'Tournez la tête à droite', hint: 'Doucement vers la droite', icon: ArrowRight },
  left: { label: 'Tournez la tête à gauche', hint: 'Doucement vers la gauche', icon: ArrowLeft },
  up: { label: 'Levez la tête', hint: 'Regardez vers le haut', icon: ArrowUp },
  down: { label: 'Baissez la tête', hint: 'Regardez vers le bas', icon: ArrowDown },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const COUNTDOWN = 3;

export default function FaceLiveness() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<{ direction: Dir; image: string }[]>([]);

  const [sequence] = useState<Dir[]>(() => [
    'front',
    ...shuffle<Dir>(['right', 'left', 'up', 'down']),
  ]);
  const [stepIndex, setStepIndex] = useState(0);
  const [count, setCount] = useState(COUNTDOWN);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const current = sequence[stepIndex];

  // Démarre la caméra
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setError(
          "Impossible d'accéder à la caméra. Autorisez l'accès dans votre navigateur.",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      await kycService.submitLiveness({
        level: 'INTERMEDIATE',
        sequence,
        frames: framesRef.current,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'envoi");
    } finally {
      setSubmitting(false);
    }
  }, [sequence]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Downscale : largeur max 640px pour limiter la taille du payload
    const MAX_W = 640;
    const scale = Math.min(1, MAX_W / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    framesRef.current.push({ direction: current, image: dataUrl });

    if (stepIndex + 1 < sequence.length) {
      setStepIndex((i) => i + 1);
      setCount(COUNTDOWN);
    } else {
      void submit();
    }
  }, [current, stepIndex, sequence.length, submit]);

  // Décompte + capture auto
  useEffect(() => {
    if (!ready || error || submitting || done) return;
    if (count <= 0) {
      capture();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, ready, error, submitting, done, capture]);

  if (done) {
    return (
      <div className="animate-fade-in max-w-xl mx-auto">
        <Card padding="lg" className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-4">
            <CheckCircle2 size={48} className="text-success-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Vérification envoyée ✅</h2>
          <p className="text-sm text-ink-muted mb-5">
            Votre visage a été capturé. Un agent va vérifier votre dossier sous peu.
          </p>
          <Button variant="primary" size="md" fullWidth onClick={() => navigate('/profile')}>
            Terminé
          </Button>
        </Card>
      </div>
    );
  }

  const Meta = META[current];
  const StepIcon = Meta.icon;

  return (
    <div className="animate-fade-in max-w-xl mx-auto space-y-5">
      <PageHeader
        title="Vérification du visage"
        subtitle="Suivez les instructions à l'écran"
        actions={
          <Button variant="ghost" size="sm" icon={X} onClick={() => navigate('/profile')}>
            Annuler
          </Button>
        }
      />

      <Card padding="md">
        {error ? (
          <div className="text-center py-8">
            <ScanFace size={40} className="mx-auto text-ink-dim mb-3" />
            <p className="text-sm text-danger-400 mb-4">{error}</p>
            <Button variant="secondary" size="md" onClick={() => navigate('/profile')}>
              Retour
            </Button>
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-w-sm mx-auto">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Cadre ovale */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-60 rounded-[50%] border-[3px] border-white/80" />
              </div>
              {/* Badge étape */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-bold px-3 py-1 rounded-full">
                Étape {stepIndex + 1}/{sequence.length}
              </div>
            </div>

            <div className="text-center mt-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand mx-auto flex items-center justify-center text-white mb-2">
                <StepIcon size={26} />
              </div>
              <div className="text-lg font-bold">{Meta.label}</div>
              <div className="text-xs text-ink-muted">{Meta.hint}</div>
              <div className="text-4xl font-black mt-3 text-brand-300">
                {submitting ? '…' : count > 0 ? count : '📸'}
              </div>
              {submitting && (
                <div className="text-xs text-ink-muted mt-1">Envoi en cours…</div>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mt-4">
              {sequence.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i < stepIndex
                      ? 'w-2 bg-success-500'
                      : i === stepIndex
                        ? 'w-6 bg-brand-400'
                        : 'w-2 bg-bg-border'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
