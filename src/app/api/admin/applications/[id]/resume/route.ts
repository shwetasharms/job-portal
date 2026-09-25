import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getApplication, readResumeFile } from "@/lib/applications";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/applications/[id]/resume">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const app = await getApplication(id);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const buf = await readResumeFile(app);
    const ext = app.resume.storedName.split(".").pop();
    const safeName = `${app.candidate.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "resume"}_${app.jobId}.${ext}`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": app.resume.mimeType,
        "Content-Length": String(buf.length),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Resume file missing" }, { status: 404 });
  }
}
