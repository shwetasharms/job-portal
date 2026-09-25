import type { Job } from "./types";

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "HireHub";

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", CAD: "C$", EUR: "€", GBP: "£" };

function compactMoney(n: number, currency: string): string {
  if (currency === "INR") {
    if (n >= 100000) return `${+(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
    return String(n);
  }
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(0)}K`;
  return String(n);
}

export function formatSalary(s: Job["salary"]): string | null {
  if (!s) return null;
  const sym = CURRENCY_SYMBOL[s.currency] ?? `${s.currency} `;
  const per = s.period === "year" ? (s.currency === "INR" ? " PA" : "/yr") : s.period === "month" ? "/month" : "/hr";
  const lo = `${sym}${compactMoney(s.min, s.currency)}`;
  return s.max && s.max !== s.min
    ? `${lo} – ${sym}${compactMoney(s.max, s.currency)}${per}`
    : `${lo}${per}`;
}

export function formatExperience(e: Job["experience"]): string | null {
  if (!e) return null;
  if (e.min === 0 && (e.max ?? 0) <= 1) return "Fresher";
  if (e.max === undefined) return `${e.min}+ yrs`;
  return `${e.min}–${e.max} yrs`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const WORK_MODE_LABEL: Record<Job["workMode"], string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const EMPLOYMENT_LABEL: Record<Job["employmentType"], string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
