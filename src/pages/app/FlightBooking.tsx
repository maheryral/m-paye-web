import { Plane } from 'lucide-react';
import ComingSoon from '../../components/ComingSoon';

export default function FlightBooking() {
  return (
    <ComingSoon
      title="Vols"
      subtitle="Réservez vos billets d'avion"
      icon={Plane}
      accentColor="#3b82f6"
      features={[
        'Vols intérieurs et internationaux',
        'Aller simple, aller-retour, multi-villes',
        'Comparateur multi-compagnies',
        'Choix de siège et bagages',
        'E-boarding pass directement dans l\'app',
      ]}
    />
  );
}
