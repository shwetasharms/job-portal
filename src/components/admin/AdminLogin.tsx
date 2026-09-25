"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-5">
      <label className="block">
        <span className="label">Password</span>
        <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required aria-invalid={Boolean(error)} />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
