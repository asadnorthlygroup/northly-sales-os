"use client";

import { useEffect, useState, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Package, Copy, Archive, Trash2, Pencil,
  ChevronDown, ChevronRight, Eye, Loader2, X, Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/pricing";
import { CITY_GROUPS, CATEGORY_OPTIONS, ACCOUNTS_SEED } from "@/lib/accounts-seed";

type SalesPackage = {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  pages_included: string[];
  primary_page: string | null;
  collabs: string[];
  markets: string[];
  pricing: number;
  guaranteed_impressions: number | null;
  status: "active" | "archived";
  created_at: string;
  created_by?: string;
  created_by_email?: string;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  deliverables: [""],
  pages_included: [] as string[],
  primary_page: "",
  collabs: [] as string[],
  markets: [] as string[],
  pricing: "",
  guaranteed_impressions: "",
};

type PackageForm = typeof EMPTY_FORM;

function marketLabel(key: string) {
  return CITY_GROUPS.find((g) => g.key === key)?.label ?? key;
}

function PageBadge({ handle, primary }: { handle: string; primary?: boolean }) {
  const acc = ACCOUNTS_SEED.find((a) => a.handle === handle);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${primary ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
      {handle}
      {acc && <span className="opacity-60">·{Math.round(acc.followers / 1000)}k</span>}
      {primary && <span className="font-semibold ml-0.5">★</span>}
    </span>
  );
}

function PackageCard({
  pkg,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  pkg: SalesPackage;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const creatorHandle = pkg.created_by_email ? pkg.created_by_email.split("@")[0] : null;

  return (
    <div className={`border rounded-2xl overflow-hidden ${pkg.status === "archived" ? "opacity-60" : ""}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="mt-0.5 shrink-0 text-slate-300">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800">{pkg.title}</span>
            {pkg.status === "archived" && <Badge variant="secondary" className="text-xs">Archived</Badge>}
            <span className="text-sm font-semibold text-slate-700">{formatCurrency(pkg.pricing)}</span>
            {pkg.guaranteed_impressions && (
              <span className="text-xs text-slate-500">{pkg.guaranteed_impressions.toLocaleString()} impr.</span>
            )}
            {creatorHandle && (
              <span className="text-xs text-slate-400 italic">{creatorHandle}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {pkg.markets.map((m) => (
              <Badge key={m} variant="secondary" className="text-xs">{marketLabel(m)}</Badge>
            ))}
            {pkg.pages_included.length > 0 && (
              <span className="text-xs text-slate-500">{pkg.pages_included.length} page{pkg.pages_included.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDuplicate} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={onArchive} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title={pkg.status === "active" ? "Archive" : "Restore"}>
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-slate-50 px-4 py-4 space-y-3 text-sm">
          {pkg.description && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</div>
              <p className="text-slate-700 whitespace-pre-line">{pkg.description}</p>
            </div>
          )}
          {pkg.deliverables.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Deliverables</div>
              <ul className="space-y-0.5">
                {pkg.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(pkg.pages_included.length > 0 || pkg.collabs.length > 0) && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pages</div>
              <div className="flex flex-wrap gap-1">
                {pkg.primary_page && <PageBadge handle={pkg.primary_page} primary />}
                {pkg.pages_included.filter((h) => h !== pkg.primary_page).map((h) => <PageBadge key={h} handle={h} />)}
                {pkg.collabs.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    {h} <span className="opacity-60">collab</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {pkg.guaranteed_impressions && (
            <div className="text-xs text-slate-500">Guaranteed impressions: {pkg.guaranteed_impressions.toLocaleString()}</div>
          )}
          <div className="pt-1">
            <Button asChild size="sm" className="bg-[#E8192C] hover:bg-[#c0141f] gap-1.5 text-xs h-8">
              <a href={`/proposals/new?packageId=${pkg.id}`}>
                <Eye className="h-3.5 w-3.5" />
                Use in Proposal
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PackageFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: SalesPackage;
  onSave: (data: PackageForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PackageForm>(() =>
    initial
      ? {
          title: initial.title,
          description: initial.description,
          deliverables: initial.deliverables.length ? initial.deliverables : [""],
          pages_included: initial.pages_included,
          primary_page: initial.primary_page ?? "",
          collabs: initial.collabs,
          markets: initial.markets,
          pricing: String(initial.pricing),
          guaranteed_impressions: initial.guaranteed_impressions ? String(initial.guaranteed_impressions) : "",
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [pageSearch, setPageSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof PackageForm>(k: K, v: PackageForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const ne = { ...e }; delete ne[k]; return ne; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.description.trim()) e.description = "Required";
    if (!form.markets.length) e.markets = "Select at least one market";
    if (!form.pricing || isNaN(Number(form.pricing))) e.pricing = "Enter a valid price";
    if (!form.pages_included.length) e.pages_included = "Select at least one page";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        deliverables: form.deliverables.filter((d) => d.trim()),
      });
    } finally { setSaving(false); }
  }

  const filteredPages = ACCOUNTS_SEED.filter((a) =>
    !pageSearch ||
    a.handle.toLowerCase().includes(pageSearch.toLowerCase()) ||
    a.marketLabel.toLowerCase().includes(pageSearch.toLowerCase()) ||
    a.subNetwork.toLowerCase().includes(pageSearch.toLowerCase())
  ).slice(0, 50);

  const togglePage = (handle: string) => {
    const included = form.pages_included.includes(handle);
    set("pages_included", included ? form.pages_included.filter((h) => h !== handle) : [...form.pages_included, handle]);
    if (included && form.primary_page === handle) set("primary_page", "");
  };

  const toggleCollab = (handle: string) => {
    const included = form.collabs.includes(handle);
    set("collabs", included ? form.collabs.filter((h) => h !== handle) : [...form.collabs, handle]);
  };

  const toggleMarket = (key: string) => {
    const included = form.markets.includes(key);
    set("markets", included ? form.markets.filter((m) => m !== key) : [...form.markets, key]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{initial ? "Edit Package" : "Create Package"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title *</label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Standard Launch Bundle"
              className="mt-1"
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          {/* Markets */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Markets *</label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CITY_GROUPS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => toggleMarket(g.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    form.markets.includes(g.key)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {errors.markets && <p className="text-xs text-red-600 mt-1">{errors.markets}</p>}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Price *</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  value={form.pricing}
                  onChange={(e) => set("pricing", e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  type="number"
                  min="0"
                />
              </div>
              {errors.pricing && <p className="text-xs text-red-600 mt-1">{errors.pricing}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Guaranteed Impressions</label>
              <Input
                value={form.guaranteed_impressions}
                onChange={(e) => set("guaranteed_impressions", e.target.value)}
                placeholder="e.g. 50000"
                className="mt-1"
                type="number"
                min="0"
              />
            </div>
          </div>

          {/* Pages */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pages Included *</label>
            <Input
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              placeholder="Search pages…"
              className="mt-1 mb-2"
            />
            <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredPages.map((a) => {
                const isIncluded = form.pages_included.includes(a.handle);
                const isPrimary = form.primary_page === a.handle;
                const isCollab = form.collabs.includes(a.handle);
                return (
                  <div key={a.handle} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b last:border-b-0">
                    <button type="button" onClick={() => togglePage(a.handle)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isIncluded ? "bg-slate-900 border-slate-900" : "border-slate-300"}`}>
                      {isIncluded && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{a.handle}</span>
                      <span className="text-xs text-slate-400 ml-2">{a.marketLabel} · {Math.round(a.followers / 1000)}k</span>
                    </div>
                    {isIncluded && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => set("primary_page", isPrimary ? "" : a.handle)}
                          className={`px-1.5 py-0.5 rounded text-xs transition-colors ${isPrimary ? "bg-red-100 text-red-700 font-medium" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        >
                          {isPrimary ? "★ Primary" : "Set Primary"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCollab(a.handle)}
                          className={`px-1.5 py-0.5 rounded text-xs transition-colors ${isCollab ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        >
                          {isCollab ? "Collab ✓" : "Collab"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {form.pages_included.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">{form.pages_included.length} page(s) selected{form.primary_page ? ` · Primary: ${form.primary_page}` : ""}{form.collabs.length > 0 ? ` · ${form.collabs.length} collab(s)` : ""}</p>
            )}
            {errors.pages_included && <p className="text-xs text-red-600 mt-1">{errors.pages_included}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client-Facing Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe this package as it would appear in a proposal email…"
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30 resize-none"
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
          </div>

          {/* Deliverables */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Deliverables</label>
            <div className="space-y-2 mt-1">
              {form.deliverables.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={d}
                    onChange={(e) => {
                      const next = [...form.deliverables];
                      next[i] = e.target.value;
                      set("deliverables", next);
                    }}
                    placeholder={`Deliverable ${i + 1}`}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => set("deliverables", form.deliverables.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-500 px-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("deliverables", [...form.deliverables, ""])}
                className="text-xs text-[#E8192C] hover:underline font-medium"
              >
                + Add deliverable
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#E8192C] hover:bg-[#c0141f]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? "Save Changes" : "Create Package"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<SalesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [mineOnly, setMineOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<SalesPackage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, q: search });
    if (mineOnly) params.set("mine", "true");
    const res = await fetch(`/api/packages?${params}`);
    const d = await res.json() as { data: SalesPackage[] };
    setPackages(d.data ?? []);
    setLoading(false);
  }, [statusFilter, search, mineOnly]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: PackageForm) {
    const payload = {
      ...data,
      pricing: Number(data.pricing),
      guaranteed_impressions: data.guaranteed_impressions ? Number(data.guaranteed_impressions) : null,
    };

    if (editingPkg) {
      await fetch(`/api/packages/${editingPkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowForm(false);
    setEditingPkg(null);
    await load();
  }

  async function handleDuplicate(id: string) {
    await fetch(`/api/packages/${id}`, { method: "POST" });
    await load();
  }

  async function handleArchive(pkg: SalesPackage) {
    await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: pkg.status === "active" ? "archived" : "active" }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this package permanently?")) return;
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    await load();
  }

  const activeCount = packages.filter((p) => p.status === "active").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Packages" />

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Packages & Options</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reusable sales packages that auto-populate proposals and IOs.
            </p>
          </div>
          <Button onClick={() => { setEditingPkg(null); setShowForm(true); }} className="bg-[#E8192C] hover:bg-[#c0141f] gap-1.5">
            <Plus className="h-4 w-4" />
            Create Package
          </Button>
        </div>

        {/* My / All toggle */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          {[{ label: "All Packages", val: false }, { label: "My Packages", val: true }].map(({ label, val }) => (
            <button
              key={String(val)}
              onClick={() => setMineOnly(val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mineOnly === val ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Packages", value: packages.filter(p => p.status === "active").length },
            { label: "Archived", value: packages.filter(p => p.status === "archived").length },
            { label: "Total Pages", value: [...new Set(packages.flatMap(p => p.pages_included))].length },
          ].map(({ label, value }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-sm font-medium mt-1">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["active", "archived", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all capitalize ${
                  statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading packages…
          </div>
        ) : packages.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <Package className="h-8 w-8 text-[#E8192C] mx-auto mb-3" />
              <div className="font-medium">
                {activeCount === 0 && statusFilter === "active" ? "No packages yet" : "No results"}
              </div>
              <div className="text-sm text-muted-foreground mt-1 mb-4">
                Create a package to reuse it across proposals.
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-[#E8192C] hover:bg-[#c0141f]">
                <Plus className="h-4 w-4 mr-1.5" /> Create First Package
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onEdit={() => { setEditingPkg(pkg); setShowForm(true); }}
                onDuplicate={() => handleDuplicate(pkg.id)}
                onArchive={() => handleArchive(pkg)}
                onDelete={() => handleDelete(pkg.id)}
              />
            ))}
          </div>
        )}
      </div>

      {(showForm || editingPkg) && (
        <PackageFormModal
          initial={editingPkg ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingPkg(null); }}
        />
      )}
    </main>
  );
}
