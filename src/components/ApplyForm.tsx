"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ScreeningQuestion } from "@/lib/types";
import { ResumeDropzone, checkResumeFile } from "./ResumeDropzone";
import { useResumeHandoff } from "./ResumeHandoff";
import { validateAnswers, validateCandidate, visibleQuestions } from "@/lib/questions";
import { IconCheck, IconSparkle } from "./icons";

interface Props {
  job: { id: string; title: string; company: string; questions: ScreeningQuestion[] };
}

const PROFILE_KEY = "jp_candidate_profile";

function omit(obj: Record<string, string>, key: string) {
  if (!(key in obj)) return obj;
  const next = { ...obj };
  delete next[key];
  return next;
}

type Candidate = { name: string; email: string; phone: string; linkedin: string; currentLocation: string };

export function ApplyForm({ job }: Props) {
  const handoff = useResumeHandoff();
  const initialFile = handoff.file && !checkResumeFile(handoff.file) ? handoff.file : null;
  const [file, setFile] = useState<File | null>(initialFile);
  const [fromMatcher, setFromMatcher] = useState(Boolean(initialFile));
  const [candidate, setCandidate] = useState<Candidate>({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    currentLocation: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Pre-fill contact details from a previous application (after hydration, browser-only storage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after mount
      if (saved) setCandidate((c) => ({ ...c, ...(JSON.parse(saved) as Partial<Candidate>) }));
    } catch {
      /* storage unavailable – ignore */
    }
  }, []);

  const shown = useMemo(() => visibleQuestions(job.questions, answers), [job.questions, answers]);

  const setAnswer = (id: string, v: string) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setErrors((e) => omit(e, `answers.${id}`));
  };
  const setField = (k: keyof Candidate, v: string) => {
    setCandidate((c) => ({ ...c, [k]: v }));
    setErrors((e) => omit(e, k));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const errs: Record<string, string> = {
      ...validateCandidate(candidate),
      ...Object.fromEntries(Object.entries(validateAnswers(job.questions, answers)).map(([k, v]) => [`answers.${k}`, v])),
    };
    if (!file) errs.resume = "Please upload your resume.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Please fix the highlighted fields.");
      const firstKey = Object.keys(errs)[0];
      document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const fd = new FormData();
    fd.set("jobId", job.id);
    fd.set("resume", file!);
    for (const [k, v] of Object.entries(candidate)) fd.set(k, v);
    for (const q of shown) fd.set(`answers[${q.id}]`, answers[q.id] ?? "");

    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; fieldErrors?: Record<string, string> };
      if (!res.ok) {
        setErrors(data.fieldErrors ?? {});
        setFormError(data.error ?? `Something went wrong (${res.status}).`);
        return;
      }
      try {
        const { name, email, phone, linkedin, currentLocation } = candidate;
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, email, phone, linkedin, currentLocation }));
      } catch {
        /* ignore */
      }
      handoff.setResume(null);
      setDone(data.id ?? "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error – check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <IconCheck width={28} height={28} />
        </span>
        <h2 className="mt-4 text-xl font-bold">Application submitted</h2>
        <p className="mt-2 text-slate-600">
          Your application for <strong>{job.title}</strong> at {job.company} has been sent to the recruiter.
        </p>
        <p className="mt-1 text-xs text-slate-400">Reference: {done}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">Browse more jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Section step={1} title="Resume">
        <div data-field="resume">
          <ResumeDropzone
            file={file}
            onFile={(f) => {
              setFile(f);
              setFromMatcher(false);
              setErrors((e) => omit(e, "resume"));
            }}
            error={errors.resume}
          />
        </div>
        {fromMatcher && file && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
            <IconCheck /> Using the resume you checked in Resume Match.
          </p>
        )}
        <Link
          href={`/resume-match?job=${job.id}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <IconSparkle /> Check how well your resume matches this job first
        </Link>
      </Section>

      <Section step={2} title="Your details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" required value={candidate.name} onChange={setField} error={errors.name} autoComplete="name" />
          <Field label="Email" name="email" type="email" required value={candidate.email} onChange={setField} error={errors.email} autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" required value={candidate.phone} onChange={setField} error={errors.phone} autoComplete="tel" placeholder="+91 98765 43210" />
          <Field label="Current location" name="currentLocation" value={candidate.currentLocation} onChange={setField} error={errors.currentLocation} placeholder="City" />
          <div className="sm:col-span-2">
            <Field label="LinkedIn profile" name="linkedin" type="url" value={candidate.linkedin} onChange={setField} error={errors.linkedin} placeholder="https://linkedin.com/in/…" />
          </div>
        </div>
      </Section>

      {job.questions.length > 0 && (
        <Section step={3} title="Recruiter questions" subtitle={`${job.company} would like to know a bit more.`}>
          <div className="space-y-5">
            {shown.map((q) => (
              <QuestionInput
                key={q.id}
                q={q}
                value={answers[q.id] ?? ""}
                onChange={(v) => setAnswer(q.id, v)}
                error={errors[`answers.${q.id}`]}
              />
            ))}
          </div>
        </Section>
      )}

      {formError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          By applying you agree to share your resume and answers with {job.company}.
        </p>
        <button className="btn-primary px-8 py-3 text-base" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}

function Section({ step, title, subtitle, children }: { step: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{step}</span>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  name: keyof Candidate;
  value: string;
  onChange: (k: keyof Candidate, v: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block" data-field={name}>
      <span className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        className="input"
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(name, e.target.value)}
      />
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
  error,
}: {
  q: ScreeningQuestion;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const inputId = `q_${q.id}`;
  const labelEl = (
    <span className="label">
      {q.label} {q.required && <span className="text-red-500">*</span>}
    </span>
  );
  const help = q.helpText && <span className="mt-1 block text-xs text-slate-500">{q.helpText}</span>;
  const err = error && <span className="field-error block">{error}</span>;

  if (q.type === "yesno") {
    return (
      <fieldset data-field={`answers.${q.id}`}>
        <legend className="label">
          {q.label} {q.required && <span className="text-red-500">*</span>}
        </legend>
        <div className="flex gap-3">
          {["Yes", "No"].map((opt) => (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                value === opt ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name={inputId} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
              {opt}
            </label>
          ))}
        </div>
        {help}
        {err}
      </fieldset>
    );
  }

  let control: React.ReactNode;
  switch (q.type) {
    case "textarea":
      control = (
        <textarea id={inputId} rows={4} maxLength={5000} className="input" value={value} placeholder={q.placeholder} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case "select":
      control = (
        <select id={inputId} className="input" value={value} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {q.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case "date":
      control = <input id={inputId} type="date" className="input sm:max-w-xs" value={value} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "number":
    case "currency":
      control = (
        <div className="flex items-stretch sm:max-w-xs">
          {q.type === "currency" && q.currency && (
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
              {q.currency === "INR" ? "₹" : q.currency}
            </span>
          )}
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            step="any"
            min={q.min}
            max={q.max}
            className={`input ${q.type === "currency" && q.currency ? "rounded-l-none" : ""} ${q.unit ? "rounded-r-none" : ""}`}
            value={value}
            placeholder={q.placeholder}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange(e.target.value)}
          />
          {q.unit && (
            <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
              {q.unit}
            </span>
          )}
        </div>
      );
      break;
    default:
      control = <input id={inputId} type="text" maxLength={500} className="input" value={value} placeholder={q.placeholder} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div data-field={`answers.${q.id}`}>
      <label htmlFor={inputId}>{labelEl}</label>
      {control}
      {help}
      {err}
    </div>
  );
}
