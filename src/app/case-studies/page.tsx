"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Plus, Search, X, Pencil, Trash2, Link2, FileText, StickyNote,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CaseStudyFull, CaseStudySummary } from "@/app/api/case-studies/route";

const NICHES = [
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "retail", label: "Retail" },
  { value: "events", label: "Events" },
  { value: "tourism", label: "Tourism" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "sports", label: "Sports" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

const SUB_NICHES: Record<string, { value: string; label: string }[]> = {
  food_beverage: [
    { value: "grand_opening", label: "Grand Opening" },
    { value: "lto", label: "LTO (Limited-Time Offer)" },
    { value: "restaurant", label: "Restaurant" },
    { value: "bar", label: "Bar / Nightlife" },
  ],
  retail: [
    { value: "clothing", label: "Clothing" },
    { value: "home", label: "Home & Décor" },
    { value: "beauty_retail", label: "Beauty Retail" },
  ],
  lifestyle: [
    { value: "fitness", label: "Fitness / Wellness" },
    { value: "beauty_service", label: "Beauty Services" },
    { value: "spa", label: "Spa / Self-care" },
  ],
  events: [
    { value: "grand_opening_event", label: "Grand Opening" },
    { value: "corporate", label: "Corporate" },
    { value: "festival", label: "Festival" },
  ],
};

const CONTENT_ICONS = {
  pdf: <FileText className="h-3.5 w-3.5" />,
  link: <Link2 className="h-3.5 w-3.5" />,
  notes: <StickyNote className="h-3.5 w-3.5" />,
};

const EMPTY_FORM = {
  title: "", client_name: "", niche: "food_beverage", sub_niche: "",
  content_type: "notes" as "pdf" | "link" | "notes",
  link_url: "", notes: "", results: "", tags: "",
};

export default function CaseStudiesPage() {
  const [studies, setStudies] = useState<CaseStudySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullData, setFullData] = useState<Record<string, CaseStudyFull>>({});
  const { toast } = useToast();

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (nicheFilter !== "all") params.set("niche", nicheFilter);
    if (search) params.set("q", search);
    if (mineOnly) params.set("mine", "true");
    const res = await fetch(`/api/case-studies?${params}`);
    const data = await res.json();
    setStudies(data.data ?? []);
    setLoading(false);
  }, [nicheFilter, search, mineOnly]);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);

  const expandStudy = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!fullData[id]) {
      const res = await fetch(`/api/case-studies/${id}`);
      const d = await res.json();
      if (d.data) setFullData((prev) => ({ ...prev, [id]: d.data }));
    }
  };

  const openNew = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };
  const openEdit = async (id: string) => {
    let full = fullData[id];
    if (!full) {
      const res = await fetch(`/api/case-studies/${id}`);
      const d = await res.json();
      if (d.data) { full = d.data; setFullData((prev) => ({ ...prev, [id]: d.data })); }
    }
    if (!full) return;
    setForm({
      title: full.title, client_name: full.client_name, niche: full.niche,
      sub_niche: full.sub_niche ?? "", content_type: full.content_type,
      link_url: full.link_url ?? "", notes: full.notes, results: full.results,
      tags: full.tags.join(", "),
    });
    setEditId(id);
    setShowForm(true);
  };

  const saveStudy = async () => {
    if (!form.title.trim() || !form.niche) {
      toast({ title: "Title and niche are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        sub_niche: form.sub_niche || null,
      };
      const url = editId ? `/api/case-studies/${editId}` : "/api/case-studies";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: editId ? "Case study updated" : "Case study added" });
      setShowForm(false);
      fetchStudies();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteStudy = async (id: string) => {
    if (!confirm("Delete this case study?")) return;
    await fetch(`/api/case-studies/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" });
    fetchStudies();
  };

  const nicheLabel = (n: string) => NICHES.find((x) => x.value === n)?.label ?? n;
  const subNicheLabel = (niche: string, sub: string | null) => {
    if (!sub) return null;
    return SUB_NICHES[niche]?.find((x) => x.value === sub)?.label ?? sub;
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Case Studies" />
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-[#E8192C]" />
              Case Studies
            </h1>
            <p className="text-sm text-slate-500 mt-1">Results we've driven for clients — organized by niche</p>
          </div>
          <Button onClick={openNew} className="bg-[#E8192C] hover:bg-[#c0141f]">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Case Study
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or title…" className="pl-9 bg-white" />
          </div>
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="w-48 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => setMineOnly(!mineOnly)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${mineOnly ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {mineOnly ? "My Studies" : "All Studies"}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">{editId ? "Edit Case Study" : "Add Case Study"}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title <span className="text-red-500">*</span></Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Grand Opening — Burger Spot" className="mt-1" />
                  </div>
                  <div>
                    <Label>Client Name</Label>
                    <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Burger Spot Hamilton" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Niche <span className="text-red-500">*</span></Label>
                    <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v, sub_niche: "" })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sub-niche</Label>
                    <Select value={form.sub_niche || "_none"} onValueChange={(v) => setForm({ ...form, sub_niche: v === "_none" ? "" : v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {(SUB_NICHES[form.niche] ?? []).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Content Type</Label>
                  <div className="flex gap-2 mt-1">
                    {(["notes", "link"] as const).map((ct) => (
                      <button key={ct} type="button" onClick={() => setForm({ ...form, content_type: ct })}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${form.content_type === ct ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        {ct === "notes" ? "Notes" : "Link / URL"}
                      </button>
                    ))}
                  </div>
                </div>
                {form.content_type === "link" && (
                  <div>
                    <Label>URL</Label>
                    <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://drive.google.com/..." className="mt-1" />
                  </div>
                )}
                <div>
                  <Label>Notes / Context</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Campaign details, strategy used, what made this work…" className="mt-1 h-24" />
                </div>
                <div>
                  <Label>Results</Label>
                  <Textarea value={form.results} onChange={(e) => setForm({ ...form, results: e.target.value })} placeholder="e.g. 2.4M impressions, 800+ walk-ins on opening day, sold out within 2 hours…" className="mt-1 h-20" />
                </div>
                <div>
                  <Label>Tags <span className="text-xs text-slate-400">(comma-separated)</span></Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="grand opening, hamilton, restaurant, 50k+" className="mt-1" />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={saveStudy} disabled={saving} className="bg-[#E8192C] hover:bg-[#c0141f]">
                  {saving ? "Saving…" : editId ? "Save Changes" : "Add Case Study"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading…</div>
        ) : studies.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <div className="font-medium">No case studies yet</div>
            <div className="text-sm mt-1">Add your first one to get started</div>
          </div>
        ) : (
          <div className="space-y-3">
            {studies.map((cs) => {
              const expanded = expandedId === cs.id;
              const full = fullData[cs.id];
              return (
                <Card key={cs.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{cs.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{nicheLabel(cs.niche)}</Badge>
                          {cs.sub_niche && <Badge variant="outline" className="text-xs">{subNicheLabel(cs.niche, cs.sub_niche)}</Badge>}
                          <span className="text-slate-400 flex items-center gap-1 text-xs">{CONTENT_ICONS[cs.content_type]} {cs.content_type}</span>
                        </div>
                        {cs.client_name && <div className="text-sm text-slate-500 mt-0.5">{cs.client_name} · by {cs.created_by_email.split("@")[0]}</div>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => expandStudy(cs.id)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button onClick={() => openEdit(cs.id)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteStudy(cs.id)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  {expanded && (
                    <CardContent className="pt-0">
                      {!full ? (
                        <div className="text-sm text-slate-400">Loading…</div>
                      ) : (
                        <div className="space-y-3 text-sm">
                          {full.link_url && (
                            <a href={full.link_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" /> {full.link_url}
                            </a>
                          )}
                          {full.notes && (
                            <div>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</div>
                              <p className="text-slate-700 whitespace-pre-wrap">{full.notes}</p>
                            </div>
                          )}
                          {full.results && (
                            <div>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Results</div>
                              <p className="text-slate-700 whitespace-pre-wrap">{full.results}</p>
                            </div>
                          )}
                          {full.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {full.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
