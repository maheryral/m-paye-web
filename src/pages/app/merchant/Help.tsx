import { useState } from 'react';
import {
  Book,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Button, Card, PageHeader } from '../../../ui';

interface Faq {
  q: string;
  a: string;
}

const SECTIONS: { title: string; faqs: Faq[] }[] = [
  {
    title: 'Premiers pas',
    faqs: [
      {
        q: 'Comment activer mon compte marchand ?',
        a: "Allez dans Devenir marchand depuis le menu, remplissez le formulaire d'inscription avec vos documents (RCS, NIF, pièce d'identité). L'équipe M'Paye valide votre dossier sous 24-48h.",
      },
      {
        q: "Comment créer ma première boutique ?",
        a: "Une fois validé, allez dans Boutiques → Nouvelle boutique. Indiquez le nom, l'adresse et le téléphone. Vous pouvez avoir plusieurs boutiques sous le même compte marchand.",
      },
      {
        q: 'Comment ajouter un produit ?',
        a: "Menu Produits → Ajouter. Nom, prix, description, photo (optionnelle), gestion de stock. Les produits apparaissent dans votre catalogue.",
      },
    ],
  },
  {
    title: 'Encaissement',
    faqs: [
      {
        q: "Comment recevoir un paiement par QR ?",
        a: "Allez sur QR de paiement → saisissez le montant et la description. Choisissez Mode wallet M'Paye (par défaut) ou Mobile Money direct. Le client scanne votre QR et confirme.",
      },
      {
        q: 'Quelle est la différence entre Mode wallet et Mode mobile ?',
        a: "Mode wallet : l'argent va dans votre wallet M'Paye (puis retrait via banque). Mode mobile : l'argent va directement sur votre numéro Orange/Airtel/MVola, sans passer par M'Paye.",
      },
      {
        q: 'Mon QR expire-t-il ?',
        a: "Oui, après 5 minutes. Un QR ne peut être payé qu'une seule fois. Régénérez-en un nouveau pour chaque encaissement.",
      },
      {
        q: "Qu'est-ce qu'un lien de paiement ?",
        a: "C'est un QR ou une URL réutilisable que vous pouvez envoyer par message/email/réseaux sociaux. Vos clients paient via le navigateur (carte ou solde M'Paye). Idéal pour la vente à distance.",
      },
    ],
  },
  {
    title: 'Retraits & remboursements',
    faqs: [
      {
        q: 'Comment retirer mon argent ?',
        a: "Menu Solde & retraits. Choisissez le montant, sélectionnez un compte bancaire (à ajouter au préalable). Frais : 1% min 500 Ar. Versement sous 24-48h ouvrées.",
      },
      {
        q: "Quel est le délai d'un retrait ?",
        a: "Les demandes sont validées sous 24h ouvrées. Le virement bancaire arrive sous 24-48h selon votre banque. Pour les retraits Mobile Money, c'est instantané (selon disponibilité opérateur).",
      },
      {
        q: 'Comment rembourser un client ?',
        a: "Menu Remboursements → cliquez sur la transaction → saisissez le montant à rembourser (total ou partiel) + le motif. Le remboursement est instantané sur le wallet du client.",
      },
    ],
  },
  {
    title: 'Équipe',
    faqs: [
      {
        q: 'Comment inviter un employé ?',
        a: "Menu Équipe → Inviter. Email ou téléphone + rôle (Manager / Caissier / Comptable). L'employé recevra l'invitation par email.",
      },
      {
        q: 'Quels sont les rôles disponibles ?',
        a: "Propriétaire (accès total), Manager (gestion produits + équipe + retraits), Caissier (encaissement uniquement), Comptable (lecture seule + exports). Vous pouvez changer un rôle à tout moment.",
      },
    ],
  },
  {
    title: 'Comptabilité & TVA',
    faqs: [
      {
        q: 'Comment exporter mes ventes ?',
        a: "Menu Rapports & TVA → sélectionnez le mois → Télécharger CSV ou Excel. Le fichier contient référence, date, client, montant HT/TTC, TVA, mode de paiement.",
      },
      {
        q: 'Comment configurer la TVA ?',
        a: "Depuis le Tableau marchand → Configurer (section TVA). Saisissez votre taux par défaut (ex : 20%) et votre numéro fiscal (NIF). La TVA est automatiquement calculée et verrouillée sur chaque vente.",
      },
    ],
  },
];

export default function MerchantHelp() {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpen(open === key ? null : key);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Aide & support"
        subtitle="Trouvez les réponses aux questions fréquentes ou contactez-nous"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={18} className="text-brand-300" />
            <h3 className="text-sm font-bold">Chat support</h3>
          </div>
          <p className="text-xs text-ink-muted mb-3">
            Réponse sous 5 min en journée.
          </p>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            icon={MessageSquare}
            onClick={() => (window.location.href = '/messages')}
          >
            Ouvrir le chat
          </Button>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={18} className="text-success-400" />
            <h3 className="text-sm font-bold">Email</h3>
          </div>
          <p className="text-xs text-ink-muted mb-3">support@mpaye.mg</p>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={ExternalLink}
            onClick={() => window.open('mailto:support@mpaye.mg')}
          >
            Envoyer un email
          </Button>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Phone size={18} className="text-warning-400" />
            <h3 className="text-sm font-bold">Téléphone</h3>
          </div>
          <p className="text-xs text-ink-muted mb-3">+261 34 00 00 000</p>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={Phone}
            onClick={() => window.open('tel:+26134000000')}
          >
            Appeler
          </Button>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-brand-300" />
          <h3 className="text-base font-bold">Bien démarrer avec M'Paye</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Book, label: 'Activer mon compte marchand', step: 1 },
            { icon: Book, label: 'Créer ma première vente QR', step: 2 },
            { icon: Book, label: 'Effectuer mon premier retrait', step: 3 },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="flex items-start gap-3 p-3 rounded-xl bg-bg-elevated"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="flex items-center gap-1 text-[11px] text-brand-300 mt-1">
                    <Icon size={11} />
                    Voir la doc
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* FAQ par section */}
      {SECTIONS.map((sec) => (
        <Card key={sec.title} padding="md">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={18} className="text-brand-300" />
            <h3 className="text-base font-bold">{sec.title}</h3>
          </div>
          <div className="space-y-2">
            {sec.faqs.map((f, i) => {
              const key = `${sec.title}-${i}`;
              const isOpen = open === key;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-bg-border bg-bg-elevated/40 overflow-hidden"
                >
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-bg-elevated transition"
                  >
                    <span className="text-sm font-semibold">{f.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-ink-muted shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 text-xs text-ink-muted leading-relaxed border-t border-bg-border pt-3">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
