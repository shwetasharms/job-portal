import { NextResponse, type NextRequest } from "next/server";
import { getJob, isJobOpen } from "@/lib/jobs";
import { readResumeUpload, extractResumeText, RESUME_MIME } from "@/lib/resume";
import {
  saveApplication,
  newApplicationId,
  DuplicateApplicationError,
} from "@/lib/applications";
import { validateAnswers, validateCandidate, visibleQuestions } from "@/lib/questions";
import { analyzeResume, extractJobKeywords } from "@/lib/matcher/engine";

export const runtime = "nodejs";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export async function POST(req: NextRequest) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const jobId = str(fd, "jobId");
  const job = jobId ? await getJob(jobId) : undefined;
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (!isJobOpen(job)) {
    return NextResponse.json({ error: "This job is no longer accepting applications." }, { status: 410 });
  }

  const candidate = {
    name: str(fd, "name").trim(),
    email: str(fd, "email").trim().toLowerCase(),
    phone: str(fd, "phone").trim(),
    linkedin: str(fd, "linkedin").trim() || undefined,
    currentLocation: str(fd, "currentLocation").trim().slice(0, 120) || undefined,
  };

  // Answers arrive as answers[<questionId>]
  const answers: Record<string, string> = {};
  for (const q of job.questions) answers[q.id] = str(fd, `answers[${q.id}]`).trim();

  const fieldErrors: Record<string, string> = {
    ...validateCandidate(candidate),
    ...Object.fromEntries(
      Object.entries(validateAnswers(job.questions, answers)).map(([k, v]) => [`answers.${k}`, v]),
    ),
  };

  const upload = await readResumeUpload(fd.get("resume"));
  if (!upload.ok) fieldErrors.resume = upload.error;

  if (Object.keys(fieldErrors).length || !upload.ok) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors },
      { status: 422 },
    );
  }

  // Keyword alignment for the recruiter (best effort – a scanned PDF may have no text)
  let match: { score: number; matched: string[]; missing: string[] } | null = null;
  try {
    const text = await extractResumeText(upload.buf, upload.kind);
    if (text.length > 50) {
      const jobText = { ...job, experienceMin: job.experience?.min };
      const report = analyzeResume(text, extractJobKeywords(jobText), jobText);
      match = {
        score: report.score,
        matched: report.matched.map((k) => k.term),
        missing: report.missing.map((k) => k.term),
      };
    }
  } catch (e) {
    console.warn(`[apply] resume text extraction failed: ${(e as Error).message}`);
  }

  const shown = visibleQuestions(job.questions, answers);
  try {
    const saved = await saveApplication(
      {
        id: newApplicationId(),
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        createdAt: new Date().toISOString(),
        candidate,
        answers: shown.map((q) => ({ questionId: q.id, label: q.label, value: answers[q.id] ?? "" })),
        resume: {
          originalName: upload.name.slice(0, 200),
          mimeType: RESUME_MIME[upload.kind],
          size: upload.buf.length,
        },
        match,
        status: "new",
      },
      { buf: upload.buf, ext: upload.kind },
    );
    return NextResponse.json({ id: saved.id }, { status: 201 });
  } catch (e) {
    if (e instanceof DuplicateApplicationError) {
      return NextResponse.json({ error: e.message, fieldErrors: { email: e.message } }, { status: 409 });
    }
    console.error("[apply] failed to save application", e);
    return NextResponse.json({ error: "Could not save your application. Please try again." }, { status: 500 });
  }
}
