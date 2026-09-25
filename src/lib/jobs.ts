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
const jobs_exp=[
  {
    "id": "sr-react-dev-galific",
    "title": "Senior React Developer",
    "company": "Galific Solutions",
    "companyWebsite": "https://www.galific.com",
    "location": "Noida, Uttar Pradesh",
    "workMode": "hybrid",
    "employmentType": "full-time",
    "department": "Engineering",
    "openings": 2,
    "experience": {
      "min": 4,
      "max": 8
    },
    "salary": {
      "min": 1800000,
      "max": 2800000,
      "currency": "INR",
      "period": "year"
    },
    "postedAt": "2026-09-22",
    "applyBy": "2026-10-31",
    "status": "open",
    "description": "We are looking for a Senior React Developer to build data-intelligence dashboards used by logistics and real-estate businesses across India.\nYou will own front-end architecture for analytics products, work closely with backend and ML engineers, and ship features that turn complex data into clear decisions.",
    "responsibilities": [
      "Build and maintain complex dashboards using React, Next.js and TypeScript",
      "Design reusable component libraries and state management patterns",
      "Integrate REST and GraphQL APIs and optimise rendering performance",
      "Write unit and integration tests with Jest and React Testing Library",
      "Mentor junior developers and review pull requests"
    ],
    "requirements": [
      "4+ years of professional experience with React and TypeScript",
      "Strong knowledge of Next.js, server-side rendering and routing",
      "Experience with Redux Toolkit or React Query",
      "Solid understanding of HTML, CSS, Tailwind CSS and responsive design",
      "Experience with Git, CI/CD pipelines and code reviews"
    ],
    "niceToHave": [
      "Data visualisation with D3.js or Recharts",
      "Experience with Node.js and PostgreSQL",
      "Exposure to AWS or Docker"
    ],
    "skills": [
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Redux",
      "React Query",
      "Tailwind CSS",
      "Jest",
      "REST API",
      "GraphQL",
      "Git"
    ],
    "benefits": [
      "Health insurance for family",
      "Flexible hybrid schedule",
      "Annual learning budget"
    ],
    "questions": [
      {
        "id": "immediate_joiner",
        "label": "Are you an immediate joiner?",
        "type": "yesno",
        "required": true
      },
      {
        "id": "notice_period",
        "label": "What is your notice period?",
        "type": "select",
        "required": true,
        "options": [
          "Serving notice",
          "15 days",
          "30 days",
          "60 days",
          "90 days"
        ],
        "showIf": {
          "questionId": "immediate_joiner",
          "equals": "No"
        }
      },
      {
        "id": "last_working_day",
        "label": "Last working day",
        "type": "date",
        "required": true,
        "helpText": "As per your resignation acceptance",
        "showIf": {
          "questionId": "notice_period",
          "equals": "Serving notice"
        }
      },
      {
        "id": "current_ctc",
        "label": "Current CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "expected_ctc",
        "label": "Expected CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "portfolio",
        "label": "GitHub or portfolio link",
        "type": "text",
        "required": false,
        "placeholder": "https://github.com/..."
      },
      {
        "id": "relocate",
        "label": "Are you willing to work from Noida office 3 days a week?",
        "type": "yesno",
        "required": true
      }
    ]
  },
  {
    "id": "data-analyst-bi",
    "title": "Data Analyst (Power BI / SQL)",
    "company": "Galific Solutions",
    "companyWebsite": "https://www.galific.com",
    "location": "Gurugram, Haryana",
    "workMode": "onsite",
    "employmentType": "full-time",
    "department": "Data",
    "openings": 1,
    "experience": {
      "min": 2,
      "max": 5
    },
    "salary": {
      "min": 800000,
      "max": 1400000,
      "currency": "INR",
      "period": "year"
    },
    "postedAt": "2026-09-20",
    "status": "open",
    "description": "Join our data team to turn raw sales, logistics and operations data into dashboards and insights for mid-sized enterprises.\nYou will write SQL, build Power BI and Looker Studio reports and present findings directly to client stakeholders.",
    "responsibilities": [
      "Write complex SQL queries on PostgreSQL and BigQuery",
      "Build Power BI and Looker Studio dashboards",
      "Clean and transform data using Python and Pandas",
      "Define KPIs with business stakeholders and automate recurring reports"
    ],
    "requirements": [
      "2+ years of experience in data analysis",
      "Strong SQL skills including joins, window functions and CTEs",
      "Hands-on Power BI experience with DAX",
      "Working knowledge of Python, Pandas and Excel",
      "Good communication and stakeholder management skills"
    ],
    "niceToHave": [
      "Google Analytics (GA4) experience",
      "Statistics and A/B testing"
    ],
    "skills": [
      "SQL",
      "Power BI",
      "DAX",
      "Python",
      "Pandas",
      "Excel",
      "BigQuery",
      "Looker Studio",
      "Data Visualization",
      "Statistics"
    ],
    "questions": [
      {
        "id": "immediate_joiner",
        "label": "Are you an immediate joiner?",
        "type": "yesno",
        "required": true
      },
      {
        "id": "notice_period",
        "label": "What is your notice period?",
        "type": "select",
        "required": true,
        "options": [
          "Serving notice",
          "15 days",
          "30 days",
          "60 days",
          "90 days"
        ],
        "showIf": {
          "questionId": "immediate_joiner",
          "equals": "No"
        }
      },
      {
        "id": "last_working_day",
        "label": "Last working day",
        "type": "date",
        "required": true,
        "helpText": "As per your resignation acceptance",
        "showIf": {
          "questionId": "notice_period",
          "equals": "Serving notice"
        }
      },
      {
        "id": "current_ctc",
        "label": "Current CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "expected_ctc",
        "label": "Expected CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "tools_rating",
        "label": "Rate your Power BI expertise",
        "type": "select",
        "required": true,
        "options": [
          "Beginner",
          "Intermediate",
          "Advanced",
          "Expert"
        ]
      }
    ]
  },
  {
    "id": "ml-engineer-nlp",
    "title": "Machine Learning Engineer (NLP / LLM)",
    "company": "Aarvy Labs",
    "location": "Bengaluru, Karnataka",
    "workMode": "remote",
    "employmentType": "full-time",
    "department": "AI",
    "openings": 1,
    "experience": {
      "min": 3,
      "max": 7
    },
    "salary": {
      "min": 2500000,
      "max": 4000000,
      "currency": "INR",
      "period": "year"
    },
    "postedAt": "2026-09-24",
    "status": "open",
    "description": "We are building LLM-powered products for automation of business workflows. You will fine-tune, evaluate and deploy language models and retrieval pipelines to production.",
    "responsibilities": [
      "Build RAG pipelines using LangChain and vector databases",
      "Fine-tune and evaluate transformer models with PyTorch and Hugging Face",
      "Deploy models as APIs using FastAPI, Docker and Kubernetes",
      "Monitor model quality and latency in production"
    ],
    "requirements": [
      "3+ years building machine learning systems in production",
      "Strong Python, PyTorch and scikit-learn skills",
      "Experience with LLMs, prompt engineering and embeddings",
      "Experience with MLOps: Docker, CI/CD, model monitoring",
      "Solid understanding of NLP fundamentals"
    ],
    "niceToHave": [
      "Experience with AWS SageMaker or GCP Vertex AI",
      "Publications or open-source contributions"
    ],
    "skills": [
      "Python",
      "PyTorch",
      "Machine Learning",
      "NLP",
      "LLM",
      "LangChain",
      "Hugging Face",
      "FastAPI",
      "Docker",
      "Kubernetes",
      "MLOps",
      "Vector Database"
    ],
    "questions": [
      {
        "id": "immediate_joiner",
        "label": "Are you an immediate joiner?",
        "type": "yesno",
        "required": true
      },
      {
        "id": "notice_period",
        "label": "What is your notice period?",
        "type": "select",
        "required": true,
        "options": [
          "Serving notice",
          "15 days",
          "30 days",
          "60 days",
          "90 days"
        ],
        "showIf": {
          "questionId": "immediate_joiner",
          "equals": "No"
        }
      },
      {
        "id": "last_working_day",
        "label": "Last working day",
        "type": "date",
        "required": true,
        "helpText": "As per your resignation acceptance",
        "showIf": {
          "questionId": "notice_period",
          "equals": "Serving notice"
        }
      },
      {
        "id": "current_ctc",
        "label": "Current CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "expected_ctc",
        "label": "Expected CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "llm_projects",
        "label": "Briefly describe an LLM project you shipped to production",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "node-backend-dev",
    "title": "Backend Developer (Node.js)",
    "company": "Propviewz",
    "location": "Delhi NCR",
    "workMode": "hybrid",
    "employmentType": "full-time",
    "department": "Engineering",
    "experience": {
      "min": 2,
      "max": 5
    },
    "salary": {
      "min": 1000000,
      "max": 1800000,
      "currency": "INR",
      "period": "year"
    },
    "postedAt": "2026-09-18",
    "status": "open",
    "description": "Propviewz processes thousands of government property records every day. We need a backend developer to scale our data pipeline and public APIs.",
    "responsibilities": [
      "Design and build REST APIs with Node.js and Express",
      "Build scraping and ETL jobs with queues (BullMQ / Redis)",
      "Model data in PostgreSQL and MongoDB and optimise queries",
      "Deploy services on AWS using Docker"
    ],
    "requirements": [
      "2+ years with Node.js and TypeScript",
      "Strong PostgreSQL knowledge",
      "Experience with Redis and message queues",
      "Understanding of microservices and API security"
    ],
    "skills": [
      "Node.js",
      "Express",
      "TypeScript",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "AWS",
      "Docker",
      "REST API",
      "Microservices"
    ],
    "questions": [
      {
        "id": "immediate_joiner",
        "label": "Are you an immediate joiner?",
        "type": "yesno",
        "required": true
      },
      {
        "id": "notice_period",
        "label": "What is your notice period?",
        "type": "select",
        "required": true,
        "options": [
          "Serving notice",
          "15 days",
          "30 days",
          "60 days",
          "90 days"
        ],
        "showIf": {
          "questionId": "immediate_joiner",
          "equals": "No"
        }
      },
      {
        "id": "last_working_day",
        "label": "Last working day",
        "type": "date",
        "required": true,
        "helpText": "As per your resignation acceptance",
        "showIf": {
          "questionId": "notice_period",
          "equals": "Serving notice"
        }
      },
      {
        "id": "current_ctc",
        "label": "Current CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      },
      {
        "id": "expected_ctc",
        "label": "Expected CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      }
    ]
  },
  {
    "id": "digital-marketing-exec",
    "title": "Digital Marketing Executive",
    "company": "Clanner.AI",
    "location": "Remote (India)",
    "workMode": "remote",
    "employmentType": "full-time",
    "department": "Marketing",
    "experience": {
      "min": 1,
      "max": 3
    },
    "salary": {
      "min": 400000,
      "max": 700000,
      "currency": "INR",
      "period": "year"
    },
    "postedAt": "2026-09-15",
    "status": "open",
    "description": "Plan and execute performance and social media campaigns for a fast-growing SaaS product for professionals.",
    "responsibilities": [
      "Run Google Ads and Meta Ads campaigns",
      "Plan LinkedIn and Instagram content calendars",
      "Track funnels in Google Analytics (GA4)",
      "Do SEO keyword research and on-page optimisation"
    ],
    "requirements": [
      "1+ years in digital marketing",
      "Hands-on with Google Ads, Meta Ads and GA4",
      "Good written English and copywriting skills",
      "Basic understanding of SEO"
    ],
    "skills": [
      "Google Ads",
      "Meta Ads",
      "SEO",
      "Google Analytics",
      "Social Media Marketing",
      "Copywriting",
      "Content Marketing"
    ],
    "questions": [
      {
        "id": "immediate_joiner",
        "label": "Are you an immediate joiner?",
        "type": "yesno",
        "required": true
      },
      {
        "id": "notice_period",
        "label": "What is your notice period?",
        "type": "select",
        "required": true,
        "options": [
          "Serving notice",
          "15 days",
          "30 days",
          "60 days",
          "90 days"
        ],
        "showIf": {
          "questionId": "immediate_joiner",
          "equals": "No"
        }
      },
      {
        "id": "last_working_day",
        "label": "Last working day",
        "type": "date",
        "required": true,
        "helpText": "As per your resignation acceptance",
        "showIf": {
          "questionId": "notice_period",
          "equals": "Serving notice"
        }
      },
      {
        "id": "expected_ctc",
        "label": "Expected CTC",
        "type": "currency",
        "currency": "INR",
        "unit": "LPA",
        "required": true,
        "min": 0,
        "max": 500
      }
    ]
  },
  {
    "id": "frontend-intern",
    "title": "Frontend Developer Intern",
    "company": "Galific Solutions",
    "companyWebsite": "https://www.galific.com",
    "location": "Noida, Uttar Pradesh",
    "workMode": "onsite",
    "employmentType": "internship",
    "department": "Engineering",
    "openings": 3,
    "experience": {
      "min": 0,
      "max": 1
    },
    "salary": {
      "min": 15000,
      "max": 25000,
      "currency": "INR",
      "period": "month"
    },
    "postedAt": "2026-09-10",
    "applyBy": "2026-10-15",
    "status": "open",
    "description": "A 6-month internship for students or fresh graduates who want to learn production React development on real client projects.",
    "responsibilities": [
      "Build UI components in React",
      "Fix bugs and write tests",
      "Participate in code reviews and stand-ups"
    ],
    "requirements": [
      "Good knowledge of HTML, CSS and JavaScript",
      "Basic React knowledge",
      "Familiarity with Git"
    ],
    "skills": [
      "HTML",
      "CSS",
      "JavaScript",
      "React",
      "Git"
    ],
    "questions": [
      {
        "id": "graduation_year",
        "label": "Year of graduation",
        "type": "number",
        "required": true,
        "min": 2020,
        "max": 2030
      },
      {
        "id": "college",
        "label": "College / University",
        "type": "text",
        "required": true
      },
      {
        "id": "start_date",
        "label": "Earliest start date",
        "type": "date",
        "required": true
      },
      {
        "id": "duration_ok",
        "label": "Are you available for the full 6 months?",
        "type": "yesno",
        "required": true
      }
    ]
  }
]
export async function getAllJobs(): Promise<Job[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_SECONDS * 1000) return cache.jobs;
  if (!inflight) {
    inflight = loadFromSource()
      .then((jobs) => {
        jobs.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
        cache = { at: Date.now(), jobs };
        return jobs_exp;
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
