import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'E-Ticaret Admin Paneli',
  description: 'Modern e-ticaret yönetim paneli',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
