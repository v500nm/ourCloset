/** @type {import('next').NextConfig} */

const nextConfig = {
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
