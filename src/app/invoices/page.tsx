"use client";

import { useEffect, useState, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, ExternalLink, CheckCircle, Clock, Link2, Loader2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

type Invoice = {
  id: string;
  client_name: string;
  option_number: number | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  province: string;
  invoice_date: string;
  due_date: string;
  service_description: string | null;
  selected_accounts: string[];
  qb_invoice_number: string | null;
  qb_url: string | null;
  status: string;
  created_at: string;
  deals: { title: string; status: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent:  { label: "Sent",  color: "bg-blue-100 text-blue-700",   icon: <Clock className="h-3 w-3" /> },
  paid:  { label: "Paid",  color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600", icon: <Clock className="h-3 w-3" /> },
  void:  { label: "Void",  color: "bg-red-100 text-red-600",     icon: <XCircle className="h-3 w-3" /> },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/invoices");
    const d = await res.json() as { data: Invoice[] };
    setInvoices(d.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  async function markStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch("/api/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setInvoices((inv) => inv.map((i) => i.id === id ? { ...i, status } : i));
    setUpdatingId(null);
  }

  const totalSent = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const countPaid = invoices.filter((i) => i.status === "paid").length;
  const countSent = invoices.filter((i) => i.status === "sent").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Invoices" />

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Invoices", value: invoices.length, sub: "all time", display: String(invoices.length) },
            { label: "Outstanding", value: countSent, sub: "awaiting payment", display: `${countSent} · ${formatCurrency(totalSent)}` },
            { label: "Collected", value: countPaid, sub: "marked paid", display: `${countPaid} · ${formatCurrency(totalPaid)}` },
            { label: "QB Connected", value: 0, sub: "via OAuth", display: "—" },
          ].map(({ label, sub, display }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold">{display}</div>
                <div className="font-medium text-sm mt-1">{label}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QB connect */}
        <div className="flex justify-end">
          <a
            href="/api/auth/quickbooks"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect / Reconnect QuickBooks
          </a>
        </div>

        {/* Table */}
        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading invoices…
            </CardContent>
          </Card>
        ) : invoices.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <Receipt className="h-8 w-8 text-[#E8192C] mx-auto mb-3" />
              <div className="font-medium">No invoices yet</div>
              <div className="text-sm text-muted-foreground mt-1">
                Create invoices from won deals in the Pipeline.
              </div>
              <Button asChild className="mt-4 bg-[#E8192C] hover:bg-[#c0141f]">
                <a href="/deals">Go to Pipeline</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Invoice #", "Client", "Deal", "Subtotal", "Tax", "Total", "Due", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.sent;
                    const isUpdating = updatingId === inv.id;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {inv.qb_invoice_number ? (
                            <span className="flex items-center gap-1">
                              #{inv.qb_invoice_number}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{inv.client_name}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                          {inv.deals?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(inv.subtotal)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatCurrency(inv.tax_amount)}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(inv.due_date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {inv.qb_url && (
                              <a
                                href={inv.qb_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                                title="Open in QuickBooks"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {inv.status === "sent" && (
                              <button
                                onClick={() => markStatus(inv.id, "paid")}
                                disabled={isUpdating}
                                className="text-xs text-green-600 hover:underline disabled:opacity-40 whitespace-nowrap"
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                              </button>
                            )}
                            {inv.status === "paid" && (
                              <button
                                onClick={() => markStatus(inv.id, "sent")}
                                disabled={isUpdating}
                                className="text-xs text-slate-400 hover:text-slate-600 hover:underline disabled:opacity-40"
                              >
                                Undo
                              </button>
                            )}
                            {inv.status !== "void" && (
                              <button
                                onClick={() => markStatus(inv.id, "void")}
                                disabled={isUpdating}
                                className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-40"
                              >
                                Void
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
