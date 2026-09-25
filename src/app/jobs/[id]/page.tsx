import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJob, isJobOpen } from "@/lib/jobs";
import { CompanyLogo } from "@/components/CompanyLogo";
import { IconBriefcase, IconClock, IconMapPin, IconSparkle, IconUsers, IconWallet } from "@/components/icons";
import {
  EMPLOYMENT_LABEL,
  WORK_MODE_LABEL,
  formatDate,
  formatExperience,
  formatSalary,
  timeAgo,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const job = await getJob(id).catch(() => undefined);
  if (!job) return { title: "Job not found" };
  return {
    title: `${job.title} at ${job.company}`,
    description: job.description.slice(0, 160),
  };
}

export default async function JobPage(props: PageProps<"/jobs/[id]">) {
  const { id } = await props.params;
  const job = await getJob(id);
  if (!job) notFound();

  const open = isJobOpen(job);
  const salary = formatSalary(job.salary);
  const exp = formatExperience(job.experience);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Jobs</Link> <span aria-hidden>/</span>{" "}
        <span className="text-slate-700">{job.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <header className="card p-6">
            <div className="flex gap-4">
              <CompanyLogo name={job.company} logo={job.companyLogo} size={56} />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <p className="text-slate-600">
                  {job.companyWebsite ? (
                    <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700 hover:underline">
                      {job.company}
                    </a>
                  ) : (
                    job.company
                  )}
                  {job.department && <span className="text-slate-400"> · {job.department}</span>}
                </p>
              </div>
            </div>

            <ul className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {exp && <li className="flex items-center gap-2"><IconBriefcase className="text-slate-400" /> {exp} experience</li>}
              {salary && <li className="flex items-center gap-2"><IconWallet className="text-slate-400" /> {salary}</li>}
              <li className="flex items-center gap-2"><IconMapPin className="text-slate-400" /> {job.location} · {WORK_MODE_LABEL[job.workMode]}</li>
              <li className="flex items-center gap-2"><IconClock className="text-slate-400" /> {EMPLOYMENT_LABEL[job.employmentType]}</li>
              {job.openings && <li className="flex items-center gap-2"><IconUsers className="text-slate-400" /> {job.openings} opening{job.openings > 1 ? "s" : ""}</li>}
            </ul>
            <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
              Posted {timeAgo(job.postedAt)}
              {job.applyBy && <> · Apply by {formatDate(job.applyBy)}</>}
            </p>
          </header>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Job description</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">
              {job.description.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <ListSection title="Responsibilities" items={job.responsibilities} />
            <ListSection title="Requirements" items={job.requirements} />
            <ListSection title="Nice to have" items={job.niceToHave} />
            <ListSection title="Benefits" items={job.benefits} />

            {job.skills.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-slate-900">Key skills</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <li key={s} className="chip border border-slate-200 bg-white">{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            {open ? (
              <>
                <Link href={`/jobs/${job.id}/apply`} className="btn-primary w-full py-3 text-base">
                  Apply now
                </Link>
                {job.questions.length > 0 && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Resume + {job.questions.length} short screening question{job.questions.length > 1 ? "s" : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-lg bg-slate-100 p-3 text-center text-sm font-medium text-slate-600">
                This job is no longer accepting applications.
              </p>
            )}
          </div>

          <div className="card border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-center gap-2 font-semibold text-emerald-800">
              <IconSparkle /> Is your resume a match?
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Open this job side-by-side with your resume, see which keywords are missing and tailor it before applying.
            </p>
            <Link href={`/resume-match?job=${job.id}`} className="btn-secondary mt-4 w-full border-emerald-300 text-emerald-800 hover:bg-emerald-50">
              Check resume match
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-slate-700 marker:text-slate-400">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
