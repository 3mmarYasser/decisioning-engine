import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Decisioning Engine',
  description: 'Consent-safe personalisation without rebuilding',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                D
              </div>
              Decisioning Engine
            </Link>
            <nav className="flex items-center gap-1 text-sm" aria-label="Main">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Playground
              </Link>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                API
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
