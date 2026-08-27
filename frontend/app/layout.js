import './globals.css';
import { AuthProvider } from '@/lib/auth';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://roundtablemailer.netlify.app';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'RoundTable Email Studio',
  description: 'Internal email marketing & communication system for RoundTable',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'RoundTable Email Studio',
    title: 'RoundTable Email Studio',
    description: 'Compose, personalise and deliver thoughtful RoundTable campaigns from one secure workspace.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'RoundTable Email Studio — communications and campaign management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RoundTable Email Studio',
    description: 'Compose, personalise and deliver thoughtful RoundTable campaigns from one secure workspace.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
