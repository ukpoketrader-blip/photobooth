"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { adminFetch, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("changeme");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await adminFetch<{ token: string }>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(
        msg === "Failed to fetch"
          ? "Cannot reach the API. Run: pnpm --filter @photobooth/api dev"
          : msg
      );
    }
  }

  return (
    <AdminShell>
      <main className="admin-login">
        <form className="card" onSubmit={handleSubmit}>
          <div className="admin-login__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/event-lab-logo.png"
              alt="Event Lab"
              className="admin-login__logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h1 className="admin-login__title">Event Lab Admin</h1>
          </div>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn--cta" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>
      </main>
    </AdminShell>
  );
}
