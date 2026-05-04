import { Inter } from 'next/font/google';
import '../index.css';
import BottomNav from '@/src/components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'OpsFly',
  description: 'AI-powered operations intelligence for hospitality managers',
  manifest: '/manifest.json',
  appleWebAppCapable: 'yes',
  appleWebAppStatusBarStyle: 'black-translucent',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#050B14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <div className="page-wrapper">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
