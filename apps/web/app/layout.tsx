import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'CyberOS Access Portal',
  description: 'Privy wallet onboarding + invite lifecycle + RBAC admin tooling.',
};

const routes = [
  ['Landing', '/'],
  ['Waitlist', '/waitlist'],
  ['Auth', '/auth'],
  ['Dashboard', '/dashboard'],
  ['Scanner', '/scanner'],
  ['Leaderboard', '/leaderboard'],
  ['Terminal', '/terminal'],
  ['Copy', '/copy'],
  ['Admin', '/admin'],
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main>
            <h1>CyberOS Web Console</h1>
            <nav>
              {routes.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </nav>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
