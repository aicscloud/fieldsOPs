import type { Metadata } from 'next';
import { PublicChrome } from '@/components/PublicChrome';
import { faq } from '@/lib/public-content';

export const metadata: Metadata = {
  title: 'FAQ — Fundi',
  description: 'Questions fréquentes sur Fundi.',
};

export default function FaqPage() {
  return (
    <PublicChrome>
      <article className="site-doc">
        <h1>Questions fréquentes</h1>
        <div className="site-faq-list">
          {faq.map((item) => (
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
