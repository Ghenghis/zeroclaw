/** @type {import('next').NextConfig} */

const path = require('path');

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Allow inline styles for theme CSS vars; allow data URIs for canvas exports
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // WebGL and canvas require blob: for texture streaming
      "img-src 'self' data: blob:",
      // Worker scripts for ConfettiEngine and Web Audio
      "worker-src 'self' blob:",
      // SSE endpoint on same origin; CDN scripts for game templates
      "connect-src 'self' https://cdn.jsdelivr.net",
      // Allow CDN scripts in AI-generated game iframes
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      // Three.js / R3F loads GLSL as blob workers on some browsers
      "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com blob:",
    ].join('; '),
  },
];

// ---------------------------------------------------------------------------
// Next.js configuration
// ---------------------------------------------------------------------------

const nextConfig = {
  // ── Output ──────────────────────────────────────────────────────────────
  // 'standalone' is ideal for Docker deployments
  output: process.env.NEXT_OUTPUT ?? 'standalone',

  // ── React ───────────────────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Performance ─────────────────────────────────────────────────────────
  compress: true,

  // ── Images ──────────────────────────────────────────────────────────────
  images: {
    // Allow external textures for planet maps (Three.js TextureLoader)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.nasa.gov',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    // Serve planet/texture assets at original quality
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  // ── Experimental ────────────────────────────────────────────────────────
  experimental: {
    // Turbopack (Next 15)
    turbo: {
      rules: {
        // Support importing GLSL shader files directly
        '*.{frag,vert,glsl}': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
      },
    },
    // Partial pre-rendering for admin routes
    ppr: process.env.NEXT_EXPERIMENTAL_PPR === 'true',
    // Enable React Server Components advanced patterns
    serverComponentsExternalPackages: ['sharp'],
  },

  // ── Webpack (fallback when not using Turbopack) ──────────────────────────
  webpack(config, { isServer }) {
    // GLSL raw-loader for shader files
    config.module.rules.push({
      test: /\.(frag|vert|glsl)$/i,
      use: 'raw-loader',
    });

    // Three.js tree-shaking alias
    config.resolve.alias = {
      ...config.resolve.alias,
      three: path.resolve('./node_modules/three'),
    };

    // Allow importing from lib/backgrounds with @/ alias
    config.resolve.alias['@'] = path.resolve(__dirname);

    // Suppress Three.js "Critical dependency" warnings for dynamic imports
    config.module.exprContextCritical = false;

    // Canvas is used server-side for quality gate image analysis (optional)
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'canvas'];
    }

    return config;
  },

  // ── Headers ─────────────────────────────────────────────────────────────
  async headers() {
    return [
      // Apply security headers to all routes
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache generated site static assets aggressively
      {
        source: '/generated/:date/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      // SSE endpoint: no caching, keep-alive
      {
        source: '/api/commits/stream',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store' },
          { key: 'Connection', value: 'keep-alive' },
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
      // Arcade game iframes need relaxed CSP for CDN scripts
      {
        source: '/api/weekend/game/:id',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net cdnjs.cloudflare.com; img-src * data: blob:; connect-src *;",
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      // Admin routes: no public caching
      {
        source: '/admin/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Legacy path from v1 — redirect to today's generated site
      {
        source: '/daily',
        destination: '/generated/latest',
        permanent: false,
      },
    ];
  },

  // ── Rewrites ─────────────────────────────────────────────────────────────
  async rewrites() {
    return [
      // TimeWarp: /visit/YYYY-MM-DD → generated archive
      {
        source: '/visit/:date',
        destination: '/generated/:date',
      },
    ];
  },

  // ── Environment ──────────────────────────────────────────────────────────
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
    NEXT_PUBLIC_SITE_VERSION: process.env.npm_package_version ?? '0.0.1',
  },
};

module.exports = nextConfig;
