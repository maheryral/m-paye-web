import { BedDouble } from 'lucide-react';
import ComingSoon from '../../components/ComingSoon';

export default function Hotels() {
  return (
    <ComingSoon
      title="Hôtels"
      subtitle="Trouvez le meilleur hébergement"
      icon={BedDouble}
      accentColor="#8b5cf6"
      features={[
        'Recherche par destination et dates',
        'Filtres par prix, note et équipements',
        'Photos, avis et disponibilités en direct',
        'Réservation instantanée',
        'Paiement sécurisé via M\'Paye',
      ]}
    />
  );
}
