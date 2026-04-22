import { Suspense } from "react";
import ProposalBuilder from "@/components/proposal/ProposalBuilder";

export default function NewProposalPage() {
  return (
    <Suspense fallback={null}>
      <ProposalBuilder />
    </Suspense>
  );
}
