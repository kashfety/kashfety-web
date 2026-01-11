/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint config moved to eslint.config.js or removed - no longer in next.config.mjs
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack config for Next.js 16
  // Empty config silences the webpack/turbopack conflict warning
  // The lockfile warning is expected since we have both root and Client package.json
  // This is fine - Next.js will use the Client directory as the workspace root
  turbopack: {},
  // Keep webpack config for production builds (Turbopack is for dev)
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
