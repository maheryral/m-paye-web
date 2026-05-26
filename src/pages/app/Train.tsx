import { Train as TrainIcon } from 'lucide-react';
import ComingSoon from '../../components/ComingSoon';

export default function Train() {
  return (
    <ComingSoon
      title="Train"
      subtitle="Réservez vos billets de train"
      icon={TrainIcon}
      accentColor="#0891b2"
      features={[
        'Recherche par gare de départ et arrivée',
        'Choix de la classe et du tarif',
        'Sélection de siège',
        'E-billet avec QR code',
        'Paiement direct depuis votre wallet',
      ]}
    />
  );
}
