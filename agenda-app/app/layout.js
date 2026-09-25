import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-mono' });

export const metadata = {
  title: 'Agenda Psicológica',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Agenda',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F1729',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
