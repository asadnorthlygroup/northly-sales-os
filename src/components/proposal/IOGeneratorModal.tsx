"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, ExternalLink, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";
import type { AccountSeed } from "@/lib/accounts-seed";
import type { LadderPrices } from "@/lib/pricing";

// ─── Google Places autocomplete hook ──────────────────────────────────────────
const PROVINCE_MAP: Record<string, string> = {
  "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB",
  "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Nova Scotia": "NS",
  "Northwest Territories": "NT", "Nunavut": "NU", "Ontario": "ON",
  "Prince Edward Island": "PE", "Quebec": "QC", "Saskatchewan": "SK", "Yukon": "YT",
};

function ensurePacContainerStyle() {
  if (document.getElementById("pac-container-fix")) return;
  const style = document.createElement("style");
  style.id = "pac-container-fix";
  style.textContent = ".pac-container { z-index: 99999 !important; }";
  document.head.appendChild(style);
}

// Module-level promise so concurrent callers share a single load
let _mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_mapsLoadPromise) return _mapsLoadPromise;

  _mapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-maps-places") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-places";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      _mapsLoadPromise = null;
      reject(new Error("Google Maps script failed to load — check that the API key is valid and Places API is enabled in Google Cloud Console"));
    };
    document.head.appendChild(script);
  });

  return _mapsLoadPromise;
}

type WindowWithGM = typeof window & { gm_authFailure?: () => void };

function usePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onPlace: (parts: { street: string; city: string; province: string; postal: string }) => void,
  onError?: (msg: string) => void,
) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceRef = useRef(onPlace);
  useEffect(() => { onPlaceRef.current = onPlace; }, [onPlace]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    ensurePacContainerStyle();
    let cancelled = false;
    const w = window as WindowWithGM;
    const prevAuthFailure = w.gm_authFailure;

    // Intercept Google Maps auth failures (invalid key, Places API not enabled, billing inactive)
    w.gm_authFailure = () => {
      if (!cancelled) {
        onError?.(
          "Google Maps authentication failed. Go to Google Cloud Console → APIs & Services and confirm: " +
          "(1) Maps JavaScript API is enabled, (2) Places API is enabled, (3) billing is active for the project."
        );
      }
    };

    loadGoogleMapsScript(apiKey).then(async () => {
      if (cancelled || !inputRef.current) return;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      try {
        // Try new importLibrary approach first (required for API keys created after early 2024),
        // fall back to legacy direct access for older keys.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapsAny = window.google.maps as any;
        const AutocompleteClass: typeof google.maps.places.Autocomplete =
          typeof mapsAny.importLibrary === "function"
            ? (await mapsAny.importLibrary("places")).Autocomplete
            : window.google.maps.places.Autocomplete;

        const ac = new AutocompleteClass(inputRef.current, {
          componentRestrictions: { country: "ca" },
          fields: ["address_components"],
          types: ["address"],
        });
        autocompleteRef.current = ac;

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.address_components) return;
          let streetNumber = "", route = "", city = "", provinceLong = "", postal = "";
          for (const comp of place.address_components) {
            const t = comp.types;
            if (t.includes("street_number")) streetNumber = comp.long_name;
            else if (t.includes("route")) route = comp.long_name;
            else if (t.includes("locality")) city = comp.long_name;
            else if (t.includes("administrative_area_level_1")) provinceLong = comp.long_name;
            else if (t.includes("postal_code")) postal = comp.long_name;
          }
          onPlaceRef.current({
            street: [streetNumber, route].filter(Boolean).join(" "),
            city,
            province: PROVINCE_MAP[provinceLong] ?? "ON",
            postal,
          });
        });
      } catch (err) {
        if (!cancelled) onError?.(String(err));
        console.error("[Places] Autocomplete init error:", err);
      }
    }).catch((err: Error) => {
      if (!cancelled) onError?.(err.message);
      console.error("[Places]", err.message);
    });

    return () => {
      cancelled = true;
      if (w.gm_authFailure !== prevAuthFailure) w.gm_authFailure = prevAuthFailure;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland & Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

const PROVINCE_TAX: Record<string, { name: string; rate: number }> = {
  ON: { name: "HST (ON)", rate: 0.13 },
  BC: { name: "GST + PST (BC)", rate: 0.12 },
  AB: { name: "GST", rate: 0.05 },
  QC: { name: "GST + QST (QC)", rate: 0.14975 },
  MB: { name: "GST + PST (MB)", rate: 0.12 },
  SK: { name: "GST + PST (SK)", rate: 0.11 },
  NS: { name: "HST (NS)", rate: 0.15 },
  NB: { name: "HST (NB)", rate: 0.15 },
  PE: { name: "HST (PE)", rate: 0.15 },
  NL: { name: "HST (NL)", rate: 0.15 },
  NT: { name: "GST", rate: 0.05 },
  NU: { name: "GST", rate: 0.05 },
  YT: { name: "GST", rate: 0.05 },
};

interface PaymentRow { date: string; amount: string; }
interface StoryAssignment { handle: string; included: boolean; qty: number; }

interface IOGeneratorModalProps {
  businessName: string;
  cities: string[];
  selectedAccounts: AccountSeed[];
  ladder: LadderPrices;
  optionsCount: number;
  collaboratorHandles?: string[];
  onClose: () => void;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-5 pb-1">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{children}</h3>
      <div className="mt-1.5 border-t border-slate-100" />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function IOGeneratorModal({
  businessName,
  cities,
  selectedAccounts,
  ladder,
  optionsCount,
  collaboratorHandles = [],
  onClose,
}: IOGeneratorModalProps) {
  const [optionNumber, setOptionNumber] = useState<number>(Math.min(optionsCount, 2));
  const [contactName, setContactName] = useState("");
  const [clientLegalName, setClientLegalName] = useState(businessName);
  const [clientStreet, setClientStreet] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientProvince, setClientProvince] = useState("ON");
  const [clientPostal, setClientPostal] = useState("");
  const streetInputRef = useRef<HTMLInputElement>(null);
  const hasPlacesKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [placesError, setPlacesError] = useState<string | null>(null);

  const handlePlaceSelect = useCallback((parts: { street: string; city: string; province: string; postal: string }) => {
    if (parts.street) setClientStreet(parts.street);
    if (parts.city) setClientCity(parts.city);
    if (parts.province) setClientProvince(parts.province);
    if (parts.postal) setClientPostal(parts.postal);
  }, []);

  usePlacesAutocomplete(streetInputRef, handlePlaceSelect, setPlacesError);
  const [clientEmail, setClientEmail] = useState("");
  const [serviceStartDate, setServiceStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const [offerExpiry, setOfferExpiry] = useState("");
  const [storyServicesType, setStoryServicesType] = useState<"complementary" | "full_price" | "other">("complementary");
  const [storyServicesNote, setStoryServicesNote] = useState("");
  const [storyRate, setStoryRate] = useState("");
  const [storyAssignments, setStoryAssignments] = useState<StoryAssignment[]>(
    () => selectedAccounts.map((a) => ({ handle: a.handle, included: true, qty: 1 }))
  );
  const [paymentType, setPaymentType] = useState<"single" | "multiple">("single");
  const [paymentCount, setPaymentCount] = useState(2);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentRow[]>([{ date: "", amount: "" }, { date: "", amount: "" }]);
  const [specialConditions, setSpecialConditions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const generateIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optionPriceMap: Record<number, number> = {
    2: ladder.option2Price,
    3: ladder.option3Price,
    4: ladder.option4Price,
    5: ladder.option5Price,
  };
  const optionPrice = optionPriceMap[optionNumber] ?? 0;
  const tax = PROVINCE_TAX[clientProvince] ?? PROVINCE_TAX.ON;
  const taxAmount = Math.round(optionPrice * tax.rate * 100) / 100;
  const total = optionPrice + taxAmount;

  // Sync payment rows when count changes
  useEffect(() => {
    if (paymentType !== "multiple") return;
    setPaymentSchedule((prev) => {
      const next = [...prev];
      while (next.length < paymentCount) next.push({ date: "", amount: "" });
      return next.slice(0, paymentCount);
    });
  }, [paymentCount, paymentType]);

  // Auto-split payment amounts evenly
  useEffect(() => {
    if (paymentType !== "multiple" || !optionPrice) return;
    const perPayment = formatCurrency(Math.round((total / paymentCount) * 100) / 100);
    setPaymentSchedule((prev) =>
      prev.map((row) => ({ ...row, amount: row.amount || perPayment }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, paymentCount, total]);

  const availableOptions = Array.from({ length: optionsCount - 1 }, (_, i) => i + 2);

  async function generate() {
    if (!clientEmail || !serviceStartDate || !campaignEndDate) {
      setError("Please fill in all required fields (email, service start, and campaign end date).");
      return;
    }
    setGenerating(true);
    setGenerateProgress(0);
    setError(null);
    generateIntervalRef.current = setInterval(() => {
      setGenerateProgress((p) => {
        if (p >= 85) { clearInterval(generateIntervalRef.current!); return 85; }
        return Math.min(85, p + 3 + Math.random() * 4);
      });
    }, 700);
    try {
      const res = await fetch("/api/proposals/io", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionNumber,
          businessName,
          contactName,
          clientLegalName: clientLegalName || businessName,
          clientStreet,
          clientCity,
          clientProvince,
          clientPostal,
          clientEmail,
          serviceStartDate,
          campaignEndDate,
          storyServicesType,
          storyServicesNote,
          storyRate: storyRate ? parseFloat(storyRate.replace(/[^0-9.]/g, "")) : 0,
          storyAssignments: storyAssignments
            .filter((sa) => sa.included)
            .map((sa) => ({ handle: sa.handle, qty: sa.qty })),
          paymentType,
          paymentSchedule,
          specialConditions,
          selectedAccountHandles: selectedAccounts.map((a) => a.handle),
          collaboratorHandles,
          optionPrice,
          markets: cities,
          offerExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "no_drive_token") {
          setError("Google Drive access required. Sign out and back in to grant access.");
        } else {
          throw new Error(data.error ?? "IO generation failed");
        }
        return;
      }
      setDocUrl(data.docUrl);
    } catch (err) {
      setError(String(err));
    } finally {
      clearInterval(generateIntervalRef.current!);
      setGenerateProgress(100);
      setTimeout(() => setGenerating(false), 300);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div>
            <div className="font-bold text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#E8192C]" />
              Generate Insertion Order
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{businessName}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
        </div>

        {/* Success state */}
        {docUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="font-bold text-lg mb-1">IO Created Successfully</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Saved to your Northly Google Drive folder. Review and edit before sending to client.
            </p>
            <div className="flex gap-3">
              <Button asChild className="bg-[#E8192C] hover:bg-[#c0141f] gap-2">
                <a href={docUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Docs
                </a>
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* Pricing preview */}
              <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected option total (before tax)</span>
                <span className="font-bold text-slate-900">{formatCurrency(optionPrice)}</span>
              </div>

              {/* Option selection */}
              <SectionHeader>Option</SectionHeader>
              <Field label="Which option is this IO for?" required>
                <Select value={String(optionNumber)} onValueChange={(v) => setOptionNumber(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableOptions.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Option {n} — {formatCurrency(optionPriceMap[n] ?? 0)}
                        {n === 2 && " (Pilot)"}
                        {n === 3 && " (Awareness Bundle)"}
                        {n === 4 && " (Awareness + Conversion)"}
                        {n === 5 && " (Full Campaign)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Client billing */}
              <SectionHeader>Client Billing Details</SectionHeader>
              <div className="space-y-3">
                <Field label="Invoice contact (first & last name)" required>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" />
                </Field>
                <Field label="Legal company name">
                  <Input value={clientLegalName} onChange={(e) => setClientLegalName(e.target.value)} placeholder={businessName} />
                </Field>
                <Field label="Street address">
                  <div className="relative">
                    <Input
                      ref={streetInputRef}
                      value={clientStreet}
                      onChange={(e) => setClientStreet(e.target.value)}
                      placeholder="290 Picton Ave., Suite 103"
                      className={hasPlacesKey ? "pr-8" : ""}
                    />
                    {hasPlacesKey && (
                      <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    )}
                  </div>
                  {hasPlacesKey && !placesError && (
                    <p className="text-xs text-slate-400 mt-1">Start typing — city, province, and postal will fill automatically.</p>
                  )}
                  {placesError && (
                    <p className="text-xs text-amber-600 mt-1">Address autocomplete unavailable — fill in manually. ({placesError})</p>
                  )}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City">
                    <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="Toronto" />
                  </Field>
                  <Field label="Postal code">
                    <Input value={clientPostal} onChange={(e) => setClientPostal(e.target.value)} placeholder="M5A 1A1" />
                  </Field>
                </div>
                <Field label="Province" required>
                  <Select value={clientProvince} onValueChange={setClientProvince}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Invoice email" required>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@client.com" />
                </Field>
              </div>

              {/* Dates */}
              <SectionHeader>Dates</SectionHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Service start date" required>
                    <Input type="date" value={serviceStartDate} onChange={(e) => setServiceStartDate(e.target.value)} />
                  </Field>
                  <Field label="Campaign end date" required>
                    <Input type="date" value={campaignEndDate} onChange={(e) => setCampaignEndDate(e.target.value)} />
                  </Field>
                </div>
                <Field label="Offer expiry date">
                  <Input type="date" value={offerExpiry} onChange={(e) => setOfferExpiry(e.target.value)} />
                </Field>
              </div>

              {/* Story services */}
              <SectionHeader>Story Services</SectionHeader>
              <div className="space-y-3">
                <Field label="How should stories be handled?" required>
                  <Select value={storyServicesType} onValueChange={(v) => setStoryServicesType(v as typeof storyServicesType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complementary">Complementary story on each account (included in campaign)</SelectItem>
                      <SelectItem value="full_price">Full price story on each account (billed separately)</SelectItem>
                      <SelectItem value="other">Other — I'll describe it below</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Per-account story assignments */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Which pages & how many stories?
                  </Label>
                  <div className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {storyAssignments.map((sa, i) => (
                      <div
                        key={sa.handle}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm ${!sa.included ? "bg-slate-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={sa.included}
                          onChange={(e) => {
                            const next = [...storyAssignments];
                            next[i] = { ...next[i], included: e.target.checked };
                            setStoryAssignments(next);
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#E8192C] shrink-0"
                        />
                        <span className={`flex-1 font-mono text-xs ${!sa.included ? "text-slate-400 line-through" : "text-slate-700"}`}>
                          {sa.handle}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...storyAssignments];
                              next[i] = { ...next[i], qty: Math.max(1, next[i].qty - 1) };
                              setStoryAssignments(next);
                            }}
                            disabled={!sa.included || sa.qty <= 1}
                            className="h-5 w-5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                          >−</button>
                          <span className={`w-5 text-center text-xs tabular-nums font-medium ${!sa.included ? "text-slate-300" : "text-slate-700"}`}>
                            {sa.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...storyAssignments];
                              next[i] = { ...next[i], qty: next[i].qty + 1 };
                              setStoryAssignments(next);
                            }}
                            disabled={!sa.included}
                            className="h-5 w-5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(storyServicesType === "full_price" || storyServicesType === "other") && (
                  <Field label="Rate per story post">
                    <Input value={storyRate} onChange={(e) => setStoryRate(e.target.value)} placeholder="$500.00" />
                  </Field>
                )}
                {storyServicesType === "other" && (
                  <Field label="Describe the story arrangement">
                    <Textarea
                      value={storyServicesNote}
                      onChange={(e) => setStoryServicesNote(e.target.value)}
                      placeholder="e.g. 1 complementary story on the main account, full price on supporting accounts…"
                      rows={3}
                    />
                  </Field>
                )}
              </div>

              {/* Payment */}
              <SectionHeader>Payment</SectionHeader>
              <div className="space-y-3">
                <Field label="Payment structure" required>
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "single" | "multiple")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single payment ({formatCurrency(total)} incl. tax)</SelectItem>
                      <SelectItem value="multiple">Multiple payments</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {paymentType === "multiple" && (
                  <>
                    <Field label="Number of payments">
                      <Select value={String(paymentCount)} onValueChange={(v) => setPaymentCount(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} payments</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Payment schedule</Label>
                      {paymentSchedule.slice(0, paymentCount).map((row, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2 items-center">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Payment {i + 1} — Date</Label>
                            <Input type="date" value={row.date}
                              onChange={(e) => {
                                const next = [...paymentSchedule];
                                next[i] = { ...next[i], date: e.target.value };
                                setPaymentSchedule(next);
                              }} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Amount (incl. tax)</Label>
                            <Input value={row.amount} placeholder={formatCurrency(Math.round((total / paymentCount) * 100) / 100)}
                              onChange={(e) => {
                                const next = [...paymentSchedule];
                                next[i] = { ...next[i], amount: e.target.value };
                                setPaymentSchedule(next);
                              }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Tax preview */}
              <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(optionPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{tax.name} @ {(tax.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Special conditions */}
              <SectionHeader>Special Conditions (Optional)</SectionHeader>
              <Textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                placeholder="Any custom terms, revisions policy, cancellation clauses, etc."
                rows={3}
              />

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 space-y-3 bg-white">
              {generating && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Generating IO document…</span>
                    <span className="font-medium">{Math.round(generateProgress)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E8192C] transition-all duration-500"
                      style={{ width: `${generateProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1" disabled={generating}>Cancel</Button>
                <Button
                  onClick={generate}
                  disabled={generating}
                  className="flex-1 bg-[#E8192C] hover:bg-[#c0141f] gap-2"
                >
                  <FileText className="h-4 w-4" />Generate IO
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
