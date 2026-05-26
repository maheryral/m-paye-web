import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg text-white px-6">
      <div className="text-6xl font-bold text-accent-violet">404</div>
      <div className="text-lg text-slate-400">Cette page n'existe pas.</div>
      <Link
        to="/dashboard"
        className="mt-4 bg-gradient-button px-6 py-3 rounded-2xl font-semibold"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
