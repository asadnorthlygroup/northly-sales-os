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
  ExternalLink, Mic, MicOff, Pencil, X, Wand2, Users,
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
  proposedDirection: string;
  optionsCount: number;
  recommendedOption: number;
  option2Discount: number;
  option3Discount: number;
  option4Discount: number;
  option5Discount: number;
  markupMode: "flat" | "percentage";
  displayMode: "itemized" | "package";
  includeBA: boolean;
  includeLTO: boolean;
  includeOC: boolean;
  notes: string;
  selectedAccounts: Record<string, boolean>;
  customPrices: Record<string, number>;
  collaboratorHandles: string[];
  collaboratorAdjustMode: "discount" | "surcharge" | "none";
  collaboratorAdjustValue: number;
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
  proposedDirection: "",
  optionsCount: 3,
  recommendedOption: 2,
  option2Discount: 25,
  option3Discount: 30,
  option4Discount: 35,
  option5Discount: 40,
  markupMode: "flat",
  displayMode: "package",
  includeBA: true,
  includeLTO: false,
  includeOC: false,
  notes: "",
  selectedAccounts: {},
  customPrices: {},
  collaboratorHandles: [],
  collaboratorAdjustMode: "none",
  collaboratorAdjustValue: 15,
};

const STEPS = ["Business", "Strategy", "Pages & Pricing", "Output"] as const;

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
  const [form, setForm] = useState<ProposalForm>(() => {
    // Pre-fill from Close CRM URL params when navigating from Leads page
    const businessName = searchParams.get("businessName") ?? "";
    const contactName = searchParams.get("contactName") ?? "";
    const businessInfo = searchParams.get("businessInfo") ?? "";
    if (!businessName) return DEFAULT_FORM;
    return { ...DEFAULT_FORM, businessName, contactName, businessInfo };
  });
  const [closeLeadId] = useState<string | null>(() => searchParams.get("closeLeadId"));
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
  const { toast } = useToast();
  const router = useRouter();

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

  const priceOf = useCallback(
    (account: AccountSeed): number => {
      if (form.customPrices[account.handle] !== undefined) {
        return form.customPrices[account.handle];
      }
      let price = applyFlatMarkup(account.baseRate, DEFAULT_PRICING_CONFIG);
      if (form.collaboratorHandles.includes(account.handle)) {
        if (form.collaboratorAdjustMode === "discount") {
          price = roundProposalPrice(price * (1 - form.collaboratorAdjustValue / 100));
        } else if (form.collaboratorAdjustMode === "surcharge") {
          price = roundProposalPrice(price * (1 + form.collaboratorAdjustValue / 100));
        }
      }
      return price;
    },
    [form.customPrices, form.collaboratorHandles, form.collaboratorAdjustMode, form.collaboratorAdjustValue]
  );

  const selectedBaseTotal = useMemo(
    () => selectedAccounts.reduce((sum, a) => sum + priceOf(a), 0),
    [selectedAccounts, priceOf]
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
            {step === 1 && <Step1Business form={form} setForm={setForm} strategyHook={strategyHook} />}
            {step === 2 && <Step2Strategy form={form} setForm={setForm} strategyHook={strategyHook} />}
            {step === 3 && (
              <Step3Pages
                form={form}
                setForm={setForm}
                accountsByCity={accountsByCity}
                selectedAccounts={selectedAccounts}
                priceOf={priceOf}
                ladder={ladder}
                toggleAccount={toggleAccount}
              />
            )}
            {step === 4 && (
              <Step4Output
                proposalText={proposalText}
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
                    setIsReviewing(true);
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
                      setIsReviewing(false);
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
}: {
  form: ProposalForm;
  setForm: React.Dispatch<React.SetStateAction<ProposalForm>>;
  strategyHook: string;
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

  return (
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

        {/* Row 2: website + PR date */}
        <div>
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <Label>PR / Launch Date</Label>
          <Input value={form.prDate} onChange={(e) => update("prDate", e.target.value)} placeholder="Friday May 2 at 12pm" className="mt-1" />
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

        {/* Strategy preview */}
        <div className="md:col-span-2 rounded-xl border border-dashed bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500 mb-1">Strategy hook preview</div>
          <p className="text-sm text-slate-700 italic">&ldquo;{strategyHook}&rdquo;</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// STEP 2 — Strategy & Option Logic
// ─────────────────────────────────────────────
function Step2Strategy({
  form,
  setForm,
  strategyHook,
}: {
  form: ProposalForm;
  setForm: React.Dispatch<React.SetStateAction<ProposalForm>>;
  strategyHook: string;
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
          goals: form.goals,
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
            <Label>Proposed direction / strategy note</Label>
            <div className="flex items-center gap-1.5">
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
            placeholder="We should start focused on 2 Toronto pages to get clean data, then scale to GTA…"
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
            <Label>Markup mode</Label>
            <Select value={form.markupMode} onValueChange={(v) => update("markupMode", v as "flat" | "percentage")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat +$175/account</SelectItem>
                <SelectItem value="percentage">20% blanket markup</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Discount controls */}
        <div>
          <Label className="text-sm font-medium">Option discounts (%)</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {[2, 3, 4, 5].map((n) => {
              const key = `option${n}Discount` as keyof ProposalForm;
              const val = form[key] as number;
              return (
                <div key={n}>
                  <label className="text-xs text-slate-500 mb-1 block">Option {n}</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={val}
                      onChange={(e) => update(key, parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign types */}
        <div>
          <Label className="text-sm font-medium">Campaign types to include</Label>
          <div className="flex gap-4 mt-2">
            {([["includeBA", "BA (Brand Awareness)"], ["includeLTO", "LTO (Conversion)"], ["includeOC", "OC (Original Content)"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form[key as keyof ProposalForm] as boolean}
                  onCheckedChange={(v) => update(key as keyof ProposalForm, !!v)}
                />
                {label}
              </label>
            ))}
          </div>
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
  ladder,
  toggleAccount,
}: {
  form: ProposalForm;
  setForm: React.Dispatch<React.SetStateAction<ProposalForm>>;
  accountsByCity: Record<string, AccountSeed[]>;
  selectedAccounts: AccountSeed[];
  priceOf: (a: AccountSeed) => number;
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
            <Badge variant="secondary"><DollarSign className="h-3 w-3 mr-1" />+$175 markup · rounded</Badge>
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
                                per BA Feed Post + 2 Stories
                              </div>
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
  onGenerateIO,
}: {
  proposalText: string;
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
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  AI is reviewing the proposal…
                </div>
              )}
              <div className="relative">
                {isRefining && (
                  <div className="absolute inset-0 bg-white/70 rounded-xl z-10 flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-[#E8192C]" />
                    AI is updating the proposal…
                  </div>
                )}
                <ScrollArea className="h-[560px] rounded-xl border bg-white p-6">
                  <pre className="whitespace-pre-wrap text-sm leading-7 font-sans text-slate-800">{proposalText}</pre>
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
  opt1CityBlocks: { city: string; accounts: { handle: string; followers: string; price: string }[] }[];
  selectedPagesList: string[];
  optionNames: Record<number, string>;
  optionBestFor: Record<number, string>;
  optionDeliverables: Record<number, { items: string[] }>;
  optionWhyItWorks: Record<number, string>;
  optionNumbers: number[];
  optionPrices: Record<number, { price: number; standard: number; disc: number }>;
  recName: string;
  recReasons: string[];
  outcomeBullets: string[];
  assetBullets: string[];
  focusBullets: string[];
  strategyHook: string;
  notes: string;
  prDate: string;
  contactName: string;
  recommendedOption: number;
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

  // Opener — warm connection line like Asif writes.
  // NEVER paste businessInfo or differentiator verbatim here — those are AE notes, not client-facing copy.
  let opener = form.contactName
    ? `It was great connecting with you, and I really appreciate you taking the time to walk me through ${client}.`
    : `I've spent some time looking at ${client} and putting together the right approach for ${cityLabels}.`;
  if (form.proposedDirection) {
    opener += ` ${form.proposedDirection.trim()}`;
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

  const primaryAccounts = selectedAccounts.filter((a) => !form.collaboratorHandles.includes(a.handle));
  const collabAccounts = selectedAccounts.filter((a) => form.collaboratorHandles.includes(a.handle));

  // selectedPagesList used in option descriptions — shows primary / collab split
  const selectedPagesList: string[] = [];
  if (selectedAccounts.length === 0) {
    selectedPagesList.push("(no pages selected — go back to Step 3)");
  } else if (collabAccounts.length === 0) {
    selectedAccounts.forEach((a) => selectedPagesList.push(a.handle));
  } else {
    // Split into primary feed posts + collaborated across
    if (primaryAccounts.length) selectedPagesList.push(`Primary feed posts on ${primaryAccounts.map((a) => a.handle).join(", ")}`);
    if (collabAccounts.length) selectedPagesList.push(`Collaborated across ${collabAccounts.map((a) => a.handle).join(", ")}`);
  }

  const optionNames: Record<number, string> = {
    2: isGrandOpening ? "Grand Opening Push" : "Awareness Pilot",
    3: isGrandOpening ? "Grand Opening Bundle" : "Awareness Bundle",
    4: "Awareness + Conversion Bundle",
    5: "Full Campaign (BA + LTO + OC)",
  };
  const optionBestFor: Record<number, string> = {
    2: isGrandOpening ? "Getting in front of the right local audience ahead of and during the opening" : "Building initial visibility and testing which audiences respond best",
    3: isGrandOpening ? "Owning awareness across all key pages at launch" : "Broader and more consistent exposure across the market",
    4: "Driving both awareness and conversions in a single campaign",
    5: "Maximizing reach, engagement, and conversion with the full suite of content",
  };
  // Page split line for option deliverables
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
    2: { items: ["1 Dedicated Feed Post per page", "2 Story Posts per page", ...pageSplitLines] },
    3: { items: ["1 Dedicated Feed Post per page", "2 Story Posts per page", "Coordinated rollout across the network", ...pageSplitLines] },
    4: { items: ["1 Brand Awareness Post per page", "1 Limited-Time Offer / Conversion Post per page", "4 Story Posts per page", ...pageSplitLines] },
    5: { items: ["1 Brand Awareness Post per page", "1 LTO / Conversion Post per page", "1 Original Content Shoot", "Story Rollout across all pages", ...pageSplitLines] },
  };
  const optionWhyItWorks: Record<number, string> = {
    2: isGrandOpening
      ? `This gets ${client} in front of the core ${cityLabels} audience ahead of the opening. Focused, targeted, and timed to drive foot traffic right from day one.`
      : `Focused coverage on the strongest pages gives you clean performance data from the first campaign and a clear foundation to scale from.`,
    3: isGrandOpening
      ? `Multiple pages, simultaneous rollout. This creates the "everyone is talking about it" effect that drives lineups and traffic on opening day.`
      : `Multiple posts across different pages create repeated touchpoints — helping people remember the brand when they're ready to act.`,
    4: `The first post builds awareness and credibility. The follow-up gives people a specific reason to act — whether that's booking, visiting, or ordering.`,
    5: `This is the most complete approach. We introduce the brand, drive urgency, and produce original content that lives on your page long after the campaign ends.`,
  };

  // Hedge phrases that indicate AI couldn't find real content — filter these out entirely
  const HEDGE_PATTERNS = [
    /^based on/i, /^it appears/i, /^however/i, /^not clearly/i,
    /^specific differentiator/i, /^limited (website|content)/i,
    /^from the (website|content|transcript)/i, /^the (website|content)/i,
    /unclear/i, /not available/i, /cannot determine/i, /^unfortunately/i,
  ];
  const isHedge = (s: string) => HEDGE_PATTERNS.some((p) => p.test(s.trim()));

  // "Already has" bullets — SHORT and punchy, max 100 chars each, filter AI hedge language
  const assetBullets: string[] = [];
  if (form.differentiator) {
    form.differentiator.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      .filter((s) => !isHedge(s) && s.length >= 8)
      .slice(0, 3)
      .forEach((s) => assetBullets.push(s.replace(/\.$/, "").substring(0, 100)));
  }
  if (assetBullets.length === 0) assetBullets.push(`A strong concept with real potential in ${cityLabels}`);

  const focusBullets: string[] = [];
  if (form.challenge) focusBullets.push(form.challenge.trim().replace(/\.$/, ""));
  focusBullets.push(`${isGrandOpening ? "Maximizing awareness and foot traffic in the opening window" : `Driving ${goals.toLowerCase()} beyond the existing audience`}`);
  if (isGrandOpening) focusBullets.push("Creating urgency that converts attention into attendance");

  const recReasons: string[] = [];
  if (form.challenge) recReasons.push(form.challenge.trim().replace(/\.$/, ""));
  if (isGrandOpening) {
    recReasons.push("The opening window is critical — multiple touchpoints beat a single post");
    recReasons.push("You need strong awareness before the doors open, not after");
  } else {
    recReasons.push(`The goal is ${goals.toLowerCase()} — this option is built exactly for that`);
    recReasons.push("It keeps the investment efficient while maximizing the right reach");
  }
  recReasons.push("Performance data from this push tells us exactly where to go next");

  const outcomeBullets = [
    isGrandOpening ? "Drive strong foot traffic in the opening window" : `Build measurable ${goals.toLowerCase()} in ${cityLabels}`,
    "Generate real performance data to build on",
    "Create a foundation for future campaigns",
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
    client, cityLabels, goals, isGrandOpening, opener,
    opt1CityBlocks, selectedPagesList,
    optionNames, optionBestFor, optionDeliverables, optionWhyItWorks,
    optionNumbers, optionPrices, recName, recReasons, outcomeBullets,
    assetBullets, focusBullets, strategyHook,
    notes: form.notes, prDate: form.prDate, contactName: form.contactName,
    recommendedOption: form.recommendedOption,
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

  const opt1Text = d.opt1CityBlocks.length
    ? d.opt1CityBlocks.map((b) => `${b.city} Pages:\n${b.accounts.map((a) => `• ${a.handle} (${a.followers} followers on IG and FB combined) – ${a.price}`).join("\n")}`).join("\n\n")
    : "• (no pages available for selected markets)";

  let text = `Hi ${d.contactName || "there"},

${d.opener}

As promised, I've put together a few options for you to review.


${d.client} – ${d.cityLabels} Campaign Strategy


The Opportunity

${d.client} already has:
${d.assetBullets.map((b) => `• ${b}`).join("\n")}

The focus now is:
${d.focusBullets.map((b) => `• ${b}`).join("\n")}

${d.strategyHook}


Campaign Options


Option 1 – Brand Awareness (Page-by-Page)

Best for: Flexibility and full visibility into what's available across ${d.cityLabels}

Deliverables (per page):
1 Feed Post + 2 Story Posts

${opt1Text}

You can select individual pages based on budget, or combine multiple for stronger reach.`;

  for (const n of d.optionNumbers) {
    const { price, standard, disc } = d.optionPrices[n];
    const isRec = d.recommendedOption === n;
    text += `


Option ${n} – ${d.optionNames[n]}${isRec ? " (Recommended)" : ""}

Best for: ${d.optionBestFor[n] ?? ""}

Deliverables:
${d.optionDeliverables[n]?.items.map((i) => `• ${i}`).join("\n") ?? ""}

Pages Included:
${d.selectedPagesList.join("\n")}

Investment:
Original Value: ${fp(standard)}
Bundled Campaign Rate: ${fp(price)} (over ${disc}% in savings)

Why it works:
${d.optionWhyItWorks[n] ?? ""}`;
  }

  text += `


Recommendation

I'd recommend going with Option ${d.recommendedOption} – ${d.recName}.

${d.notes ? d.notes.trim() + "\n\n" : ""}${d.recReasons.length ? (d.assetBullets[0] ? "Since:\n" : "Given that:\n") + d.recReasons.map((r) => `• ${r}`).join("\n") : ""}

This gives you the best chance to:
${d.outcomeBullets.map((b) => `• ${b}`).join("\n")}


Next Steps

${d.prDate
    ? `I've put this together ahead of ${d.prDate}. Let me know your thoughts and we can lock everything in.`
    : "I'd love to walk through this with you. Let me know your thoughts or send over a couple of times that work and I'll make myself available."}

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

  const ul = (items: string[]) => `<ul style="margin:6px 0;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const p = (text: string) => `<p style="margin:8px 0">${text}</p>`;
  const h2 = (text: string) => `<h2 style="font-size:18px;font-weight:bold;margin:24px 0 8px">${text}</h2>`;
  const h3 = (text: string) => `<h3 style="font-size:15px;font-weight:bold;margin:20px 0 6px">${text}</h3>`;
  const hr = () => `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">`;
  const b = (text: string) => `<strong>${text}</strong>`;

  const opt1Blocks = d.opt1CityBlocks.length
    ? d.opt1CityBlocks.map((blk) =>
        `${p(`${blk.city} Pages:`)}<ul style="margin:4px 0;padding-left:20px">${blk.accounts.map((a) => `<li>${a.handle} (${a.followers} followers on IG and FB combined) – ${a.price}</li>`).join("")}</ul>`
      ).join("")
    : p("(no pages available for selected markets)");

  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;max-width:680px">
${p(`Hi ${d.contactName || "there"},`)}
${p(d.opener)}
${p("As promised, I've put together a few options for you to review.")}
${hr()}
${h2(`${d.client} – ${d.cityLabels} Campaign Strategy`)}
${h3("The Opportunity")}
${p(`${b(d.client)} already has:`)}
${ul(d.assetBullets)}
${p("The focus now is:")}
${ul(d.focusBullets)}
${p(d.strategyHook)}
${hr()}
${h2("Campaign Options")}
${hr()}
${h3("Option 1 – Brand Awareness (Page-by-Page)")}
${p(`${b("Best for:")} Flexibility and full visibility into what's available across ${d.cityLabels}`)}
${p(`${b("Deliverables (per page:")}<br>1 Feed Post + 2 Story Posts`)}
${opt1Blocks}
${p("You can select individual pages based on budget, or combine multiple for stronger reach.")}`;

  for (const n of d.optionNumbers) {
    const { price, standard, disc } = d.optionPrices[n];
    const isRec = d.recommendedOption === n;
    html += `${hr()}
${h3(`Option ${n} – ${d.optionNames[n]}${isRec ? " (Recommended)" : ""}`)}
${p(`${b("Best for:")} ${d.optionBestFor[n] ?? ""}`)}
${p(b("Deliverables:"))}
${ul(d.optionDeliverables[n]?.items ?? [])}
${p(b("Pages Included:"))}
${ul(d.selectedPagesList)}
${p(`${b("Investment:")}<br>Original Value: ${fp(standard)}<br>${b(`Bundled Campaign Rate: ${fp(price)}`)} (over ${disc}% in savings)`)}
${p(`${b("Why it works:")}<br>${d.optionWhyItWorks[n] ?? ""}`)}`;
  }

  html += `${hr()}
${h2("Recommendation")}
${p(`I'd recommend going with ${b(`Option ${d.recommendedOption} – ${d.recName}`)}.`)}
${d.notes ? p(d.notes.trim()) : ""}
${p(d.recReasons.length ? (d.assetBullets[0] ? "Since:" : "Given that:") : "")}
${ul(d.recReasons)}
${p("This gives you the best chance to:")}
${ul(d.outcomeBullets)}
${hr()}
${h2("Next Steps")}
${p(d.prDate
    ? `I've put this together ahead of ${d.prDate}. Let me know your thoughts and we can lock everything in.`
    : "I'd love to walk through this with you. Let me know your thoughts or send over a couple of times that work and I'll make myself available.")}
${p("Best,<br>[AE Name]")}
</div>`;

  return html;
}
