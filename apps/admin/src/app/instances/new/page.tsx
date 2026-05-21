"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch } from "@/lib/api";

export default function NewInstancePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await adminFetch<{ instance: { id: string }; apiSecret: string }>(
        "/api/admin/booth-instances",
        {
          method: "POST",
          body: JSON.stringify({ name, slug }),
        }
      );
      setSecret(res.apiSecret);
      setTimeout(() => router.push(`/instances/${res.instance.id}`), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <AdminShell>
      <Nav />
      <div className="container container--narrow">
        <PageHeader
          eyebrow="Booth"
          title="New instance"
          lead="Create a kiosk URL slug and API credentials for a new photobooth."
        />

        <form className="card" onSubmit={handleSubmit}>
          {error ? <div className="alert alert--error">{error}</div> : null}
          {secret ? (
            <div className="alert alert--warning">
              Save this API secret (shown once): <code>{secret}</code>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug (URL)</label>
            <input
              id="slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              pattern="[a-z0-9-]+"
              required
            />
          </div>
          <button type="submit" className="btn btn--cta" disabled={!!secret}>
            Create instance
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
