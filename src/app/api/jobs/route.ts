import { NextResponse, type NextRequest } from "next/server";
import { filterJobs, getAllJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/** Public JSON feed of jobs (same filters as the listing page). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const jobs = filterJobs(await getAllJobs(), {
      q: sp.get("q") ?? undefined,
      location: sp.get("location") ?? undefined,
      workMode: sp.get("workMode") ?? undefined,
      type: sp.get("type") ?? undefined,
      exp: sp.get("exp") ?? undefined,
    });
    return NextResponse.json({ jobs, total: jobs.length });
  } catch {
    return NextResponse.json({ error: "Job source unavailable." }, { status: 503 });
  }
}
