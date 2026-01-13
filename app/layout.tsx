import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Copileo Dashboard',
  description: 'Bot de transcription automatique',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}