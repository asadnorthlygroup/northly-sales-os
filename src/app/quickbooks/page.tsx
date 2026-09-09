"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, Plug, RefreshCw } from "lucide-react";

/**
 * Connect, reconnect and disconnect the QuickBooks company.
 *
 * Intuit requires a connect/reconnect URL and a disconnect URL for production
 * apps, and reaches these without a session, so the page renders a signed-out
 * state rather than redirecting to the login screen. No data is shown until
 * the status endpoint answers, which needs a session of its own.
 */
interface Status {
  connected: boolean;
  environment?: string;
  realmId?: string;
  companyName?: string | null;
  isSandbox?: boolean;
  detail?: string;
}

export default function QuickBooksPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/quickbooks/status", {
        headers: { Accept: "application/json" },
        redirect: "follow",
      });
      // Unauthenticated callers are redirected to the login page by the
      // middleware, so the reply is HTML rather than a 401.
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (res.status === 401 || !isJson) {
        setNeedsSignIn(true);
        return;
      }
      setStatus(await res.json());
    } catch {
      setError("Could not read the connection status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function disconnect() {
    if (!confirm("Disconnect QuickBooks? Invoices cannot be created until you reconnect.")) return;
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/auth/quickbooks/disconnect", { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Could not disconnect.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-2xl px-6 py-5 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8192C] text-sm font-bold text-white">
            N
          </span>
          <span className="font-semibold text-slate-900">Northly Sales OS</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">QuickBooks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect the company that invoices are created in.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking the connection…
          </div>
        )}

        {!loading && needsSignIn && (
          <div className="rounded-2xl border bg-white p-6 space-y-3">
            <p className="text-sm text-slate-600">
              Sign in to a Northly Group account to manage the QuickBooks connection.
            </p>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </div>
        )}

        {!loading && !needsSignIn && status && (
          <div className="rounded-2xl border bg-white p-6 space-y-5">
            <div className="flex items-start gap-3">
              {status.connected ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-slate-900">
                  {status.connected ? "Connected" : "Not connected"}
                </div>
                {status.connected && (
                  <div className="text-sm text-slate-600 mt-0.5">
                    {status.companyName ?? "Unknown company"}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  environment: {status.environment ?? "unknown"}
                  {status.realmId ? ` · realm …${status.realmId.slice(-6)}` : ""}
                </div>
              </div>
            </div>

            {status.connected && status.isSandbox && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="font-medium">This is an Intuit sandbox company</div>
                <p className="text-xs mt-1">
                  Invoices created here are test data. They do not appear in Northly Group&rsquo;s
                  real books and never reach a client.
                </p>
              </div>
            )}

            {!status.connected && status.detail && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 break-words">
                {status.detail.slice(0, 400)}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <a href="/api/auth/quickbooks?return_to=/quickbooks">
                <Button>
                  {status.connected ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Reconnect
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plug className="h-4 w-4" />
                      Connect QuickBooks
                    </span>
                  )}
                </Button>
              </a>
              {status.connected && (
                <Button variant="outline" onClick={disconnect} disabled={working}>
                  {working ? "Disconnecting…" : "Disconnect"}
                </Button>
              )}
              <Link href="/deals">
                <Button variant="ghost">Back to pipeline</Button>
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              Reconnecting lets you choose which company to invoice into. Northly Group has
              more than one company under the same Intuit login, so check the name above
              after connecting.
            </p>

            <p className="text-xs text-slate-500 border-t pt-4">
              Something wrong with the connection or an invoice? Email{" "}
              <a href="mailto:info@northlygroup.com" className="text-[#E8192C] underline">
                info@northlygroup.com
              </a>{" "}
              and include the company name and invoice number shown above.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
