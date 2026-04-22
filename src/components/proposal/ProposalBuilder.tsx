"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  ChevronRight, ChevronLeft, Check, Save, Loader2, FileText, ExternalLink,
} from "lucide-react";
import {
  ACCOUNTS_SEED,
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
  cities: string[];  // city group keys
  category: BusinessCategory;
  goal: string;
  budgetMin: string;
  budgetMax: string;
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
}

const DEFAULT_FORM: ProposalForm = {
  businessName: "",
  contactName: "",
  website: "",
  prDate: "",
  cities: ["toronto"],
  category: "restaurant",
  goal: "Awareness",
  budgetMin: "",
  budgetMax: "",
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
};

const STEPS = ["Business", "Strategy", "Pages & Pricing", "Output"] as const;

export default function ProposalBuilder() {
  const [form, setForm] = useState<ProposalForm>(DEFAULT_FORM);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);
  const [exportingDoc, setExportingDoc] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Accounts relevant to selected cities + category
  const relevantAccounts = useMemo(
    () => getAccountsForCities(form.cities, form.category),
    [form.cities, form.category]
  );

  // Group relevant accounts by city group
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

  // Selected accounts list
  const selectedAccounts = useMemo(
    () => relevantAccounts.filter((a) => form.selectedAccounts[a.handle]),
    [relevantAccounts, form.selectedAccounts]
  );

  // Per-account proposal price (base + $175 markup, rounded)
  const priceOf = useCallback(
    (account: AccountSeed) => applyFlatMarkup(account.baseRate, DEFAULT_PRICING_CONFIG),
    []
  );

  const selectedBaseTotal = useMemo(
    () => selectedAccounts.reduce((sum, a) => sum + priceOf(a), 0),
    [selectedAccounts, priceOf]
  );

  const ladder = useMemo(
    () =>
      computeLadderPrices({
        selectedBaseTotal,
        option2Discount: form.option2Discount / 100,
        option3Discount: form.option3Discount / 100,
        option4Discount: form.option4Discount / 100,
        option5Discount: form.option5Discount / 100,
      }),
    [selectedBaseTotal, form.option2Discount, form.option3Discount, form.option4Discount, form.option5Discount]
  );

  const strategyHook = useMemo(() => getStrategyHook(form.category), [form.category]);

  const toggleCity = (cityKey: string) => {
    const exists = form.cities.includes(cityKey);
    const next = exists
      ? form.cities.filter((c) => c !== cityKey)
      : [...form.cities, cityKey];
    setForm((f) => ({ ...f, cities: next.length ? next : [cityKey] }));
  };

  const toggleAccount = (handle: string) => {
    setForm((f) => ({
      ...f,
      selectedAccounts: {
        ...f.selectedAccounts,
        [handle]: !f.selectedAccounts[handle],
      },
    }));
  };

  const cityLabel = (key: string) =>
    CITY_GROUPS.find((c) => c.key === key)?.label ?? key;

  const proposalText = useMemo(() => generateProposalText(form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf), [form, selectedAccounts, relevantAccounts, ladder, strategyHook, priceOf]);

  const copyProposal = () => {
    navigator.clipboard.writeText(proposalText);
    toast({ title: "Copied to clipboard", description: "Proposal text is ready to paste." });
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
          form,
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
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-[#E8192C] flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="text-sm text-muted-foreground">Northly Sales OS</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">New Proposal</span>
          </div>
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
                      active
                        ? "bg-[#E8192C] text-white border-[#E8192C]"
                        : done
                        ? "bg-slate-900 text-white border-slate-900"
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

              {/* Live summary */}
              <div className="text-xs text-slate-500 space-y-1 pt-1">
                <div className="font-medium text-slate-700">Live Summary</div>
                {form.businessName && <div>Client: <span className="text-slate-900">{form.businessName}</span></div>}
                <div>Cities: <span className="text-slate-900">{form.cities.map(cityLabel).join(", ")}</span></div>
                <div>Category: <span className="text-slate-900">{CATEGORY_OPTIONS.find(c => c.value === form.category)?.label}</span></div>
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
            {step === 1 && (
              <Step1Business form={form} setForm={setForm} strategyHook={strategyHook} />
            )}
            {step === 2 && (
              <Step2Strategy form={form} setForm={setForm} strategyHook={strategyHook} />
            )}
            {step === 3 && (
              <Step3Pages
                form={form}
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
              />
            )}

            {/* Nav buttons */}
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
                onClick={() => setStep((s) => Math.min(4, s + 1))}
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

  const toggleCity = (key: string) => {
    const exists = form.cities.includes(key);
    const next = exists ? form.cities.filter((c) => c !== key) : [...form.cities, key];
    update("cities", next.length ? next : [key]);
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Step 1: Business Details</CardTitle>
        <CardDescription>Set the base information for the proposal.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Business name</Label>
          <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="The Mad Stacker" className="mt-1" />
        </div>
        <div>
          <Label>Contact name</Label>
          <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Dino" className="mt-1" />
        </div>
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

        <div>
          <Label>Main goal</Label>
          <Select value={form.goal} onValueChange={(v) => update("goal", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GOAL_OPTIONS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        <div className="md:col-span-2">
          <Label>What do they do?</Label>
          <Textarea value={form.businessInfo} onChange={(e) => update("businessInfo", e.target.value)} placeholder="Premium sub restaurant with two GTA locations..." className="mt-1 h-20" />
        </div>
        <div>
          <Label>What makes them different?</Label>
          <Textarea value={form.differentiator} onChange={(e) => update("differentiator", e.target.value)} placeholder="Premium ingredients, house-made sauces..." className="mt-1 h-20" />
        </div>
        <div>
          <Label>Main challenge</Label>
          <Textarea value={form.challenge} onChange={(e) => update("challenge", e.target.value)} placeholder="Needs awareness and foot traffic in new market" className="mt-1 h-20" />
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

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Step 2: Strategy & Option Logic</CardTitle>
        <CardDescription>Define discounts, recommended option, and strategic framing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Proposed direction / strategy note</Label>
          <Textarea
            value={form.proposedDirection}
            onChange={(e) => update("proposedDirection", e.target.value)}
            placeholder="We should start focused on 2 Toronto pages to get clean data, then scale to GTA..."
            className="mt-1 h-24"
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
            placeholder="Additional context near the recommendation or closing..."
            className="mt-1 h-16"
          />
        </div>

        {/* Strategy hook */}
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
  accountsByCity,
  selectedAccounts,
  priceOf,
  ladder,
  toggleAccount,
}: {
  form: ProposalForm;
  accountsByCity: Record<string, AccountSeed[]>;
  selectedAccounts: AccountSeed[];
  priceOf: (a: AccountSeed) => number;
  ladder: ReturnType<typeof computeLadderPrices>;
  toggleAccount: (handle: string) => void;
}) {
  const total2 = ladder.option2Price;
  const total3 = ladder.option3Price;

  return (
    <div className="space-y-4">
      {/* Header with totals */}
      <Card className="rounded-2xl shadow-sm border-[#E8192C]/20 bg-red-50/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{form.cities.map((c) => CITY_GROUPS.find((g) => g.key === c)?.label).join(", ")}</Badge>
            <Badge variant="secondary"><Layers className="h-3 w-3 mr-1" />{CATEGORY_OPTIONS.find((c) => c.value === form.category)?.label}</Badge>
            <Badge variant="secondary"><DollarSign className="h-3 w-3 mr-1" />+$175 markup · rounded</Badge>
            {selectedAccounts.length > 0 && (
              <>
                <div className="ml-auto flex gap-4 text-sm">
                  <div><span className="text-slate-500">Pilot (Opt 2):</span> <span className="font-semibold text-green-700">{formatCurrency(total2)}</span></div>
                  <div><span className="text-slate-500">Bundle (Opt 3):</span> <span className="font-semibold text-green-700">{formatCurrency(total3)}</span></div>
                </div>
              </>
            )}
          </div>
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
                  return (
                    <button
                      type="button"
                      key={account.handle}
                      onClick={() => toggleAccount(account.handle)}
                      className={`text-left border rounded-xl p-4 transition-all ${
                        selected
                          ? "border-[#E8192C] bg-[#E8192C] text-white shadow-sm"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{account.handle}</div>
                          <div className={`text-xs mt-0.5 ${selected ? "text-red-100" : "text-slate-500"}`}>
                            {account.subNetwork} · {account.followers.toLocaleString()} followers
                          </div>
                        </div>
                        <Checkbox checked={selected} className="mt-0.5 flex-shrink-0" />
                      </div>
                      <div className={`mt-3 font-bold text-lg ${selected ? "text-white" : "text-slate-900"}`}>
                        {formatCurrency(price)}
                      </div>
                      <div className={`text-xs ${selected ? "text-red-100" : "text-slate-400"}`}>
                        per BA Feed Post + 2 Stories
                      </div>
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
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(price)}</div>
                    </div>
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
}: {
  proposalText: string;
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
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Step 4: Proposal Output</CardTitle>
        <CardDescription>Polished proposal ready to copy and send.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />Proposal Email</TabsTrigger>
            <TabsTrigger value="summary">Pricing Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <div className="flex flex-wrap justify-end mb-3 gap-2">
              <Button variant="outline" onClick={onCopy} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              {docUrl ? (
                <Button size="sm" variant="outline" onClick={() => window.open(docUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Doc
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onExportDoc} disabled={exportingDoc}>
                  {exportingDoc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  {exportingDoc ? "Exporting…" : "Export to Google Doc"}
                </Button>
              )}
              {savedDealId ? (
                <Button size="sm" onClick={onViewPipeline} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" />
                  View in Pipeline
                </Button>
              ) : (
                <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#E8192C] hover:bg-[#c0141f]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? "Saving…" : "Save to Pipeline"}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[600px] rounded-xl border bg-white p-6">
              <pre className="whitespace-pre-wrap text-sm leading-7 font-sans text-slate-800">{proposalText}</pre>
            </ScrollArea>
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
                    { label: "Option 2 — Pilot", price: ladder.option2Price },
                    { label: "Option 3 — Bundle", price: ladder.option3Price },
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
  );
}

// ─────────────────────────────────────────────
// Proposal text generator
// ─────────────────────────────────────────────
function generateProposalText(
  form: ProposalForm,
  selectedAccounts: AccountSeed[],
  allRelevant: AccountSeed[],
  ladder: ReturnType<typeof computeLadderPrices>,
  strategyHook: string,
  priceOf: (a: AccountSeed) => number
): string {
  const cityLabels = form.cities.map((c) => CITY_GROUPS.find((g) => g.key === c)?.label ?? c).join(", ");
  const fc = formatCurrency;

  // Group all relevant pages by city for Option 1
  const byCity: Record<string, AccountSeed[]> = {};
  for (const cg of CITY_GROUPS) {
    const accs = allRelevant.filter((a) => (cg.markets ?? [cg.key]).includes(a.market));
    if (accs.length && form.cities.includes(cg.key)) byCity[cg.label] = accs;
  }

  const opt1Lines = Object.entries(byCity)
    .map(([city, accs]) => `${city}:\n${accs.map((a) => `  • ${a.handle} – ${fc(priceOf(a))}`).join("\n")}`)
    .join("\n\n");

  const selectedLines = selectedAccounts.length
    ? selectedAccounts.map((a) => `  • ${a.handle}`).join("\n")
    : "  • (no pages selected)";

  const recommendedLabel = ["", "", "Recommended Pilot", "Multi-Page Awareness Bundle", "Awareness + Conversion Bundle", "Full Campaign"][form.recommendedOption] ?? "";

  let text = `Subject: ${form.businessName || "Business"} | ${cityLabels} ${form.goal} Proposal

Hi ${form.contactName || "there"},

Hope you're doing well.

I took some time to go through ${form.businessName || "the business"} and think through the best way to approach this. ${strategyHook}

Right now, the opportunity is simple:
• ${form.goal}${form.challenge ? `\n• Solve for: ${form.challenge}` : ""}${form.differentiator ? `\n• Lead with what makes you different: ${form.differentiator}` : ""}${form.businessInfo ? `\n• Context: ${form.businessInfo}` : ""}

So rather than just listing posts, the strategy here should be:
Awareness → Consideration → Conversion
${form.proposedDirection ? `\n${form.proposedDirection}\n` : ""}
Below are the options I'd look at.

---

## Option 1 – Full Market Inventory

This gives you a full view of the relevant pages we have across ${cityLabels}, along with the proposal pricing for a Brand Awareness post on each.

${opt1Lines}

Each includes:
• 1 Feed Post
• 2 Story Posts

---

## Option 2 – Recommended Pilot${form.recommendedOption === 2 ? " ★ Recommended" : ""}

If I were you, this is where I'd start.

Instead of spreading budget thin, we focus on the pages below to give us the cleanest read on performance before scaling.

Pages:
${selectedLines}

Deliverables: 1 Feed Post + 2 Story Posts per page

Standard Value: ${fc(ladder.option2StandardValue)}
First-Time / Pilot Rate (${form.option2Discount}% off): ${fc(ladder.option2Price)}`;

  if (form.optionsCount >= 3) {
    text += `

---

## Option 3 – Multi-Page Awareness Bundle${form.recommendedOption === 3 ? " ★ Recommended" : ""}

Stronger awareness play — more coverage and repetition right out of the gate.

Pages:
${selectedLines}

Deliverables: 1 BA Post + 2 Story Posts per page

Standard Value: ${fc(ladder.option3StandardValue)}
Bundled Rate (${form.option3Discount}% off): ${fc(ladder.option3Price)}`;
  }

  if (form.optionsCount >= 4) {
    text += `

---

## Option 4 – Awareness + Conversion Bundle${form.recommendedOption === 4 ? " ★ Recommended" : ""}

Where we shift from just getting seen to actually driving action through a second push.

Pages:
${selectedLines}

Deliverables: 1 BA Post + 1 Conversion/LTO Post + 4 Story Posts per page

Standard Value: ${fc(ladder.option4StandardValue)}
Campaign Rate (${form.option4Discount}% off): ${fc(ladder.option4Price)}`;
  }

  if (form.optionsCount >= 5) {
    text += `

---

## Option 5 – Full Campaign (BA + LTO + OC)${form.recommendedOption === 5 ? " ★ Recommended" : ""}

The full play — visual storytelling, sharper, more conversion-ready.

Pages:
${selectedLines}

Deliverables: 1 BA Post + 1 LTO Post + 4 Story Posts + 1 Original Content video per page

Standard Value: ${fc(ladder.option5StandardValue)}
Campaign Rate (${form.option5Discount}% off): ${fc(ladder.option5Price)}`;
  }

  text += `

---

## Recommendation

If I were you, I'd start with Option ${form.recommendedOption} — ${recommendedLabel}.

It gives you the best balance of:
• Fit with your budget
• Clean performance data
• A realistic path to scale if the first push works
${form.notes ? `\n${form.notes}\n` : ""}
I'd love to hear your thoughts and which direction you're leaning toward.

If helpful, we can also jump on a quick call this week to review it together. Send me a couple of times that work and I'll make myself available.

Best,
${form.contactName ? `[AE Name]` : "[AE Name]"}`;

  return text;
}
