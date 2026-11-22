import type {BaseLayoutProps} from 'fumadocs-ui/layouts/shared';
import {i18n} from '@/lib/i18n';

export function baseOptions(locale: string = i18n.defaultLanguage): BaseLayoutProps {
  const isVi = locale === 'vi';
  return {
    i18n,
    nav: {
      title: 'Tuan Tran',
      url: `/${locale}`,
    },
    links: [
      {text: isVi ? 'Dự án' : 'Work', url: `/${locale}#work`},
      {text: isVi ? 'Học tập' : 'Learning', url: `/${locale}#learning`},
      {text: isVi ? 'Sổ tay' : 'Handbook', url: `/${locale}/handbook`, active: 'nested-url'},
    ],
    githubUrl: 'https://github.com/tuantran0910',
  };
}
