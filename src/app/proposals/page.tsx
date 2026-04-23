"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppNav } from "@/components/ui/app-nav";
import { Sparkles, FileText, Clock, Search, ChevronRight, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/pricing";

type Proposal = {
  id: string;
  version: number;
  status: string;
  created_at: string;
  generated_text: string | null;
  ladder_data: Record<string, number> | null;
  selected_accounts: string[] | null;
  intake_data: Record<string, unknown> | null;
  deals: {
    id: string;
    title: string;
    status: string;
    cities: string[];
    goal: string | null;
    clients: { company_name: string; primary_contact_name: string | null } | null;
  } | null;
};

const DEAL_STATUS: Record<string, { label: string; color: string }> = {
  draft:          { label: "Draft",       color: "bg-slate-100 text-slate-600" },
  proposal_sent:  { label: "Sent",        color: "bg-blue-100 text-blue-700" },
  negotiating:    { label: "Negotiating", color: "bg-yellow-100 text-yellow-700" },
  won:            { label: "Won",         color: "bg-green-100 text-green-700" },
  lost:           { label: "Lost",        color: "bg-red-100 text-red-600" },
  stalled:        { label: "Stalled",     color: "bg-orange-100 text-orange-600" },
};

function ProposalDrawer({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!proposal.generated_text) return;
    await navigator.clipboard.writeText(proposal.generated_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const client = proposal.deals?.clients;
  const deal = proposal.deals;
  const opt2 = proposal.ladder_data?.option2Price;
  const accounts = proposal.selected_accounts ?? [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <div className="font-bold text-lg">{client?.company_name ?? "Unnamed"}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{deal?.title}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {deal?.status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DEAL_STATUS[deal.status]?.color ?? "bg-slate-100 text-slate-600"}`}>
                  {DEAL_STATUS[deal.status]?.label ?? deal.status}
                </span>
              )}
              {opt2 && (
                <span className="text-sm font-semibold text-slate-700">{formatCurrency(opt2)}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(proposal.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 text-lg leading-none">✕</button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b bg-slate-50 flex flex-wrap gap-4 text-sm">
          {(deal?.cities ?? []).length > 0 && (
            <div>
              <span className="text-muted-foreground">Markets: </span>
              {(deal?.cities ?? []).map((c) => (
                <Badge key={c} variant="secondary" className="mr-1 text-xs">{c}</Badge>
              ))}
            </div>
          )}
          {accounts.length > 0 && (
            <div className="text-muted-foreground">
              <span>{accounts.length} page{accounts.length !== 1 ? "s" : ""} selected</span>
            </div>
          )}
          {deal?.goal && (
            <div className="text-muted-foreground">Goal: <span className="text-foreground">{deal.goal}</span></div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-b flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Text"}
          </Button>
          <Button size="sm" asChild className="bg-[#E8192C] hover:bg-[#c0141f] gap-1.5">
            <Link href="/proposals/new">
              <Sparkles className="h-3.5 w-3.5" />
              New Proposal
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/deals">View in Pipeline →</Link>
          </Button>
        </div>

        {/* Proposal text */}
        <div className="flex-1 overflow-y-auto p-6">
          {proposal.generated_text ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans leading-relaxed">
              {proposal.generated_text}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">No proposal text saved.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Proposal | null>(null);

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then(({ data }) => { setProposals(data ?? []); setLoading(false); });
  }, []);

  const filtered = proposals.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.deals?.clients?.company_name?.toLowerCase().includes(q) ||
      p.deals?.title?.toLowerCase().includes(q) ||
      (p.deals?.cities ?? []).some((c) => c.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || p.deals?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [...new Set(proposals.map((p) => p.deals?.status).filter(Boolean))] as string[];

  const stats = {
    total: proposals.length,
    sent: proposals.filter((p) => p.deals?.status === "proposal_sent").length,
    won: proposals.filter((p) => p.deals?.status === "won").length,
    draft: proposals.filter((p) => p.deals?.status === "draft").length,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Proposals" />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, sub: "proposals saved" },
            { label: "Drafts", value: stats.draft, sub: "not yet sent" },
            { label: "Sent", value: stats.sent, sub: "awaiting response" },
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

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, title, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${statusFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}
            >
              All ({proposals.length})
            </button>
            {statuses.map((s) => {
              const count = proposals.filter((p) => p.deals?.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  {DEAL_STATUS[s]?.label ?? s} ({count})
                </button>
              );
            })}
          </div>
          <Button asChild className="ml-auto bg-[#E8192C] hover:bg-[#c0141f]">
            <Link href="/proposals/new">
              <Sparkles className="h-4 w-4 mr-2" />
              New Proposal
            </Link>
          </Button>
        </div>

        {/* Proposals table */}
        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto mb-2 animate-pulse" />
              Loading proposals…
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <div className="font-medium">
                {search || statusFilter !== "all" ? "No proposals match your filters" : "No proposals yet"}
              </div>
              {!search && statusFilter === "all" && (
                <>
                  <div className="text-sm text-muted-foreground mt-1 mb-4">
                    Build your first proposal and save it to see it here.
                  </div>
                  <Button asChild className="bg-[#E8192C] hover:bg-[#c0141f]">
                    <Link href="/proposals/new">Build First Proposal</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Client", "Deal", "Markets", "Pages", "Option 2", "Status", "Date", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => {
                    const cfg = DEAL_STATUS[p.deals?.status ?? "draft"] ?? DEAL_STATUS.draft;
                    const opt2 = p.ladder_data?.option2Price;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelected(p)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.deals?.clients?.company_name ?? "—"}</div>
                          {p.deals?.clients?.primary_contact_name && (
                            <div className="text-xs text-muted-foreground">{p.deals.clients.primary_contact_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="truncate text-slate-700">{p.deals?.title ?? "—"}</div>
                          {p.deals?.goal && (
                            <div className="text-xs text-muted-foreground truncate">{p.deals.goal}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.deals?.cities ?? []).slice(0, 2).map((c) => (
                              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                            {(p.deals?.cities ?? []).length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{(p.deals?.cities ?? []).length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(p.selected_accounts ?? []).length}
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {opt2 ? formatCurrency(opt2) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

      {selected && <ProposalDrawer proposal={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
