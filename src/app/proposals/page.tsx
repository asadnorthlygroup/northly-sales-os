import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function ProposalsPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Proposals Dashboard</h1>
        <p className="text-muted-foreground mb-4">Connect Supabase to see your deal pipeline.</p>
        <Button asChild className="bg-[#E8192C] hover:bg-[#c0141f]">
          <Link href="/proposals/new">
            <Sparkles className="h-4 w-4 mr-2" />
            Build New Proposal
          </Link>
        </Button>
      </div>
    </main>
  );
}
