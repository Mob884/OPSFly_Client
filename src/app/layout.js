import { Inter } from 'next/font/google';
import '../index.css';
import { AuthProvider } from '@/src/context/AuthContext';
import AppLayoutContent from '@/src/components/AppLayoutContent';

const inter = Inter({ subsets: ['latin'] });


export const metadata = {
  title: 'OpsFly',
  description: 'AI-powered operations intelligence for hospitality managers',
  manifest: '/manifest.json',
  appleWebAppCapable: 'yes',
  appleWebAppStatusBarStyle: 'black-translucent',
  appleWebAppTitle: 'OpsFly',
  formatDetection: { telephone: false },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050B14',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest — explicit link for full browser compatibility */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050B14" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OpsFly" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

        {/* Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
                    .catch(function(err) { console.warn('[SW] Registration failed:', err); });
                });
              }

              // "Add to Home Screen" prompt — capture and expose it
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__installPrompt = e;
                window.dispatchEvent(new Event('pwa-install-ready'));
              });
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AppLayoutContent>
            {children}
          </AppLayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
