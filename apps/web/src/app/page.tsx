import Link from 'next/link';
import { Brand, ProductBoard } from '@/components/ProductBoard';

const points = [
  {
    title: 'Planning',
    text: 'La journée de chaque technicien, heure par heure.',
  },
  {
    title: 'Terrain',
    text: 'Affectation, déplacement et suivi jusqu’à la clôture.',
  },
  {
    title: 'Facturation',
    text: 'Devis et factures reliés à l’intervention terminée.',
  },
];

export default function HomePage() {
  return (
    <div className="site">
      <header className="site-nav">
        <Brand />
        <nav>
          <Link href="/login">Connexion</Link>
          <Link href="/register" className="btn">
            Créer une organisation
          </Link>
        </nav>
      </header>
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
        <ProductBoard />
      </section>
      <section className="site-points">
        {points.map((point) => (
          <article key={point.title}>
            <h2>{point.title}</h2>
            <p>{point.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
