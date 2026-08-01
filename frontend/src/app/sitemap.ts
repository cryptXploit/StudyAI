import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://prepia.app';

  // Standard public routes for indexing
  const routes = [
    '',
    '/pricing',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/login',
    '/signup'
  ].map((route) => ({
    url: \\\\,
    lastModified: new Date(),
    changeFrequency: (route === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: route === '' ? 1.0 : (route === '/pricing' ? 0.9 : 0.7),
  }));

  // Add any dynamically generated public pages here if applicable in the future
  // e.g., Public Bounty Board or Global Leaderboards

  return routes;
}

