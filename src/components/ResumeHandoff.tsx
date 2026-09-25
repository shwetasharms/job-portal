"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Carries the resume a candidate uploaded in Resume Match over to the apply
 * form, so they don't have to pick the same file twice. Lives in memory only
 * (a File can't be serialised to storage) – a hard refresh clears it.
 */
interface Handoff {
  file: File | null;
  text: string;
  setResume: (file: File | null, text?: string) => void;
}

const Ctx = createContext<Handoff | null>(null);

export function ResumeHandoffProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const value = useMemo<Handoff>(
    () => ({
      file,
      text,
      setResume: (f, t = "") => {
        setFile(f);
        setText(t);
      },
    }),
    [file, text],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResumeHandoff() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useResumeHandoff must be used inside ResumeHandoffProvider");
  return v;
}
