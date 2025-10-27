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
