"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, TrendingUp, Clock, CheckCircle, XCircle,
  ChevronDown, Receipt, Link2, UserCircle, FileText,
} from "lucide-react";
import { AppNav } from "@/components/ui/app-nav";
import { formatCurrency } from "@/lib/pricing";
import InvoiceModal from "@/components/deals/InvoiceModal";
import GenerateDocumentsModal from "@/components/deals/GenerateDocumentsModal";
import ClientProfileDrawer from "@/components/deals/ClientProfileDrawer";
import { computeDealQuality } from "@/lib/deal-quality";

type Deal = {
  id: string;
  title: string;
  status: string;
  cities: string[];
  goal: string | null;
  created_at: string;
  clients: { id: string; company_name: string; primary_contact_name: string | null } | null;
  users: { full_name: string } | null;
  proposals: { id: string; ladder_data: Record<string, number>; selected_accounts: string[]; generated_text: string | null }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:         { label: "Draft",       color: "bg-slate-100 text-slate-600",   icon: <Clock className="h-3 w-3" /> },
  proposal_sent: { label: "Sent",        color: "bg-blue-100 text-blue-700",     icon: <TrendingUp className="h-3 w-3" /> },
  negotiating:   { label: "Negotiating", color: "bg-yellow-100 text-yellow-700", icon: <TrendingUp className="h-3 w-3" /> },
  won:           { label: "Won",         color: "bg-green-100 text-green-700",   icon: <CheckCircle className="h-3 w-3" /> },
  lost:          { label: "Lost",        color: "bg-red-100 text-red-600",       icon: <XCircle className="h-3 w-3" /> },
  stalled:       { label: "Stalled",     color: "bg-orange-100 text-orange-600", icon: <Clock className="h-3 w-3" /> },
};

const STATUS_ORDER = ["draft", "proposal_sent", "negotiating", "won", "lost", "stalled"];
const STATUSES = ["draft", "proposal_sent", "negotiating", "won", "lost", "stalled"];

/**
 * Turns a deal's proposal into the lines both documents are built from.
 * Uses the lowest priced option that has a value, matching how the invoice
 * modal picks its default, and names the pages the campaign runs on.
 */
function buildDocumentLines(deal: Deal) {
  const ladder = deal.proposals?.[0]?.ladder_data ?? {};
  const handles = deal.proposals?.[0]?.selected_accounts ?? [];

  const option = [2, 3, 4, 5]
    .map((n) => ({ n, price: ladder[`option${n}Price`] ?? 0 }))
    .find((o) => o.price > 0);

  if (!option) return [];

  const pages = handles.length > 0 ? `\nPages: ${handles.join(", ")}` : "";

  return [
    {
      item: deal.title || "Northly Group Campaign",
      description: `Northly Group Marketing Package — Option ${option.n}${pages}`,
      quantity: 1,
      unitPrice: option.price,
    },
  ];
}

function StatusDropdown({
  dealId,
  current,
  onChange,
}: { dealId: string; current: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function select(s: string) {
    if (s === current) { setOpen(false); return; }
    setUpdating(true);
    setOpen(false);
    await fetch(`/api/deals/${dealId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    onChange(s);
    setUpdating(false);
  }

  const cfg = STATUS_CONFIG[current] ?? STATUS_CONFIG.draft;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={updating}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-opacity ${cfg.color} ${updating ? "opacity-50" : "hover:opacity-80"}`}
      >
        {cfg.icon}
        {cfg.label}
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border shadow-lg py-1 min-w-[140px]">
            {STATUSES.map((s) => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => select(s)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 text-left ${s === current ? "font-medium" : ""}`}
                >
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${c.color}`}>
                    {c.icon}{c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [invoiceDeal, setInvoiceDeal] = useState<Deal | null>(null);
  const [documentsDeal, setDocumentsDeal] = useState<Deal | null>(null);
  const [qbBanner, setQbBanner] = useState<"connected" | "error" | null>(null);
  const [profileClientId, setProfileClientId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchDeals = useCallback(async () => {
    const { data } = await supabase
      .from("deals")
      .select(`id, title, status, cities, goal, created_at,
        clients ( id, company_name, primary_contact_name ),
        users ( full_name ),
        proposals ( id, ladder_data, selected_accounts, generated_text )`)
      .order("created_at", { ascending: false });
    setDeals((data as unknown as Deal[]) ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDeals();
    // Check for QB connect callback
    const params = new URLSearchParams(window.location.search);
    if (params.get("qb") === "connected") setQbBanner("connected");
    if (params.get("error")?.startsWith("qb_")) setQbBanner("error");
  }, [fetchDeals]);

  function updateDealStatus(id: string, status: string) {
    setDeals((ds) => ds.map((d) => d.id === id ? { ...d, status } : d));
  }

  const filtered = filter === "all" ? deals : deals.filter((d) => d.status === filter);
  const stats = {
    total: deals.length,
    open: deals.filter((d) => !["won", "lost"].includes(d.status)).length,
    won: deals.filter((d) => d.status === "won").length,
    sent: deals.filter((d) => d.status === "proposal_sent").length,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Deals Pipeline" />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* QB banners */}
        {qbBanner === "connected" && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            <CheckCircle className="h-4 w-4 shrink-0" />
            QuickBooks connected successfully. You can now create invoices.
          </div>
        )}
        {qbBanner === "error" && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle className="h-4 w-4 shrink-0" />
            QuickBooks connection failed. <a href="/api/auth/quickbooks" className="underline font-medium">Try again →</a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Deals", value: stats.total, sub: "all time" },
            { label: "Open", value: stats.open, sub: "active pipeline" },
            { label: "Proposals Sent", value: stats.sent, sub: "awaiting response" },
            { label: "Won", value: stats.won, sub: "closed deals" },
          ].map(({ label, value, sub }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <div className="text-3xl font-bold">{value}</div>
                <div className="font-medium text-sm mt-1">{label}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QB Connect link */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${filter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}
            >
              All ({deals.length})
            </button>
            {STATUS_ORDER.map((s) => {
              const count = deals.filter((d) => d.status === s).length;
              if (count === 0) return null;
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  {STATUS_CONFIG[s].label} ({count})
                </button>
              );
            })}
          </div>
          <a
            href="/api/auth/quickbooks"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect QuickBooks
          </a>
        </div>

        {/* Table */}
        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">Loading pipeline…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <Sparkles className="h-8 w-8 text-[#E8192C] mx-auto mb-3" />
              <div className="font-medium">No deals yet</div>
              <div className="text-sm text-muted-foreground mt-1 mb-4">Build a proposal and save it to pipeline.</div>
              <Button asChild className="bg-[#E8192C] hover:bg-[#c0141f]">
                <Link href="/proposals/new">Build First Proposal</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Client", "Deal", "AE", "Markets", "Status", "Score", "Opt 2 Value", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((deal) => {
                    const opt2 = deal.proposals?.[0]?.ladder_data?.option2Price;
                    const hasProposal = (deal.proposals?.length ?? 0) > 0;
                    const quality = computeDealQuality(deal);
                    return (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div>
                              <div className="font-medium">{deal.clients?.company_name ?? "—"}</div>
                              {deal.clients?.primary_contact_name && (
                                <div className="text-xs text-muted-foreground">{deal.clients.primary_contact_name}</div>
                              )}
                            </div>
                            {deal.clients?.id && (
                              <button
                                onClick={() => setProfileClientId(deal.clients!.id)}
                                className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors p-0.5"
                                title="View client profile"
                              >
                                <UserCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="truncate font-medium text-slate-800">{deal.title}</div>
                          {deal.goal && <div className="text-xs text-muted-foreground">{deal.goal}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{deal.users?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(deal.cities ?? []).slice(0, 2).map((c) => (
                              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                            {(deal.cities ?? []).length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{deal.cities.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusDropdown
                            dealId={deal.id}
                            current={deal.status}
                            onChange={(s) => updateDealStatus(deal.id, s)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${quality.color}`}
                            title={quality.breakdown.map((b) => `${b.label}: ${b.earned}/${b.max}`).join("\n")}
                          >
                            {quality.score}
                            <span className="opacity-70 font-normal">{quality.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {opt2 ? formatCurrency(opt2) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(deal.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          {hasProposal && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setDocumentsDeal(deal)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#E8192C] rounded-lg hover:bg-[#c81525] transition-colors whitespace-nowrap"
                              >
                                <FileText className="h-3 w-3" />
                                Agreement + Invoice
                              </button>
                              <button
                                onClick={() => setInvoiceDeal(deal)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#2CA01C] border border-[#2CA01C]/30 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap"
                                title="Create only a QuickBooks invoice"
                              >
                                <Receipt className="h-3 w-3" />
                                Invoice only
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Agreement + invoice, generated together */}
      {documentsDeal && (
        <GenerateDocumentsModal
          dealId={documentsDeal.id}
          clientCompany={documentsDeal.clients?.company_name ?? "Client"}
          campaignTitle={documentsDeal.title ?? "Campaign"}
          lines={buildDocumentLines(documentsDeal)}
          onClose={() => setDocumentsDeal(null)}
        />
      )}

      {/* Invoice modal */}
      {invoiceDeal && (
        <InvoiceModal
          dealId={invoiceDeal.id}
          clientName={invoiceDeal.clients?.company_name ?? "Client"}
          optionPrices={invoiceDeal.proposals?.[0]?.ladder_data ?? {}}
          selectedAccountHandles={invoiceDeal.proposals?.[0]?.selected_accounts ?? []}
          onClose={() => setInvoiceDeal(null)}
        />
      )}

      {/* Client profile drawer */}
      {profileClientId && (
        <ClientProfileDrawer
          clientId={profileClientId}
          onClose={() => setProfileClientId(null)}
        />
      )}
    </main>
  );
}
