import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/globals.css';
import Providers from '../components/Providers';
import { ErrorBoundary } from '../components/ErrorBoundary';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '700'], // Light, Regular, Medium, Bold
});

export const metadata: Metadata = {
  title: 'PulseCheck',
  description: 'Team engagement and pulse surveys',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
