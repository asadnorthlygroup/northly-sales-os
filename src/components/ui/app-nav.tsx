"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { useState, useRef, useEffect } from "react";

interface AppNavProps {
  page?: string;
  showBack?: boolean;
  backHref?: string;
}

const PRIMARY_NAV = [
  { href: "/proposals", label: "Proposals" },
  { href: "/deals", label: "Pipeline" },
  { href: "/accounts", label: "Accounts" },
  { href: "/leads", label: "Leads" },
  { href: "/nori", label: "NORI" },
];

const MORE_NAV = [
  { href: "/library", label: "Proposal Library" },
  { href: "/packages", label: "Packages" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/invoices", label: "Invoices" },
  { href: "/pricing", label: "Pricing Engine" },
];

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const isActive = MORE_NAV.some((n) => pathname?.startsWith(n.href));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? "text-[#E8192C]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        More
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
          {MORE_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname?.startsWith(href)
                  ? "text-[#E8192C] bg-red-50 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppNav({ page, showBack = false, backHref }: AppNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  return (
    <header className="border-b bg-white sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">

        {/* Left: logo + optional back + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}

          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="h-8 w-8 rounded-lg bg-[#E8192C] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-sm hidden sm:block">Northly Sales OS</span>
          </Link>

          {page && (
            <>
              <span className="text-slate-300 hidden sm:block">/</span>
              <span className="text-sm font-medium text-slate-700 truncate hidden sm:block">{page}</span>
            </>
          )}
        </div>

        {/* Right: nav links + actions */}
        <div className="flex items-center gap-1 shrink-0">
          {PRIMARY_NAV.map(({ href, label }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors hidden md:block ${
                  active ? "text-[#E8192C] bg-red-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}

          <div className="hidden md:block">
            <MoreMenu />
          </div>

          <div className="w-px h-4 bg-slate-200 mx-1.5 hidden md:block" />
          <SignOutButton />
          <Button asChild size="sm" className="bg-[#E8192C] hover:bg-[#c0141f]">
            <Link href="/proposals/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Proposal
            </Link>
          </Button>
        </div>

      </div>
    </header>
  );
}
