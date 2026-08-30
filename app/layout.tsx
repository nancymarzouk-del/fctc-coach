import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import './globals.css'

// UALE display serif — the same face the Florence/UALE product uses for
// headings, so FCTC reads as part of the same family. Exposed as a CSS variable
// consumed by the `font-uale-serif` Tailwind utility.
const ualeSerif = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-uale-serif',
})

export const metadata: Metadata = {
  title: 'FCTC — Firefighter Written Test Prep',
  description: 'Personalized preparation for the California Firefighter Certification Test — part of the UALE learning family',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={ualeSerif.variable}>
      <body className="bg-uale-ivory text-uale-text">{children}</body>
    </html>
  )
}
