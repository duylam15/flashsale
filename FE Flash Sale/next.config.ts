import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // Khi component gọi POST /v1/load-tests -> Proxy sang đúng route flash sale của backend
      {
        source: '/v1/load-tests',
        destination: 'http://localhost:4000/v1/order/flash-sale',
      },
      // Khi component gọi GET /v1/load-tests/:testId -> Proxy sang backend
      {
        source: '/v1/load-tests/:testId',
        destination: 'http://localhost:4000/v1/load-tests/:testId',
      },
      // Các API v1 khác nếu có
      {
        source: '/v1/:path*',
        destination: 'http://localhost:4000/v1/:path*',
      },
    ];
  },
  reactStrictMode: false,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-6f0cf05705c7412b93a792350f3b3aa5.r2.dev",
      },
      {
        protocol: "https",
        hostname: "jdj14ctwppwprnqu.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;