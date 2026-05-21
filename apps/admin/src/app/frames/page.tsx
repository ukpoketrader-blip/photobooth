"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch, getToken } from "@/lib/api";

/** Empty = same-origin /api via Next.js rewrite (see next.config.ts). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type FrameAsset = {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  photoInsetX: number;
  photoInsetY: number;
  photoInsetW: number;
  photoInsetH: number;
};

export default function FramesPage() {
  const router = useRouter();
  const [frames, setFrames] = useState<FrameAsset[]>([]);
  const [meta, setMeta] = useState({
    name: "Default frame",
    canvasWidth: 1200,
    canvasHeight: 1800,
    photoInsetX: 100,
    photoInsetY: 200,
    photoInsetW: 1000,
    photoInsetH: 1200,
  });

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    adminFetch<FrameAsset[]>("/api/admin/frame-assets").then(setFrames);
  }, [router]);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="overlay"]');
    if (!fileInput?.files?.[0]) return;

    const fd = new FormData();
    fd.append("metadata", JSON.stringify(meta));
    fd.append("overlay", fileInput.files[0]);

    const token = getToken();
    const res = await fetch(`${API_URL}/api/admin/frame-assets`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      alert("Upload failed");
      return;
    }
    const asset = (await res.json()) as FrameAsset;
    setFrames((f) => [asset, ...f]);
    form.reset();
  }

  return (
    <AdminShell>
      <Nav />
      <div className="container">
        <PageHeader
          eyebrow="Branding"
          title="Frame assets"
          lead="Upload PNG overlays with transparency. Set photo inset to position the AI image."
        />

        <form className="card" onSubmit={upload}>
          <h2>Upload frame</h2>
          <div className="field">
            <label htmlFor="frame-name">Name</label>
            <input
              id="frame-name"
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
            />
          </div>
          <div className="field-grid field-grid--2">
            {(
              [
                ["canvasWidth", "Canvas W"],
                ["canvasHeight", "Canvas H"],
                ["photoInsetX", "Inset X"],
                ["photoInsetY", "Inset Y"],
                ["photoInsetW", "Inset W"],
                ["photoInsetH", "Inset H"],
              ] as const
            ).map(([key, label]) => (
              <div className="field" key={key}>
                <label htmlFor={key}>{label}</label>
                <input
                  id={key}
                  type="number"
                  value={meta[key]}
                  onChange={(e) =>
                    setMeta({ ...meta, [key]: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="overlay">PNG overlay</label>
            <input id="overlay" name="overlay" type="file" accept="image/png" required />
          </div>
          <button type="submit" className="btn btn--cta">
            Upload frame
          </button>
        </form>

        <div className="card">
          <h2>Existing frames</h2>
          {frames.length === 0 ? (
            <p className="empty-state">No frame assets uploaded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Canvas</th>
                    <th>Inset</th>
                  </tr>
                </thead>
                <tbody>
                  {frames.map((f) => (
                    <tr key={f.id}>
                      <td>{f.name}</td>
                      <td>
                        {f.canvasWidth}×{f.canvasHeight}
                      </td>
                      <td>
                        {f.photoInsetX},{f.photoInsetY} {f.photoInsetW}×{f.photoInsetH}
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
