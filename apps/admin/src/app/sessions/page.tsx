"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch, getToken } from "@/lib/api";

type SessionRow = {
  id: string;
  consentAt: string;
  paymentStatus: string;
  expiresAt: string;
  boothInstance: { name: string; slug: string };
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    adminFetch<SessionRow[]>("/api/admin/sessions").then(setSessions);
  }, [router]);

  async function erase(id: string) {
    if (!confirm("Delete this session and all photos? (GDPR erasure)")) return;
    await adminFetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  return (
    <AdminShell>
      <Nav />
      <div className="container">
        <PageHeader
          eyebrow="Privacy"
          title="Sessions"
          lead="Right to erasure: delete guest sessions and associated images."
        />

        <div className="card">
          {sessions.length === 0 ? (
            <p className="empty-state">No guest sessions recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Booth</th>
                    <th>Consent</th>
                    <th>Payment</th>
                    <th>Expires</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.boothInstance.name}</td>
                      <td>{new Date(s.consentAt).toLocaleString("en-GB")}</td>
                      <td>{s.paymentStatus}</td>
                      <td>{new Date(s.expiresAt).toLocaleDateString("en-GB")}</td>
                      <td>
                        <button
                          type="button"
                          className="btn danger btn--sm"
                          onClick={() => erase(s.id)}
                        >
                          Erase
                        </button>
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
