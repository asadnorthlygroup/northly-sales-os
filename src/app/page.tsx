import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Users, BarChart3, FileText } from "lucide-react";
import { AppNav } from "@/components/ui/app-nav";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <AppNav />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#E8192C]" />
            Proposal IQ — Internal Sales Platform
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Meeting → Proposal → <span className="text-[#E8192C]">Close</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Build 5-option proposals in minutes. Live pricing. Smart recommendations.
            Google Docs generation. Everything in one place.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button size="lg" asChild className="bg-[#E8192C] hover:bg-[#c0141f]">
              <Link href="/proposals/new">
                <Sparkles className="h-4 w-4 mr-2" />
                Build a Proposal
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/accounts">View Accounts</Link>
            </Button>
          </div>
        </div>

        {/* Module cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center mb-2">
                <Sparkles className="h-5 w-5 text-[#E8192C]" />
              </div>
              <CardTitle>Proposal Builder</CardTitle>
              <CardDescription>
                5-option ladder with live pricing, strategy hooks, and AI-powered drafts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-[#E8192C] hover:bg-[#c0141f]">
                <Link href="/proposals/new">New Proposal</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle>Accounts Directory</CardTitle>
              <CardDescription>
                All 33 accounts across 10 cities. Live followers, rates, and metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/accounts">View Accounts</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center mb-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle>Deals Pipeline</CardTitle>
              <CardDescription>
                Track proposals from draft to close. Win rates, margins, approval flows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/deals">View Pipeline</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle>Proposal Library</CardTitle>
              <CardDescription>
                23 closed-deal examples. Search by industry, deal size, or outcome.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/library">Browse Library</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
