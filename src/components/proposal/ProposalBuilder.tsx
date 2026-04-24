"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy, Mail, MapPin, DollarSign, Layers, Sparkles,
  ChevronRight, ChevronLeft, Check, Save, Loader2, FileText,
  ExternalLink, Mic, MicOff, Pencil, X, Wand2, Users, Package,
} from "lucide-react";
import { AppNav } from "@/components/ui/app-nav";
import IOGeneratorModal from "@/components/proposal/IOGeneratorModal";
import {
  CATEGORY_OPTIONS,
  GOAL_OPTIONS,
  CITY_GROUPS,
  getAccountsForCities,
  getStrategyHook,
  type BusinessCategory,
  type AccountSeed,
} from "@/lib/accounts-seed";
import {
  applyFlatMarkup,
  computeLadderPrices,
  roundProposalPrice,
  formatCurrency,
  DEFAULT_PRICING_CONFIG,
} from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@supabase/supabase-js";

const PRICING_ADMIN = "asad@northlygroup.com";

interface ProposalForm {
  businessName: string;
  contactName: string;
  website: string;
  prDate: string;
  cities: string[];
  category: BusinessCategory;
  goals: string[];
  budgetMin: string;
  budgetMax: string;
  transcriptText: string;
  businessInfo: string;
  differentiator: string;
  challenge: string;
  caseStudy: string;
  proposedDirection: string;
  optionsCount: number;
  recommendedOption: number;
  option2Discount: number;
  option3Discount: number;
  option4Discount: number;
  option5Discount: number;
  markupMode: "flat" | "percentage" | "none";
  markupPercentage: number;
  displayMode: "itemized" | "package";
  includeBA: boolean;
  includeLTO: boolean;
  notes: string;
  selectedAccounts: Record<string, boolean>;
  customPrices: Record<string, number>;
  accountDeliverables: Record<string, { ga: number; oc: number; th: number }>;
  collaboratorHandles: string[];
  collaboratorAdjustMode: "discount" | "surcharge" | "none";
  collaboratorAdjustValue: number;
}

interface PackageRecord {
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
}

const DEFAULT_FORM: ProposalForm = {
  businessName: "",
  contactName: "",
  website: "",
  prDate: "",
  cities: ["toronto"],
  category: "restaurant",
  goals: ["Awareness"],
  budgetMin: "",
  budgetMax: "",
  transcriptText: "",
  businessInfo: "",
  differentiator: "",
  challenge: "",
  caseStudy: "",
  proposedDirection: "",
  optionsCount: 3,
  recommendedOption: 2,
  option2Discount: 25,
  option3Discount: 30,
  option4Discount: 35,
  option5Discount: 40,
  markupMode: "none",
  markupPercentage: 20,
  displayMode: "package",
  includeBA: true,
  includeLTO: false,
  notes: "",
  selectedAccounts: {},
  customPrices: {},
  accountDeliverables: {},
  collaboratorHandles: [],
  collaboratorAdjustMode: "none",
  collaboratorAdjustValue: 15,
};

const STEPS = ["Business", "Strategy", "Pages & Pricing", "Output"] as const;
const DRAFT_KEY = "northly_proposal_draft";

// ─────────────────────────────────────────────
// Voice recording hook
// ─────────────────────────────────────────────
function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SR) {
      alert("Voice input requires Chrome or Edge browser.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      onResult(e.results[0][0].transcript);
    };
    recognition.start();
  }, [onResult]);

  return { listening, start };
}

// ─────────────────────────────────────────────
// Voice button component
// ─────────────────────────────────────────────
function VoiceBtn({ onTranscript, append = false, currentValue = "" }: {
  onTranscript: (text: string) => void;
  append?: boolean;
  currentValue?: string;
}) {
  const { listening, start } = useVoiceInput((text) => {
    onTranscript(append && currentValue ? `${currentValue} ${text}` : text);
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={start}
      title={listening ? "Listening…" : "Voice input"}
      className="h-8 w-8 p-0"
    >
      {listening
        ? <MicOff className="h-3.5 w-3.5 text-red-500 animate-pulse" />
        : <Mic className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─────────────────────────────────────────────
// AI fill button component
// ─────────────────────────────────────────────
function AIBtn({ loading, onClick, label = "AI Fill" }: {
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className="h-8 gap-1 text-xs"
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Wand2 className="h-3.5 w-3.5 text-purple-500" />}
      {label}
    </Button>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function ProposalBuilder() {
  const searchParams = useSearchParams();
  const [draftRestored, setDraftRestored] = useState(false);
  const [form, setForm] = useState<ProposalForm>(() => {
    const businessName = searchParams.get("businessName") ?? searchParams.get("company") ?? "";
    const contactName = searchParams.get("contactName") ?? "";
    const businessInfo = searchParams.get("businessInfo") ?? "";
    const hasUrlParams = !!(businessName || searchParams.get("closeLeadId") || searchParams.get("packageId"));

    if (!hasUrlParams) {
      try {
        const saved = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<ProposalForm>;
          return { ...DEFAULT_FORM, ...parsed };
        }
      } catch { /* ignore */ }
    }

    if (!businessName) return DEFAULT_FORM;

    // Map market label → CITY_GROUPS key
    const marketParam = (searchParams.get("market") ?? "").toLowerCase();
    const MARKET_KEY_MAP: Record<string, string> = {
      toronto: "toronto", hamilton: "hamilton", ottawa: "ottawa",
      vancouver: "vancouver", calgary: "calgary", edmonton: "edmonton",
      montreal: "montreal", winnipeg: "winnipeg", halifax: "halifax",
      saskatoon: "saskatoon", kitchener: "kitchener", windsor: "windsor",
      national: "national", brampton: "gta", mississauga: "gta",
      durham: "gta", "york region": "gta", "london on": "london",
    };
    const cities = marketParam && MARKET_KEY_MAP[marketParam]
      ? [MARKET_KEY_MAP[marketParam]]
      : DEFAULT_FORM.cities;

    // Map industry param → BusinessCategory
    const VALID_CATEGORIES: BusinessCategory[] = [
      "restaurant", "bar", "beauty", "service", "retail",
      "event_space", "app", "ecommerce", "gifting",
    ];
    const industryParam = searchParams.get("industry") ?? "";
    const category = VALID_CATEGORIES.includes(industryParam as BusinessCategory)
      ? (industryParam as BusinessCategory)
      : DEFAULT_FORM.category;

    return { ...DEFAULT_FORM, businessName, contactName, businessInfo, cities, category };
  });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [closeLeadId] = useState<string | null>(() => searchParams.get("closeLeadId"));
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);
  const [exportingDoc, setExportingDoc] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [showIOModal, setShowIOModal] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [reviewIssues, setReviewIssues] = useState<string[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const reviewIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Fetch active packages once on mount
  useEffect(() => {
    fetch("/api/packages?status=active")
      .then((r) => r.json())
      .then((d) => { if (d.data) setPackages(d.data); })
      .catch(() => {});

    // Identify current user for admin-gated features
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      sb.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    } catch { /* ignore */ }

    // Show toast if we restored a draft
    const hasSaved = typeof window !== "undefined" && !!localStorage.getItem(DRAFT_KEY);
    const hasUrlParams = !!(
      searchParams.get("businessName") || searchParams.get("company") ||
      searchParams.get("closeLeadId") || searchParams.get("packageId")
    );
    if (hasSaved && !hasUrlParams) setDraftRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save form to localStorage on every change (debounced 800ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [form]);

  // Auto-apply package from URL param
  useEffect(() => {
    const pkgId = searchParams.get("packageId");
    if (pkgId && packages.length > 0) {
      const pkg = packages.find((p) => p.id === pkgId);
      if (pkg) applyPackage(pkg);
    }
    // intentionally run only when packages load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  const applyPackage = (pkg: PackageRecord) => {
    const allPages = [
      ...(pkg.primary_page ? [pkg.primary_page] : []),
      ...pkg.pages_included,
    ];
    const newSelected: Record<string, boolean> = { ...form.selectedAccounts };
    allPages.forEach((h) => { newSelected[h] = true; });

    setForm((f) => ({
      ...f,
      cities: pkg.markets.length ? pkg.markets : f.cities,
      selectedAccounts: newSelected,
      collaboratorHandles: pkg.collabs.length ? pkg.collabs : f.collaboratorHandles,
      proposedDirection: pkg.description ? pkg.description : f.proposedDirection,
    }));
  };

  const relevantAccounts = useMemo(
    () => getAccountsForCities(form.cities, form.category),
    [form.cities, form.category]
  );

  const accountsByCity = useMemo(() => {
    const grouped: Record<string, AccountSeed[]> = {};
    for (const cg of CITY_GROUPS) {
      const accs = relevantAccounts.filter((a) =>
        (cg.markets ?? [cg.key]).includes(a.market)
      );
      if (accs.length > 0) grouped[cg.key] = accs;
    }
    return grouped;
  }, [relevantAccounts]);

  const selectedAccounts = useMemo(
    () => relevantAccounts.filter((a) => form.selectedAccounts[a.handle]),
    [relevantAccounts, form.selectedAccounts]
  );

  const applyMarkup = useCallback(
    (rate: number): number => {
      if (form.markupMode === "none") return rate;
      if (form.markupMode === "percentage") return roundProposalPrice(rate * (1 + form.markupPercentage / 100));
      return applyFlatMarkup(rate, DEFAULT_PRICING_CONFIG);
    },
    [form.markupMode, form.markupPercentage]
  );

  const priceOf = useCallback(
    (account: AccountSeed): number => {
      if (form.customPrices[account.handle] !== undefined) {
        return form.customPrices[account.handle];
      }
      let price = applyMarkup(account.baseRate);
      if (form.collaboratorHandles.includes(account.handle)) {
        if (form.collaboratorAdjustMode === "discount") {
          price = roundProposalPrice(price * (1 - form.collaboratorAdjustValue / 100));
        } else if (form.collaboratorAdjustMode === "surcharge") {
          price = roundProposalPrice(price * (1 + form.collaboratorAdjustValue / 100));
        }
      }
      return price;
    },
    [applyMarkup, form.customPrices, form.collaboratorHandles, form.collaboratorAdjustMode, form.collaboratorAdjustValue]
  );

  const deliverableAddonCost = useCallback(
    (account: AccountSeed): number => {
      const d = form.accountDeliverables[account.handle];
      if (!d) return 0;
      let cost = 0;
      if (d.ga > 0 && account.gaRate > 0) cost += applyMarkup(account.gaRate) * d.ga;
      if (d.oc > 0 && account.ocRate > 0) cost += applyMarkup(account.ocRate) * d.oc;
      if (d.th > 0 && account.talkingHeadRate > 0) cost += applyMarkup(account.talkingHeadRate) * d.th;
      return cost;
    },
    [applyMarkup, form.accountDeliverables]
  );

  const selectedBaseTotal = useMemo(
    () => selectedAccounts.reduce((sum, a) => sum + priceOf(a) + deliverableAddonCost(a), 0),
    [selectedAccounts, priceOf, deliverableAddonCost]
  );

  const ladder = useMemo(
    () => computeLadderPrices({
      selectedBaseTotal,
      option2Discount: form.option2Discount / 100,
      option3Discount: form.option3Discount / 100,
      option4Discount: form.option4Discount / 100,
      option5Discount: form.option5Discount / 100,
    }),
    [selectedBaseTotal, form.option2Discount, form.option3Discount, form.option4Discount, form.option5Discount]
  );

  const strategyHook = useMemo(() => getStrategyHook(form.category), [form.category]);

  const toggleAccount = (handle: string) => {
    setForm((f) => ({
      ...f,
      selectedAccounts: { ...f.selectedAccounts, [handle]: !f.selectedAccounts[handle] },
    }));
  };

  const cityLabel = (key: string) =>
    CITY_GROUPS.find((c) => c.key === key)?.label ?? key;

  const generatedText = useMemo(
    () => generateProposalText(form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf),
    [form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf]
  );

  const proposalHTML = useMemo(
    () => generateProposalHTML(form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf),
    [form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf]
  );

  // Reset refined text whenever the auto-generated text changes significantly
  const proposalText = refinedText ?? generatedText;

  const refineProposal = async (instruction: string) => {
    setIsRefining(true);
    try {
      const res = await fetch("/api/ai/refine-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalText, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refine failed");
      setRefinedText(data.refined);
    } catch (err) {
      toast({ title: "AI refinement failed", description: String(err), variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  };

  const copyProposal = () => {
    const html = generateProposalHTML(form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf);
    try {
      const blob = new Blob([html], { type: "text/html" });
      const item = new ClipboardItem({ "text/html": blob });
      navigator.clipboard.write([item]);
    } catch {
      navigator.clipboard.writeText(proposalText);
    }
    toast({ title: "Copied to clipboard", description: "Paste directly into Gmail — formatting will be preserved." });
  };

  const exportToGoogleDoc = async () => {
    if (exportingDoc) return;
    setExportingDoc(true);
    try {
      const res = await fetch("/api/proposals/google-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: savedProposalId,
          title: `${form.businessName || "Proposal"} — Northly`,
          content: proposalText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "no_drive_token") {
          toast({ title: "Drive access needed", description: "Sign out and back in to grant Google Drive access.", variant: "destructive" });
        } else {
          throw new Error(data.error ?? "Export failed");
        }
        return;
      }
      setDocUrl(data.docUrl);
      window.open(data.docUrl, "_blank");
      toast({ title: "Google Doc created!", description: "Opening in a new tab." });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingDoc(false);
    }
  };

  const saveProposal = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: { ...form, goal: form.goals.join(", ") },
          selectedAccountHandles: selectedAccounts.map((a) => a.handle),
          ladder,
          proposalText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSavedDealId(data.dealId);
      setSavedProposalId(data.proposalId);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDraftRestored(false);
      toast({ title: "Proposal saved!", description: "Added to your Deals Pipeline." });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppNav page="Proposal Builder" showBack backHref="/deals" />
      <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#E8192C]" />
            Proposal Builder
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar stepper */}
          <Card className="h-fit sticky top-6 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Build Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STEPS.map((title, idx) => {
                const n = idx + 1;
                const active = step === n;
                const done = step > n;
                return (
                  <button
                    key={title}
                    onClick={() => setStep(n)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${
                      active ? "bg-[#E8192C] text-white border-[#E8192C]"
                        : done ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? "bg-white text-[#E8192C]" : done ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                        {done ? <Check className="h-3 w-3" /> : n}
                      </div>
                      <div>
                        <div className="text-xs opacity-70">Step {n}</div>
                        <div className="font-medium text-sm">{title}</div>
                      </div>
                    </div>
                  </button>
                );
              })}

              <Separator className="my-2" />
              <div className="text-xs text-slate-500 space-y-1 pt-1">
                <div className="font-medium text-slate-700">Live Summary</div>
                {form.businessName && <div>Client: <span className="text-slate-900">{form.businessName}</span></div>}
                <div>Cities: <span className="text-slate-900">{form.cities.map(cityLabel).join(", ")}</span></div>
                <div>Pages selected: <span className="font-semibold text-slate-900">{selectedAccounts.length}</span></div>
                {selectedBaseTotal > 0 && (
                  <>
                    <div>Opt 2 (Pilot): <span className="font-semibold text-green-700">{formatCurrency(ladder.option2Price)}</span></div>
                    <div>Opt 3 (Bundle): <span className="font-semibold text-green-700">{formatCurrency(ladder.option3Price)}</span></div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main content */}
          <div className="space-y-4">
            {draftRestored && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                <span className="font-semibold">Draft restored</span>
                <span className="text-amber-400">·</span>
                <span>Your previous work was saved automatically. Pick up where you left off.</span>
                <button
                  className="ml-auto text-amber-600 hover:text-amber-900 underline text-xs font-medium"
                  onClick={() => {
                    setForm(DEFAULT_FORM);
                    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
                    setDraftRestored(false);
                  }}
                >
                  Discard draft
                </button>
              </div>
            )}
            {step === 1 && closeLeadId && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                <span className="font-semibold">From Close CRM</span>
                <span className="text-blue-400">·</span>
                <span>Client info pre-filled from your lead. Review and update as needed.</span>
                <a
                  href={`https://app.close.com/leads/${closeLeadId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-blue-600 hover:text-blue-800 underline text-xs font-medium"
                >
                  Open in Close ↗
                </a>
              </div>
            )}
            {step === 1 && <Step1Business form={form} setForm={setForm} strategyHook={strategyHook} packages={packages} onApplyPackage={applyPackage} />}
            {step === 2 && <Step2Strategy form={form} setForm={setForm} strategyHook={strategyHook} userEmail={userEmail} />}
            {step === 3 && (
              <Step3Pages
                form={form}
                setForm={setForm}
                accountsByCity={accountsByCity}
                selectedAccounts={selectedAccounts}
                priceOf={priceOf}
                deliverableAddonCost={deliverableAddonCost}
                applyMarkup={applyMarkup}
                ladder={ladder}
                toggleAccount={toggleAccount}
              />
            )}
            {step === 4 && (
              <Step4Output
                proposalText={proposalText}
                proposalHTML={proposalHTML}
                isRefined={refinedText !== null}
                onCopy={copyProposal}
                onSave={saveProposal}
                saving={saving}
                savedDealId={savedDealId}
                onViewPipeline={() => router.push("/deals")}
                onExportDoc={exportToGoogleDoc}
                exportingDoc={exportingDoc}
                docUrl={docUrl}
                form={form}
                ladder={ladder}
                selectedAccounts={selectedAccounts}
                priceOf={priceOf}
                onRefine={refineProposal}
                isRefining={isRefining}
                onResetRefined={() => setRefinedText(null)}
                reviewIssues={reviewIssues}
                isReviewing={isReviewing}
                reviewProgress={reviewProgress}
                onGenerateIO={() => setShowIOModal(true)}
              />
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={async () => {
                  const next = Math.min(4, step + 1);
                  setStep(next);
                  if (next === 4) {
                    setReviewIssues([]);
                    setReviewProgress(0);
                    setIsReviewing(true);
                    // Simulate progress up to 90%
                    reviewIntervalRef.current = setInterval(() => {
                      setReviewProgress((p) => {
                        if (p >= 88) { clearInterval(reviewIntervalRef.current!); return 88; }
                        return Math.min(88, p + 2 + Math.random() * 3);
                      });
                    }, 600);
                    try {
                      const text = refinedText ?? generateProposalText(form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf);
                      const res = await fetch("/api/ai/review-proposal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ proposalText: text, clientName: form.businessName }),
                      });
                      const data = await res.json();
                      setReviewIssues(data.issues ?? []);
                      if (data.fixed) {
                        setRefinedText(data.fixed);
                      }
                    } catch {
                      // silently skip
                    } finally {
                      clearInterval(reviewIntervalRef.current!);
                      setReviewProgress(100);
                      setTimeout(() => setIsReviewing(false), 400);
                    }
                  }
                }}
                className="bg-[#E8192C] hover:bg-[#c0141f]"
              >
                {step === 4 ? "Done" : "Next"}
                {step < 4 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showIOModal && (
      <IOGeneratorModal
        businessName={form.businessName || "Client"}
        cities={form.cities}
        selectedAccounts={selectedAccounts}
        ladder={ladder}
        optionsCount={form.optionsCount}
        collaboratorHandles={form.collaboratorHandles}
        onClose={() => setShowIOModal(false)}
      />
    )}
    </>
  );
}

// ─────────────────────────────────────────────
// STEP 1 — Business Details
// ─────────────────────────────────────────────
function Step1Business({
  form,
  setForm,
  strategyHook,
  packages,
  onApplyPackage,
}: {
  form: ProposalForm;
  setForm: React.Dispatch<React.SetStateAction<ProposalForm>>;
  strategyHook: string;
  packages: PackageRecord[];
  onApplyPackage: (pkg: PackageRecord) => void;
}) {
  const update = (key: keyof ProposalForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const toggleCity = (key: string) => {
    const next = form.cities.includes(key)
      ? form.cities.filter((c) => c !== key)
      : [...form.cities, key];
    update("cities", next.length ? next : [key]);
  };

  const toggleGoal = (g: string) => {
    const next = form.goals.includes(g)
      ? form.goals.filter((x) => x !== g)
      : [...form.goals, g];
    update("goals", next.length ? next : [g]);
  };

  const runAI = async (type: string, fields: Record<string, string>, onSuccess: (data: Record<string, string>) => void) => {
    setAiLoading((l) => ({ ...l, [type]: true }));
    try {
      const res = await fetch("/api/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      onSuccess(data);
    } catch (err) {
      alert(`AI fill failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiLoading((l) => ({ ...l, [type]: false }));
    }
  };

  const extractFromTranscript = () => {
    if (!form.transcriptText.trim()) {
      alert("Please paste or record a discovery transcript first.");
      return;
    }
    runAI("transcript", { transcript: form.transcriptText }, (data) => {
      if (data.businessInfo) update("businessInfo", data.businessInfo);
      if (data.differentiator) update("differentiator", data.differentiator);
      if (data.challenge) update("challenge", data.challenge);
    });
  };

  const fillFromWebsite = (field: "businessInfo" | "differentiator") => {
    if (!form.website.trim()) {
      alert("Please enter a website URL first.");
      return;
    }
    runAI("business", { website: form.website, businessName: form.businessName }, (data) => {
      if (field === "businessInfo" && data.businessInfo) update("businessInfo", data.businessInfo);
      if (field === "differentiator" && data.differentiator) update("differentiator", data.differentiator);
    });
  };

  const [selectedPkgId, setSelectedPkgId] = useState<string>("");

  return (
    <>
    {packages.length > 0 && (
      <Card className="rounded-2xl shadow-sm border-slate-200 bg-slate-50/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-[#E8192C]" />
            Load from Package
          </CardTitle>
          <CardDescription>Select a saved package to auto-populate markets, pages, collabs, and direction.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 flex-wrap">
          <Select value={selectedPkgId} onValueChange={(val) => {
            setSelectedPkgId(val);
          }}>
            <SelectTrigger className="w-72 bg-white">
              <SelectValue placeholder="Select a package…" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={!selectedPkgId}
            onClick={() => {
              const pkg = packages.find((p) => p.id === selectedPkgId);
              if (pkg) onApplyPackage(pkg);
            }}
            className="bg-[#E8192C] hover:bg-[#c0141f]"
            size="sm"
          >
            Apply Package
          </Button>
          {selectedPkgId && (() => {
            const pkg = packages.find((p) => p.id === selectedPkgId);
            if (!pkg) return null;
            return (
              <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                {pkg.markets.length > 0 && <span>Markets: <strong className="text-slate-700">{pkg.markets.join(", ")}</strong></span>}
                {(pkg.pages_included.length > 0 || pkg.primary_page) && (
                  <span>Pages: <strong className="text-slate-700">{[pkg.primary_page, ...pkg.pages_included].filter(Boolean).length}</strong></span>
                )}
                {pkg.pricing > 0 && <span>Ref price: <strong className="text-slate-700">${pkg.pricing.toLocaleString()}</strong></span>}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    )}
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Step 1: Business Details</CardTitle>
        <CardDescription>Set the base information for the proposal.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        {/* Row 1: names */}
        <div>
          <Label>Business name</Label>
          <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="The Mad Stacker" className="mt-1" />
        </div>
        <div>
          <Label>Contact name</Label>
          <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Dino" className="mt-1" />
        </div>

        {/* Row 2: website + launch date */}
        <div>
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <Label>Launch Date <span className="text-xs text-slate-400 font-normal">(optional)</span></Label>
          <Input type="date" value={form.prDate} onChange={(e) => update("prDate", e.target.value)} className="mt-1" />
        </div>

        {/* City selection */}
        <div className="md:col-span-2">
          <Label>Target city / market</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CITY_GROUPS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCity(c.key)}
                className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                  form.cities.includes(c.key)
                    ? "bg-[#E8192C] text-white border-[#E8192C]"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <Label>Business category</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v as BusinessCategory)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Budget min ($)</Label>
            <Input value={form.budgetMin} onChange={(e) => update("budgetMin", e.target.value)} placeholder="1500" className="mt-1" />
          </div>
          <div>
            <Label>Budget max ($)</Label>
            <Input value={form.budgetMax} onChange={(e) => update("budgetMax", e.target.value)} placeholder="5000" className="mt-1" />
          </div>
        </div>

        {/* Goals — multi-select chips */}
        <div className="md:col-span-2">
          <Label>Goals (select all that apply)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGoal(g)}
                className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                  form.goals.includes(g)
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                {form.goals.includes(g) && <Check className="h-3 w-3 inline mr-1" />}
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Discovery transcript section */}
        <div className="md:col-span-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">Discovery call notes</div>
              <div className="text-xs text-slate-400 mt-0.5">Paste transcript or record voice — AI will fill the fields below automatically</div>
            </div>
            <div className="flex items-center gap-2">
              <VoiceBtn
                onTranscript={(text) => update("transcriptText", form.transcriptText ? `${form.transcriptText} ${text}` : text)}
                currentValue={form.transcriptText}
              />
              <AIBtn
                loading={!!aiLoading.transcript}
                onClick={extractFromTranscript}
                label="Extract insights"
              />
            </div>
          </div>
          <Textarea
            value={form.transcriptText}
            onChange={(e) => update("transcriptText", e.target.value)}
            placeholder="Paste your discovery call transcript here, or use the mic button to record notes…"
            className="h-24 bg-white text-sm"
          />
        </div>

        {/* What do they do? */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label>
              What do they do?
              <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <VoiceBtn
                onTranscript={(text) => update("businessInfo", text)}
                currentValue={form.businessInfo}
              />
              <AIBtn
                loading={!!aiLoading.business_info}
                onClick={() => {
                  setAiLoading((l) => ({ ...l, business_info: true }));
                  fetch("/api/ai/autofill", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "business", website: form.website, businessName: form.businessName }),
                  })
                    .then((r) => r.json())
                    .then((d) => { if (d.businessInfo) update("businessInfo", d.businessInfo); })
                    .catch((e) => alert(`AI fill failed: ${e.message}`))
                    .finally(() => setAiLoading((l) => ({ ...l, business_info: false })));
                }}
                label="AI Fill"
              />
            </div>
          </div>
          <Textarea
            value={form.businessInfo}
            onChange={(e) => update("businessInfo", e.target.value)}
            placeholder="Premium sub restaurant with two GTA locations…"
            className="h-20"
          />
        </div>

        {/* What makes them different? */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>
              What makes them different?
              <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <VoiceBtn
                onTranscript={(text) => update("differentiator", text)}
                currentValue={form.differentiator}
              />
              <AIBtn
                loading={!!aiLoading.differentiator}
                onClick={() => {
                  setAiLoading((l) => ({ ...l, differentiator: true }));
                  fetch("/api/ai/autofill", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "business", website: form.website, businessName: form.businessName }),
                  })
                    .then((r) => r.json())
                    .then((d) => { if (d.differentiator) update("differentiator", d.differentiator); })
                    .catch((e) => alert(`AI fill failed: ${e.message}`))
                    .finally(() => setAiLoading((l) => ({ ...l, differentiator: false })));
                }}
                label="AI Fill"
              />
            </div>
          </div>
          <Textarea
            value={form.differentiator}
            onChange={(e) => update("differentiator", e.target.value)}
            placeholder="Premium ingredients, house-made sauces…"
            className="h-20"
          />
        </div>

        {/* Main challenge */}
        <div>
          <Label>Main challenge</Label>
          <Textarea
            value={form.challenge}
            onChange={(e) => update("challenge", e.target.value)}
            placeholder="Needs awareness and foot traffic in new market"
            className="mt-1 h-20"
          />
        </div>

        {/* Case study */}
        <div className="md:col-span-2">
          <Label>
            Related case study <span className="text-xs text-slate-400 font-normal">(optional)</span>
          </Label>
          <div className="text-xs text-slate-400 mt-0.5 mb-1">Mention a similar client the AE can reference in the proposal — e.g. "We ran a similar campaign for Chiang Mai's grand opening and drove 10K+ shares"</div>
          <Textarea
            value={form.caseStudy}
            onChange={(e) => update("caseStudy", e.target.value)}
            placeholder="e.g. Similar to what we did for Wingstop GO — lineups on day one, sold out opening weekend…"
            className="h-16"
          />
        </div>

        {/* Strategy preview */}
        <div className="md:col-span-2 rounded-xl border border-dashed bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500 mb-1">Strategy hook preview</div>
          <p className="text-sm text-slate-700 italic">&ldquo;{strategyHook}&rdquo;</p>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

// ─────────────────────────────────────────────
// STEP 2 — Strategy & Option Logic
// ─────────────────────────────────────────────
function Step2Strategy({
  form,
  setForm,
  strategyHook,
  userEmail,
}: {
  form: ProposalForm;
  setForm: React.Dispatch<React.SetStateAction<ProposalForm>>;
  strategyHook: string;
  userEmail: string | null;
}) {
  const update = (key: keyof ProposalForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [aiDirectionLoading, setAiDirectionLoading] = useState(false);

  const generateDirection = async () => {
    setAiDirectionLoading(true);
    try {
      const res = await fetch("/api/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "direction",
          businessName: form.businessName,
          category: form.category,
          goals: form.goals,
          cities: form.cities,
          challenge: form.challenge,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      if (data.direction) update("proposedDirection", data.direction);
    } catch (err) {
      alert(`AI failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiDirectionLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Step 2: Strategy & Option Logic</CardTitle>
        <CardDescription>Define discounts, recommended option, and strategic framing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Proposed direction with voice + AI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <Label>Proposed direction / strategy note</Label>
              <p className="text-xs text-slate-400 mt-0.5">What you think is the best account execution approach — which pages, what sequence, and why</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              <VoiceBtn
                onTranscript={(text) => update("proposedDirection", text)}
                currentValue={form.proposedDirection}
              />
              <AIBtn
                loading={aiDirectionLoading}
                onClick={generateDirection}
                label="AI Recommend"
              />
            </div>
          </div>
          <Textarea
            value={form.proposedDirection}
            onChange={(e) => update("proposedDirection", e.target.value)}
            placeholder="e.g. Lead with 2 strong Toronto pages to build initial awareness, then layer in GTA pages if budget allows. Grand opening angle — start with a teaser post 2 weeks out, hard announcement day-of, recap post in week 1."
            className="h-24"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Options to show</Label>
            <Select value={String(form.optionsCount)} onValueChange={(v) => update("optionsCount", parseInt(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} options</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recommended option</Label>
            <Select value={String(form.recommendedOption)} onValueChange={(v) => update("recommendedOption", parseInt(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>Option {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Agency markup</Label>
            <Select
              value={
                form.markupMode === "none" ? "none"
                : form.markupPercentage === 20 ? "small"
                : form.markupPercentage === 40 ? "large"
                : "custom"
              }
              onValueChange={(v) => {
                if (v === "none") setForm((f) => ({ ...f, markupMode: "none" }));
                else if (v === "small") setForm((f) => ({ ...f, markupMode: "percentage", markupPercentage: 20 }));
                else if (v === "large") setForm((f) => ({ ...f, markupMode: "percentage", markupPercentage: 40 }));
                else setForm((f) => ({ ...f, markupMode: "percentage", markupPercentage: f.markupPercentage === 20 || f.markupPercentage === 40 ? 30 : f.markupPercentage }));
              }}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Markup (base rate)</SelectItem>
                <SelectItem value="small">Small Agency (20% increase)</SelectItem>
                <SelectItem value="large">Large Agency (40% increase)</SelectItem>
                <SelectItem value="custom">Custom % increase</SelectItem>
              </SelectContent>
            </Select>
            {form.markupMode !== "none" && form.markupPercentage !== 20 && form.markupPercentage !== 40 && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.markupPercentage}
                  onChange={(e) => update("markupPercentage", parseInt(e.target.value) || 0)}
                  className="w-24 text-center"
                />
                <span className="text-sm text-slate-500">% increase</span>
              </div>
            )}
          </div>
        </div>

        {/* Discount controls */}
        <div>
          <Label className="text-sm font-medium">Option discounts (%)</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {[2, 3, 4, 5].map((n) => {
              const key = `option${n}Discount` as keyof ProposalForm;
              const val = form[key] as number;
              const flagged = val > 30 && userEmail !== PRICING_ADMIN;
              return (
                <div key={n}>
                  <label className={`text-xs mb-1 block ${flagged ? "text-amber-600 font-semibold" : "text-slate-500"}`}>Option {n}{flagged ? " ⚑" : ""}</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={val}
                      onChange={(e) => update(key, parseInt(e.target.value) || 0)}
                      className={`text-center ${flagged ? "border-amber-400 bg-amber-50" : ""}`}
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {userEmail !== PRICING_ADMIN && [form.option2Discount, form.option3Discount, form.option4Discount, form.option5Discount].some((d) => d > 30) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <span className="text-base leading-none mt-0.5">⚑</span>
              <div>
                <span className="font-semibold">Discount exceeds 30%</span> — primary account discounts over 30% require approval from Asad before sending.
                <span className="block text-xs text-amber-600 mt-0.5">Collabs can use any adjustment via the collab settings in Step 3.</span>
              </div>
            </div>
          )}
        </div>

        {/* Campaign types */}
        <div>
          <Label className="text-sm font-medium">Campaign types to include</Label>
          <div className="flex gap-4 mt-2">
            {([["includeBA", "BA (Brand Awareness)"], ["includeLTO", "LTO (Conversion)"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form[key as keyof ProposalForm] as boolean}
                  onCheckedChange={(v) => update(key as keyof ProposalForm, !!v)}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">GA and OC add-ons are set per page in Step 3.</p>
        </div>

        <div>
          <Label>Closing notes (optional)</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Additional context near the recommendation or closing…"
            className="mt-1 h-16"
          />
        </div>

        <div className="rounded-xl border border-dashed bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500 mb-1">Strategy hook (auto-selected for {form.category})</div>
          <p className="text-sm text-slate-700 italic">&ldquo;{strategyHook}&rdquo;</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// STEP 3 — Pages & Pricing
// ─────────────────────────────────────────────
function Step3Pages({
  form,
  setForm,
  accountsByCity,
  selectedAccounts,
  priceOf,
  deliverableAddonCost,
  applyMarkup,
  ladder,
  toggleAccount,
}: {
  form: ProposalForm;
  setForm: React.Dispatch<React.SetStateAction<ProposalForm>>;
  accountsByCity: Record<string, AccountSeed[]>;
  selectedAccounts: AccountSeed[];
  priceOf: (a: AccountSeed) => number;
  deliverableAddonCost: (a: AccountSeed) => number;
  applyMarkup: (rate: number) => number;
  ladder: ReturnType<typeof computeLadderPrices>;
  toggleAccount: (handle: string) => void;
}) {
  const [editingHandle, setEditingHandle] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const startEdit = (account: AccountSeed, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHandle(account.handle);
    setEditValue(String(priceOf(account)));
  };

  const saveEdit = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const price = parseInt(editValue);
    if (!isNaN(price) && price > 0) {
      setForm((f) => ({ ...f, customPrices: { ...f.customPrices, [handle]: price } }));
    }
    setEditingHandle(null);
  };

  const clearCustomPrice = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm((f) => {
      const next = { ...f.customPrices };
      delete next[handle];
      return { ...f, customPrices: next };
    });
  };

  const toggleCollaborator = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm((f) => ({
      ...f,
      collaboratorHandles: f.collaboratorHandles.includes(handle)
        ? f.collaboratorHandles.filter((h) => h !== handle)
        : [...f.collaboratorHandles, handle],
    }));
  };

  const total2 = ladder.option2Price;
  const total3 = ladder.option3Price;
  const hasCollaborators = form.collaboratorHandles.length > 0;

  return (
    <div className="space-y-4">
      {/* Header card with title */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Step 3: Pages & Pricing</CardTitle>
          <CardDescription>Select pages, set pricing, and mark any collaborator accounts.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{form.cities.map((c) => CITY_GROUPS.find((g) => g.key === c)?.label).join(", ")}</Badge>
            <Badge variant="secondary"><Layers className="h-3 w-3 mr-1" />{CATEGORY_OPTIONS.find((c) => c.value === form.category)?.label}</Badge>
            <Badge variant="secondary"><DollarSign className="h-3 w-3 mr-1" />
              {form.markupMode === "none"
                ? "No markup (base rate)"
                : form.markupMode === "percentage"
                ? `${form.markupPercentage}% agency markup`
                : "+$175 flat markup"} · rounded
            </Badge>
            {selectedAccounts.length > 0 && (
              <div className="ml-auto flex gap-4 text-sm">
                <div><span className="text-slate-500">Pilot (Opt 2):</span> <span className="font-semibold text-green-700">{formatCurrency(total2)}</span></div>
                <div><span className="text-slate-500">Bundle (Opt 3):</span> <span className="font-semibold text-green-700">{formatCurrency(total3)}</span></div>
              </div>
            )}
          </div>

          {/* Collaborator pricing settings */}
          {hasCollaborators && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Collaborator pricing</span>
                <span className="text-xs text-orange-500">({form.collaboratorHandles.length} account{form.collaboratorHandles.length !== 1 ? "s" : ""})</span>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={form.collaboratorAdjustMode}
                  onValueChange={(v) => setForm((f) => ({ ...f, collaboratorAdjustMode: v as ProposalForm["collaboratorAdjustMode"] }))}
                >
                  <SelectTrigger className="w-40 h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No adjustment</SelectItem>
                    <SelectItem value="discount">Apply discount</SelectItem>
                    <SelectItem value="surcharge">Apply surcharge</SelectItem>
                  </SelectContent>
                </Select>
                {form.collaboratorAdjustMode !== "none" && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={form.collaboratorAdjustValue}
                      onChange={(e) => setForm((f) => ({ ...f, collaboratorAdjustValue: parseInt(e.target.value) || 0 }))}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account picker by city */}
      {Object.keys(accountsByCity).length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No accounts match the selected cities and category. Try different selections.
          </CardContent>
        </Card>
      ) : (
        Object.entries(accountsByCity).map(([cityKey, accounts]) => (
          <Card key={cityKey} className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{CITY_GROUPS.find((c) => c.key === cityKey)?.label ?? cityKey}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {accounts.map((account) => {
                  const price = priceOf(account);
                  const selected = !!form.selectedAccounts[account.handle];
                  const isCollaborator = form.collaboratorHandles.includes(account.handle);
                  const hasCustomPrice = form.customPrices[account.handle] !== undefined;
                  const isEditing = editingHandle === account.handle;

                  return (
                    <button
                      type="button"
                      key={account.handle}
                      onClick={() => toggleAccount(account.handle)}
                      className={`text-left border rounded-xl p-4 transition-all relative ${
                        selected
                          ? isCollaborator
                            ? "border-orange-400 bg-orange-500 text-white shadow-sm"
                            : "border-[#E8192C] bg-[#E8192C] text-white shadow-sm"
                          : isCollaborator
                          ? "bg-orange-50 border-orange-300"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{account.handle}</div>
                          <div className={`text-xs mt-0.5 ${selected ? "text-white/70" : "text-slate-500"}`}>
                            {account.subNetwork} · {account.followers.toLocaleString()} followers
                          </div>
                        </div>
                        <Checkbox checked={selected} className="mt-0.5 flex-shrink-0" />
                      </div>

                      {/* Price display / edit */}
                      <div className="mt-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-white/80">$</span>
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 w-24 text-sm bg-white/20 border-white/40 text-white"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white hover:bg-white/20" onClick={(e) => saveEdit(account.handle, e)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setEditingHandle(null); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-end justify-between">
                            <div>
                              <span className={`font-bold text-lg ${selected ? "text-white" : "text-slate-900"}`}>
                                {formatCurrency(price)}
                              </span>
                              {hasCustomPrice && (
                                <button
                                  className={`ml-1 text-xs underline ${selected ? "text-white/70" : "text-slate-400"}`}
                                  onClick={(e) => clearCustomPrice(account.handle, e)}
                                >
                                  reset
                                </button>
                              )}
                              <div className={`text-xs ${selected ? "text-white/70" : "text-slate-400"}`}>
                                BA Feed Post + 2 Stories
                              </div>
                              {selected && deliverableAddonCost(account) > 0 && (
                                <div className={`text-xs mt-0.5 font-medium ${selected ? "text-white/80" : "text-slate-600"}`}>
                                  +{formatCurrency(deliverableAddonCost(account))} add-ons
                                </div>
                              )}
                            </div>
                            <button
                              className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors ${selected ? "text-white/70 hover:bg-white/20" : "text-slate-400 hover:bg-slate-100"}`}
                              onClick={(e) => startEdit(account, e)}
                              title="Edit price"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Primary / Collaborator toggle */}
                      {!isEditing && (
                        <div className="mt-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (isCollaborator) toggleCollaborator(account.handle, e); }}
                            className={`flex-1 text-xs py-1 rounded-lg font-medium transition-all border ${
                              !isCollaborator
                                ? selected ? "bg-white text-[#E8192C] border-white" : "bg-[#E8192C] text-white border-[#E8192C]"
                                : selected ? "bg-white/10 text-white/60 border-white/20 hover:bg-white/20" : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            Primary
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (!isCollaborator) toggleCollaborator(account.handle, e); }}
                            className={`flex-1 text-xs py-1 rounded-lg font-medium transition-all border ${
                              isCollaborator
                                ? "bg-orange-500 text-white border-orange-500"
                                : selected ? "bg-white/10 text-white/60 border-white/20 hover:bg-white/20" : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            Collab
                          </button>
                        </div>
                      )}

                      {/* Per-account add-on deliverables (only when selected) */}
                      {selected && !isEditing && (account.gaRate > 0 || account.ocRate > 0 || account.talkingHeadRate > 0) && (
                        <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1">Add-ons</div>
                          {([
                            ["GA", "ga", account.gaRate] as const,
                            ["OC Reel", "oc", account.ocRate] as const,
                            ["Talking Head", "th", account.talkingHeadRate] as const,
                          ].filter(([, , rate]) => rate > 0)).map(([label, key, rate]) => {
                            const qty = form.accountDeliverables[account.handle]?.[key] ?? 0;
                            const unitPrice = applyMarkup(rate);
                            return (
                              <div key={key} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-white/70 flex-1">{label}</span>
                                <span className="text-xs text-white/50">{formatCurrency(unitPrice)}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (qty === 0) return;
                                      setForm((f) => ({
                                        ...f,
                                        accountDeliverables: {
                                          ...f.accountDeliverables,
                                          [account.handle]: { ...( f.accountDeliverables[account.handle] ?? { ga: 0, oc: 0, th: 0 }), [key]: qty - 1 },
                                        },
                                      }));
                                    }}
                                    className="h-5 w-5 rounded text-white/70 hover:bg-white/20 flex items-center justify-center text-sm font-bold disabled:opacity-30"
                                    disabled={qty === 0}
                                  >−</button>
                                  <span className={`w-4 text-center text-xs font-semibold ${qty > 0 ? "text-white" : "text-white/40"}`}>{qty}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForm((f) => ({
                                        ...f,
                                        accountDeliverables: {
                                          ...f.accountDeliverables,
                                          [account.handle]: { ...( f.accountDeliverables[account.handle] ?? { ga: 0, oc: 0, th: 0 }), [key]: qty + 1 },
                                        },
                                      }));
                                    }}
                                    className="h-5 w-5 rounded text-white/70 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                                  >+</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Ladder summary */}
      {selectedAccounts.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">5-Option Ladder Preview</CardTitle>
            <CardDescription>Based on {selectedAccounts.length} selected page{selectedAccounts.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { n: 2, label: "Pilot (Opt 2)", standard: ladder.option2StandardValue, price: ladder.option2Price, disc: form.option2Discount },
                { n: 3, label: "Awareness Bundle (Opt 3)", standard: ladder.option3StandardValue, price: ladder.option3Price, disc: form.option3Discount },
                { n: 4, label: "Awareness + Conversion (Opt 4)", standard: ladder.option4StandardValue, price: ladder.option4Price, disc: form.option4Discount },
                { n: 5, label: "Full Campaign (Opt 5)", standard: ladder.option5StandardValue, price: ladder.option5Price, disc: form.option5Discount },
              ]
                .slice(0, form.optionsCount - 1)
                .map(({ n, label, standard, price, disc }) => (
                  <div key={n} className={`flex items-center justify-between rounded-lg px-4 py-3 ${form.recommendedOption === n ? "bg-green-50 border border-green-200" : "bg-slate-50"}`}>
                    <div>
                      <span className="font-medium text-sm">{label}</span>
                      {form.recommendedOption === n && <Badge className="ml-2 text-xs bg-green-600">Recommended</Badge>}
                      <div className="text-xs text-slate-500 mt-0.5">Standard: {formatCurrency(standard)} · {disc}% off</div>
                    </div>
                    <div className="font-bold text-lg">{formatCurrency(price)}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 4 — Output
// ─────────────────────────────────────────────
function Step4Output({
  proposalText,
  proposalHTML,
  isRefined,
  onCopy,
  onSave,
  saving,
  savedDealId,
  onViewPipeline,
  onExportDoc,
  exportingDoc,
  docUrl,
  form,
  ladder,
  selectedAccounts,
  priceOf,
  onRefine,
  isRefining,
  onResetRefined,
  reviewIssues,
  isReviewing,
  reviewProgress,
  onGenerateIO,
}: {
  proposalText: string;
  proposalHTML: string;
  isRefined: boolean;
  onCopy: () => void;
  onSave: () => void;
  saving: boolean;
  savedDealId: string | null;
  onViewPipeline: () => void;
  onExportDoc: () => void;
  exportingDoc: boolean;
  docUrl: string | null;
  form: ProposalForm;
  ladder: ReturnType<typeof computeLadderPrices>;
  selectedAccounts: AccountSeed[];
  priceOf: (a: AccountSeed) => number;
  onRefine: (instruction: string) => Promise<void>;
  isRefining: boolean;
  onResetRefined: () => void;
  reviewIssues: string[];
  isReviewing: boolean;
  reviewProgress: number;
  onGenerateIO: () => void;
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const sendInstruction = async () => {
    if (!chatInput.trim() || isRefining) return;
    const instruction = chatInput.trim();
    setChatInput("");
    setChatHistory((h) => [...h, { role: "user", text: instruction }]);
    await onRefine(instruction);
    setChatHistory((h) => [...h, { role: "ai", text: "Proposal updated." }]);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Step 4: Proposal Output</CardTitle>
          <CardDescription>Polished proposal ready to copy and paste into Gmail.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Action bar — always visible regardless of active tab */}
          <div className="flex flex-wrap items-center mb-4 gap-2">
            {isRefined && (
              <button onClick={onResetRefined} className="text-xs text-slate-500 underline hover:text-slate-700">
                Reset to generated
              </button>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={onCopy} size="sm">
                <Copy className="h-4 w-4 mr-2" />Copy
              </Button>
              {docUrl ? (
                <Button size="sm" variant="outline" onClick={() => window.open(docUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />Open Doc
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onExportDoc} disabled={exportingDoc}>
                  {exportingDoc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  {exportingDoc ? "Exporting…" : "Export to Doc"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onGenerateIO} className="border-[#E8192C] text-[#E8192C] hover:bg-red-50">
                <FileText className="h-4 w-4 mr-2" />Generate IO
              </Button>
              {savedDealId ? (
                <Button size="sm" onClick={onViewPipeline} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" />View in Pipeline
                </Button>
              ) : (
                <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#E8192C] hover:bg-[#c0141f]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? "Saving…" : "Save to Pipeline"}
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />Proposal Email</TabsTrigger>
              <TabsTrigger value="summary">Pricing Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              {isReviewing && (
                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>AI is reviewing the proposal…</span>
                    <span className="font-medium text-slate-700">{Math.round(reviewProgress)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E8192C] transition-all duration-500"
                      style={{ width: `${reviewProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {reviewIssues.length > 0 && !isReviewing && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 space-y-1">
                  <div className="font-semibold mb-1">AI found and fixed {reviewIssues.length} issue{reviewIssues.length !== 1 ? "s" : ""}:</div>
                  {reviewIssues.map((issue, i) => <div key={i}>• {issue}</div>)}
                </div>
              )}
              <div className="relative">
                {isRefining && (
                  <div className="absolute inset-0 bg-white/70 rounded-xl z-10 flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-[#E8192C]" />
                    AI is updating the proposal…
                  </div>
                )}
                <ScrollArea className="h-[560px] rounded-xl border bg-white px-6 py-5">
                  {isRefined
                    ? <pre className="whitespace-pre-wrap text-sm leading-7 font-sans text-slate-800">{proposalText}</pre>
                    : <div
                        className="text-sm leading-relaxed text-slate-800 proposal-preview"
                        dangerouslySetInnerHTML={{ __html: proposalHTML }}
                      />
                  }
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm mb-2">Selected Pages ({selectedAccounts.length})</h3>
                  <div className="space-y-1">
                    {selectedAccounts.map((a) => (
                      <div key={a.handle} className="flex justify-between text-sm py-1 border-b">
                        <span>{a.handle}</span>
                        <span className="font-medium">{formatCurrency(priceOf(a))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-1">
                      <span>Total (standard)</span>
                      <span>{formatCurrency(ladder.option2StandardValue)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-sm mb-2">Option Prices</h3>
                  <div className="space-y-1">
                    {[
                      { label: "Option 2 — Awareness Pilot", price: ladder.option2Price },
                      { label: "Option 3 — Awareness Bundle", price: ladder.option3Price },
                      { label: "Option 4 — Awareness + Conversion", price: ladder.option4Price },
                      { label: "Option 5 — Full Campaign", price: ladder.option5Price },
                    ].slice(0, form.optionsCount - 1).map(({ label, price }) => (
                      <div key={label} className="flex justify-between text-sm py-1 border-b">
                        <span>{label}</span>
                        <span className="font-bold">{formatCurrency(price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Proposal Assistant */}
      <Card className="rounded-2xl shadow-sm border-purple-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-500" />
            AI Proposal Assistant
          </CardTitle>
          <CardDescription>Tell the AI how to update the proposal — it rewrites it instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Chat history */}
          {chatHistory.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-slate-100 text-slate-700 ml-8"
                      : "bg-purple-50 text-purple-700 mr-8"
                  }`}
                >
                  {msg.role === "user" ? "You: " : "AI: "}{msg.text}
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendInstruction(); } }}
              placeholder='E.g. "Make Option 3 the recommendation" or "Add more urgency to the opener"'
              className="flex-1 text-sm"
              disabled={isRefining}
            />
            <Button
              onClick={sendInstruction}
              disabled={!chatInput.trim() || isRefining}
              className="bg-purple-600 hover:bg-purple-700 shrink-0"
              size="sm"
            >
              {isRefining
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Wand2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "Make the opener more personal",
              "Make Option 2 the recommendation",
              "Add urgency for a grand opening",
              "Shorten the whole proposal",
              "Add a case study to the Recommendation",
              "Make the tone more casual and conversational",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setChatInput(suggestion)}
                className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared proposal data builder
// ─────────────────────────────────────────────
function fp(amount: number): string {
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

interface ProposalData {
  client: string;
  cityLabels: string;
  goals: string;
  isGrandOpening: boolean;
  opener: string;
  businessContext: string;
  opt1CityBlocks: { city: string; accounts: { handle: string; followers: string; price: string }[] }[];
  selectedPagesList: string[];
  totalReach: number;
  optionNames: Record<number, string>;
  optionBestFor: Record<number, string>;
  optionDeliverables: Record<number, { items: string[] }>;
  optionHowItWorks: Record<number, string[]>;
  optionWhyItWorks: Record<number, string>;
  optionNumbers: number[];
  optionPrices: Record<number, { price: number; standard: number; disc: number }>;
  recName: string;
  recReasons: string[];
  outcomeBullets: string[];
  assetBullets: string[];
  fromWhatYouShared: string[];
  roleLines: string[];
  whyThisWorksInsight: string;
  strategyHook: string;
  notes: string;
  prDate: string;
  contactName: string;
  recommendedOption: number;
  caseStudy: string;
  proposedDirection: string;
}

function buildProposalData(
  form: ProposalForm,
  selectedAccounts: AccountSeed[],
  allRelevant: AccountSeed[],
  ladder: ReturnType<typeof computeLadderPrices>,
  strategyHook: string,
  priceOf: (a: AccountSeed) => number
): ProposalData {
  const client = form.businessName || "your business";
  const cityLabels = form.cities.map((c) => CITY_GROUPS.find((g) => g.key === c)?.label ?? c).join(" + ");
  const goals = form.goals.join(" + ") || "awareness";
  const isGrandOpening = form.goals.includes("Grand Opening");

  // Warm personal opener — never paste AE notes verbatim here
  const opener = form.contactName
    ? `It was great connecting with you, and I really appreciate you taking the time to walk me through ${client}.`
    : `I've spent some time looking at ${client} and putting together the right approach for ${cityLabels}.`;

  // Business context paragraph — strategic framing sentence pulled from businessInfo
  let businessContext = "";
  if (form.businessInfo) {
    const bi = form.businessInfo.trim();
    // Don't use it verbatim — frame it as the "this isn't just X, it's Y" observation
    businessContext = bi.endsWith(".") ? bi : `${bi}.`;
  }

  // Option 1 — all relevant pages grouped by city
  const byCityRaw: Record<string, AccountSeed[]> = {};
  for (const cg of CITY_GROUPS) {
    if (!form.cities.includes(cg.key)) continue;
    const accs = allRelevant.filter((a) => (cg.markets ?? [cg.key]).includes(a.market));
    if (accs.length) byCityRaw[cg.label] = accs;
  }
  const opt1CityBlocks = Object.entries(byCityRaw).map(([city, accs]) => ({
    city,
    accounts: accs.map((a) => ({
      handle: a.handle,
      followers: a.followers >= 1000000
        ? `${(a.followers / 1000000).toFixed(1)}M+`
        : a.followers >= 1000 ? `${Math.round(a.followers / 1000)}k+` : String(a.followers),
      price: fp(priceOf(a)),
    })),
  }));

  const totalReach = selectedAccounts.reduce((s, a) => s + a.followers, 0);
  const primaryAccounts = selectedAccounts.filter((a) => !form.collaboratorHandles.includes(a.handle));
  const collabAccounts = selectedAccounts.filter((a) => form.collaboratorHandles.includes(a.handle));

  const selectedPagesList: string[] = [];
  if (selectedAccounts.length === 0) {
    selectedPagesList.push("(no pages selected — go back to Step 3)");
  } else if (collabAccounts.length === 0) {
    selectedAccounts.forEach((a) => selectedPagesList.push(a.handle));
  } else {
    if (primaryAccounts.length) selectedPagesList.push(`Primary: ${primaryAccounts.map((a) => a.handle).join(", ")}`);
    if (collabAccounts.length) selectedPagesList.push(`Collaborated: ${collabAccounts.map((a) => a.handle).join(", ")}`);
  }

  // Conversion verb based on goals
  const conversionVerb = form.goals.includes("Bookings") ? "book"
    : form.goals.includes("E-commerce Sales") ? "order"
    : form.goals.includes("Sign Ups / Downloads") ? "sign up"
    : form.goals.includes("Foot Traffic") || isGrandOpening ? "show up"
    : "act";

  const optionNames: Record<number, string> = {
    2: isGrandOpening ? "Grand Opening Push" : "Awareness Pilot",
    3: isGrandOpening ? "Grand Opening Bundle" : "Awareness + Traffic Driver",
    4: isGrandOpening ? "Grand Opening + Conversion Push" : "Awareness + Conversion Campaign",
    5: "Full Launch Campaign",
  };
  const optionBestFor: Record<number, string> = {
    2: isGrandOpening
      ? "Flexibility — test which audiences respond best ahead of the opening"
      : "Testing the market and building initial visibility with your strongest pages",
    3: isGrandOpening
      ? `Owning awareness across ${cityLabels} and turning visibility into opening day foot traffic`
      : "Building strong, consistent exposure across the market and driving real traffic",
    4: isGrandOpening
      ? "Driving awareness AND actual turnout — announcement plus a reason to show up"
      : "Driving actual bookings and conversions, not just visibility",
    5: "Making the strongest possible impact — full awareness, urgency, and original content",
  };

  const primaryLabel = primaryAccounts.length ? primaryAccounts.map((a) => a.handle).join(", ") : null;
  const collabLabel = collabAccounts.length ? collabAccounts.map((a) => a.handle).join(", ") : null;
  const pageSplitLines: string[] = [];
  if (primaryLabel && collabLabel) {
    pageSplitLines.push(`Primary feed posts on ${primaryLabel}`);
    pageSplitLines.push(`Collaborated across ${collabLabel}`);
  } else if (primaryLabel) {
    pageSplitLines.push(`Pages: ${primaryLabel}`);
  }

  const optionDeliverables: Record<number, { items: string[] }> = {
    2: { items: ["1 Brand Awareness Feed Post per page", "2 Supporting Story Posts per page", ...pageSplitLines] },
    3: { items: ["1 Brand Awareness Feed Post per page", "1 Follow-up / Traffic Driver Post per page", "4 Story Posts per page", ...pageSplitLines] },
    4: { items: ["1 Brand Awareness Post per page", "1 Limited-Time Offer / Conversion Post per page", "4 Story Posts per page", ...pageSplitLines] },
    5: { items: ["1 Brand Awareness Post per page", "1 LTO / Conversion Post per page", "1 Original Content shoot", "Story rollout across all pages", ...pageSplitLines] },
  };

  // "How this works" — Post 1 / Post 2 sequence, like AE examples
  const optionHowItWorks: Record<number, string[]> = {
    2: [
      `Post 1 – Brand Awareness: Introduce ${client} to the ${cityLabels} audience. Build familiarity with the brand, what you offer, and what makes you different.`,
      "Supporting Story Posts reinforce reach and keep the brand top of mind.",
    ],
    3: [
      `Post 1 – Brand Awareness: Introduce ${client} and build familiarity across the ${cityLabels} network.`,
      isGrandOpening
        ? `Post 2 – Opening Push: A second coordinated post creates the "everyone is talking about it" effect — exactly what drives lineups and foot traffic on opening day.`
        : `Post 2 – Traffic Driver: Multiple posts across different pages create repeated touchpoints — helping people remember the brand when they're ready to ${conversionVerb}.`,
    ],
    4: [
      `Post 1 – Brand Awareness: Introduce ${client} and build credibility with the ${cityLabels} audience.`,
      `Post 2 – Limited-Time Offer: Give people a specific reason to ${conversionVerb} now. This is what turns "I've seen this before" → "I should ${conversionVerb} now."`,
    ],
    5: [
      `Post 1 – Brand Awareness: Introduce the brand and build familiarity.`,
      `Post 2 – Limited-Time Offer: Drive urgency and give people a clear reason to ${conversionVerb}.`,
      `Post 3 – Original Content: Showcase the actual experience through video. For a brand like ${client}, this is the strongest driver of emotional connection and purchase intent — and it lives on your page long after the campaign ends.`,
    ],
  };

  const optionWhyItWorks: Record<number, string> = {
    2: isGrandOpening
      ? `Focused, targeted, and timed to drive awareness and foot traffic right from day one.`
      : `Focused coverage on your strongest pages gives you clean performance data from the first campaign — and a clear foundation to build on.`,
    3: isGrandOpening
      ? `Multiple pages, simultaneous rollout. This is what creates the "everyone is talking about it" effect that drives lineups on opening day.`
      : `Multiple posts across different pages create repeated touchpoints — helping people remember ${client} when they're ready to act.`,
    4: `The awareness post builds recognition. The follow-up gives people a specific reason to ${conversionVerb}. This structure is designed to move people from seeing → acting.`,
    5: `This is the most complete approach. We introduce the brand, drive urgency with an offer, and produce original content that extends the campaign's impact well beyond the posting window.`,
  };

  // Hedge phrase filter
  const HEDGE_PATTERNS = [
    /^based on/i, /^it appears/i, /^however/i, /^not clearly/i,
    /^specific differentiator/i, /^limited (website|content)/i,
    /^from the (website|content|transcript)/i, /^the (website|content)/i,
    /unclear/i, /not available/i, /cannot determine/i, /^unfortunately/i,
  ];
  const isHedge = (s: string) => HEDGE_PATTERNS.some((p) => p.test(s.trim()));

  // "You've got:" bullets — short punchy differentiators
  const assetBullets: string[] = [];
  if (form.differentiator) {
    form.differentiator.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      .filter((s) => !isHedge(s) && s.length >= 8)
      .slice(0, 3)
      .forEach((s) => assetBullets.push(s.replace(/\.$/, "").substring(0, 100)));
  }
  if (assetBullets.length === 0) assetBullets.push(`A strong concept with real potential in ${cityLabels}`);

  // "From what you shared:" — diagnosis section (2-3 insights based on challenge + category)
  const fromWhatYouShared: string[] = [];
  if (form.challenge) fromWhatYouShared.push(form.challenge.trim().replace(/\.$/, ""));
  const categoryInsight: Partial<Record<BusinessCategory, string>> = {
    restaurant: "The product is what will sell itself — the main gap is getting new people in the door",
    bar: "The energy and experience is your biggest selling point — the challenge is getting people to take the first step",
    beauty: "The quality of the service is clearly there — the opportunity is getting in front of the right audience and giving them a reason to book",
    service: "The expertise is established — the opportunity is local discovery and building trust with a new audience",
    retail: "The product selection is the differentiator — the gap is driving people from awareness to actually visiting",
    event_space: "The space sells itself once people see it — the opportunity is consistent exposure to the right audience",
    app: "The product works — the focus is acquisition and getting the right audience to discover and download",
    ecommerce: "The product is ready to convert — the opportunity is reaching buyers who don't know you exist yet",
    gifting: "The product resonates with the right occasion buyer — the challenge is showing up at the right moment",
  };
  if (categoryInsight[form.category]) fromWhatYouShared.push(categoryInsight[form.category]!);

  // "Our role is to:" lines
  const roleLines: string[] = isGrandOpening
    ? [
        "Build strong awareness before the doors open",
        "Create urgency and momentum that drives foot traffic on opening day",
      ]
    : form.goals.some((g) => ["Bookings", "E-commerce Sales", "Sign Ups / Downloads"].includes(g))
    ? [
        "Increase discovery with the right audience",
        `Shorten the gap between seeing → ${conversionVerb}ing`,
      ]
    : [
        "Increase awareness and local discovery",
        "Turn that visibility into real foot traffic and business",
      ];

  // "Which means:" insight
  const whyThisWorksInsight = isGrandOpening
    ? "The opening window is short — every day without awareness is a missed opportunity to build momentum"
    : form.goals.some((g) => ["Bookings", "E-commerce Sales", "Sign Ups / Downloads"].includes(g))
    ? `Awareness alone is not enough — people need a clear reason to ${conversionVerb} now`
    : `Once people discover ${client}, the product does the rest — our role is to increase that discovery`;

  const recReasons: string[] = [];
  if (form.challenge) recReasons.push(form.challenge.trim().replace(/\.$/, ""));
  if (isGrandOpening) {
    recReasons.push("The opening window is critical — multiple touchpoints beat a single post");
    recReasons.push("You need strong awareness before the doors open, not after");
  } else {
    recReasons.push(`The goal is ${goals.toLowerCase()} — this option is structured exactly for that`);
    recReasons.push("It keeps the investment efficient while maximizing the right reach");
  }

  const outcomeBullets = [
    isGrandOpening ? "Drive strong foot traffic in the opening window" : `Build measurable ${goals.toLowerCase()} in ${cityLabels}`,
    "Generate real performance data to build on",
    isGrandOpening ? "Make a strong first impression in the market" : "Create a foundation for future campaigns",
  ];

  const optionNumbers = [2, 3, 4, 5].slice(0, form.optionsCount - 1);
  const optionPrices: Record<number, { price: number; standard: number; disc: number }> = {};
  for (const n of optionNumbers) {
    optionPrices[n] = {
      price: ladder[`option${n}Price` as keyof typeof ladder] as number,
      standard: ladder[`option${n}StandardValue` as keyof typeof ladder] as number,
      disc: form[`option${n}Discount` as keyof ProposalForm] as number,
    };
  }

  const recName = optionNames[form.recommendedOption] ?? `Option ${form.recommendedOption}`;

  return {
    client, cityLabels, goals, isGrandOpening, opener, businessContext,
    opt1CityBlocks, selectedPagesList, totalReach,
    optionNames, optionBestFor, optionDeliverables, optionHowItWorks, optionWhyItWorks,
    optionNumbers, optionPrices, recName, recReasons, outcomeBullets,
    assetBullets, fromWhatYouShared, roleLines, whyThisWorksInsight, strategyHook,
    notes: form.notes, prDate: form.prDate, contactName: form.contactName,
    recommendedOption: form.recommendedOption,
    caseStudy: form.caseStudy?.trim() ?? "",
    proposedDirection: form.proposedDirection?.trim() ?? "",
  };
}

function generateProposalText(
  form: ProposalForm,
  selectedAccounts: AccountSeed[],
  allRelevant: AccountSeed[],
  ladder: ReturnType<typeof computeLadderPrices>,
  strategyHook: string,
  priceOf: (a: AccountSeed) => number
): string {
  const d = buildProposalData(form, selectedAccounts, allRelevant, ladder, strategyHook, priceOf);
  const reachStr = d.totalReach >= 1000000
    ? `${(d.totalReach / 1000000).toFixed(1)}M+`
    : d.totalReach >= 1000 ? `${Math.round(d.totalReach / 1000)}K+` : String(d.totalReach);

  const opt1Text = d.opt1CityBlocks.length
    ? d.opt1CityBlocks.map((b) => `${b.city} Pages:\n${b.accounts.map((a) => `• ${a.handle} (${a.followers} followers on IG and FB combined) – ${a.price}`).join("\n")}`).join("\n\n")
    : "• (no pages available for selected markets)";

  let text = `Hi ${d.contactName || "there"},

${d.opener}
${d.businessContext ? `\n${d.businessContext}\n` : ""}
As promised, I've put together a few options for you to review.


${d.client} – ${d.cityLabels} Campaign Strategy


The Opportunity

${d.client} already has:
${d.assetBullets.map((b) => `• ${b}`).join("\n")}

The challenge right now is:
${d.fromWhatYouShared.length ? d.fromWhatYouShared.map((b) => `• ${b}`).join("\n") : `• Building awareness and consistent discovery in ${d.cityLabels}`}
${d.isGrandOpening ? "• The opening window is short — momentum needs to be built before the doors open\n" : ""}${d.proposedDirection ? `\n${d.proposedDirection}\n` : ""}

Campaign Options


Option 1 – Brand Awareness (Page-by-Page)

Best for: Flexibility — pick individual pages based on budget or market priority

Deliverables (per page):
1 Feed Post + 2 Story Posts

${opt1Text}

You can select individual pages depending on which markets you want to prioritize, or combine multiple for stronger reach.`;

  for (const n of d.optionNumbers) {
    const { price, standard, disc } = d.optionPrices[n];
    const isRec = d.recommendedOption === n;
    const howItWorks = d.optionHowItWorks[n] ?? [];
    text += `


Option ${n} – ${d.optionNames[n]}${isRec ? " (Recommended)" : ""}

Best for: ${d.optionBestFor[n] ?? ""}

Deliverables:
${d.optionDeliverables[n]?.items.map((i) => `• ${i}`).join("\n") ?? ""}
${selectedAccounts.length > 0 ? `\nTotal Network Reach: ~${reachStr} followers` : ""}
Bundled Investment:
${fp(price)} (Saving over ${disc}% vs individual pricing)

How this works:
${howItWorks.map((l) => `• ${l}`).join("\n")}`;
  }

  text += `


Why This Works for ${d.client}

From what you shared:
${d.fromWhatYouShared.map((b) => `• ${b}`).join("\n")}

Which means:
• ${d.whyThisWorksInsight}

Our role is to:
${d.roleLines.map((r) => `• ${r}`).join("\n")}
${d.caseStudy ? `\n\nFor reference — ${d.caseStudy}` : ""}


Recommendation

I'd ${d.recommendedOption === 5 ? "strongly " : ""}recommend going with Option ${d.recommendedOption} – ${d.recName}.
${d.notes ? `\n${d.notes.trim()}\n` : ""}
Given:
${d.recReasons.map((r) => `• ${r}`).join("\n")}

This gives you the best chance to:
${d.outcomeBullets.map((b) => `• ${b}`).join("\n")}


Next Steps

${d.prDate
    ? `I've put this together ahead of ${d.prDate}. Let me know your thoughts and we can lock in dates and messaging.`
    : "Let me know your thoughts and we can set up a quick call to walk through this together. Happy to adjust based on your priorities."}

Best,
[AE Name]`;

  return text;
}

function generateProposalHTML(
  form: ProposalForm,
  selectedAccounts: AccountSeed[],
  allRelevant: AccountSeed[],
  ladder: ReturnType<typeof computeLadderPrices>,
  strategyHook: string,
  priceOf: (a: AccountSeed) => number
): string {
  const d = buildProposalData(form, selectedAccounts, allRelevant, ladder, strategyHook, priceOf);
  const reachStr = d.totalReach >= 1000000
    ? `${(d.totalReach / 1000000).toFixed(1)}M+`
    : d.totalReach >= 1000 ? `${Math.round(d.totalReach / 1000)}K+` : String(d.totalReach);

  const ul = (items: string[]) => `<ul style="margin:6px 0;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const p = (text: string) => `<p style="margin:8px 0">${text}</p>`;
  const h2 = (text: string) => `<h2 style="font-size:18px;font-weight:bold;margin:24px 0 8px">${text}</h2>`;
  const h3 = (text: string) => `<h3 style="font-size:15px;font-weight:bold;margin:20px 0 6px">${text}</h3>`;
  const h4 = (text: string) => `<h4 style="font-size:13px;font-weight:bold;margin:14px 0 4px;color:#444">${text}</h4>`;
  const hr = () => `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">`;
  const b = (text: string) => `<strong>${text}</strong>`;

  const opt1Blocks = d.opt1CityBlocks.length
    ? d.opt1CityBlocks.map((blk) =>
        `${p(`${b(blk.city + " Pages:")}`)}<ul style="margin:4px 0;padding-left:20px">${blk.accounts.map((a) => `<li>${a.handle} (${a.followers} followers on IG and FB combined) – ${a.price}</li>`).join("")}</ul>`
      ).join("")
    : p("(no pages available for selected markets)");

  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;max-width:680px">
${p(`Hi ${d.contactName || "there"},`)}
${p(d.opener)}
${d.businessContext ? p(d.businessContext) : ""}
${p("As promised, I've put together a few options for you to review.")}
${hr()}
${h2(`${d.client} – ${d.cityLabels} Campaign Strategy`)}
${h3("The Opportunity")}
${p(`${b(d.client)} already has:`)}
${ul(d.assetBullets)}
${p("The challenge right now is:")}
${ul(d.fromWhatYouShared.length ? d.fromWhatYouShared : [`Building awareness and consistent discovery in ${d.cityLabels}`])}
${d.isGrandOpening ? p("With a seasonal opening window, it's important to build momentum early and capitalize on demand.") : ""}
${d.proposedDirection ? p(`<em>${d.proposedDirection}</em>`) : ""}
${hr()}
${h2("Campaign Options")}
${hr()}
${h3("Option 1 – Brand Awareness (Page-by-Page)")}
${p(`${b("Best for:")} Flexibility — pick individual pages based on budget or market priority`)}
${p(`${b("Deliverables (per page:")}<br>1 Feed Post + 2 Story Posts`)}
${opt1Blocks}
${p("You can select individual pages depending on which markets you want to prioritize, or combine multiple for stronger reach.")}`;

  for (const n of d.optionNumbers) {
    const { price, standard, disc } = d.optionPrices[n];
    const isRec = d.recommendedOption === n;
    const howItWorks = d.optionHowItWorks[n] ?? [];
    html += `${hr()}
${h3(`Option ${n} – ${d.optionNames[n]}${isRec ? " (Recommended)" : ""}`)}
${p(`${b("Best for:")} ${d.optionBestFor[n] ?? ""}`)}
${p(b("Deliverables:"))}
${ul(d.optionDeliverables[n]?.items ?? [])}
${selectedAccounts.length > 0 ? p(`${b("Total Network Reach:")} ~${reachStr} followers`) : ""}
${p(`${b("Bundled Investment:")}<br>${b(fp(price))} (Saving over ${disc}% vs individual pricing)`)}
${h4("How this works")}
${ul(howItWorks)}`;
  }

  html += `${hr()}
${h2(`Why This Works for ${d.client}`)}
${p(b("From what you shared:"))}
${ul(d.fromWhatYouShared.length ? d.fromWhatYouShared : [`The focus is building awareness and discovery in ${d.cityLabels}`])}
${p(`${b("Which means:")}<br>${d.whyThisWorksInsight}`)}
${p(b("Our role is to:"))}
${ul(d.roleLines)}
${d.caseStudy ? p(`For reference — ${d.caseStudy}`) : ""}
${hr()}
${h2("Recommendation")}
${p(`I'd ${d.recommendedOption === 5 ? "strongly " : ""}recommend going with ${b(`Option ${d.recommendedOption} – ${d.recName}`)}.`)}
${d.notes ? p(d.notes.trim()) : ""}
${p("Given:")}
${ul(d.recReasons)}
${p("This gives you the best chance to:")}
${ul(d.outcomeBullets)}
${hr()}
${h2("Next Steps")}
${p(d.prDate
    ? `I've put this together ahead of ${d.prDate}. Let me know your thoughts and we can lock in dates and messaging.`
    : "Let me know your thoughts and we can set up a quick call to walk through this together. Happy to adjust based on your priorities.")}
${p("Best,<br>[AE Name]")}
</div>`;

  return html;
}
