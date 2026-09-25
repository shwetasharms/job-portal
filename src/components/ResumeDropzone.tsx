"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { IconFile, IconUpload } from "./icons";
import { formatBytes } from "@/lib/format";

export const ACCEPTED_RESUME = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_RESUME_MB ?? 5);

export function checkResumeFile(f: File): string | null {
  const ext = f.name.toLowerCase().split(".").pop();
  if (ext !== "pdf" && ext !== "docx") return "Only PDF or DOCX files are accepted.";
  if (f.size === 0) return "The file is empty.";
  if (f.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB} MB.`;
  return null;
}

interface Props {
  file: File | null;
  onFile: (f: File | null) => void;
  error?: string | null;
  busy?: boolean;
  compact?: boolean;
}

export function ResumeDropzone({ file, onFile, error, busy, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = (f: File | undefined | null) => {
    if (!f) return;
    const err = checkResumeFile(f);
    setLocalError(err);
    onFile(err ? null : f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    accept(e.dataTransfer.files?.[0]);
  };

  const shownError = localError ?? error;

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_RESUME}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = ""; // allow re-selecting the same file after edits
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <IconFile width={20} height={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{busy ? "Reading…" : formatBytes(file.size)}</p>
          </div>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => inputRef.current?.click()}>
            Replace
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            onClick={() => {
              setLocalError(null);
              onFile(null);
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          aria-invalid={Boolean(shownError)}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition ${
            compact ? "p-5" : "p-8"
          } ${
            drag
              ? "border-brand-500 bg-brand-50"
              : shownError
                ? "border-red-300 bg-red-50/50"
                : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40"
          }`}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
            <IconUpload width={20} height={20} />
          </span>
          <span className="mt-3 text-sm font-semibold text-slate-900">
            <span className="text-brand-700">Upload resume</span> or drag and drop
          </span>
          <span className="mt-1 text-xs text-slate-500">PDF or DOCX, up to {MAX_MB} MB</span>
        </label>
      )}
      {shownError && <p className="field-error" role="alert">{shownError}</p>}
    </div>
  );
}
