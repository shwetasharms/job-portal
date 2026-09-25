import type { Metadata } from "next";
import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { listApplications } from "@/lib/applications";
import { getAllJobs } from "@/lib/jobs";
import { AdminLogin, LogoutButton } from "@/components/admin/AdminLogin";
import { ApplicationRow } from "@/components/admin/ApplicationRow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recruiter", robots: { index: false } };

export default async function AdminPage(props: PageProps<"/admin">) {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <h1 className="text-xl font-bold">Recruiter sign in</h1>
        <p className="mt-1 text-sm text-slate-600">View and manage applications.</p>
        {adminConfigured() ? (
          <AdminLogin />
        ) : (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Set <code className="font-mono">ADMIN_PASSWORD</code> (8+ characters) in <code className="font-mono">.env.local</code> and restart the server to enable recruiter access.
          </p>
        )}
      </div>
    );
  }

  const sp = await props.searchParams;
  const jobFilter = typeof sp.job === "string" && sp.job ? sp.job : undefined;
  const statusFilter = typeof sp.status === "string" && sp.status ? sp.status : undefined;

  const [apps, jobs] = await Promise.all([listApplications(), getAllJobs().catch(() => [])]);
  const counts = new Map<string, number>();
  for (const a of apps) counts.set(a.jobId, (counts.get(a.jobId) ?? 0) + 1);

  const filtered = apps.filter((a) => (!jobFilter || a.jobId === jobFilter) && (!statusFilter || a.status === statusFilter));
  const questionsByJob = new Map(jobs.map((j) => [j.id, j.questions]));

  // Jobs that have applications but were removed from the feed still show up
  const jobOptions = [
    ...jobs.map((j) => ({ id: j.id, label: `${j.title} — ${j.company}` })),
    ...[...counts.keys()].filter((id) => !jobs.some((j) => j.id === id)).map((id) => ({ id, label: `${id} (removed)` })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-slate-600">{apps.length} total · {apps.filter((a) => a.status === "new").length} new</p>
        </div>
        <LogoutButton />
      </div>

      <form action="/admin" className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-60 flex-1">
          <span className="label">Job</span>
          <select name="job" defaultValue={jobFilter ?? ""} className="input">
            <option value="">All jobs</option>
            {jobOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label} ({counts.get(j.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="w-44">
          <span className="label">Status</span>
          <select name="status" defaultValue={statusFilter ?? ""} className="input">
            <option value="">Any</option>
            <option value="new">New</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <button className="btn-primary">Filter</button>
        {(jobFilter || statusFilter) && <Link href="/admin" className="btn-ghost">Reset</Link>}
      </form>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-slate-600">No applications yet.</div>
        ) : (
          filtered.map((a) => <ApplicationRow key={a.id} app={a} questions={questionsByJob.get(a.jobId) ?? []} />)
        )}
      </div>
    </div>
  );
}
