"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import type { Job, JobSummary } from "@/lib/types";
import {
  analyzeResume,
  extractJobKeywords,
  splitPastedJd,
  type JobText,
  type KeywordResult,
} from "@/lib/matcher/engine";
import { resumeTextToDocx } from "@/lib/matcher/docx-export";
import { ResumeDropzone } from "../ResumeDropzone";
import { useResumeHandoff } from "../ResumeHandoff";
import { Highlighted } from "./Highlighted";
import { ScoreRing, scoreTone } from "./ScoreRing";
import { IconCheck, IconX } from "../icons";

interface Props {
  jobs: JobSummary[];
  job: Job | null;
}

type JdMode = "portal" | "paste";

export function ResumeMatcher({ jobs, job }: Props) {
  const router = useRouter();
  const handoff = useResumeHandoff();
  const [navPending, startNav] = useTransition();

  const [jdMode, setJdMode] = useState<JdMode>(job ? "portal" : jobs.length ? "portal" : "paste");
  const [pastedJd, setPastedJd] = useState("");

  const [file, setFile] = useState<File | null>(handoff.file);
  const [originalText, setOriginalText] = useState(handoff.text);
  const [resumeText, setResumeText] = useState(handoff.text);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "highlight">(handoff.text ? "highlight" : "edit");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const deferredResume = useDeferredValue(resumeText);

  /* ---------- JD → keywords ---------- */
  const jobText: JobText | null = useMemo(() => {
    if (jdMode === "portal") {
      if (!job) return null;
      return { ...job, experienceMin: job.experience?.min };
    }
    return pastedJd.trim().length > 40 ? splitPastedJd(pastedJd) : null;
  }, [jdMode, job, pastedJd]);

  const keywords = useMemo(() => (jobText ? extractJobKeywords(jobText) : []), [jobText]);

  const report = useMemo(
    () => (jobText && deferredResume.trim() ? analyzeResume(deferredResume, keywords, jobText) : null),
    [deferredResume, keywords, jobText],
  );
  const foundTerms = useMemo(() => new Set(report?.matched.map((k) => k.term) ?? []), [report]);
  const edited = originalText !== "" && resumeText !== originalText;

  /* ---------- Resume upload ---------- */
  async function onFile(f: File | null) {
    setFile(f);
    setParseError(null);
    if (!f) {
      handoff.setResume(null);
      return;
    }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.set("resume", f);
      const res = await fetch("/api/resume/parse", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setParseError(data.error ?? "Could not read this resume.");
        setOriginalText("");
        return;
      }
      setOriginalText(data.text);
      setResumeText(data.text);
      setView("highlight");
      handoff.setResume(f, data.text);
    } catch {
      setParseError("Network error while reading the resume.");
    } finally {
      setParsing(false);
    }
  }

  /* ---------- Actions ---------- */
  function baseName() {
    return (file?.name.replace(/\.(pdf|docx)$/i, "") || "resume").replace(/[^\w-]+/g, "_");
  }

  async function buildTailoredFile(): Promise<File> {
    const blob = await resumeTextToDocx(resumeText);
    const suffix = job && jdMode === "portal" ? `_${job.id}` : "_tailored";
    return new File([blob], `${baseName()}${suffix}.docx`, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadDocx() {
    setBusyAction("docx");
    try {
      const f = await buildTailoredFile();
      download(f, f.name);
    } finally {
      setBusyAction(null);
    }
  }

  async function applyWith(kind: "original" | "tailored") {
    if (!job) return;
    setBusyAction(kind);
    try {
      if (kind === "tailored" || !file) {
        const f = await buildTailoredFile();
        handoff.setResume(f, resumeText);
      } else {
        handoff.setResume(file, originalText);
      }
      startNav(() => router.push(`/jobs/${job.id}/apply`));
    } finally {
      setBusyAction(null);
    }
  }

  function selectJob(id: string) {
    startNav(() => router.replace(id ? `/resume-match?job=${encodeURIComponent(id)}` : "/resume-match", { scroll: false }));
  }

  const canApply = jdMode === "portal" && job && job.status !== "closed" && resumeText.trim().length > 0;

  /* ---------- Render ---------- */
  return (
    <div className="grid lg:h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* ================= LEFT: Job description ================= */}
      <section className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-r lg:border-b-0" aria-label="Job description">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold">Job description</h1>
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm" role="tablist">
              {(["portal", "paste"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={jdMode === m}
                  onClick={() => setJdMode(m)}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${jdMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {m === "portal" ? "Portal job" : "Paste JD"}
                </button>
              ))}
            </div>
          </div>
          {jdMode === "portal" && (
            <select
              className="input mt-3"
              value={job?.id ?? ""}
              onChange={(e) => selectJob(e.target.value)}
              aria-label="Select a job"
              disabled={navPending}
            >
              <option value="">Select a job to compare…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {jdMode === "paste" ? (
            <div className="flex h-full flex-col gap-3">
              <textarea
                className="input min-h-[240px] flex-1 font-mono text-[13px] leading-relaxed"
                placeholder={"Paste the full job description here.\n\nTip: keep headings like \"Requirements\" and \"Nice to have\" – they tell the matcher which skills matter most."}
                value={pastedJd}
                onChange={(e) => setPastedJd(e.target.value)}
              />
              {pastedJd && keywords.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Keywords detected</p>
                  <Highlighted text={pastedJd} keywords={keywords} foundTerms={foundTerms} />
                </div>
              )}
            </div>
          ) : job ? (
            <JobDescription job={job} keywords={keywords} foundTerms={foundTerms} hasResume={Boolean(report)} />
          ) : (
            <EmptyState
              title="Pick a job"
              body="Choose one of the open jobs above, or switch to “Paste JD” to check your resume against any job description from another site."
            />
          )}
        </div>
      </section>

      {/* ================= RIGHT: Resume + analysis ================= */}
      <section className="flex min-h-0 flex-col bg-slate-50" aria-label="Your resume">
        <div className="border-b border-slate-200 bg-white p-4">
          <ResumeDropzone file={file} onFile={onFile} error={parseError} busy={parsing} compact />
          {!file && (
            <p className="mt-2 text-center text-xs text-slate-500">…or paste your resume text in the editor below.</p>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* ---- Score ---- */}
          {report ? (
            <ScorePanel report={report} />
          ) : (
            <div className="card p-5 text-sm text-slate-600">
              {!jobText
                ? "Select or paste a job description to start."
                : "Upload or paste your resume to see how well it matches."}
            </div>
          )}

          {/* ---- Resume editor ---- */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Your resume</h2>
                {edited && <span className="chip bg-brand-50 text-brand-700">Edited</span>}
              </div>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs" role="tablist">
                  {(["edit", "highlight"] as const).map((v) => (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={`rounded-md px-2.5 py-1 font-medium ${view === v ? "bg-white shadow-sm" : "text-slate-600"}`}
                    >
                      {v === "edit" ? "Edit" : "Highlights"}
                    </button>
                  ))}
                </div>
                {edited && (
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setResumeText(originalText)}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            {view === "edit" ? (
              <textarea
                className="block min-h-[360px] w-full resize-y border-0 p-4 font-mono text-[13px] leading-relaxed text-slate-800 focus:ring-0 focus:outline-none"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Your resume text appears here after upload. Edit it to tailor for this job – the score updates as you type."
                aria-label="Resume text"
                spellCheck
              />
            ) : (
              <div className="max-h-[520px] min-h-[200px] overflow-y-auto p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800">
                {resumeText ? (
                  <Highlighted text={resumeText} keywords={keywords} foundTerms={foundTerms} onlyFound />
                ) : (
                  <span className="text-slate-400">Nothing to show yet.</span>
                )}
              </div>
            )}
          </div>

          {/* ---- Actions ---- */}
          {resumeText.trim() && (
            <div className="card space-y-3 p-4">
              {canApply ? (
                <>
                  {edited || !file ? (
                    <>
                      <button className="btn-primary w-full" onClick={() => applyWith("tailored")} disabled={Boolean(busyAction) || navPending}>
                        {busyAction === "tailored" || navPending ? "Preparing…" : `Apply to ${job!.company} with tailored resume`}
                      </button>
                      {file && (
                        <button className="btn-secondary w-full" onClick={() => applyWith("original")} disabled={Boolean(busyAction) || navPending}>
                          Apply with original file ({file.name})
                        </button>
                      )}
                      <p className="text-xs text-slate-500">
                        The tailored version is sent as a clean, ATS-friendly DOCX generated from the text above.
                        For your own design, update your original file and upload it again.
                      </p>
                    </>
                  ) : (
                    <button className="btn-primary w-full" onClick={() => applyWith("original")} disabled={Boolean(busyAction) || navPending}>
                      {navPending ? "Opening…" : `Apply to ${job!.company} with this resume`}
                    </button>
                  )}
                </>
              ) : jdMode === "paste" ? (
                <p className="text-xs text-slate-500">
                  Comparing against a pasted JD. Download your tailored resume and apply on the employer&apos;s site.
                </p>
              ) : null}
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-xs" onClick={downloadDocx} disabled={Boolean(busyAction)}>
                  {busyAction === "docx" ? "Building…" : "Download .docx"}
                </button>
                <button
                  className="btn-secondary flex-1 text-xs"
                  onClick={() => download(new Blob([resumeText], { type: "text/plain;charset=utf-8" }), `${baseName()}_tailored.txt`)}
                >
                  Download .txt
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ================================================================== */

function JobDescription({
  job,
  keywords,
  foundTerms,
  hasResume,
}: {
  job: Job;
  keywords: ReturnType<typeof extractJobKeywords>;
  foundTerms: Set<string>;
  hasResume: boolean;
}) {
  const H = (t: string) => <Highlighted text={t} keywords={keywords} foundTerms={foundTerms} />;
  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <div className="mt-5">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 marker:text-slate-400">
          {items.map((it, i) => (
            <li key={i}>{H(it)}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <article>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{job.title}</h2>
          <p className="text-sm text-slate-600">
            {job.company} · {job.location}
          </p>
        </div>
        <Link href={`/jobs/${job.id}`} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
          View posting
        </Link>
      </div>
      {hasResume && (
        <p className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span><mark className="kw-hit">green</mark> in your resume</span>
          <span><mark className="kw-miss">amber</mark> missing</span>
        </p>
      )}
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
        {job.description.split(/\n+/).map((p, i) => (
          <p key={i}>{H(p)}</p>
        ))}
      </div>
      {list("Responsibilities", job.responsibilities)}
      {list("Requirements", job.requirements)}
      {list("Nice to have", job.niceToHave)}
      {job.skills.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold text-slate-900">Key skills</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {job.skills.map((s) => {
              const kw = keywords.find((k) => k.term.toLowerCase() === s.toLowerCase()) ?? keywords.find((k) => k.patterns.some((p) => new RegExp(p.source, p.flags.replace("g", "")).test(s)));
              const found = kw ? foundTerms.has(kw.term) : false;
              return (
                <li key={s} className={`chip ${hasResume ? (found ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800") : ""}`}>
                  {hasResume && (found ? <IconCheck width={12} height={12} /> : <IconX width={12} height={12} />)}
                  {s}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

function ScorePanel({ report }: { report: ReturnType<typeof analyzeResume> }) {
  const tone = scoreTone(report.score);
  const byImportance = (list: KeywordResult[], imp: KeywordResult["importance"]) => list.filter((k) => k.importance === imp);
  const missingReq = byImportance(report.missing, "required");
  const missingPref = byImportance(report.missing, "preferred");
  const missingOther = byImportance(report.missing, "mentioned");

  return (
    <div className="card p-5">
      <div className="flex items-center gap-5">
        <ScoreRing score={report.score} />
        <div className="min-w-0">
          <p className={`text-lg font-bold ${tone.text}`}>{tone.label}</p>
          <p className="text-sm text-slate-600">
            {report.matched.length} of {report.keywords.length} keywords found
          </p>
          <p className="text-sm text-slate-600">
            Must-have skills: <strong>{report.requiredCoverage.matched}</strong> / {report.requiredCoverage.total}
          </p>
        </div>
      </div>

      {report.missing.length > 0 && (
        <div className="mt-5 space-y-3">
          <KeywordGroup title="Missing must-have keywords" items={missingReq} tone="miss-strong" />
          <KeywordGroup title="Missing preferred keywords" items={missingPref} tone="miss" />
          <KeywordGroup title="Also mentioned in the JD" items={missingOther} tone="miss-soft" />
          <p className="rounded-lg bg-brand-50 p-2.5 text-xs text-brand-900">
            Add a missing keyword only if you really have that skill – mention it in your skills list and in a project or
            role bullet where you used it. Recruiters check.
          </p>
        </div>
      )}

      {report.matched.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800 select-none">
            Matched keywords ({report.matched.length})
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {report.matched.map((k) => (
              <li key={k.term} className="chip bg-emerald-100 text-emerald-800" title={`${k.resumeCount}× in resume, ${k.jdCount}× in JD`}>
                <IconCheck width={12} height={12} /> {k.term}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">Resume checks</p>
        <ul className="space-y-2">
          {report.checks.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${c.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {c.ok ? <IconCheck width={12} height={12} /> : <IconX width={12} height={12} />}
              </span>
              <span>
                <span className="font-medium text-slate-800">{c.label}</span>
                <span className="block text-xs text-slate-500">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KeywordGroup({ title, items, tone }: { title: string; items: KeywordResult[]; tone: "miss-strong" | "miss" | "miss-soft" }) {
  if (!items.length) return null;
  const cls =
    tone === "miss-strong"
      ? "bg-red-50 text-red-700 border border-red-200"
      : tone === "miss"
        ? "bg-amber-50 text-amber-800 border border-amber-200"
        : "bg-slate-100 text-slate-600";
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((k) => (
          <li key={k.term} className={`chip ${cls}`} title={`Appears ${k.jdCount}× in the job description`}>
            {k.term}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      </div>
    </div>
  );
}
