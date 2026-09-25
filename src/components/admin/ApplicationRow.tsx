"use client";

import { useState } from "react";
import type { Application, ScreeningQuestion } from "@/lib/types";
import { formatAnswer } from "@/lib/questions";
import { formatBytes, timeAgo } from "@/lib/format";
import { scoreTone } from "../matcher/ScoreRing";

const STATUS_STYLE: Record<Application["status"], string> = {
  new: "bg-brand-50 text-brand-700",
  shortlisted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-200 text-slate-600",
};

export function ApplicationRow({ app, questions }: { app: Application; questions: ScreeningQuestion[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: Application["status"]) {
    const prev = status;
    setStatus(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setStatus(prev);
      setError("Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  const qById = new Map(questions.map((q) => [q.id, q]));
  const tone = app.match ? scoreTone(app.match.score) : null;

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <p className="font-semibold text-slate-900">{app.candidate.name}</p>
          <p className="truncate text-sm text-slate-600">
            {app.jobTitle} · {app.company}
          </p>
          <p className="text-xs text-slate-500">
            {app.candidate.email} · {app.candidate.phone} · {timeAgo(app.createdAt)}
          </p>
        </button>
        {app.match && tone && (
          <div className="text-center" title="Resume keyword match at time of applying">
            <p className={`text-lg font-bold ${tone.text}`}>{app.match.score}%</p>
            <p className="text-[10px] tracking-wide text-slate-500 uppercase">match</p>
          </div>
        )}
        <span className={`chip capitalize ${STATUS_STYLE[status]}`}>{status}</span>
        <select
          aria-label="Change status"
          className="input w-36 py-1.5"
          value={status}
          disabled={saving}
          onChange={(e) => changeStatus(e.target.value as Application["status"])}
        >
          <option value="new">New</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
        </select>
        <a href={`/api/admin/applications/${app.id}/resume`} className="btn-secondary py-1.5">
          Resume
        </a>
      </div>
      {error && <p className="field-error px-4 pb-2">{error}</p>}
      {open && (
        <div className="grid gap-6 border-t border-slate-100 p-4 text-sm md:grid-cols-2">
          <div>
            <p className="mb-2 font-semibold">Screening answers</p>
            {app.answers.length === 0 ? (
              <p className="text-slate-500">No questions for this job.</p>
            ) : (
              <dl className="space-y-2">
                {app.answers.map((a) => {
                  const q = qById.get(a.questionId);
                  return (
                    <div key={a.questionId}>
                      <dt className="text-xs text-slate-500">{a.label}</dt>
                      <dd className="whitespace-pre-wrap text-slate-900">{q ? formatAnswer(q, a.value) : a.value || "—"}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <p className="mb-1 font-semibold">Candidate</p>
              {app.candidate.currentLocation && <p>Location: {app.candidate.currentLocation}</p>}
              {app.candidate.linkedin && (
                <a href={app.candidate.linkedin} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">
                  LinkedIn profile
                </a>
              )}
              <p className="text-xs text-slate-500">
                {app.resume.originalName} · {formatBytes(app.resume.size)}
              </p>
            </div>
            {app.match && (
              <div>
                <p className="mb-1 font-semibold">Missing keywords</p>
                {app.match.missing.length ? (
                  <ul className="flex flex-wrap gap-1">
                    {app.match.missing.map((m) => (
                      <li key={m} className="chip bg-amber-50 text-amber-800">{m}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">None</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
