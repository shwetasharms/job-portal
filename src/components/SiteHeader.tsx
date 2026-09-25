"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SITE_NAME } from "@/lib/format";

const NAV = [
  { href: "/", label: "Jobs", match: (p: string) => p === "/" || p.startsWith("/jobs") },
  { href: "/resume-match", label: "Resume Match", match: (p: string) => p.startsWith("/resume-match") },
  { href: "/admin", label: "Recruiter", match: (p: string) => p.startsWith("/admin") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">
            {SITE_NAME[0]}
          </span>
          <span className="text-lg">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {n.label}
                {n.href === "/resume-match" && (
                  <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    ATS
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          className="btn-ghost px-2 sm:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-slate-200 px-4 py-2 sm:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                n.match(pathname) ? "bg-brand-50 text-brand-700" : "text-slate-700"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
