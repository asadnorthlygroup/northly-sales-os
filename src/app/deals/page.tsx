"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Plus, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

type Deal = {
  id: string;
  title: string;
  status: string;
  cities: string[];
  goal: string | null;
  created_at: string;
  clients: { company_name: string; primary_contact_name: string | null } | null;
  users: { full_name: string } | null;
  proposals: { id: string; ladder_data: Record<string, number> }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:          { label: "Draft",         color: "bg-slate-100 text-slate-600",   icon: <Clock className="h-3 w-3" /> },
  proposal_sent:  { label: "Sent",          color: "bg-blue-100 text-blue-700",     icon: <TrendingUp className="h-3 w-3" /> },
  negotiating:    { label: "Negotiating",   color: "bg-yellow-100 text-yellow-700", icon: <TrendingUp className="h-3 w-3" /> },
  won:            { label: "Won",           color: "bg-green-100 text-green-700",   icon: <CheckCircle className="h-3 w-3" /> },
  lost:           { label: "Lost",          color: "bg-red-100 text-red-600",       icon: <XCircle className="h-3 w-3" /> },
  stalled:        { label: "Stalled",       color: "bg-orange-100 text-orange-600", icon: <Clock className="h-3 w-3" /> },
};

const STATUS_ORDER = ["draft", "proposal_sent", "negotiating", "won", "lost", "stalled"];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase
      .from("deals")
      .select(`id, title, status, cities, goal, created_at,
        clients ( company_name, primary_contact_name ),
        users ( full_name ),
        proposals ( id, ladder_data )`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDeals((data as unknown as Deal[]) ?? []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = filter === "all" ? deals : deals.filter((d) => d.status === filter);
  const stats = {
    total: deals.length,
    open: deals.filter((d) => !["won", "lost"].includes(d.status)).length,
    won: deals.filter((d) => d.status === "won").length,
    sent: deals.filter((d) => d.status === "proposal_sent").length,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#E8192C] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <div className="font-semibold">Northly Sales OS</div>
              <div className="text-xs text-muted-foreground">Deals Pipeline</div>
            </div>
          </div>
          <Button asChild className="bg-[#E8192C] hover:bg-[#c0141f]">
            <Link href="/proposals/new"><Plus className="h-4 w-4 mr-2" />New Proposal</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${filter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}>
            All ({deals.length})
          </button>
          {STATUS_ORDER.map((s) => {
            const count = deals.filter((d) => d.status === s).length;
            if (count === 0) return null;
            return (
              <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}>
                {STATUS_CONFIG[s].label} ({count})
              </button>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <Card className="rounded-2xl"><CardContent className="py-16 text-center text-muted-foreground">Loading pipeline…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <Sparkles className="h-8 w-8 text-[#E8192C] mx-auto mb-3" />
              <div className="font-medium">No deals yet</div>
              <div className="text-sm text-muted-foreground mt-1 mb-4">Build a proposal and save it to pipeline.</div>
              <Button asChild className="bg-[#E8192C] hover:bg-[#c0141f]"><Link href="/proposals/new">Build First Proposal</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Client", "Deal", "AE", "Markets", "Status", "Opt 2 Value", "Date"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((deal) => {
                    const cfg = STATUS_CONFIG[deal.status] ?? STATUS_CONFIG.draft;
                    const opt2 = deal.proposals?.[0]?.ladder_data?.option2Price;
                    return (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{deal.clients?.company_name ?? "—"}</div>
                          {deal.clients?.primary_contact_name && <div className="text-xs text-muted-foreground">{deal.clients.primary_contact_name}</div>}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="truncate font-medium text-slate-800">{deal.title}</div>
                          {deal.goal && <div className="text-xs text-muted-foreground">{deal.goal}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{deal.users?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(deal.cities ?? []).slice(0, 2).map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                            {(deal.cities ?? []).length > 2 && <Badge variant="secondary" className="text-xs">+{deal.cities.length - 2}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{opt2 ? formatCurrency(opt2) : "—"}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(deal.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
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
    </main>
  );
}
