"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppNav } from "@/components/ui/app-nav";
import {
  Search, Plus, RefreshCw, ExternalLink, User, Phone, Mail,
  TrendingUp, Clock, ChevronRight, Building2, AlertCircle,
} from "lucide-react";

type CloseContact = {
  id: string;
  name: string;
  title?: string;
  emails: { email: string }[];
  phones: { phone: string }[];
};

type CloseOpportunity = {
  id: string;
  status_label: string;
  status_type: string;
  value: number;
  value_formatted: string;
  note?: string;
};

type CloseLead = {
  id: string;
  display_name: string;
  status_label: string;
  contacts: CloseContact[];
  opportunities: CloseOpportunity[];
  date_created: string;
  date_updated: string;
  description?: string;
  url?: string;
};

const STATUS_COLORS: Record<string, string> = {
  "Potential":     "bg-blue-50 text-blue-700 border-blue-200",
  "Interested":    "bg-purple-50 text-purple-700 border-purple-200",
  "Active":        "bg-green-50 text-green-700 border-green-200",
  "Trial":         "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Won":           "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Lost":          "bg-red-50 text-red-600 border-red-200",
  "Bad Fit":       "bg-slate-100 text-slate-500 border-slate-200",
};

function statusColor(label: string) {
  return STATUS_COLORS[label] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function oppStatusColor(type: string) {
  if (type === "won") return "text-emerald-600";
  if (type === "lost") return "text-red-500";
  return "text-blue-600";
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<CloseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CloseLead | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLeads = useCallback(async (q: string, append = false, cur?: string) => {
    if (!append) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cur) params.set("cursor", cur);
      const res = await fetch(`/api/close/leads?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const fetched: CloseLead[] = data.data ?? [];
      setLeads((prev) => append ? [...prev, ...fetched] : fetched);
      setHasMore(!!data.cursor_next);
      setCursor(data.cursor_next ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(debouncedSearch);
  }, [debouncedSearch, fetchLeads]);

  // Build proposal URL with pre-filled params from a Close lead
  function buildProposalUrl(lead: CloseLead) {
    const contact = lead.contacts?.[0];
    const params = new URLSearchParams();
    params.set("businessName", lead.display_name ?? "");
    if (contact?.name) params.set("contactName", contact.name);
    if (contact?.emails?.[0]?.email) params.set("contactEmail", contact.emails[0].email);
    if (lead.description) params.set("businessInfo", lead.description.substring(0, 200));
    params.set("closeLeadId", lead.id);
    return `/proposals/new?${params}`;
  }

  const primaryContact = (lead: CloseLead) => lead.contacts?.[0];
  const openOpps = (lead: CloseLead) => lead.opportunities?.filter((o) => o.status_type === "active") ?? [];
  const totalOppValue = (lead: CloseLead) =>
    lead.opportunities?.reduce((s, o) => s + (o.value ?? 0), 0) ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <AppNav page="Close CRM Leads" showBack backHref="/deals" />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Leads from Close CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">Click any lead to build a proposal with pre-filled client info.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLeads(debouncedSearch)}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search leads by company or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Error state */}
        {error && (
          <Card className="rounded-2xl border-red-200 bg-red-50 mb-6">
            <CardContent className="py-5 flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">Could not connect to Close CRM</div>
                <div className="text-sm mt-0.5">{error.includes("not configured") ? "Add CLOSE_API_KEY to your Vercel environment variables." : error}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Leads list */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              ))
            ) : leads.length === 0 && !error ? (
              <Card className="rounded-2xl">
                <CardContent className="py-16 text-center">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <div className="font-medium text-slate-600">No leads found</div>
                  <div className="text-sm text-muted-foreground mt-1">Try a different search.</div>
                </CardContent>
              </Card>
            ) : (
              leads.map((lead) => {
                const contact = primaryContact(lead);
                const opps = openOpps(lead);
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(isSelected ? null : lead)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? "border-[#E8192C] ring-1 ring-[#E8192C]/20 shadow-md" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">{lead.display_name}</span>
                          <Badge className={`text-xs border ${statusColor(lead.status_label)}`} variant="outline">
                            {lead.status_label}
                          </Badge>
                          {opps.length > 0 && (
                            <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200" variant="outline">
                              <TrendingUp className="h-3 w-3 mr-1" />{opps.length} opp{opps.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {contact && (
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{contact.name}</span>
                            {contact.emails?.[0] && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.emails[0].email}</span>}
                            {contact.phones?.[0] && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phones[0].phone}</span>}
                          </div>
                        )}
                        {lead.description && (
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">{lead.description}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          {lead.url && (
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            className="bg-[#E8192C] hover:bg-[#c0141f] text-xs h-8"
                            onClick={(e) => { e.stopPropagation(); router.push(buildProposalUrl(lead)); }}
                          >
                            Build Proposal
                          </Button>
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(lead.date_updated).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {hasMore && (
              <Button variant="outline" className="w-full rounded-xl" onClick={() => fetchLeads(debouncedSearch, true, cursor ?? undefined)}>
                Load more leads
              </Button>
            )}
          </div>

          {/* Lead detail panel */}
          <div className="sticky top-24 self-start">
            {selectedLead ? (
              <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-5 space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-lg leading-tight">{selectedLead.display_name}</h3>
                      {selectedLead.url && (
                        <a href={selectedLead.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <Badge className={`text-xs border ${statusColor(selectedLead.status_label)}`} variant="outline">
                      {selectedLead.status_label}
                    </Badge>
                  </div>

                  {selectedLead.description && (
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedLead.description}</p>
                  )}

                  {/* Contacts */}
                  {selectedLead.contacts?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contacts</p>
                      <div className="space-y-3">
                        {selectedLead.contacts.map((c) => (
                          <div key={c.id} className="rounded-xl bg-slate-50 p-3">
                            <div className="font-medium text-sm">{c.name}</div>
                            {c.title && <div className="text-xs text-slate-500">{c.title}</div>}
                            {c.emails?.[0] && <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Mail className="h-3 w-3" />{c.emails[0].email}</div>}
                            {c.phones?.[0] && <div className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" />{c.phones[0].phone}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opportunities */}
                  {selectedLead.opportunities?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Opportunities</p>
                      <div className="space-y-2">
                        {selectedLead.opportunities.map((o) => (
                          <div key={o.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <div>
                              <div className={`text-xs font-semibold ${oppStatusColor(o.status_type)}`}>{o.status_label}</div>
                              {o.note && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">{o.note}</div>}
                            </div>
                            {o.value > 0 && <div className="text-sm font-bold text-slate-800">{o.value_formatted}</div>}
                          </div>
                        ))}
                      </div>
                      {totalOppValue(selectedLead) > 0 && (
                        <div className="text-right text-xs text-slate-500 mt-1">
                          Total: <span className="font-semibold">${totalOppValue(selectedLead).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full bg-[#E8192C] hover:bg-[#c0141f]"
                    onClick={() => router.push(buildProposalUrl(selectedLead))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Build Proposal for {selectedLead.display_name}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-dashed border-slate-200">
                <CardContent className="py-12 text-center">
                  <Building2 className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Click a lead to see full details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
