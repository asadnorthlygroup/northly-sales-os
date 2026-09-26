import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for the public legal pages.
 *
 * These are reachable without signing in, because Intuit checks the privacy
 * policy and terms URLs when issuing production keys and a login redirect
 * fails that check. See publicPaths in middleware.ts.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8192C] text-sm font-bold text-white">
            N
          </span>
          <span className="font-semibold text-slate-900">Northly Sales OS</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>

        <div className="mt-10 space-y-10">{children}</div>

        <footer className="mt-16 border-t pt-6 text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-900">
            Terms of Service
          </Link>
          <span>WAVEROOMTV INC. trading as Northly Group</span>
        </footer>
      </div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#E8192C] [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
