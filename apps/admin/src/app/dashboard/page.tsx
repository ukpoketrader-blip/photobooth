"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch, getToken } from "@/lib/api";

type Instance = {
  id: string;
  name: string;
  slug: string;
  paymentEnabled: boolean;
  frameEnabled: boolean;
  _count: { sessions: number };
};

export default function DashboardPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    adminFetch<Instance[]>("/api/admin/booth-instances")
      .then(setInstances)
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Failed to load")
      );
  }, [router]);

  const boothUrl =
    process.env.NEXT_PUBLIC_BOOTH_URL ?? "http://localhost:3000";

  return (
    <AdminShell>
      <Nav />
      <div className="container">
        <PageHeader
          eyebrow="Event Lab"
          title="Dashboard"
          lead="Manage booth instances, AI filters, frames, and SumUp payments."
        >
          <Link href="/instances/new" className="btn btn--cta">
            New instance
          </Link>
        </PageHeader>

        {loadError ? <div className="alert alert--error">{loadError}</div> : null}

        <div className="card">
          <h2>Booth instances</h2>
          {instances.length === 0 ? (
            <p className="empty-state">
              No instances yet.{" "}
              <Link href="/instances/new">Create your first booth</Link>.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Sessions</th>
                    <th>Payment</th>
                    <th>Frame</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                      </td>
                      <td>
                        <a
                          href={`${boothUrl}/b/${i.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {i.slug}
                        </a>
                      </td>
                      <td>{i._count.sessions}</td>
                      <td>
                        <span
                          className={`badge ${i.paymentEnabled ? "badge--on" : "badge--off"}`}
                        >
                          {i.paymentEnabled ? "On" : "Off"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${i.frameEnabled ? "badge--on" : "badge--off"}`}
                        >
                          {i.frameEnabled ? "On" : "Off"}
                        </span>
                      </td>
                      <td>
                        <Link href={`/instances/${i.id}`}>Edit settings</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
