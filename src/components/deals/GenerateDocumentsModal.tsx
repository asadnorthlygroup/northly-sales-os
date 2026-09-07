"use client";

import { useEffect, useState } from "react";
import { X, FileText, ExternalLink, AlertCircle, Loader2, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pricing";
import { loadBillingCache, saveBillingCache } from "@/lib/billing-cache";
import {
  centsToDollars,
  computeInvoiceTotals,
  dollarsToCents,
  parseProvince,
  PROVINCES,
  type PaymentMethod,
} from "@/lib/invoice-pricing";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "e_transfer", label: "E-transfer" },
  { value: "credit_card", label: "Credit card (adds 3% fee)" },
  { value: "cheque", label: "Cheque" },
  { value: "eft", label: "EFT" },
];

export interface DocumentLine {
  item: string;
  description: string;
  quantity: number;
  unitPrice: number;
  zeroRated?: boolean;
}

interface Props {
  dealId: string;
  clientCompany: string;
  campaignTitle: string;
  lines: DocumentLine[];
  onClose: () => void;
}

interface SuccessResult {
  invoiceNumber: string;
  qboUrl: string;
  paymentLink: string | null;
  agreementLink: string;
  draftLink: string | null;
  draftError: string | null;
  emailSubject: string;
  emailBody: string;
  agreementDownloadUrl: string;
  invoiceDownloadUrl: string;
  reusedInvoice: boolean;
  total: number;
  processingFee: number;
  tax: number;
  taxLabel: string;
}

const input =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30";
const label = "block text-xs font-medium text-slate-600 mb-1";

export default function GenerateDocumentsModal({
  dealId,
  clientCompany,
  campaignTitle,
  lines,
  onClose,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState(() => {
    const cache = loadBillingCache();
    return {
      clientContactName: "",
      clientEmail: cache.email,
      clientStreet: cache.street,
      clientCity: cache.city,
      clientProvince: cache.province || "ON",
      clientPostal: cache.postal,
      paymentMethod: "e_transfer" as PaymentMethod,
      billingTerm: "Due Upon Receipt",
      serviceStartDate: today,
      invoiceDate: today,
      dueDate: today,
      discount: 0,
      specialConditions: "",
    };
  });

  useEffect(() => {
    saveBillingCache({
      email: form.clientEmail,
      street: form.clientStreet,
      city: form.clientCity,
      province: form.clientProvince,
      postal: form.clientPostal,
    });
  }, [form.clientEmail, form.clientStreet, form.clientCity, form.clientProvince, form.clientPostal]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  async function copy(text: string, which: "subject" | "body") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  }

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Previewed from the same engine the documents are built with.
  const preview = (() => {
    try {
      const totals = computeInvoiceTotals({
        province: parseProvince(form.clientProvince),
        paymentMethod: form.paymentMethod,
        discountCents: dollarsToCents(Number(form.discount) || 0),
        lines: lines.map((l) => ({
          quantity: l.quantity,
          unitPriceCents: dollarsToCents(l.unitPrice),
          taxTreatment: l.zeroRated ? ("zero_rated" as const) : ("standard" as const),
        })),
      });
      return {
        subtotal: centsToDollars(totals.subtotalCents),
        discount: centsToDollars(totals.discountCents),
        taxLabel: totals.taxLabel,
        tax: centsToDollars(totals.taxCents),
        fee: centsToDollars(totals.feeCents),
        total: centsToDollars(totals.totalCents),
        error: "",
      };
    } catch (err) {
      return {
        subtotal: 0, discount: 0, taxLabel: "Tax", tax: 0, fee: 0, total: 0,
        error: err instanceof Error ? err.message : "Cannot price this deal.",
      };
    }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/deals/generate-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          clientCompany,
          campaignTitle,
          clientContactName: form.clientContactName,
          clientEmail: form.clientEmail,
          clientStreet: form.clientStreet,
          clientCity: form.clientCity,
          clientProvince: form.clientProvince,
          clientPostal: form.clientPostal,
          billingTerm: form.billingTerm,
          serviceStartDate: form.serviceStartDate,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate,
          paymentMethod: form.paymentMethod,
          discount: Number(form.discount) || 0,
          specialConditions: form.specialConditions || undefined,
          lines,
        }),
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }
      if (!res.ok) throw new Error((data.error as string) ?? `Server error (HTTP ${res.status})`);
      setResult(data as unknown as SuccessResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#E8192C]" />
            <h2 className="font-semibold text-lg">Create Agreement + Invoice</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-5 w-5" />
                <span className="font-semibold">
                  {result.reusedInvoice ? "Documents rebuilt" : "Documents created"}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Invoice number</span>
                  <span className="font-medium text-slate-900">#{result.invoiceNumber}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 border-t pt-1.5">
                  <span>Total</span>
                  <span>{formatCurrency(result.total)}</span>
                </div>
              </div>

              {result.reusedInvoice && (
                <p className="text-xs text-slate-500">
                  This deal already had invoice #{result.invoiceNumber}, so it was reused rather
                  than creating a second one.
                </p>
              )}

              {/* Step 1 — the two PDFs */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  1 · Download both PDFs
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={result.agreementDownloadUrl}
                     className="flex items-center justify-center gap-2 border rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-50">
                    <Download className="h-4 w-4 text-slate-400" />
                    Agreement
                  </a>
                  <a href={result.invoiceDownloadUrl}
                     className="flex items-center justify-center gap-2 border rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-50">
                    <Download className="h-4 w-4 text-slate-400" />
                    Invoice
                  </a>
                </div>
              </div>

              {/* Step 2 — the message, ready to paste anywhere */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  2 · Copy the message
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-slate-50">
                    <span className="text-xs text-slate-600 truncate">{result.emailSubject}</span>
                    <button type="button" onClick={() => copy(result.emailSubject, "subject")}
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
                      {copied === "subject" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === "subject" ? "Copied" : "Subject"}
                    </button>
                  </div>
                  <textarea readOnly value={result.emailBody} rows={9}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-full px-3 py-2 text-xs font-mono leading-relaxed resize-y focus:outline-none" />
                  <div className="px-3 py-2 border-t bg-slate-50">
                    <button type="button" onClick={() => copy(result.emailBody, "body")}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                      {copied === "body" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === "body" ? "Copied to clipboard" : "Copy message"}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5">
                  Paste it into your own email, attach both PDFs, and send. The total and payment
                  instructions above already match the invoice.
                </p>
              </div>

              {result.draftLink && (
                <a href={result.draftLink} target="_blank" rel="noreferrer"
                   className="flex items-center justify-between border rounded-xl px-4 py-3 text-sm hover:bg-slate-50">
                  <span className="font-medium">Or open the ready-made Gmail draft</span>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500 text-xs hover:text-slate-700">
                  Open the originals
                </summary>
                <div className="space-y-2 mt-2">
                  <a href={result.agreementLink} target="_blank" rel="noreferrer"
                     className="flex items-center justify-between border rounded-xl px-4 py-2.5 text-sm hover:bg-slate-50">
                    <span>Agreement in Google Docs</span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                  <a href={result.qboUrl} target="_blank" rel="noreferrer"
                     className="flex items-center justify-between border rounded-xl px-4 py-2.5 text-sm hover:bg-slate-50">
                    <span>Invoice in QuickBooks</span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                </div>
              </details>

              <p className="text-xs text-slate-500">Nothing has gone to the client yet.</p>

              <Button onClick={onClose} className="w-full">Done</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <div className="font-medium text-slate-900">{clientCompany}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {campaignTitle} · {lines.length} line{lines.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Invoice Contact</label>
                  <input required value={form.clientContactName}
                         onChange={(e) => set("clientContactName", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>Invoice Email</label>
                  <input required type="email" value={form.clientEmail}
                         onChange={(e) => set("clientEmail", e.target.value)} className={input} />
                </div>
                <div className="col-span-2">
                  <label className={label}>Street</label>
                  <input value={form.clientStreet} onChange={(e) => set("clientStreet", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>City</label>
                  <input value={form.clientCity} onChange={(e) => set("clientCity", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>Province</label>
                  <select value={form.clientProvince} onChange={(e) => set("clientProvince", e.target.value)} className={input}>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Postal Code</label>
                  <input value={form.clientPostal} onChange={(e) => set("clientPostal", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className={input}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Service Start</label>
                  <input type="date" value={form.serviceStartDate}
                         onChange={(e) => set("serviceStartDate", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={input} />
                </div>
                <div className="col-span-2">
                  <label className={label}>Discount ($, optional)</label>
                  <input type="number" min={0} step="0.01" value={form.discount}
                         onChange={(e) => set("discount", Number(e.target.value))} className={input} />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>{formatCurrency(preview.subtotal)}</span>
                </div>
                {preview.discount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Total Saving</span><span>−{formatCurrency(preview.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>{preview.taxLabel}</span><span>{formatCurrency(preview.tax)}</span>
                </div>
                {preview.fee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Processing fee 3% (zero-rated)</span><span>{formatCurrency(preview.fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900 border-t pt-1.5">
                  <span>Total</span><span>{formatCurrency(preview.total)}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  The agreement and the invoice both show this total.
                </p>
              </div>

              {preview.error && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  {preview.error}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={loading || Boolean(preview.error)} className="w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating invoice, agreement and draft…
                  </span>
                ) : (
                  "Create agreement + invoice"
                )}
              </Button>
              <p className="text-[11px] text-slate-500 text-center">
                Creates a Gmail draft. Nothing is sent to the client.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
