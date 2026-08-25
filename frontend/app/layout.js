import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'RoundTable Email Studio',
  description: 'Internal email marketing & communication system for RoundTable',
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
