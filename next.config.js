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
    serverActions: true,
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'sharp', 'onnxruntime-node'];
    return config;
  },
  env: {
    NEXT_PUBLIC_MAX_FILE_SIZE: '50000000', // 50MB in bytes
  }
}

module.exports = nextConfig
