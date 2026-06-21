import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FCTC Pass Coach - Firefighter Exam Prep',
  description: 'Personalized preparation for California Firefighter Certification Test',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
