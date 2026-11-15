/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
        ],
      },
    ];
  },

  // Prevent Next.js from bundling server-side WASM modules incorrectly for Xenova Transformers
  serverExternalPackages: ['@xenova/transformers'],
  experimental: {
    webpackBuildWorker: false,
  },
  webpack: (config) => {
    // Enable WASM support in Webpack
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    config.parallelism = 1;
    return config;
  },
};

export default nextConfig;
