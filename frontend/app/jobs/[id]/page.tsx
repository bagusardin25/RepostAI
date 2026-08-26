import type { Metadata } from "next";
import { JobWorkspace } from "@frontend/components/job-workspace";

export const metadata: Metadata = {
  title: "Job bay",
};

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobWorkspace jobId={id} />;
}
