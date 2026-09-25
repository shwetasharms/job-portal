import { DICTIONARY, type KeywordCategory } from "./dictionary";

/**
 * Resume ⇄ Job-description keyword alignment engine.
 * Pure TypeScript – runs in the browser (live scoring while the candidate edits)
 * and on the server (score stored with each application).
 */

export type Importance = "required" | "preferred" | "mentioned";

export interface Keyword {
  term: string;
  category: KeywordCategory | "phrase";
  importance: Importance;
  weight: number;
  /** Regexes that detect this keyword in text */
  patterns: RegExp[];
  /** Occurrences in the JD */
  jdCount: number;
}

export interface KeywordResult extends Omit<Keyword, "patterns"> {
  found: boolean;
  resumeCount: number;
}

export interface MatchReport {
  score: number; // 0–100
  keywords: KeywordResult[];
  matched: KeywordResult[];
  missing: KeywordResult[];
  requiredCoverage: { matched: number; total: number };
  checks: { id: string; ok: boolean; label: string; detail: string }[];
  resumeWordCount: number;
}

export interface JobText {
  title?: string;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  niceToHave?: string[];
  skills?: string[];
  experienceMin?: number;
}

const WEIGHTS: Record<Importance, number> = { required: 3, preferred: 2, mentioned: 1 };

/* ------------------------------------------------------------------ */
/* Regex helpers                                                       */
/* ------------------------------------------------------------------ */

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Word-boundary aware pattern that also works for terms with symbols
 * (C++, C#, .NET, Node.js, CI/CD). Whitespace/hyphen inside a term is flexible.
 */
function termPattern(term: string, caseSensitive = false): RegExp {
  const body = term
    .trim()
    .split(/[\s-]+/)
    .map(escapeRe)
    .join("[\\s\\-]+");
  // Left: not preceded by a letter/digit. Right: not followed by letter/digit/+/#/&.
  return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9+#&])`, caseSensitive ? "g" : "gi");
}

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    p.lastIndex = 0;
    const m = text.match(p);
    if (m) n += m.length;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Dictionary compiled once                                            */
/* ------------------------------------------------------------------ */

interface CompiledEntry {
  term: string;
  category: KeywordCategory;
  patterns: RegExp[];
}

const COMPILED: CompiledEntry[] = DICTIONARY.map((e) => {
  const patterns: RegExp[] = [];
  if (e.matchTermLoosely !== false) patterns.push(termPattern(e.term));
  for (const a of e.aliases ?? []) patterns.push(termPattern(a));
  for (const c of e.caseSensitive ?? []) patterns.push(termPattern(c, true));
  return { term: e.term, category: e.category, patterns };
});

function findDictEntry(label: string): CompiledEntry | undefined {
  // Resolve a free-text skill label (e.g. from job.skills) to a dictionary entry
  const probe = ` ${label.trim()} `;
  return COMPILED.find((c) => {
    if (c.term.toLowerCase() === label.trim().toLowerCase()) return true;
    return c.patterns.some((p) => {
      p.lastIndex = 0;
      const m = probe.match(p);
      return m !== null && m[0].trim().length === label.trim().length;
    });
  });
}

/* ------------------------------------------------------------------ */
/* Phrase extraction for terms not in the dictionary                   */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  (
    "a about above after again against all also am an and any are as at be because been before being below " +
    "between both but by can could did do does doing down during each etc few for from further had has have " +
    "having he her here hers him his how i if in into is it its itself just let me more most my no nor not " +
    "of off on once only or other our ours out over own per same she should so some such than that the their " +
    "them then there these they this those through to too under until up upon us very via was we were what " +
    "when where which while who whom why will with within without would you your yours plus e.g i.e like " +
    // generic job-posting vocabulary that carries no signal
    "ability able work working works worked team teams role roles job candidate candidates company " +
    "experience experienced years year strong good great excellent solid deep hands-on hands knowledge " +
    "understanding familiarity familiar skills skill required requirements preferred responsibilities " +
    "responsible looking join build building develop developing using use used new across closely day " +
    "daily ensure well including include includes etc must nice bonus plus minimum least professional " +
    "opportunity opportunities environment business businesses real clients client product products " +
    "features feature help helping make making turn complex clear decisions drive own owning ship shipping " +
    "high quality best practices practice time world range variety various based related relevant within " +
    "equivalent degree bachelor bachelors master masters field similar proven track record excellent " +
    "part fast growing growth grow india indian every thousands lakh lpa ctc salary " +
    "senior junior lead developer developers engineer engineers intern interns manager executive analyst"
  ).split(/\s+/),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9+#./-]+/)
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ""))
    .filter((t) => t.length > 1 && !/^\d+[+]?$/.test(t));
}

/** Frequent unigrams/bigrams from the JD that the dictionary did not already cover. */
function extractPhrases(text: string, exclude: Set<string>, limit = 12) {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  const add = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);

  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i];
    if (!STOPWORDS.has(a) && a.length > 2) add(a);
    const b = tokens[i + 1];
    if (b && !STOPWORDS.has(a) && !STOPWORDS.has(b) && a.length > 2 && b.length > 2) add(`${a} ${b}`);
  }

  const candidates = [...counts.entries()]
    .filter(([k, c]) => {
      if (exclude.has(k)) return false;
      // bigrams qualify at 2+, unigrams need 2+ as well to cut noise
      return c >= 2;
    })
    // Prefer bigrams, then frequency
    .sort((x, y) => y[1] + (y[0].includes(" ") ? 0.5 : 0) - (x[1] + (x[0].includes(" ") ? 0.5 : 0)));

  const picked: { term: string; count: number }[] = [];
  for (const [term, count] of candidates) {
    // Skip unigram if a picked bigram already contains it (and vice versa)
    if (picked.some((p) => p.term.split(" ").includes(term) || term.split(" ").includes(p.term))) continue;
    picked.push({ term, count });
    if (picked.length >= limit) break;
  }
  return picked;
}

/* ------------------------------------------------------------------ */
/* Pasted-JD section detection                                         */
/* ------------------------------------------------------------------ */

const REQUIRED_HEADER =
  /^\s*(requirements?|qualifications?|must[\s-]have|what you('|’)ll need|who you are|skills required|required skills|key skills|technical skills|eligibility)\b/i;
const PREFERRED_HEADER =
  /^\s*(nice[\s-]to[\s-]have|preferred|good to have|bonus|plus points?|desired skills|additional skills)\b/i;
const OTHER_HEADER =
  /^\s*(responsibilities|about (us|the (role|company|team))|what you('|’)ll do|benefits|perks|role|job description|overview|the role|location|compensation)\b/i;

/** Split a free-form pasted JD into required / preferred / other buckets by headings. */
export function splitPastedJd(text: string): JobText {
  const required: string[] = [];
  const preferred: string[] = [];
  const other: string[] = [];
  let bucket: string[] = other;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const isHeader = line.length < 60 && !/[.]$/.test(line);
    if (isHeader && REQUIRED_HEADER.test(line)) bucket = required;
    else if (isHeader && PREFERRED_HEADER.test(line)) bucket = preferred;
    else if (isHeader && OTHER_HEADER.test(line)) bucket = other;
    else bucket.push(line.replace(/^(?:[-•*●▪◦·]|\d{1,2}[.)])\s*/, ""));
  }
  const expMatch = text.match(/(\d{1,2})\s*\+?\s*(?:-|to|–)?\s*(?:\d{1,2})?\s*\+?\s*years?/i);
  return {
    description: other.join("\n"),
    requirements: required,
    niceToHave: preferred,
    experienceMin: expMatch ? Number(expMatch[1]) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Keyword extraction from a JD                                        */
/* ------------------------------------------------------------------ */

export function extractJobKeywords(job: JobText): Keyword[] {
  const requiredText = (job.requirements ?? []).join("\n");
  const preferredText = (job.niceToHave ?? []).join("\n");
  const otherText = [job.title ?? "", job.description, ...(job.responsibilities ?? [])].join("\n");
  const fullText = [otherText, requiredText, preferredText].join("\n");

  const byTerm = new Map<string, Keyword>();
  const upsert = (k: Omit<Keyword, "weight">) => {
    const prev = byTerm.get(k.term.toLowerCase());
    const rank = { required: 3, preferred: 2, mentioned: 1 } as const;
    if (!prev) {
      byTerm.set(k.term.toLowerCase(), { ...k, weight: WEIGHTS[k.importance] });
    } else if (rank[k.importance] > rank[prev.importance]) {
      prev.importance = k.importance;
      prev.weight = WEIGHTS[k.importance];
    }
  };

  // 1. Explicit skill tags on the job are always "required"
  for (const s of job.skills ?? []) {
    if (!s.trim()) continue;
    const entry = findDictEntry(s);
    const patterns = entry ? entry.patterns : [termPattern(s)];
    upsert({
      term: entry?.term ?? s.trim(),
      category: entry?.category ?? "skill",
      importance: "required",
      patterns,
      jdCount: Math.max(1, countMatches(fullText, patterns)),
    });
  }

  // 2. Dictionary hits in each section
  for (const c of COMPILED) {
    const inReq = countMatches(requiredText, c.patterns);
    const inPref = countMatches(preferredText, c.patterns);
    const inOther = countMatches(otherText, c.patterns);
    const total = inReq + inPref + inOther;
    if (!total) continue;
    upsert({
      term: c.term,
      category: c.category,
      importance: inReq ? "required" : inPref ? "preferred" : "mentioned",
      patterns: c.patterns,
      jdCount: total,
    });
  }

  // 3. Frequent domain phrases the dictionary does not know
  const covered = new Set<string>();
  for (const k of byTerm.values()) {
    covered.add(k.term.toLowerCase());
    for (const t of tokenize(k.term)) covered.add(t);
  }
  // Strip already-matched dictionary terms from the text so phrases don't duplicate them
  let residual = fullText;
  for (const k of byTerm.values()) for (const p of k.patterns) residual = residual.replace(p, " ");
  for (const p of extractPhrases(residual, covered)) {
    const patterns = [termPattern(p.term)];
    const inReq = countMatches(requiredText, patterns) > 0;
    upsert({
      term: p.term,
      category: "phrase",
      importance: inReq ? "required" : "mentioned",
      patterns,
      jdCount: p.count,
    });
  }

  return [...byTerm.values()].sort(
    (a, b) => b.weight - a.weight || b.jdCount - a.jdCount || a.term.localeCompare(b.term),
  );
}

/* ------------------------------------------------------------------ */
/* Resume analysis                                                     */
/* ------------------------------------------------------------------ */

/** Best-effort years of experience from a resume. */
export function estimateYearsOfExperience(resume: string): number | null {
  const explicit = [...resume.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b(?:\s+of)?(?:\s+\w+){0,3}\s+experience/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n < 50);
  if (explicit.length) return Math.max(...explicit);

  // Sum date ranges like "Jan 2020 – Present", "2018 - 2021", "03/2019 - 06/2022"
  const month = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
  const point = `(?:${month}\\s*[',]?\\s*)?(?:\\d{1,2}[/.-])?(19|20)\\d{2}`;
  const re = new RegExp(`(${point})\\s*(?:-|–|—|to)\\s*(${point}|present|current|till date|now|ongoing)`, "gi");
  const now = new Date();
  const toYears = (s: string): number | null => {
    if (/present|current|till|now|ongoing/i.test(s)) return now.getFullYear() + now.getMonth() / 12;
    const y = s.match(/(19|20)\d{2}/);
    if (!y) return null;
    const mm = s.toLowerCase().match(new RegExp(month));
    const monthIdx = mm
      ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(mm[0].slice(0, 3))
      : 0;
    return Number(y[0]) + Math.max(0, monthIdx) / 12;
  };
  const ranges: [number, number][] = [];
  for (const m of resume.matchAll(re)) {
    const a = toYears(m[1]);
    const b = toYears(m[3]);
    if (a !== null && b !== null && b > a && b - a < 45) ranges.push([a, b]);
  }
  if (!ranges.length) return null;
  // Merge overlaps so parallel roles / education don't double count
  ranges.sort((x, y) => x[0] - y[0]);
  let total = 0;
  let [cs, ce] = ranges[0];
  for (const [s, e] of ranges.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  return Math.round(total * 10) / 10;
}

export function analyzeResume(resumeText: string, keywords: Keyword[], job?: JobText): MatchReport {
  const text = resumeText.replace(/\s+/g, " ");
  const results: KeywordResult[] = keywords.map(({ patterns, ...k }) => {
    const resumeCount = countMatches(text, patterns);
    return { ...k, found: resumeCount > 0, resumeCount };
  });

  const totalWeight = results.reduce((s, k) => s + k.weight, 0);
  const gotWeight = results.reduce((s, k) => s + (k.found ? k.weight : 0), 0);
  const score = totalWeight ? Math.round((gotWeight / totalWeight) * 100) : 0;

  const required = results.filter((k) => k.importance === "required");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const checks: MatchReport["checks"] = [];
  checks.push({
    id: "email",
    ok: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
    label: "Email address",
    detail: "Recruiters and ATS systems expect an email on the resume.",
  });
  checks.push({
    id: "phone",
    ok: /(\+?\d[\d\s-]{8,}\d)/.test(text),
    label: "Phone number",
    detail: "Add a reachable phone number with country code.",
  });
  checks.push({
    id: "length",
    ok: words >= 250 && words <= 1200,
    label: "Resume length",
    detail:
      words < 250
        ? `Only ${words} words – add detail on projects and impact.`
        : words > 1200
          ? `${words} words – consider trimming to 1–2 pages.`
          : `${words} words – good length.`,
  });
  checks.push({
    id: "metrics",
    ok: /\d+\s?%|₹\s?\d|\$\s?\d|\b\d+x\b|\b\d{2,}\+?\s(users|clients|customers|records|requests)/i.test(text),
    label: "Quantified impact",
    detail: "Numbers (%, users, revenue, time saved) make achievements concrete.",
  });
  if (job?.experienceMin !== undefined && job.experienceMin > 0) {
    const yrs = estimateYearsOfExperience(resumeText);
    checks.push({
      id: "experience",
      ok: yrs !== null && yrs >= job.experienceMin,
      label: `Experience (${job.experienceMin}+ yrs asked)`,
      detail:
        yrs === null
          ? "Could not detect years of experience – state it in your summary (e.g. \"5 years of experience\")."
          : `Detected ~${yrs} years from your resume.`,
    });
  }

  return {
    score,
    keywords: results,
    matched: results.filter((k) => k.found),
    missing: results.filter((k) => !k.found),
    requiredCoverage: { matched: required.filter((k) => k.found).length, total: required.length },
    checks,
    resumeWordCount: words,
  };
}

/** Build a single regex that finds every keyword occurrence – used for highlighting. */
export function buildHighlighter(keywords: Keyword[]): { re: RegExp; lookup: (s: string) => Keyword | undefined } | null {
  if (!keywords.length) return null;
  const sources: string[] = [];
  const insensitive: { k: Keyword; re: RegExp }[] = [];
  for (const k of keywords) {
    for (const p of k.patterns) {
      // Fold case-sensitive patterns in as-is; the combined regex is case-insensitive,
      // lookup() re-checks against the original pattern (with its own flags).
      sources.push(p.source);
      insensitive.push({ k, re: new RegExp(`^(?:${p.source})$`, p.flags.replace("g", "")) });
    }
  }
  // Longest first so "React Native" wins over "React"
  sources.sort((a, b) => b.length - a.length);
  const re = new RegExp(sources.map((s) => `(?:${s})`).join("|"), "gi");
  return {
    re,
    lookup: (s: string) => insensitive.find((x) => x.re.test(s))?.k,
  };
}
