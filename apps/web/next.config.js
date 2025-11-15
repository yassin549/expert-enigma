/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [];
  },
  
  // Rewrites - Proxy API requests to backend (only in development)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // Only proxy in development when API URL is localhost or not set
    // In production, always use direct API calls via NEXT_PUBLIC_API_URL
    if (nodeEnv === 'production') {
      return [];
    }
    
    // In development, only proxy if API URL is localhost
    if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      return [];
    }
    
    const defaultApiUrl = 'http://localhost:8000';
    const targetUrl = apiUrl || defaultApiUrl;
    
    // Only proxy HTTP/HTTPS requests (WebSocket connections must use direct URL)
    return [
      {
        source: '/api/:path*',
        destination: `${targetUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
