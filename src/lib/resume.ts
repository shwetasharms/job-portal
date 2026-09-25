import "server-only";

export const MAX_RESUME_BYTES = Number(process.env.MAX_RESUME_MB ?? 5) * 1024 * 1024;

export type ResumeKind = "pdf" | "docx";

export const RESUME_MIME: Record<ResumeKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Detect file type from magic bytes – never trust the browser-supplied
 * MIME type or extension alone.
 */
export function detectResumeKind(buf: Buffer, filename: string): ResumeKind | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  // DOCX is a ZIP container ("PK\x03\x04") holding word/document.xml
  if (
    ext === "docx" &&
    buf.length > 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04 &&
    buf.includes(Buffer.from("word/"))
  ) {
    return "docx";
  }
  return null;
}

export async function extractResumeText(buf: Buffer, kind: ResumeKind): Promise<string> {
  if (kind === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return normalize(text);
  }
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return normalize(value);
}

function normalize(t: string) {
  return t
    .replace(/\u0000/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Validate an uploaded File from a multipart form. Returns buffer + kind or an error message. */
export async function readResumeUpload(
  file: FormDataEntryValue | null,
): Promise<{ ok: true; buf: Buffer; kind: ResumeKind; name: string } | { ok: false; error: string }> {
  if (!file || typeof file === "string") return { ok: false, error: "Please attach your resume." };
  if (file.size === 0) return { ok: false, error: "The resume file is empty." };
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, error: `Resume must be under ${Math.round(MAX_RESUME_BYTES / 1024 / 1024)} MB.` };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = detectResumeKind(buf, file.name);
  if (!kind) return { ok: false, error: "Only PDF or DOCX resumes are accepted." };
  return { ok: true, buf, kind, name: file.name };
}
