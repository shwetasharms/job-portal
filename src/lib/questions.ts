import type { ScreeningQuestion } from "./types";

/** Pure helpers shared by the apply form (client) and the API route (server). */

export function isQuestionVisible(q: ScreeningQuestion, answers: Record<string, string>): boolean {
  if (!q.showIf) return true;
  const actual = answers[q.showIf.questionId] ?? "";
  const expected = Array.isArray(q.showIf.equals) ? q.showIf.equals : [q.showIf.equals];
  return expected.includes(actual);
}

/** Visible questions, resolving chains (a question hidden ⇒ its dependants hidden too). */
export function visibleQuestions(questions: ScreeningQuestion[], answers: Record<string, string>) {
  const visible = new Set<string>();
  // Iterate until stable to resolve showIf chains regardless of declaration order
  let changed = true;
  while (changed) {
    changed = false;
    for (const q of questions) {
      if (visible.has(q.id)) continue;
      const parentOk = !q.showIf || visible.has(q.showIf.questionId);
      if (parentOk && isQuestionVisible(q, answers)) {
        visible.add(q.id);
        changed = true;
      }
    }
  }
  return questions.filter((q) => visible.has(q.id));
}

export function validateAnswer(q: ScreeningQuestion, raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return q.required ? "This question is required." : null;
  if (v.length > 5000) return "Answer is too long.";
  switch (q.type) {
    case "number":
    case "currency": {
      const n = Number(v);
      if (!Number.isFinite(n)) return "Enter a valid number.";
      if (q.min !== undefined && n < q.min) return `Must be at least ${q.min}.`;
      if (q.max !== undefined && n > q.max) return `Must be at most ${q.max}.`;
      return null;
    }
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? null : "Enter a valid date.";
    case "yesno":
      return v === "Yes" || v === "No" ? null : "Choose Yes or No.";
    case "select":
      return q.options?.includes(v) ? null : "Choose one of the options.";
    case "text":
      return v.length > 500 ? "Keep this under 500 characters." : null;
    default:
      return null;
  }
}

export function validateAnswers(questions: ScreeningQuestion[], answers: Record<string, string>) {
  const errors: Record<string, string> = {};
  for (const q of visibleQuestions(questions, answers)) {
    const err = validateAnswer(q, answers[q.id]);
    if (err) errors[q.id] = err;
  }
  return errors;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[0-9][0-9\s-]{7,15}[0-9]$/;

export function validateCandidate(c: { name: string; email: string; phone: string; linkedin?: string }) {
  const errors: Record<string, string> = {};
  if (c.name.trim().length < 2) errors.name = "Enter your full name.";
  if (c.name.length > 120) errors.name = "Name is too long.";
  if (!EMAIL_RE.test(c.email.trim())) errors.email = "Enter a valid email.";
  if (!PHONE_RE.test(c.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (c.linkedin?.trim()) {
    try {
      const u = new URL(c.linkedin.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      errors.linkedin = "Enter a full URL, e.g. https://linkedin.com/in/you";
    }
  }
  return errors;
}

export function formatAnswer(q: ScreeningQuestion, v: string): string {
  if (!v) return "—";
  if (q.type === "currency") return `${q.currency ?? ""} ${v}${q.unit ? ` ${q.unit}` : ""}`.trim();
  if (q.type === "number" && q.unit) return `${v} ${q.unit}`;
  if (q.type === "date") {
    const d = new Date(`${v}T00:00:00`);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  return v;
}
