import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "jp_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function secret(): string | null {
  const s = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  return s && s.length >= 8 ? s : null;
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && secret());
}

function sign(payload: string, key: string) {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

export function createAdminToken(): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD / AUTH_SECRET not configured");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  const key = secret();
  if (!key || !token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(payload, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(payload.split(".")[1]);
  return Number.isFinite(exp) && exp * 1000 > Date.now();
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
