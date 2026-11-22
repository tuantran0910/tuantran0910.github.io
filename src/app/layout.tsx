import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './global.css';

export const metadata: Metadata = {
  title: {
    default: 'Tuan Tran — Cloud Native Engineering Handbook',
    template: '%s | Tuan Tran',
  },
  description: 'Work, projects, and practical cloud-native platform engineering notes.',
  icons: {
    icon: '/img/favicon.svg',
  },
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
