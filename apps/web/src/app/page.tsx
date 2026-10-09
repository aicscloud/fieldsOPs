import { PublicChrome } from '@/components/PublicChrome';
import { ProductBoard } from '@/components/ProductBoard';
import { faq } from '@/lib/public-content';
import Link from 'next/link';

const stories = [
  {
    image: '/brand/technician.jpg',
    alt: 'Technicien relevant une intervention sur tablette, devant un climatiseur.',
    title: 'Le technicien part avec la bonne mission',
    text: 'Adresse, durée, catégorie et pièces prévues sont sur la fiche avant le départ. Le responsable voit qui est en route, sur place ou déjà terminé.',
  },
  {
    image: '/brand/invoice.jpg',
    alt: 'Bureau avec une tablette, un carnet et une calculatrice pour préparer une facture.',
    title: 'La facture suit l’intervention',
    text: 'Un devis ou une facture reprend le client, le site et le travail fait. Vous encaissez à partir de ce qui a réellement été réalisé.',
  },
];

export default function HomePage() {
  return (
    <PublicChrome>
      <section className="site-hero">
        <div className="site-copy">
          <p className="site-kicker">Logiciel pour équipes terrain</p>
          <h1>Le planning du jour, tenu à un seul endroit.</h1>
          <p>
            Affectez les interventions, suivez les techniciens et préparez la
            facturation sans quitter l’outil.
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

      <section className="site-band" id="produit">
        <div className="site-band-copy">
          <h2>Une journée, trois colonnes.</h2>
          <p>Le planning montre qui fait quoi, de 8 h à 19 h.</p>
        </div>
        <ProductBoard />
      </section>

      {stories.map((story, index) => (
        <section
          className={`site-split ${index % 2 ? 'is-reverse' : ''}`}
          key={story.title}
        >
          <img src={story.image} alt={story.alt} />
          <div>
            <h2>{story.title}</h2>
            <p>{story.text}</p>
          </div>
        </section>
      ))}

      <section className="site-faq" id="faq">
        <h2>Questions fréquentes</h2>
        <div>
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicChrome>
  );
}
