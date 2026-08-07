import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://code4community26.web.app';

  const robotsTxt = `User-agent: *
Allow: /
Allow: /services
Allow: /work
Allow: /grade-calculator
Allow: /yearbook-formatting
Allow: /seating-chart
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms

# Disallow API routes
Disallow: /api/
Disallow: /debug-appcheck
Disallow: /test-firestore

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (be respectful)
Crawl-delay: 1`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
