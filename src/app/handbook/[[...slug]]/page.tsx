import {source} from '@/lib/source';
import {DocsBody, DocsDescription, DocsPage, DocsTitle} from 'fumadocs-ui/page';
import defaultMdxComponents, {createRelativeLink} from 'fumadocs-ui/mdx';
import {Callout} from 'fumadocs-ui/components/callout';
import {Card, Cards} from 'fumadocs-ui/components/card';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {Mermaid} from '@/components/Mermaid';

export default async function Page(props: {
  params: Promise<{slug?: string[]}>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const hasToc = (page.data.toc?.length ?? 0) > 0;

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
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{slug?: string[]}>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
