"use client";

import { useEffect, useState, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Search, CheckCircle, XCircle, Clock, Loader2,
  RefreshCw, ChevronDown, ChevronRight, Trophy,
} from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

type PdfFile = {
  filename: string;
  ingested: boolean;
  status: string | null;
  client_name: string | null;
  outcome: string | null;
  ingested_at: string | null;
};

type ProposalExample = {
  id: string;
  source_file: string;
  client_name: string | null;
  industry_category: string | null;
  industry_niche: string | null;
  geography_tier: string | null;
  cities: string[];
  outcome: string;
  final_deal_size: number | null;
  deal_size_tier: string | null;
  options_presented: number[];
  recommended_option: number | null;
  chosen_option: number | null;
  ae_name: string | null;
  strategy_framing: string | null;
  objections: string[];
  closing_cta: string | null;
  extraction_status: string;
  ingested_at: string;
  time_to_close_days: number | null;
};

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  won:     { label: "Won",     color: "bg-green-100 text-green-700",  icon: <Trophy className="h-3 w-3" /> },
  lost:    { label: "Lost",    color: "bg-red-100 text-red-600",     icon: <XCircle className="h-3 w-3" /> },
  stalled: { label: "Stalled", color: "bg-orange-100 text-orange-600",icon: <Clock className="h-3 w-3" /> },
  unknown: { label: "Unknown", color: "bg-slate-100 text-slate-500",  icon: <Clock className="h-3 w-3" /> },
};

function ExampleRow({ ex }: { ex: ProposalExample }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = OUTCOME_CONFIG[ex.outcome] ?? OUTCOME_CONFIG.unknown;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="mt-0.5 shrink-0 text-slate-300">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800">{ex.client_name ?? "Unknown Client"}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
              {cfg.icon}{cfg.label}
            </span>
            {ex.final_deal_size && (
              <span className="text-sm font-semibold text-slate-700">{formatCurrency(ex.final_deal_size)}</span>
            )}
            {ex.industry_category && (
              <Badge variant="secondary" className="text-xs capitalize">
                {ex.industry_category.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            {(ex.cities ?? []).length > 0 && <span>{ex.cities.join(", ")}</span>}
            {ex.ae_name && <span>AE: {ex.ae_name}</span>}
            {ex.time_to_close_days && <span>{ex.time_to_close_days}d to close</span>}
            {(ex.options_presented ?? []).length > 0 && (
              <span>Options: {ex.options_presented.map((o) => `Opt ${o}`).join(", ")}</span>
            )}
            {ex.chosen_option && <span className="text-green-600 font-medium">Chose Option {ex.chosen_option}</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-slate-50 px-4 py-4 space-y-3 text-sm">
          {ex.strategy_framing && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Strategy</div>
              <p className="text-slate-700">{ex.strategy_framing}</p>
            </div>
          )}
          {(ex.objections ?? []).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Objections</div>
              <div className="flex flex-wrap gap-1">
                {ex.objections.map((o) => (
                  <Badge key={o} variant="secondary" className="text-xs bg-red-50 text-red-600">{o}</Badge>
                ))}
              </div>
            </div>
          )}
          {ex.closing_cta && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Closing CTA</div>
              <p className="text-slate-600">{ex.closing_cta}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground pt-1">Source: {ex.source_file}</div>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [examples, setExamples] = useState<ProposalExample[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingExamples, setLoadingExamples] = useState(true);
  const [ingestingFile, setIngestingFile] = useState<string | null>(null);
  const [ingestingAll, setIngestingAll] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<{ done: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [tab, setTab] = useState<"library" | "ingest">("library");

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    const res = await fetch("/api/library/files");
    const d = await res.json() as { files: PdfFile[] };
    setFiles(d.files ?? []);
    setLoadingFiles(false);
  }, []);

  const loadExamples = useCallback(async () => {
    setLoadingExamples(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (outcomeFilter) params.set("outcome", outcomeFilter);
    const res = await fetch(`/api/library?${params}`);
    const d = await res.json() as { data: ProposalExample[] };
    setExamples(d.data ?? []);
    setLoadingExamples(false);
  }, [search, outcomeFilter]);

  useEffect(() => { loadFiles(); loadExamples(); }, [loadFiles, loadExamples]);

  const ingestOne = useCallback(async (filename: string) => {
    setIngestingFile(filename);
    await fetch("/api/library/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    await loadFiles();
    await loadExamples();
    setIngestingFile(null);
  }, [loadFiles, loadExamples]);

  const ingestAll = useCallback(async () => {
    const pending = files.filter((f) => !f.ingested);
    if (pending.length === 0) return;
    setIngestingAll(true);
    setIngestProgress({ done: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      await ingestOne(pending[i].filename);
      setIngestProgress({ done: i + 1, total: pending.length });
    }
    setIngestingAll(false);
    setIngestProgress(null);
  }, [files, ingestOne]);

  const totalFiles = files.length;
  const ingestedCount = files.filter((f) => f.ingested).length;
  const wonCount = examples.filter((e) => e.outcome === "won").length;
  const lostCount = examples.filter((e) => e.outcome === "lost").length;
  const pendingFiles = files.filter((f) => !f.ingested);

  const filteredExamples = examples.filter((e) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (e.client_name ?? "").toLowerCase().includes(q) ||
      (e.industry_category ?? "").toLowerCase().includes(q) ||
      (e.cities ?? []).some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Proposal Library" />

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "PDFs Found", value: totalFiles, sub: "in project folder" },
            { label: "Ingested", value: ingestedCount, sub: "parsed by AI" },
            { label: "Won", value: wonCount, sub: "extracted wins" },
            { label: "Lost", value: lostCount, sub: "extracted losses" },
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

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab("library")}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${tab === "library" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
            <BookOpen className="h-4 w-4 inline mr-2" />Library ({examples.length})
          </button>
          <button onClick={() => setTab("ingest")}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${tab === "ingest" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
            <RefreshCw className="h-4 w-4 inline mr-2" />Ingest PDFs
            {pendingFiles.length > 0 && <Badge className="ml-2 text-xs bg-amber-500">{pendingFiles.length}</Badge>}
          </button>
        </div>

        {/* ── Library view ── */}
        {tab === "library" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search client, industry, city…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {["", "won", "lost", "stalled", "unknown"].map((o) => (
                  <button key={o} onClick={() => setOutcomeFilter(o)}
                    className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${outcomeFilter === o ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`}>
                    {o === "" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loadingExamples ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading library…
              </div>
            ) : filteredExamples.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="py-16 text-center">
                  <BookOpen className="h-8 w-8 text-[#E8192C] mx-auto mb-3" />
                  <div className="font-medium">
                    {ingestedCount === 0 ? "No proposals ingested yet" : "No results match your filters"}
                  </div>
                  {ingestedCount === 0 && (
                    <div className="text-sm text-muted-foreground mt-1 mb-4">
                      Switch to the Ingest tab to process your PDFs.
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredExamples.map((ex) => <ExampleRow key={ex.id} ex={ex} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Ingest view ── */}
        {tab === "ingest" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pendingFiles.length > 0
                  ? `${pendingFiles.length} PDFs not yet ingested. Run ingestion on your local dev server.`
                  : "All PDFs have been ingested."}
              </p>
              {pendingFiles.length > 0 && (
                <Button
                  onClick={ingestAll}
                  disabled={ingestingAll}
                  className="bg-[#E8192C] hover:bg-[#c0141f]"
                >
                  {ingestingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {ingestProgress ? `${ingestProgress.done}/${ingestProgress.total}` : "Starting…"}
                    </>
                  ) : (
                    <>Ingest All ({pendingFiles.length})</>
                  )}
                </Button>
              )}
            </div>

            {loadingFiles ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading files…
              </div>
            ) : (
              <Card className="rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      {["File", "Status", "Client (extracted)", "Outcome", "Action"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {files.map((f) => (
                      <tr key={f.filename} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <div className="text-xs text-slate-600 max-w-[280px] truncate">{f.filename}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          {f.ingested ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" /> Done
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 text-xs">{f.client_name ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {f.outcome ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_CONFIG[f.outcome]?.color ?? "bg-slate-100 text-slate-600"}`}>
                              {f.outcome}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => ingestOne(f.filename)}
                            disabled={ingestingFile === f.filename || ingestingAll}
                            className="text-xs text-[#E8192C] hover:underline disabled:opacity-40"
                          >
                            {ingestingFile === f.filename ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : f.ingested ? "Re-ingest" : "Ingest"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
