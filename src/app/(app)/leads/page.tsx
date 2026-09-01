import { Suspense } from "react";
import { LeadsPageSkeleton } from "@/components/feedback/PageSkeletons";
import { LeadsPageClient } from "@/modules/leads/components/LeadsPageClient";

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsPageSkeleton />}>
      <LeadsPageClient />
    </Suspense>
  );
}
