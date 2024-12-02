/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive'
          }
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  }
}

module.exports = nextConfig
