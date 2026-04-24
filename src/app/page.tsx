import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Users, BarChart3, FileText, UserPlus,
  Brain, BookOpen, Receipt, DollarSign, Package, Plus, Award,
} from "lucide-react";
import { AppNav } from "@/components/ui/app-nav";

const MODULES = [
  {
    href: "/proposals/new",
    icon: Sparkles,
    iconBg: "bg-red-50",
    iconColor: "text-[#E8192C]",
    title: "Proposal Builder",
    description: "5-option ladder with live pricing, strategy hooks, and AI-powered drafts",
    cta: "New Proposal",
    ctaVariant: "primary" as const,
  },
  {
    href: "/proposals",
    icon: FileText,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Proposals",
    description: "View all proposals, track status, export IOs, and generate agreements",
    cta: "View Proposals",
    ctaVariant: "outline" as const,
  },
  {
    href: "/deals",
    icon: BarChart3,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    title: "Deals Pipeline",
    description: "Track proposals from draft to close. Win rates, margins, approval flows",
    cta: "View Pipeline",
    ctaVariant: "outline" as const,
  },
  {
    href: "/accounts",
    icon: Users,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    title: "Accounts Directory",
    description: "All accounts across every city — live followers, rates, and metrics",
    cta: "View Accounts",
    ctaVariant: "outline" as const,
  },
  {
    href: "/leads",
    icon: UserPlus,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    title: "Leads",
    description: "Inbound leads from Close CRM. One click to start a proposal from a lead",
    cta: "View Leads",
    ctaVariant: "outline" as const,
  },
  {
    href: "/nori",
    icon: Brain,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    title: "NORI",
    description: "AI sales intelligence — strategy briefs, objection handling, talk tracks",
    cta: "Open NORI",
    ctaVariant: "outline" as const,
  },
  {
    href: "/library",
    icon: BookOpen,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    title: "Proposal Library",
    description: "Closed-deal examples from PDFs. Search by market, category, or outcome",
    cta: "Browse Library",
    ctaVariant: "outline" as const,
  },
  {
    href: "/packages",
    icon: Package,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    title: "Packages",
    description: "Reusable sales packages with pages, markets, and pricing — load into any proposal",
    cta: "View Packages",
    ctaVariant: "outline" as const,
  },
  {
    href: "/invoices",
    icon: Receipt,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    title: "Invoices",
    description: "Invoice ledger synced to QuickBooks. Track outstanding, collected, and paid",
    cta: "View Invoices",
    ctaVariant: "outline" as const,
  },
  {
    href: "/pricing",
    icon: DollarSign,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "Pricing Engine",
    description: "Live rate calculator with markup controls, ladder previews, and margin tracking",
    cta: "Open Pricing",
    ctaVariant: "outline" as const,
  },
  {
    href: "/case-studies",
    icon: Award,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "Case Studies",
    description: "Upload and reference closed campaign wins — sorted by niche, outcome, and client type",
    cta: "View Case Studies",
    ctaVariant: "outline" as const,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm text-muted-foreground mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#E8192C]" />
            Northly Sales OS — Internal Platform
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Meeting → Proposal → <span className="text-[#E8192C]">Close</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Build proposals in minutes. AI-powered strategy. Live pricing. Everything in one place.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button size="lg" asChild className="bg-[#E8192C] hover:bg-[#c0141f] shadow-sm">
              <Link href="/proposals/new">
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-white">
              <Link href="/deals">View Pipeline</Link>
            </Button>
          </div>
        </div>

        {/* Module grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-3"
              >
                <div className={`h-10 w-10 rounded-xl ${mod.iconBg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${mod.iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 text-sm mb-1">{mod.title}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                </div>
                <div className={`text-xs font-medium flex items-center gap-1 ${mod.ctaVariant === "primary" ? "text-[#E8192C]" : "text-slate-600"} group-hover:translate-x-0.5 transition-transform`}>
                  {mod.cta} →
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
