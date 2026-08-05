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
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: route === '' ? 1.0 : (route === '/pricing' ? 0.9 : 0.7),
  }));

  // Add any dynamically generated public pages here if applicable in the future
  // e.g., Public Bounty Board or Global Leaderboards

  // Marketing / Blog Pages
  const blogIndex = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as 'daily',
      priority: 0.9,
    }
  ];

  const blogPostRoutes = [
    '/blog/how-to-pass-chemistry-exam-in-1-night',
    '/blog/best-ai-tools-for-university-students-2026'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as 'monthly',
    priority: 0.8,
  }));

  const toolRoutes = [
    '/tools/pdf-to-podcast',
    '/tools/3d-molecule-renderer',
    '/tools/night-before-exam-generator',
    '/tools/ai-flashcards-maker',
    '/tools/panic-mode',
    '/tools/exam-oracle-predictor',
    '/tools/ai-workspace',
    '/tools/neural-feed',
    '/tools/quiz-generator',
    '/tools/notes-purifier',
    '/tools/ai-teacher-chat',
    '/tools/pro-academic-solver',
    '/tools/mind-map-generator',
    '/tools/concept-battle',
    '/tools/bionic-reader',
    '/tools/focus-island',
    '/tools/career-hacker',
    '/tools/youtube-decoder',
    '/tools/lab-auto-grapher',
    '/tools/timeline-mapper',
    '/tools/knowledge-universe',
    '/tools/wallpaper-generator',
    '/tools/logic-workspace',
    '/tools/presentation-generator',
    '/tools/syllabus-extractor',
    '/tools/calendar-sync',
    '/tools/geo-mapper'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.8,
  }));

  return [...routes, ...blogIndex, ...blogPostRoutes, ...toolRoutes];
}

