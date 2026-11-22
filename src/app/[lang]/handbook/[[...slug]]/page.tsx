import {source} from '@/lib/source';
import {DocsBody, DocsDescription, DocsPage, DocsTitle} from 'fumadocs-ui/page';
import defaultMdxComponents, {createRelativeLink} from 'fumadocs-ui/mdx';
import {Callout} from 'fumadocs-ui/components/callout';
import {Card, Cards} from 'fumadocs-ui/components/card';
import {Pencil} from 'lucide-react';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {Mermaid} from '@/components/Mermaid';
import {GITHUB_EDIT_DOCS_BASE, SITE_URL} from '@/lib/site';

export default async function Page(props: {
  params: Promise<{lang: string; slug?: string[]}>;
}) {
  const {lang, slug} = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const hasToc = (page.data.toc?.length ?? 0) > 0;
  const editUrl = `${GITHUB_EDIT_DOCS_BASE}/${page.path}`;

  return (
    <DocsPage
      toc={hasToc ? page.data.toc : undefined}
      full={page.data.full ?? !hasToc}
      tableOfContent={{enabled: hasToc}}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
            a: createRelativeLink(source, page),
            Mermaid,
            Callout,
            Card,
            Cards,
          }}
        />
      </DocsBody>
      <div className="not-prose mt-8 border-t border-fd-border pt-4">
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        >
          <Pencil className="size-3.5" />
          {lang === 'vi' ? 'Chỉnh sửa trang này trên GitHub' : 'Edit this page on GitHub'}
        </a>
      </div>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams('slug', 'lang');
}

export async function generateMetadata(props: {
  params: Promise<{lang: string; slug?: string[]}>;
}): Promise<Metadata> {
  const {lang, slug} = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const slugPath = page.slugs.length > 0 ? `/${page.slugs.join('/')}` : '';
  const canonical = `${SITE_URL}/${lang}/handbook${slugPath}`;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/en/handbook${slugPath}`,
        vi: `${SITE_URL}/vi/handbook${slugPath}`,
      },
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url: canonical,
      type: 'article',
      locale: lang === 'vi' ? 'vi_VN' : 'en_US',
    },
  };
}
