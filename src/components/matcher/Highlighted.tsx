"use client";

import { Fragment, useMemo } from "react";
import { buildHighlighter, type Keyword } from "@/lib/matcher/engine";

/**
 * Renders text with keyword occurrences wrapped in <mark>.
 * `foundTerms` decides the colour: found in the resume → green, missing → amber.
 * When `onlyFound` is set (resume view), non-found terms are left plain.
 */
export function Highlighted({
  text,
  keywords,
  foundTerms,
  onlyFound = false,
}: {
  text: string;
  keywords: Keyword[];
  foundTerms: Set<string>;
  onlyFound?: boolean;
}) {
  const hl = useMemo(() => buildHighlighter(keywords), [keywords]);

  const nodes = useMemo(() => {
    if (!hl || !text) return [text];
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(hl.re)) {
      const idx = m.index ?? 0;
      const kw = hl.lookup(m[0]);
      if (!kw) continue; // case-sensitive term matched loosely – skip
      const found = foundTerms.has(kw.term);
      if (onlyFound && !found) continue;
      if (idx > last) out.push(text.slice(last, idx));
      out.push(
        <mark key={idx} className={found ? "kw-hit" : "kw-miss"} title={`${kw.term}${found ? " – in your resume" : " – missing from your resume"}`}>
          {m[0]}
        </mark>,
      );
      last = idx + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }, [hl, text, foundTerms, onlyFound]);

  return <Fragment>{nodes}</Fragment>;
}
