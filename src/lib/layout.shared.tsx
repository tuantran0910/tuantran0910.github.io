import type {BaseLayoutProps} from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Tuan Tran',
    },
    links: [
      {text: 'Work', url: '/#work'},
      {text: 'Learning', url: '/#learning'},
      {text: 'Handbook', url: '/handbook', active: 'nested-url'},
    ],
    githubUrl: 'https://github.com/tuantran0910',
  };
}
