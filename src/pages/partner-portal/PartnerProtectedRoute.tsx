// src/pages/partner-portal/PartnerProtectedRoute.tsx
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { usePartnerAuth } from '../../contexts/PartnerAuthContext';

export function PartnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { partner, loading } = usePartnerAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }
  if (!partner) return <Navigate to="/partner-portal/login" replace />;
  return <>{children}</>;
}
