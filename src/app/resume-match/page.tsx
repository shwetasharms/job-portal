import type { Metadata } from "next";
import { getAllJobs, getJob, isJobOpen, toSummary } from "@/lib/jobs";
import { ResumeMatcher } from "@/components/matcher/ResumeMatcher";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resume Match",
  description: "Compare your resume with a job description, find missing keywords and tailor it before you apply.",
};

export default async function ResumeMatchPage(props: PageProps<"/resume-match">) {
  const sp = await props.searchParams;
  const jobId = typeof sp.job === "string" ? sp.job : undefined;

  const all = await getAllJobs().catch(() => []);
  const job = jobId ? ((await getJob(jobId).catch(() => undefined)) ?? null) : null;
  const jobs = all.filter(isJobOpen).map(toSummary);

  return <ResumeMatcher jobs={jobs} job={job} />;
}
