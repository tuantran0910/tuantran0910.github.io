import {RootProvider} from 'fumadocs-ui/provider/next';
import {i18n, i18nUI} from '@/lib/i18n';
import type {ReactNode} from 'react';

export function generateStaticParams() {
  return i18n.languages.map(lang => ({lang}));
}

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{lang: string}>;
  children: ReactNode;
}) {
  const {lang} = await params;

  return (
    <RootProvider
      i18n={i18nUI.provider(lang)}
      theme={{
        defaultTheme: 'light',
        enableSystem: false,
        storageKey: 'handbook-theme',
      }}
      search={{
        options: {
          type: 'static',
        },
      }}
    >
      {children}
    </RootProvider>
  );
}
