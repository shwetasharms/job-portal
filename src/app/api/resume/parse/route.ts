import { NextResponse, type NextRequest } from "next/server";
import { readResumeUpload, extractResumeText } from "@/lib/resume";

export const runtime = "nodejs";

/** Extract plain text from an uploaded PDF/DOCX resume. Nothing is stored. */
export async function POST(req: NextRequest) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }
  const upload = await readResumeUpload(fd.get("resume"));
  if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 422 });

  try {
    const text = await extractResumeText(upload.buf, upload.kind);
    if (text.replace(/\s/g, "").length < 30) {
      return NextResponse.json(
        {
          error:
            "We couldn't read text from this file. It may be a scanned image – export your resume as a text-based PDF or DOCX, or paste the text instead.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ text, kind: upload.kind });
  } catch (e) {
    console.warn(`[resume/parse] ${(e as Error).message}`);
    return NextResponse.json(
      { error: "This file could not be read. It may be corrupted or password protected." },
      { status: 422 },
    );
  }
}
