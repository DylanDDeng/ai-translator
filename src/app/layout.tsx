import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Translate Document',
  description: 'Upload document and translate into Chinese',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
