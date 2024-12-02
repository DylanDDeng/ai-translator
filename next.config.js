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
          },
          {
            key: 'Content-Security-Policy',
            value: 'upgrade-insecure-requests'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ],
      },
    ]
  },
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
    serverActionsBodySizeLimit: '50mb'
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'sharp', 'onnxruntime-node'];
    return config;
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    },
    responseLimit: false
  },
  env: {
    NEXT_PUBLIC_MAX_FILE_SIZE: '50000000', // 50MB in bytes
  }
}

module.exports = nextConfig
