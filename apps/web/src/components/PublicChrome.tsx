import Link from 'next/link';
import { ReactNode } from 'react';
import { Brand } from '@/components/Brand';

export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="site">
      <header className="site-nav">
        <Brand />
        <nav>
          <Link href="/#produit">Produit</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/login">Connexion</Link>
          <Link href="/register" className="btn">
            Créer une organisation
          </Link>
        </nav>
      </header>
      {children}
      <footer className="site-foot">
        <Brand />
        <p>Planning, terrain et facturation pour les équipes qui se déplacent.</p>
        <nav>
          <Link href="/faq">FAQ</Link>
          <Link href="/cgu">Conditions d’utilisation</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
        </nav>
      </footer>
    </div>
  );
}
