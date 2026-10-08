import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.resolve(__dirname, '../..');

// Dev et build utilisent des dossiers séparés : un `next build` pendant que
// `next dev` tourne ne corrompt plus le cache HMR (CSS / chunks 404).
const distDir = process.env.NODE_ENV === 'development' ? '.next-dev' : '.next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir,
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Évite les assets CSS/_next mal résolus en monorepo Windows
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/.next-dev/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
