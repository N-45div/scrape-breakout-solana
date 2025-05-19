import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = {
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <script async src="https://tally.so/widgets/embed.js"></script>
      <body className="flex flex-col min-h-screen bg-white dark:bg-black">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
