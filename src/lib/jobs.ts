import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { JobSchema, type Job, type JobSummary } from "./types";

/**
 * Job source resolution (first match wins):
 *   1. JOBS_SOURCE_URL  – remote JSON (array, or { jobs: [...] }) or CSV
 *   2. JOBS_FILE        – local path to .json or .csv (relative to project root)
 *   3. data/jobs.json   – default bundled file
 *
 * Results are cached in memory for JOBS_CACHE_SECONDS (default 300).
 * Invalid rows are skipped and logged instead of taking the whole portal down.
 */

const CACHE_SECONDS = Number(process.env.JOBS_CACHE_SECONDS ?? 300);

let cache: { at: number; jobs: Job[] } | null = null;
let inflight: Promise<Job[]> | null = null;

function splitList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v !== "string" || !v.trim()) return [];
  // CSV cells use "|" (or newlines) as list separators
  return v
    .split(/\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Map a flat CSV row onto the Job shape. */
function csvRowToJob(row: Record<string, string>): unknown {
  const expMin = num(row.experienceMin);
  const salMin = num(row.salaryMin);
  let questions: unknown = [];
  if (row.questions?.trim()) {
    try {
      questions = JSON.parse(row.questions);
    } catch {
      throw new Error(`questions column is not valid JSON`);
    }
  }
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyLogo: row.companyLogo || undefined,
    companyWebsite: row.companyWebsite || undefined,
    location: row.location,
    workMode: row.workMode || undefined,
    employmentType: row.employmentType || undefined,
    department: row.department || undefined,
    openings: num(row.openings),
    experience: expMin !== undefined ? { min: expMin, max: num(row.experienceMax) } : undefined,
    salary:
      salMin !== undefined
        ? {
            min: salMin,
            max: num(row.salaryMax),
            currency: row.salaryCurrency || undefined,
            period: row.salaryPeriod || undefined,
          }
        : undefined,
    postedAt: row.postedAt,
    applyBy: row.applyBy || undefined,
    status: row.status || undefined,
    description: row.description,
    responsibilities: splitList(row.responsibilities),
    requirements: splitList(row.requirements),
    niceToHave: splitList(row.niceToHave),
    skills: splitList(row.skills),
    benefits: splitList(row.benefits),
    questions,
  };
}

function parseCsv(text: string): unknown[] {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  if (res.errors.length) {
    for (const e of res.errors.slice(0, 5)) console.warn(`[jobs] CSV row ${e.row}: ${e.message}`);
  }
  const out: unknown[] = [];
  res.data.forEach((row, i) => {
    try {
      out.push(csvRowToJob(row));
    } catch (e) {
      console.warn(`[jobs] CSV row ${i + 2} skipped: ${(e as Error).message}`);
    }
  });
  return out;
}

function parseJson(text: string): unknown[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.jobs)) return data.jobs;
  throw new Error("JSON job source must be an array or { jobs: [...] }");
}

function validate(raw: unknown[], source: string): Job[] {
  const jobs: Job[] = [];
  const seen = new Set<string>();
  raw.forEach((item, i) => {
    const r = JobSchema.safeParse(item);
    if (!r.success) {
      const id = (item as { id?: string })?.id ?? `#${i}`;
      console.warn(
        `[jobs] ${source}: job ${id} skipped – ${r.error.issues
          .map((x) => `${x.path.join(".") || "job"}: ${x.message}`)
          .join("; ")}`,
      );
      return;
    }
    if (seen.has(r.data.id)) {
      console.warn(`[jobs] ${source}: duplicate job id ${r.data.id} skipped`);
      return;
    }
    seen.add(r.data.id);
    jobs.push(r.data);
  });
  return jobs;
}

async function loadFromSource(): Promise<Job[]> {
  const url = process.env.JOBS_SOURCE_URL?.trim();
  if (url) {
    const res = await fetch(url, {
      headers: process.env.JOBS_SOURCE_AUTH
        ? { Authorization: process.env.JOBS_SOURCE_AUTH }
        : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`JOBS_SOURCE_URL responded ${res.status}`);
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    const isCsv = ct.includes("csv") || /\.csv(\?|$)/i.test(url);
    return validate(isCsv ? parseCsv(text) : parseJson(text), url);
  }

  const file = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.JOBS_FILE?.trim() || "data/jobs.json",
  );
  const text = await fs.readFile(file, "utf8");
  const raw = file.toLowerCase().endsWith(".csv") ? parseCsv(text) : parseJson(text);
  return validate(raw, path.basename(file));
}

export async function getAllJobs(): Promise<Job[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_SECONDS * 1000) return cache.jobs;
  if (!inflight) {
    inflight = loadFromSource()
      .then((jobs) => {
        jobs.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
        cache = { at: Date.now(), jobs };
        return jobs;
      })
      .catch((e) => {
        console.error(`[jobs] failed to load job source: ${(e as Error).message}`);
        // Serve stale data if we have it; otherwise surface the error
        if (cache) return cache.jobs;
        throw e;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function getJob(id: string): Promise<Job | undefined> {
  return (await getAllJobs()).find((j) => j.id === id);
}

export function toSummary(j: Job): JobSummary {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    workMode: j.workMode,
    employmentType: j.employmentType,
    experience: j.experience,
    salary: j.salary,
    postedAt: j.postedAt,
    skills: j.skills,
    status: j.status,
  };
}

export function isJobOpen(j: Job): boolean {
  if (j.status === "closed") return false;
  if (j.applyBy) {
    // applyBy is inclusive of the whole day
    const end = new Date(j.applyBy);
    end.setHours(23, 59, 59, 999);
    if (Date.now() > end.getTime()) return false;
  }
  return true;
}

export interface JobFilters {
  q?: string;
  location?: string;
  workMode?: string;
  type?: string;
  exp?: string;
}

export function filterJobs(jobs: Job[], f: JobFilters): Job[] {
  const terms = (f.q ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const loc = f.location?.toLowerCase().trim();
  const exp = f.exp !== undefined && f.exp !== "" ? Number(f.exp) : undefined;

  return jobs.filter((j) => {
    if (terms.length) {
      const hay = [j.title, j.company, j.department ?? "", j.skills.join(" "), j.description]
        .join(" ")
        .toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    if (loc && !j.location.toLowerCase().includes(loc)) return false;
    if (f.workMode && j.workMode !== f.workMode) return false;
    if (f.type && j.employmentType !== f.type) return false;
    if (exp !== undefined && Number.isFinite(exp) && j.experience) {
      const max = j.experience.max ?? Infinity;
      if (exp < j.experience.min || exp > max) return false;
    }
    return true;
  });
}
