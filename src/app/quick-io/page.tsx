import { Suspense } from "react";
import ProposalBuilder from "@/components/proposal/ProposalBuilder";

export default function QuickIOPage() {
  return (
    <Suspense fallback={null}>
      <ProposalBuilder mode="quick" />
    </Suspense>
  );
}
