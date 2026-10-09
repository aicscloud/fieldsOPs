import Link from 'next/link';
import { PublicChrome } from '@/components/PublicChrome';
import { ProductBoard } from '@/components/ProductBoard';
import { faq } from '@/lib/public-content';

const points = [
  {
    title: 'Planning',
    text: 'Chaque technicien a sa colonne, de 8 h à 19 h. Une installation de 4 h, un dépannage d’1 h ou un audit de 8 h se voient tout de suite, sans se chevaucher.',
  },
  {
    title: 'Affectation',
    text: 'Le responsable choisit le technicien, le groupe et, si besoin, le transport. Les missions non affectées restent dans la file, prêtes à être placées.',
  },
  {
    title: 'Terrain',
    text: 'Sur place, le technicien ouvre la fiche : client, site, durée, notes. Le bureau suit l’avancement, du départ jusqu’à la clôture.',
  },
  {
    title: 'Facturation',
    text: 'Le devis et la facture reprennent l’intervention terminée. Le montant à encaisser reste relié au travail réellement fait.',
  },
];

const stories = [
  {
    image: '/brand/technician.jpg',
    alt: 'Technicien relevant une intervention sur tablette, devant un climatiseur.',
    title: 'Le technicien part avec la bonne mission',
    paragraphs: [
      'Avant de quitter le dépôt, il sait où aller, combien de temps prévoir et ce qu’il doit faire. L’adresse, la catégorie et les pièces prévues sont déjà sur la fiche.',
      'Pendant le déplacement, le bureau voit qui est en route, qui est sur place et qui a terminé. Les retards du matin ne se découvrent plus en fin de journée.',
    ],
  },
  {
    image: '/brand/invoice.jpg',
    alt: 'Bureau avec une tablette, un carnet et une calculatrice pour préparer une facture.',
    title: 'La facture suit l’intervention',
    paragraphs: [
      'Quand le travail est clos, le devis ou la facture reprend le client, le site et les lignes du chantier. Plus besoin de ressaisir la prestation dans un autre outil.',
      'Les pièces envoyées, acceptées ou payées restent visibles à côté de l’activité. Vous savez ce qui est fait, et ce qui est encore à encaisser.',
    ],
  },
];

export default function HomePage() {
  return (
    <PublicChrome>
      <section className="site-hero">
        <div className="site-copy">
          <p className="site-kicker">Logiciel pour équipes terrain</p>
          <h1>Planifiez la journée, suivez le terrain, facturez le travail fait.</h1>
          <p>
            Ekipa réunit le planning des techniciens, le suivi des
            interventions et la facturation. Le bureau voit qui part, qui est
            sur place et ce qui reste à encaisser. Le technicien ouvre sa
            mission avec l’adresse, la durée et le détail du travail.
          </p>
          <p>
            L’outil est prévu pour les équipes qui installent, dépannent et
            entretiennent : une journée mélange des tâches d’une heure, de
            quatre heures et de huit heures, sur plusieurs sites.
          </p>
          <div className="site-actions">
            <Link href="/register" className="btn btn-lg">
              Créer une organisation
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              Se connecter
            </Link>
          </div>
        </div>
        <figure className="site-photo">
          <img
            src="/brand/dispatch.jpg"
            alt="Responsable d’exploitation devant son planning, dans un bureau."
          />
        </figure>
      </section>

      <section className="site-points" id="produit">
        {points.map((point) => (
          <article key={point.title}>
            <h2>{point.title}</h2>
            <p>{point.text}</p>
          </article>
        ))}
      </section>

      {stories.map((story, index) => (
        <section
          className={`site-split ${index % 2 ? 'is-reverse' : ''}`}
          key={story.title}
        >
          <img src={story.image} alt={story.alt} />
          <div>
            <h2>{story.title}</h2>
            {story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="site-band">
        <div className="site-band-copy">
          <h2>La journée tient sur un seul planning.</h2>
          <p>
            Trois techniciens, des durées différentes, des sites distincts.
            Le responsable lit la charge de la journée sans ouvrir chaque fiche.
          </p>
        </div>
        <ProductBoard />
      </section>

      <section className="site-faq" id="faq">
        <h2>Questions fréquentes</h2>
        <div className="site-faq-grid">
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="site-close">
        <div className="site-close-inner">
          <div>
            <h2>Ouvrez l’espace de votre équipe.</h2>
            <p>
              Une organisation, vos techniciens, vos clients et le planning du
              jour. Vous pouvez commencer avec le compte de démonstration ou
              créer le vôtre.
            </p>
          </div>
          <Link href="/register" className="btn btn-lg">
            Créer une organisation
          </Link>
        </div>
      </section>
    </PublicChrome>
  );
}
