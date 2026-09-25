import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  adminCookieOptions,
  checkPassword,
  createAdminToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

// Naive in-memory throttle: 10 attempts / 10 min per IP
const attempts = new Map<string, { n: number; reset: number }>();

export async function POST(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Recruiter access is not configured. Set ADMIN_PASSWORD (min 8 chars) in .env.local." },
      { status: 503 },
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.reset > now && rec.n >= 10) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!body.password || !checkPassword(body.password)) {
    const r = rec && rec.reset > now ? rec : { n: 0, reset: now + 10 * 60_000 };
    r.n += 1;
    attempts.set(ip, r);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions);
  return res;
}
