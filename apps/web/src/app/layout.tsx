import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Intervenio',
  description: 'Scheduling, field work and billing for SMEs.',
  icons: { icon: '/brand/icon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={poppins.className}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
