"use client";

import { useState, useEffect } from "react";
import { X, Receipt, ExternalLink, AlertCircle, Link2 } from "lucide-react";
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

const OPTION_LABELS: Record<number, string> = {
  2: "Option 2 — Pilot",
  3: "Option 3 — Multi-Page Awareness Bundle",
  4: "Option 4 — Awareness + Conversion Bundle",
  5: "Option 5 — Full Campaign",
};

interface InvoiceModalProps {
  dealId?: string;
  clientName: string;
  optionPrices: Record<string, number>;
  selectedAccountHandles: string[];
  onClose: () => void;
  isQuick?: boolean;
}

export default function InvoiceModal({
  dealId,
  clientName,
  optionPrices,
  selectedAccountHandles,
  onClose,
  isQuick = false,
}: InvoiceModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const availableOptions = [2, 3, 4, 5].filter(
    (n) => (optionPrices[`option${n}Price`] ?? 0) > 0
  );
  const defaultOption = availableOptions[0] ?? 2;

  const [form, setForm] = useState(() => {
    const cache = loadBillingCache();
    return {
      clientEmail: cache.email,
      clientStreet: cache.street,
      clientCity: cache.city,
      clientProvince: cache.province || "ON",
      clientPostal: cache.postal,
      optionNumber: defaultOption,
      paymentMethod: "e_transfer" as PaymentMethod,
      serviceDescription: "",
      invoiceDate: today,
      dueDate: today,
    };
  });

  // Persist billing fields so the IO modal (or next session) can pre-fill them too.
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
  const [result, setResult] = useState<{ invoiceNumber: string; total: number; qbUrl: string } | null>(null);
  const [qbConnected, setQbConnected] = useState<boolean | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [qbStatus, setQbStatus] = useState<{ connected: boolean; environment?: string; realmId?: string; detail?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/quickbooks/status")
      .then((r) => r.json())
      .then((d) => {
        setQbConnected(d.connected);
        setQbStatus(d);
        if (!d.connected) setNeedsReconnect(true);
      })
      .catch(() => setQbConnected(false));
  }, []);

  function set(k: string, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const subtotal = optionPrices[`option${form.optionNumber}Price`] ?? 0;

  // Previewed from the same engine the invoice is built with, so what the AE
  // sees here and what QuickBooks bills can never drift apart.
  const preview = (() => {
    try {
      const totals = computeInvoiceTotals({
        province: parseProvince(form.clientProvince),
        paymentMethod: form.paymentMethod,
        discountCents: 0,
        lines: [
          { quantity: 1, unitPriceCents: dollarsToCents(subtotal), taxTreatment: "standard" },
        ],
      });
      return {
        taxLabel: totals.taxLabel,
        taxAmount: centsToDollars(totals.taxCents),
        processingFee: centsToDollars(totals.feeCents),
        total: centsToDollars(totals.totalCents),
        error: "",
      };
    } catch (err) {
      return {
        taxLabel: "Tax",
        taxAmount: 0,
        processingFee: 0,
        total: subtotal,
        error: err instanceof Error ? err.message : "Cannot price this province.",
      };
    }
  })();

  const { taxAmount, processingFee, total } = preview;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/invoices/quickbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          clientName,
          clientEmail: form.clientEmail,
          clientStreet: form.clientStreet,
          clientCity: form.clientCity,
          clientProvince: form.clientProvince,
          clientPostal: form.clientPostal,
          optionNumber: form.optionNumber,
          subtotal,
          paymentMethod: form.paymentMethod,
          serviceDescription: form.serviceDescription,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate,
          selectedAccountHandles,
        }),
      });

      const text = await res.text();
      let data: { error?: string; code?: string; invoiceNumber?: string; total?: number; qbUrl?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* response wasn't JSON */ }
      if (!res.ok) {
        if (data.code === "qb_auth_failed") {
          setNeedsReconnect(true);
          throw new Error(data.error ?? "QuickBooks authorization expired.");
        }
        throw new Error(data.error ?? text ?? `Server error (HTTP ${res.status})`);
      }
      setResult({
        invoiceNumber: data.invoiceNumber ?? "",
        total: data.total ?? 0,
        qbUrl: data.qbUrl ?? "",
      });
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
            <Receipt className="h-5 w-5 text-[#E8192C]" />
            <h2 className="font-semibold text-lg">Create QuickBooks Invoice</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* QB connection check */}
          {qbConnected === false && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-amber-800 text-sm">QuickBooks Not Connected</div>
                <div className="text-amber-700 text-xs mt-1">You need to connect QuickBooks Online before creating invoices.</div>
                {qbStatus?.environment && (
                  <div className="text-amber-600 text-[11px] mt-1.5 font-mono">
                    env: {qbStatus.environment}
                    {qbStatus.realmId ? ` · realm: …${qbStatus.realmId.slice(-4)}` : ""}
                    {qbStatus.detail ? ` · ${qbStatus.detail.slice(0, 80)}` : ""}
                  </div>
                )}
                <a
                  href={`/api/auth/quickbooks?return_to=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/quick-io")}`}
                  className="inline-block mt-2 text-xs font-medium text-amber-800 underline"
                >
                  Connect QuickBooks →
                </a>
              </div>
            </div>
          )}

          {result ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Receipt className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-lg text-slate-900">Invoice Created</div>
                <div className="text-slate-500 text-sm mt-1">Invoice #{result.invoiceNumber} for {formatCurrency(result.total)}</div>
              </div>
              <a
                href={result.qbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2CA01C] text-white rounded-xl text-sm font-medium hover:bg-[#238a16] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View in QuickBooks
              </a>
              <div>
                <button onClick={onClose} className="text-sm text-slate-500 underline">Close</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-sm font-medium text-slate-700">Client: <span className="text-slate-900">{clientName}</span></div>

              {/* Option — hidden in Quick mode (single Marketing Package price) */}
              {isQuick ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700">Marketing Package</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(optionPrices[`option${form.optionNumber}Price`] ?? 0)}</span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pricing Option</label>
                  <select
                    value={form.optionNumber}
                    onChange={(e) => set("optionNumber", Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  >
                    {availableOptions.map((n) => (
                      <option key={n} value={n}>
                        {OPTION_LABELS[n]} — {formatCurrency(optionPrices[`option${n}Price`] ?? 0)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Service description */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Service Description <span className="text-slate-400">(optional override)</span></label>
                <textarea
                  value={form.serviceDescription}
                  onChange={(e) => set("serviceDescription", e.target.value)}
                  rows={3}
                  placeholder={isQuick
                    ? "Northly Group Marketing Package"
                    : `Northly Group Marketing Package — ${OPTION_LABELS[form.optionNumber]}`}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30 resize-none"
                />
              </div>

              {/* Client info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => set("clientEmail", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Street Address</label>
                  <input
                    value={form.clientStreet}
                    onChange={(e) => set("clientStreet", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                  <input
                    value={form.clientCity}
                    onChange={(e) => set("clientCity", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Province</label>
                  <select
                    value={form.clientProvince}
                    onChange={(e) => set("clientProvince", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  >
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code</label>
                  <input
                    value={form.clientPostal}
                    onChange={(e) => set("clientPostal", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => set("invoiceDate", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set("dueDate", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                  />
                </div>
              </div>

              {/* Payment method — decides whether the 3% processing fee applies */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8192C]/30"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Totals preview */}
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{preview.taxLabel}</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                {processingFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Processing fee 3% (zero-rated)</span>
                    <span>{formatCurrency(processingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900 border-t pt-1.5">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {preview.error && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  {preview.error}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 space-y-2">
                  <div>{error}</div>
                  {needsReconnect && (
                    <a
                      href={`/api/auth/quickbooks?return_to=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/quick-io")}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      Reconnect QuickBooks
                    </a>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || qbConnected === false}
                  className="flex-1 bg-[#2CA01C] hover:bg-[#238a16]"
                >
                  {loading ? "Creating…" : "Create Invoice"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
