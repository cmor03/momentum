import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

// Precached page shells get a fresh revision per build.
const revision = `${Date.now()}`;

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [
    { url: '/', revision },
    { url: '/settings', revision },
    { url: '/stats', revision },
  ],
});

const nextConfig: NextConfig = {};

// Serwist only wraps production builds (`next build --webpack`); dev runs
// plain Turbopack with no service worker.
export default process.env.NODE_ENV === 'development' ? nextConfig : withSerwist(nextConfig);
