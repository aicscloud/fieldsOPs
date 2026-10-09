import type { Metadata } from 'next';
import { PublicChrome } from '@/components/PublicChrome';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation — Fundi',
  description: 'Conditions d’utilisation du service Fundi.',
};

export default function TermsPage() {
  return (
    <PublicChrome>
      <article className="site-doc">
        <h1>Conditions d’utilisation</h1>
        <p className="muted">En vigueur au 9 octobre 2026.</p>
        <h2>Objet</h2>
        <p>
          Fundi est un logiciel de gestion d’interventions : planning,
          équipes terrain, clients, sites et facturation. Les présentes
          conditions s’appliquent à toute organisation qui crée un compte.
        </p>
        <h2>Compte</h2>
        <p>
          L’inscription crée une organisation et un premier utilisateur
          responsable. Vous êtes responsable des accès que vous donnez à vos
          collaborateurs, et de la confidentialité des mots de passe.
        </p>
        <h2>Données de votre organisation</h2>
        <p>
          Les clients, interventions, photos et documents que vous enregistrez
          restent ceux de votre organisation. Fundi les traite pour fournir
          le service : affichage, planning, facturation et lien portail client.
        </p>
        <h2>Usage acceptable</h2>
        <p>
          Le service ne doit pas servir à stocker des contenus illicites, à
          usurper l’identité d’un tiers, ni à tenter d’accéder aux données
          d’une autre organisation.
        </p>
        <h2>Disponibilité</h2>
        <p>
          Le service est fourni en l’état. Une interruption de maintenance ou
          d’hébergement peut survenir. Il vous appartient de conserver les
          pièces dont votre activité a besoin en dehors de l’outil.
        </p>
        <h2>Fin d’accès</h2>
        <p>
          Vous pouvez cesser d’utiliser Fundi à tout moment. Un accès peut
          être suspendu en cas d’usage contraire aux présentes conditions.
        </p>
        <h2>Contact</h2>
        <p>
          Pour une question sur ces conditions :{' '}
          <a href="mailto:aicscloud@gmail.com">aicscloud@gmail.com</a>.
        </p>
      </article>
    </PublicChrome>
  );
}
