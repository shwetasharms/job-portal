import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Screening questions (recruiter-defined, per job)                    */
/* ------------------------------------------------------------------ */

export const questionTypes = [
  "text",
  "textarea",
  "number",
  "currency",
  "date",
  "select",
  "yesno",
] as const;

export const ScreeningQuestionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, "question id must be alphanumeric/underscore/dash"),
  label: z.string().min(1),
  type: z.enum(questionTypes),
  required: z.boolean().default(false),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  /** For `select` */
  options: z.array(z.string().min(1)).optional(),
  /** For `number` / `currency` */
  min: z.number().optional(),
  max: z.number().optional(),
  /** For `currency`, e.g. "INR" */
  currency: z.string().optional(),
  /** Suffix shown next to the input, e.g. "LPA", "days" */
  unit: z.string().optional(),
  /** Show this question only when another question has a given answer */
  showIf: z
    .object({
      questionId: z.string(),
      equals: z.union([z.string(), z.array(z.string())]),
    })
    .optional(),
});
export type ScreeningQuestion = z.infer<typeof ScreeningQuestionSchema>;

/* ------------------------------------------------------------------ */
/* Job                                                                 */
/* ------------------------------------------------------------------ */

export const workModes = ["onsite", "remote", "hybrid"] as const;
export const employmentTypes = ["full-time", "part-time", "contract", "internship"] as const;

export const JobSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/, "job id must be URL safe"),
    title: z.string().min(1),
    company: z.string().min(1),
    companyLogo: z.string().url().optional(),
    companyWebsite: z.string().url().optional(),
    location: z.string().min(1),
    workMode: z.enum(workModes).default("onsite"),
    employmentType: z.enum(employmentTypes).default("full-time"),
    department: z.string().optional(),
    openings: z.number().int().positive().optional(),
    experience: z
      .object({ min: z.number().min(0), max: z.number().min(0).optional() })
      .optional(),
    salary: z
      .object({
        min: z.number().min(0),
        max: z.number().min(0).optional(),
        currency: z.string().default("INR"),
        period: z.enum(["year", "month", "hour"]).default("year"),
      })
      .optional(),
    postedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "postedAt must be a date"),
    applyBy: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "applyBy must be a date")
      .optional(),
    status: z.enum(["open", "closed"]).default("open"),
    description: z.string().min(1),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    niceToHave: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    benefits: z.array(z.string()).default([]),
    questions: z.array(ScreeningQuestionSchema).default([]),
  })
  .superRefine((job, ctx) => {
    const ids = new Set<string>();
    for (const q of job.questions) {
      if (ids.has(q.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate question id "${q.id}"` });
      }
      ids.add(q.id);
      if (q.type === "select" && (!q.options || q.options.length === 0)) {
        ctx.addIssue({ code: "custom", message: `select question "${q.id}" needs options` });
      }
    }
    for (const q of job.questions) {
      if (q.showIf && !ids.has(q.showIf.questionId)) {
        ctx.addIssue({
          code: "custom",
          message: `question "${q.id}" showIf references unknown "${q.showIf.questionId}"`,
        });
      }
    }
  });
export type Job = z.infer<typeof JobSchema>;

/** Minimal shape sent to the client for lists / the matcher picker */
export type JobSummary = Pick<
  Job,
  | "id"
  | "title"
  | "company"
  | "location"
  | "workMode"
  | "employmentType"
  | "experience"
  | "salary"
  | "postedAt"
  | "skills"
  | "status"
>;

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

export type AnswerValue = string;

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  createdAt: string;
  candidate: {
    name: string;
    email: string;
    phone: string;
    linkedin?: string;
    currentLocation?: string;
  };
  answers: { questionId: string; label: string; value: AnswerValue }[];
  resume: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
  };
  /** Keyword alignment computed at submit time (null when text extraction failed) */
  match: { score: number; matched: string[]; missing: string[] } | null;
  status: "new" | "shortlisted" | "rejected";
}
