import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '文档翻译工具',
  description: '上传文档并翻译成中文',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
