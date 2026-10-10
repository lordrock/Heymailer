import './globals.css';
import { AuthProvider } from '@/lib/auth';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'HeyMailer',
  description: 'Professional email campaign services, audience management and reliable delivery for growing teams.',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'HeyMailer',
    title: 'HeyMailer',
    description: 'Professional email campaigns, audience management and reliable delivery—all in one place.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'HeyMailer — email campaign services for growing teams',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HeyMailer',
    description: 'Professional email campaigns, audience management and reliable delivery—all in one place.',
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
