import Link from "next/link";
import type { Job } from "@/lib/types";
import { CompanyLogo } from "./CompanyLogo";
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL, formatExperience, formatSalary, timeAgo } from "@/lib/format";
import { IconBriefcase, IconMapPin, IconWallet } from "./icons";

export function JobCard({ job, open }: { job: Job; open: boolean }) {
  const salary = formatSalary(job.salary);
  const exp = formatExperience(job.experience);
  return (
    <article className="card group relative p-5 transition hover:border-brand-200 hover:shadow-md">
      <div className="flex gap-4">
        <CompanyLogo name={job.company} logo={job.companyLogo} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
                <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0">
                  {job.title}
                </Link>
              </h2>
              <p className="text-sm text-slate-600">{job.company}</p>
            </div>
            {!open && <span className="chip bg-slate-200 text-slate-600">Closed</span>}
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
            {exp && (
              <li className="flex items-center gap-1.5"><IconBriefcase /> {exp}</li>
            )}
            {salary && (
              <li className="flex items-center gap-1.5"><IconWallet /> {salary}</li>
            )}
            <li className="flex items-center gap-1.5"><IconMapPin /> {job.location}</li>
          </ul>

          {job.skills.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
              {job.skills.slice(0, 6).map((s) => (
                <li key={s} className="chip">{s}</li>
              ))}
              {job.skills.length > 6 && <li className="chip">+{job.skills.length - 6}</li>}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex gap-2">
              <span className="chip bg-brand-50 text-brand-700">{WORK_MODE_LABEL[job.workMode]}</span>
              <span className="chip">{EMPLOYMENT_LABEL[job.employmentType]}</span>
            </div>
            <span>{timeAgo(job.postedAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
