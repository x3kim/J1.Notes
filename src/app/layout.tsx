import './globals.css'
import { Toaster } from 'sonner'
import type { Metadata, Viewport } from 'next';
import I18nProvider from '@/lib/i18n/I18nProvider';
import { ThemeProvider } from '@/lib/themes/ThemeContext';

export const metadata: Metadata = {
  title: 'gNotes',
  description: 'Self-hosted Notes App',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'gNotes',
  },
};

export const viewport: Viewport = {
  themeColor: '#fbbc04',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <ThemeProvider>
          <I18nProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </I18nProvider>
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </body>
    </html>
  )
}
