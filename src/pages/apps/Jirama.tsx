import { Zap } from 'lucide-react';
import MiniProgramLayout from './MiniProgramLayout';

/**
 * Mini-program JIRAMA — placeholder.
 *
 * À remplacer par la vraie logique métier (saisie n° contrat, appel API
 * JIRAMA, paiement via wallet M'Paye…). Pour l'instant juste l'UI de base.
 *
 * L'auth est gérée par MiniProgramLayout selon le contexte (web/mobile).
 */
export default function JiramaMiniProgram() {
  return (
    <MiniProgramLayout title="JIRAMA — Électricité" accentColor="#F59E0B">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: '#F59E0B' }}
          >
            <Zap size={36} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">JIRAMA</div>
            <div className="text-xs text-ink-muted">Payez votre facture d'électricité</div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Numéro de contrat / abonné</label>
            <input className="input" placeholder="ex: 0123456789" />
          </div>
          <div>
            <label className="label">Montant (Ar)</label>
            <input className="input" placeholder="0" inputMode="numeric" />
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            style={{ background: '#F59E0B' }}
          >
            Payer
          </button>
        </div>

        <div className="text-[11px] text-ink-dim text-center px-4 leading-relaxed">
          🚧 Mini-program JIRAMA en développement. Le paiement réel sera
          activé prochainement.
        </div>
      </div>
    </MiniProgramLayout>
  );
}
