'use client';

import { PublicChrome } from '@/components/PublicChrome';
import { useI18n } from '@/lib/i18n';

export default function LegalPage() {
  const { m } = useI18n();
  return (
    <PublicChrome>
      <article className="site-doc">
        <h1>{m.legal.title}</h1>
        {m.legal.sections.map((section) => (
          <section key={section.h}>
            <h2>{section.h}</h2>
            <p>{section.p}</p>
          </section>
        ))}
      </article>
    </PublicChrome>
  );
}
