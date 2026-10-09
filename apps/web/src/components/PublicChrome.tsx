'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Brand } from '@/components/Brand';
import { LanguageSwitch, useI18n } from '@/lib/i18n';

export function PublicChrome({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  return (
    <div className="site">
      <header className="site-nav">
        <Brand />
        <nav>
          <Link href="/#produit">{m.pub.product}</Link>
          <Link href="/faq">{m.pub.faq}</Link>
          <Link href="/login">{m.pub.login}</Link>
          <LanguageSwitch />
          <Link href="/register" className="btn">
            {m.pub.register}
          </Link>
        </nav>
      </header>
      {children}
      <footer className="site-foot">
        <Brand />
        <p>{m.pub.tagline}</p>
        <div className="site-contact">
          <a href="tel:+237686669155">+237 686 66 91 55</a>
          <a href="mailto:aicscloud@gmail.com">aicscloud@gmail.com</a>
        </div>
        <nav>
          <Link href="/faq">{m.pub.faq}</Link>
          <Link href="/cgu">{m.pub.terms}</Link>
          <Link href="/mentions-legales">{m.pub.legal}</Link>
        </nav>
      </footer>
    </div>
  );
}
