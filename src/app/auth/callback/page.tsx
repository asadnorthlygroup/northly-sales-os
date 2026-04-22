"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      const desc = searchParams.get("error_description") ?? "";
      router.replace(`/login?error=${error}&desc=${encodeURIComponent(desc)}`);
      return;
    }

    if (!code) {
      router.replace("/login?error=no_code");
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
      } else {
        router.replace("/");
      }
    });
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#E8192C] flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </main>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 rounded-xl bg-[#E8192C] flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">N</span>
        </div>
      </main>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
