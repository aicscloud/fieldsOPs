'use client';

import Link from 'next/link';
import { PublicChrome } from '@/components/PublicChrome';
import { ProductBoard } from '@/components/ProductBoard';
import { useI18n } from '@/lib/i18n';

export default function HomePage() {
  const { m } = useI18n();
  const { home, faq } = m;
  return (
    <PublicChrome>
      <section className="site-hero">
        <div className="site-copy">
          <p className="site-kicker">{home.kicker}</p>
          <h1>{home.title}</h1>
          <p>{home.lead}</p>
          <p>{home.lead2}</p>
          <div className="site-actions">
            <Link href="/register" className="btn btn-lg">
              {m.pub.register}
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              {m.pub.login}
            </Link>
          </div>
        </div>
        <figure className="site-photo">
          <img src="/brand/dispatch.jpg" alt={home.photoAlt} />
        </figure>
      </section>

      <section className="site-points" id="produit">
        {home.points.map((point) => (
          <article key={point.title}>
            <h2>{point.title}</h2>
            <p>{point.text}</p>
          </article>
        ))}
      </section>

      {home.stories.map((story, index) => (
        <section className={`site-split ${index % 2 ? 'is-reverse' : ''}`} key={story.title}>
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
          <h2>{home.boardTitle}</h2>
          <p>{home.boardText}</p>
        </div>
        <ProductBoard />
      </section>

      <section className="site-faq" id="faq">
        <h2>{home.faqTitle}</h2>
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
            <h2>{home.closeTitle}</h2>
            <p>{home.closeText}</p>
          </div>
          <Link href="/register" className="btn btn-lg">
            {m.pub.register}
          </Link>
        </div>
      </section>
    </PublicChrome>
  );
}
