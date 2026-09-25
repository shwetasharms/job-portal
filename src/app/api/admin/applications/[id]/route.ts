import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { updateApplicationStatus } from "@/lib/applications";

export const runtime = "nodejs";

const STATUSES = ["new", "shortlisted", "rejected"] as const;

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/applications/[id]">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = STATUSES.find((s) => s === body.status);
  if (!status) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const app = await updateApplicationStatus(id, status);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: app.status });
}
