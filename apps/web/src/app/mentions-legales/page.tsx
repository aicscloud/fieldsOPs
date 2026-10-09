import type { Metadata } from 'next';
import { PublicChrome } from '@/components/PublicChrome';

export const metadata: Metadata = {
  title: 'Mentions légales — Ekipa',
  description: 'Mentions légales du site Ekipa.',
};

export default function LegalPage() {
  return (
    <PublicChrome>
      <article className="site-doc">
        <h1>Mentions légales</h1>
        <h2>Éditeur</h2>
        <p>
          Le site Ekipa est édité par aicscloud.
          <br />
          Téléphone : <a href="tel:+237686669155">+237 686 66 91 55</a>
          <br />
          E-mail : <a href="mailto:aicscloud@gmail.com">aicscloud@gmail.com</a>
        </p>
        <h2>Hébergement</h2>
        <p>
          Le site et l’API sont hébergés par Render (render.com). La base de
          données est hébergée par Supabase (supabase.com), région Europe
          Ouest, Irlande.
        </p>
        <h2>Propriété</h2>
        <p>
          Le nom Ekipa, le logo et les textes de présentation sont réservés
          à l’éditeur. Les données saisies dans une organisation appartiennent
          à cette organisation.
        </p>
        <h2>Données personnelles</h2>
        <p>
          Le compte enregistre l’identité des utilisateurs (nom, e-mail) et les
          informations d’exploitation que l’organisation choisit d’y mettre :
          clients, sites, interventions, factures. Elles servent uniquement à
          faire fonctionner l’application. Pour une demande d’accès ou de
          suppression, écrivez à l’adresse de contact ci-dessus.
        </p>
      </article>
    </PublicChrome>
  );
}
