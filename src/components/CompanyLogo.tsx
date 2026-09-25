import { initials } from "@/lib/format";

const PALETTE = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700"];

export function CompanyLogo({ name, logo, size = 48 }: { name: string; logo?: string; size?: number }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- logos come from arbitrary job-source domains
    return <img src={logo} alt={`${name} logo`} width={size} height={size} className="shrink-0 rounded-lg border border-slate-200 object-contain" />;
  }
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-lg text-sm font-bold ${PALETTE[hash % PALETTE.length]}`}
    >
      {initials(name)}
    </span>
  );
}
