"use client";

import { useState, useEffect } from "react";
import { X, Receipt, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pricing";

const PROVINCE_TAX: Record<string, { name: string; rate: number }> = {
  ON: { name: "HST (ON)", rate: 0.13 },
  BC: { name: "GST + PST (BC)", rate: 0.12 },
  AB: { name: "GST (AB)", rate: 0.05 },
  QC: { name: "GST + QST (QC)", rate: 0.14975 },
  MB: { name: "GST + PST (MB)", rate: 0.12 },
  SK: { name: "GST + PST (SK)", rate: 0.11 },
  NS: { name: "HST (NS)", rate: 0.15 },
  NB: { name: "HST (NB)", rate: 0.15 },
  PE: { name: "HST (PE)", rate: 0.15 },
  NL: { name: "HST (NL)", rate: 0.15 },
  NT: { name: "GST (NT)", rate: 0.05 },
  NU: { name: "GST (NU)", rate: 0.05 },
  YT: { name: "GST (YT)", rate: 0.05 },
};

const PROVINCES = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
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
}

export default function InvoiceModal({
  dealId,
  clientName,
  optionPrices,
  selectedAccountHandles,
  onClose,
}: InvoiceModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const availableOptions = [2, 3, 4, 5].filter(
    (n) => (optionPrices[`option${n}Price`] ?? 0) > 0
  );
  const defaultOption = availableOptions[0] ?? 2;

  const [form, setForm] = useState({
    clientEmail: "",
    clientStreet: "",
    clientCity: "",
    clientProvince: "ON",
    clientPostal: "",
    optionNumber: defaultOption,
    serviceDescription: "",
    invoiceDate: today,
    dueDate: today,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ invoiceNumber: string; total: number; qbUrl: string } | null>(null);
  const [qbConnected, setQbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/quickbooks/status")
      .then((r) => r.json())
      .then((d) => setQbConnected(d.connected))
      .catch(() => setQbConnected(false));
  }, []);

  function set(k: string, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const subtotal = optionPrices[`option${form.optionNumber}Price`] ?? 0;
  const tax = PROVINCE_TAX[form.clientProvince] ?? PROVINCE_TAX.ON;
  const taxAmount = Math.round(subtotal * tax.rate * 100) / 100;
  const total = subtotal + taxAmount;

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
          serviceDescription: form.serviceDescription,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate,
          selectedAccountHandles,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create invoice");
      setResult(data);
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
              <div>
                <div className="font-medium text-amber-800 text-sm">QuickBooks Not Connected</div>
                <div className="text-amber-700 text-xs mt-1">You need to connect QuickBooks Online before creating invoices.</div>
                <a href="/api/auth/quickbooks" className="inline-block mt-2 text-xs font-medium text-amber-800 underline">
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

              {/* Option */}
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

              {/* Service description */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Service Description <span className="text-slate-400">(optional override)</span></label>
                <textarea
                  value={form.serviceDescription}
                  onChange={(e) => set("serviceDescription", e.target.value)}
                  rows={3}
                  placeholder={`Northly Group Marketing Package — ${OPTION_LABELS[form.optionNumber]}`}
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

              {/* Tax preview */}
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{tax.name} ({(tax.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 border-t pt-1.5">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
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
