"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch, getToken } from "@/lib/api";

type Report = {
  count: number;
  totalMinor: number;
  totalDisplay: string;
  transactions: Array<{
    id: string;
    amountMinor: number;
    currency: string;
    status: string;
    createdAt: string;
    session: { boothInstance: { name: string; slug: string } };
  }>;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [sumupToken, setSumupToken] = useState("");
  const [merchantCode, setMerchantCode] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    adminFetch<Report>("/api/admin/payments/report").then(setReport);
  }, [router]);

  async function connectSumUp(e: React.FormEvent) {
    e.preventDefault();
    await adminFetch("/api/admin/organisation/sumup", {
      method: "PATCH",
      body: JSON.stringify({
        sumupAccessToken: sumupToken,
        sumupMerchantCode: merchantCode,
      }),
    });
    alert("SumUp credentials saved");
  }

  return (
    <AdminShell>
      <Nav />
      <div className="container">
        <PageHeader
          eyebrow="Commerce"
          title="Payments"
          lead="Connect SumUp at organisation level, then enable payment per booth instance."
        />

        <div className="card">
          <h2>SumUp merchant connection</h2>
          <form onSubmit={connectSumUp}>
            <div className="field">
              <label htmlFor="sumup-token">Access token</label>
              <input
                id="sumup-token"
                type="password"
                value={sumupToken}
                onChange={(e) => setSumupToken(e.target.value)}
                placeholder="Org-level SumUp API token"
              />
            </div>
            <div className="field">
              <label htmlFor="merchant-code">Merchant code</label>
              <input
                id="merchant-code"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--cta">
              Save connection
            </button>
          </form>
          <p className="card-hint mt-md">
            Enable payment per booth instance in instance settings.
          </p>
        </div>

        {report ? (
          <div className="card">
            <h2>Revenue report</h2>
            <p className="text-muted">
              <strong>{report.count}</strong> transactions — {report.totalDisplay}
            </p>
            {report.transactions.length === 0 ? (
              <p className="empty-state">No transactions recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Booth</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{new Date(t.createdAt).toLocaleString("en-GB")}</td>
                        <td>{t.session.boothInstance.name}</td>
                        <td>
                          {(t.amountMinor / 100).toFixed(2)} {t.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
