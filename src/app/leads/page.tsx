"use client";

import { useEffect, useState, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Trash2, ChevronDown, Users, Zap, PhoneCall, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import Link from "next/link";

type Lead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  industry_category: string | null;
  market: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
  users: { full_name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new:       { label: "New",       color: "bg-blue-100 text-blue-700",    icon: <Zap className="h-3 w-3" /> },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-700", icon: <PhoneCall className="h-3 w-3" /> },
  qualified: { label: "Qualified", color: "bg-purple-100 text-purple-700", icon: <CheckCircle className="h-3 w-3" /> },
  converted: { label: "Converted", color: "bg-green-100 text-green-700",  icon: <CheckCircle className="h-3 w-3" /> },
  dead:      { label: "Dead",      color: "bg-slate-100 text-slate-500",  icon: <XCircle className="h-3 w-3" /> },
};

const STATUS_ORDER = ["new", "contacted", "qualified", "converted", "dead"];

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  cold_outreach: "Cold Outreach",
  referral: "Referral",
  inbound: "Inbound",
  linkedin: "LinkedIn",
  close_crm: "Close CRM",
  other: "Other",
};

const INDUSTRIES = [
  "Restaurant", "Bar", "Beauty", "Retail", "Service",
  "Event Space", "App", "Ecommerce", "Gifting", "Other",
];

const MARKETS = [
  "Toronto", "Hamilton", "Ottawa", "Vancouver", "Calgary",
  "Edmonton", "Montreal", "Winnipeg", "Halifax", "Saskatoon",
  "Brampton", "Mississauga", "Durham", "York Region", "Kitchener",
  "London ON", "Windsor", "National", "Other",
];

function StatusDropdown({ leadId, current, onChange }: {
  leadId: string; current: string; onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_CONFIG[current] ?? STATUS_CONFIG.new;

  async function select(s: string) {
    if (s === current) { setOpen(false); return; }
    setUpdating(true); setOpen(false);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    onChange(s);
    setUpdating(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={updating}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-opacity ${cfg.color} ${updating ? "opacity-50" : "hover:opacity-80"}`}
      >
        {cfg.icon}{cfg.label}<ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border shadow-lg py-1 min-w-[140px]">
            {STATUS_ORDER.map((s) => {
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => select(s)}
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

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: (l: Lead) => void }) {
  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_email: "",
    contact_phone: "", website: "", industry_category: "",
    market: "", source: "manual", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) { setError("Company name is required"); return; }
    setSaving(true); setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to add lead"); setSaving(false); return; }
    onAdded(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">Add Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none p-1">✕</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1">Company Name *</label>
              <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Acme Restaurant" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Contact Name</label>
              <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
              <Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="jane@acme.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Phone</label>
              <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="416-555-0100" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Website</label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="acme.ca" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Industry</label>
              <Select value={form.industry_category} onValueChange={(v) => set("industry_category", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i.toLowerCase().replace(" ", "_")}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Market</label>
              <Select value={form.market} onValueChange={(v) => set("market", v)}>
                <SelectTrigger><SelectValue placeholder="Select city…" /></SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Source</label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1">Notes</label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything useful about this lead…" className="h-20 resize-none text-sm" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#E8192C] hover:bg-[#c0141f]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const res = await fetch("/api/leads");
    const { data } = await res.json();
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function updateStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => l.id === id ? { ...l, status } : l));
  }

  async function deleteLead(id: string) {
    setDeletingId(id);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((ls) => ls.filter((l) => l.id !== id));
    setDeletingId(null);
  }

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.company_name.toLowerCase().includes(q) ||
      (l.contact_name ?? "").toLowerCase().includes(q) ||
      (l.market ?? "").toLowerCase().includes(q) ||
      (l.industry_category ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Leads" />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Leads", value: stats.total, sub: "all time" },
            { label: "New", value: stats.new, sub: "not yet contacted" },
            { label: "Qualified", value: stats.qualified, sub: "ready to pitch" },
            { label: "Converted", value: stats.converted, sub: "became deals" },
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
              placeholder="Search company, contact, city…"
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
              All ({leads.length})
            </button>
            {STATUS_ORDER.map((s) => {
              const count = leads.filter((l) => l.status === s).length;
              if (count === 0) return null;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  {STATUS_CONFIG[s].label} ({count})
                </button>
              );
            })}
          </div>
          <Button onClick={() => setShowAdd(true)} className="ml-auto bg-[#E8192C] hover:bg-[#c0141f]">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">Loading leads…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <Users className="h-8 w-8 text-[#E8192C] mx-auto mb-3" />
              <div className="font-medium">{search || statusFilter !== "all" ? "No leads match filters" : "No leads yet"}</div>
              {!search && statusFilter === "all" && (
                <>
                  <div className="text-sm text-muted-foreground mt-1 mb-4">Track prospects before they become deals.</div>
                  <Button onClick={() => setShowAdd(true)} className="bg-[#E8192C] hover:bg-[#c0141f]">
                    <Plus className="h-4 w-4 mr-2" /> Add First Lead
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
                    {["Company", "Contact", "Market", "Industry", "Source", "Status", "AE", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.company_name}</div>
                        {lead.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{lead.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.contact_name && <div className="font-medium text-slate-700">{lead.contact_name}</div>}
                        {lead.contact_email && (
                          <a href={`mailto:${lead.contact_email}`} className="text-xs text-blue-600 hover:underline">
                            {lead.contact_email}
                          </a>
                        )}
                        {lead.contact_phone && (
                          <div className="text-xs text-muted-foreground">{lead.contact_phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.market ?? "—"}</td>
                      <td className="px-4 py-3">
                        {lead.industry_category ? (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {lead.industry_category.replace(/_/g, " ")}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                      <td className="px-4 py-3">
                        <StatusDropdown
                          leadId={lead.id}
                          current={lead.status}
                          onChange={(s) => updateStatus(lead.id, s)}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {lead.users?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {new Date(lead.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {lead.status === "qualified" && (
                            <Button asChild size="sm" className="h-7 text-xs bg-[#E8192C] hover:bg-[#c0141f] px-2.5">
                              <Link href={`/proposals/new?company=${encodeURIComponent(lead.company_name)}&market=${encodeURIComponent(lead.market ?? "")}&industry=${encodeURIComponent(lead.industry_category ?? "")}`}>
                                → Proposal
                              </Link>
                            </Button>
                          )}
                          <button
                            onClick={() => deleteLead(lead.id)}
                            disabled={deletingId === lead.id}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 transition-colors"
                          >
                            {deletingId === lead.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onAdded={(lead) => setLeads((ls) => [lead, ...ls])}
        />
      )}
    </main>
  );
}
