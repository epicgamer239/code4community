/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**'
      }
    ]
  },
  async headers() {
    // Build CSP based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cspValue = isDevelopment
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: http://localhost http://127.0.0.1 ws://localhost ws://127.0.0.1 wss://localhost wss://127.0.0.1 https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net; frame-src 'self' https://accounts.google.com https://apis.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net https://*.google.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net; frame-src 'self' https://accounts.google.com https://apis.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net https://*.google.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests; block-all-mixed-content";

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspValue,
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
