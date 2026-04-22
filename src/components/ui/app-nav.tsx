"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/ui/sign-out-button";

interface AppNavProps {
  page?: string;
  showBack?: boolean;
  backHref?: string;
}

export function AppNav({ page, showBack = false, backHref }: AppNavProps) {
  const router = useRouter();

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
          <Button variant="ghost" size="sm" asChild className="text-slate-600 hidden md:flex">
            <Link href="/deals">Pipeline</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-slate-600 hidden md:flex">
            <Link href="/accounts">Accounts</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-slate-600 hidden md:flex">
            <Link href="/leads">Leads</Link>
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1 hidden md:block" />
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
