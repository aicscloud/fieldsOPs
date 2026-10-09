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
        <p>Planning, terrain et facturation pour les PME qui se déplacent.</p>
        <div className="site-contact">
          <a href="tel:+237686669155">+237 686 66 91 55</a>
          <a href="mailto:aicscloud@gmail.com">aicscloud@gmail.com</a>
        </div>
        <nav>
          <Link href="/faq">FAQ</Link>
          <Link href="/cgu">Conditions d’utilisation</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
        </nav>
      </footer>
    </div>
  );
}
