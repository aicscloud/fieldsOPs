'use client';

import { PublicChrome } from '@/components/PublicChrome';
import { useI18n } from '@/lib/i18n';

export default function FaqPage() {
  const { m } = useI18n();
  return (
    <PublicChrome>
      <article className="site-doc">
        <h1>{m.home.faqTitle}</h1>
        <div className="site-faq-list">
          {m.faq.map((item) => (
            <section key={item.q}>
              <h2>{item.q}</h2>
              <p>{item.a}</p>
            </section>
          ))}
        </div>
      </article>
    </PublicChrome>
  );
}
