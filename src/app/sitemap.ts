import type {MetadataRoute} from 'next';
import {source} from '@/lib/source';
import {SITE_URL} from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/en`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE_URL}/en`,
          vi: `${SITE_URL}/vi`,
        },
      },
    },
    {
      url: `${SITE_URL}/vi`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE_URL}/en`,
          vi: `${SITE_URL}/vi`,
        },
      },
    },
  ];

  for (const page of source.getPages('en')) {
    const slugPath = page.slugs.length > 0 ? `/${page.slugs.join('/')}` : '';
    const enUrl = `${SITE_URL}/en/handbook${slugPath}`;
    const viUrl = `${SITE_URL}/vi/handbook${slugPath}`;
    const alternates = {languages: {en: enUrl, vi: viUrl}};
    entries.push({url: enUrl, lastModified: now, alternates});
    entries.push({url: viUrl, lastModified: now, alternates});
  }

  return entries;
}
