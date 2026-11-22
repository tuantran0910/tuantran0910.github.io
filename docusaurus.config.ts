import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const organizationName = process.env.GITHUB_REPOSITORY_OWNER || 'tuantran0910';
const projectName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'tuantran0910.github.io';
const baseUrl = projectName.toLowerCase() === `${organizationName.toLowerCase()}.github.io`
  ? '/'
  : `/${projectName}/`;
const config: Config = {
  title: 'Tuan Tran',
  tagline: 'Work, projects, and learning notes',
  favicon: 'img/favicon.svg',
  url: `https://${organizationName}.github.io`,
  baseUrl,
  organizationName,
  projectName,
  onBrokenLinks: 'throw',
  i18n: {defaultLocale: 'en', locales: ['en']},
  markdown: {mermaid: true, hooks: {onBrokenMarkdownLinks: 'throw'}},
  themes: ['@docusaurus/theme-mermaid'],
  presets: [['classic', {
    docs: {
      routeBasePath: 'handbook',
      numberPrefixParser: false,
      sidebarPath: './sidebars.ts',
      editUrl: `https://github.com/${organizationName}/${projectName}/tree/main/`,
    },
    blog:false,
    theme:{customCss:'./src/css/custom.css'},
  } satisfies Preset.Options]],
  themeConfig: {
    navbar: {title: 'Tuan Tran', items: [
      {to: '/#work', label: 'Work', position: 'left'},
      {to: '/#learning', label: 'Learning', position: 'left'},
      {to: '/handbook/', label: 'Handbook', position: 'left'},
      {to: '/handbook/search', label: 'Handbook Search', position: 'right'},
      {href: `https://github.com/${organizationName}`, label: 'GitHub', position: 'right'},
    ]},
    footer: {style: 'dark', links: [{title: 'Handbook', items: [
      {label: 'Learning Path', to: '/handbook/learning-path'},
      {label: 'Topics', to: '/handbook/topics'},
      {label: 'Glossary', to: '/handbook/reference/glossary'},
    ]}]},
    colorMode:{defaultMode:'dark',respectPrefersColorScheme:true},
    prism:{additionalLanguages:['bash','yaml','json','go','python','diff']},
    tableOfContents:{minHeadingLevel:2,maxHeadingLevel:3},
  } satisfies Preset.ThemeConfig,
};
export default config;
