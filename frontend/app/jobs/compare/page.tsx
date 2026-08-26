import type { Metadata } from "next";
import { Suspense } from "react";
import { JobCompare } from "@frontend/components/job-compare";

export const metadata: Metadata = {
  title: "Compare jobs",
};

export default function CompareJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true">
          <div className="skel h-16 rounded-xl" />
          <div className="skel h-80 rounded-xl" />
        </div>
      }
    >
      <JobCompare />
    </Suspense>
  );
}
