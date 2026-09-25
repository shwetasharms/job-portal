import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJob, isJobOpen } from "@/lib/jobs";
import { ApplyForm } from "@/components/ApplyForm";
import { CompanyLogo } from "@/components/CompanyLogo";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/jobs/[id]/apply">): Promise<Metadata> {
  const { id } = await props.params;
  const job = await getJob(id).catch(() => undefined);
  return { title: job ? `Apply – ${job.title}` : "Apply" };
}

export default async function ApplyPage(props: PageProps<"/jobs/[id]/apply">) {
  const { id } = await props.params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={`/jobs/${job.id}`} className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to job
      </Link>
      <div className="mt-3 mb-6 flex items-center gap-3">
        <CompanyLogo name={job.company} logo={job.companyLogo} size={44} />
        <div>
          <h1 className="text-xl font-bold">Apply for {job.title}</h1>
          <p className="text-sm text-slate-600">{job.company} · {job.location}</p>
        </div>
      </div>
      {isJobOpen(job) ? (
        <ApplyForm job={{ id: job.id, title: job.title, company: job.company, questions: job.questions }} />
      ) : (
        <div className="card p-8 text-center text-slate-600">This job is no longer accepting applications.</div>
      )}
    </div>
  );
}
