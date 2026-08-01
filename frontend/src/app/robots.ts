import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard/',
        '/admin/',
        '/settings/',
        '/profile/',
        '/chat/',
        '/live/',
        '/night-before/',
        '/focus-island/',
        '/rewards/',
        '/time-bomb/',
        '/notes/',
        '/syllabus-tracker/',
        '/planner/'
      ],
    },
    sitemap: 'https://prepia.app/sitemap.xml',
  };
}

