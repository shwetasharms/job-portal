import Link from "next/link";
import { filterJobs, getAllJobs, isJobOpen, type JobFilters } from "@/lib/jobs";
import { JobCard } from "@/components/JobCard";
import { IconMapPin, IconSearch } from "@/components/icons";
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL } from "@/lib/format";
import { employmentTypes, workModes } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function JobsPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const filters: JobFilters = {
    q: first(sp.q)?.slice(0, 100),
    location: first(sp.location)?.slice(0, 60),
    workMode: first(sp.workMode),
    type: first(sp.type),
    exp: first(sp.exp),
  };
  const page = Math.max(1, Number(first(sp.page)) || 1);

  let jobs;
  try {
    jobs = await getAllJobs();
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Jobs are temporarily unavailable</h1>
        <p className="mt-2 text-slate-600">We couldn&apos;t load the job list. Please try again in a few minutes.</p>
      </div>
    );
  }

  const hideClosed = first(sp.closed) !== "1";
  const filtered = filterJobs(jobs, filters).filter((j) => !hideClosed || isJobOpen(j));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Object.values(filters).some(Boolean);

  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = first(v);
      if (val && k !== "page") u.set(k, val);
    }
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Find your next role
          </h1>
          <p className="mt-1 text-slate-600">
            {jobs.filter(isJobOpen).length} open positions. Check your resume against any job before you apply.
          </p>

          <form action="/" className="card mt-6 flex flex-col gap-2 p-2 sm:flex-row" role="search">
            <label className="relative flex-1">
              <span className="sr-only">Keyword</span>
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Skills, designation, company"
                className="input border-0 pl-9 focus:ring-0"
              />
            </label>
            <label className="relative flex-1 sm:border-l sm:border-slate-200">
              <span className="sr-only">Location</span>
              <IconMapPin className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input
                name="location"
                defaultValue={filters.location}
                placeholder="Location"
                className="input border-0 pl-9 focus:ring-0"
              />
            </label>
            {filters.workMode && <input type="hidden" name="workMode" value={filters.workMode} />}
            {filters.type && <input type="hidden" name="type" value={filters.type} />}
            {filters.exp && <input type="hidden" name="exp" value={filters.exp} />}
            <button className="btn-primary px-6">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <input type="checkbox" id="toggle-filters" className="peer sr-only" />
          <label htmlFor="toggle-filters" className="btn-secondary w-full cursor-pointer lg:hidden">
            {hasFilters ? "Filters (active)" : "Show filters"}
          </label>
          <form action="/" className="card sticky top-20 mt-3 hidden space-y-5 p-5 peer-checked:block lg:mt-0 lg:block">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              {hasFilters && (
                <Link href="/" className="text-xs font-medium text-brand-700 hover:underline">
                  Clear all
                </Link>
              )}
            </div>
            {filters.q && <input type="hidden" name="q" value={filters.q} />}
            {filters.location && <input type="hidden" name="location" value={filters.location} />}

            <fieldset>
              <legend className="label">Work mode</legend>
              <div className="space-y-1.5">
                <Radio name="workMode" value="" label="Any" current={filters.workMode} />
                {workModes.map((m) => (
                  <Radio key={m} name="workMode" value={m} label={WORK_MODE_LABEL[m]} current={filters.workMode} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label">Job type</legend>
              <div className="space-y-1.5">
                <Radio name="type" value="" label="Any" current={filters.type} />
                {employmentTypes.map((t) => (
                  <Radio key={t} name="type" value={t} label={EMPLOYMENT_LABEL[t]} current={filters.type} />
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="label">Your experience (years)</span>
              <select name="exp" defaultValue={filters.exp ?? ""} className="input">
                <option value="">Any</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? "Fresher" : i === 15 ? "15+" : `${i} ${i === 1 ? "year" : "years"}`}
                  </option>
                ))}
              </select>
            </label>

            <button className="btn-primary w-full">Apply filters</button>
          </form>
        </aside>

        <section aria-label="Job results">
          <p className="mb-4 text-sm text-slate-600">
            <strong className="text-slate-900">{filtered.length}</strong> {filtered.length === 1 ? "job" : "jobs"} found
          </p>
          {visible.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-medium">No jobs match your search.</p>
              <Link href="/" className="btn-secondary mt-4">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((j) => (
                <JobCard key={j.id} job={j} open={isJobOpen(j)} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && (
                <Link className="btn-secondary" href={pageHref(page - 1)}>
                  Previous
                </Link>
              )}
              <span className="text-sm text-slate-600">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link className="btn-secondary" href={pageHref(page + 1)}>
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}

function Radio({ name, value, label, current }: { name: string; value: string; label: string; current?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={(current ?? "") === value}
        className="h-4 w-4 accent-brand-600"
      />
      {label}
    </label>
  );
}
