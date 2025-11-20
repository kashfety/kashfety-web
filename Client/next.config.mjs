/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  webpack: (config, { isServer }) => {
    // Disable WASM optimization that might be causing issues
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: false,
      syncWebAssembly: false,
    };

    // Use a different hash algorithm
    config.optimization = {
      ...config.optimization,
      realContentHash: false,
    };

    return config;
  },
  // Avoid rewriting local API routes to the backend. If backend proxying is needed,
  // use a separate prefix (e.g. /backend) to prevent conflicts with Next API routes.
  async rewrites() {
    return process.env.PROXY_BACKEND === '1'
      ? [
        {
          source: '/backend/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
      ]
      : [];
  },
}

export default nextConfig
