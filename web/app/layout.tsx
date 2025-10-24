import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import WhatsAppWrapper from '@/components/WhatsAppWrapper'

export const metadata: Metadata = {
  metadataBase: new URL('https://huglutekstil.com'),
  title: {
    default: 'Huğlu Tekstil Atölyesi - Özel İş Kıyafetleri & Üniforma Üretimi',
    template: '%s | Huğlu Tekstil Atölyesi'
  },
  description: 'Huğlu Tekstil Atölyesi olarak restoran, otel, kafe ve kurumlar için özel tasarım iş kıyafetleri, üniforma ve iş elbiseleri üretiyoruz. Kaliteli kumaş, hızlı teslimat.',
  keywords: ['iş kıyafetleri', 'üniforma', 'iş elbiseleri', 'restoran kıyafetleri', 'otel üniforması', 'kafe kıyafetleri', 'özel tasarım', 'logo baskı', 'nakış', 'Huğlu', 'tekstil atölyesi', 'kurumsal kıyafet'],
  authors: [{ name: 'Huğlu Tekstil Atölyesi' }],
  creator: 'Huğlu Tekstil Atölyesi',
  publisher: 'Huğlu Tekstil Atölyesi',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://huglutekstil.com',
    siteName: 'Huğlu Tekstil Atölyesi',
    title: 'Huğlu Tekstil Atölyesi - Özel İş Kıyafetleri & Üniforma Üretimi',
    description: 'Restoran, otel, kafe ve kurumlar için özel tasarım iş kıyafetleri ve üniforma üretimi. Kaliteli kumaş, profesyonel işçilik.',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'Huğlu Tekstil Atölyesi Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Huğlu Tekstil Atölyesi - Özel İş Kıyafetleri',
    description: 'Restoran, otel, kafe için özel tasarım iş kıyafetleri ve üniforma üretimi.',
    images: ['/assets/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="light">
      <head>

        <link rel="canonical" href="https://huglutekstil.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#1173d4" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'Huğlu Tekstil Atölyesi',
              image: 'https://huglutekstil.com/assets/logo.png',
              '@id': 'https://huglutekstil.com',
              url: 'https://huglutekstil.com',
              telephone: '+90-XXX-XXX-XXXX',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Adres Bilgisi',
                addressLocality: 'Huğlu',
                postalCode: 'XXXXX',
                addressCountry: 'TR'
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 40.0,
                longitude: 32.0
              },
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '18:00'
              },
              sameAs: [
                'https://www.facebook.com/hugluoutdoor',
                'https://www.instagram.com/hugluoutdoor'
              ]
            })
          }}
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark font-sans">
        {children}
        <WhatsAppWrapper />
        <Script id="service-worker" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.error('ServiceWorker registration failed:', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
