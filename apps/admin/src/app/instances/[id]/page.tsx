"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch, getToken } from "@/lib/api";
import {
  GEMINI_IMAGE_MODEL_OPTIONS,
  type GeminiImageModelId,
} from "@photobooth/shared";

type FilterPreset = {
  id: string;
  name: string;
  promptTemplate: string;
  isDefault: boolean;
};

type FrameAsset = { id: string; name: string };

type Instance = {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  retentionDays: number;
  paymentEnabled: boolean;
  paymentAmountMinor: number;
  sumupReaderId: string | null;
  frameEnabled: boolean;
  frameAssetId: string | null;
  privacyNoticeHtml: string;
  maxPhotoVariants: number;
  enableQrShare: boolean;
  enableDownload: boolean;
  enablePrint: boolean;
  windowsPrinterName: string | null;
  printBridgeUrl: string | null;
  geminiImageModel: GeminiImageModelId;
  filterPresets: FilterPreset[];
};

export default function InstanceEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [frames, setFrames] = useState<FrameAsset[]>([]);
  const [newFilter, setNewFilter] = useState({ name: "", promptTemplate: "" });
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editFilter, setEditFilter] = useState({
    name: "",
    promptTemplate: "",
    isDefault: false,
  });
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const boothUrl = process.env.NEXT_PUBLIC_BOOTH_URL ?? "http://localhost:3000";

  const load = useCallback(async () => {
    const [list, frameList] = await Promise.all([
      adminFetch<Instance[]>("/api/admin/booth-instances"),
      adminFetch<FrameAsset[]>("/api/admin/frame-assets"),
    ]);
    const found = list.find((i) => i.id === id);
    if (!found) {
      router.push("/dashboard");
      return;
    }
    setInstance(found);
    setFrames(frameList);
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
  }, [load, router]);

  async function save(patch: Partial<Instance>) {
    if (!instance) return;
    const updated = await adminFetch<Instance>(
      `/api/admin/booth-instances/${instance.id}`,
      { method: "PATCH", body: JSON.stringify(patch) }
    );
    setInstance({ ...instance, ...updated, filterPresets: instance.filterPresets });
  }

  async function addFilter(e: React.FormEvent) {
    e.preventDefault();
    if (!instance) return;
    await adminFetch(`/api/admin/booth-instances/${instance.id}/filter-presets`, {
      method: "POST",
      body: JSON.stringify(newFilter),
    });
    setNewFilter({ name: "", promptTemplate: "" });
    load();
  }

  function startEditFilter(preset: FilterPreset) {
    setEditingFilterId(preset.id);
    setEditFilter({
      name: preset.name,
      promptTemplate: preset.promptTemplate,
      isDefault: preset.isDefault,
    });
  }

  function cancelEditFilter() {
    setEditingFilterId(null);
  }

  async function saveFilter(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFilterId) return;
    try {
      await adminFetch(`/api/admin/filter-presets/${editingFilterId}`, {
        method: "PATCH",
        body: JSON.stringify(editFilter),
      });
      setEditingFilterId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save filter");
    }
  }

  async function deleteFilter(preset: FilterPreset) {
    if (!instance) return;
    const msg =
      instance.filterPresets.length <= 1
        ? "This is the only filter for this booth and cannot be removed."
        : `Remove filter "${preset.name}"? It will no longer appear in the booth.`;
    if (!window.confirm(msg)) return;
    try {
      await adminFetch(`/api/admin/filter-presets/${preset.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete filter");
    }
  }

  async function rotateSecret() {
    if (!instance) return;
    const res = await adminFetch<{ apiSecret: string }>(
      `/api/admin/booth-instances/${instance.id}/rotate-secret`,
      { method: "POST" }
    );
    setRotatedSecret(res.apiSecret);
  }

  if (!instance) {
    return (
      <AdminShell>
        <Nav />
        <p className="admin-loading">Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Nav />
      <div className="container">
        <PageHeader
          eyebrow="Booth instance"
          title={instance.name}
          lead={
            <>
              Live kiosk:{" "}
              <a
                href={`${boothUrl}/b/${instance.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {boothUrl}/b/{instance.slug}
              </a>
            </>
          }
        />

        <div className="card">
          <h2>General</h2>
          <div className="field">
            <label>AI image model</label>
            <select
              value={instance.geminiImageModel}
              onChange={(e) =>
                save({
                  geminiImageModel: e.target.value as GeminiImageModelId,
                })
              }
            >
              {GEMINI_IMAGE_MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
            <small>
              Nano Banana Pro for best quality; Nano Banana 2 for faster turns at
              busy events.
            </small>
          </div>
          <div className="field">
            <label>Primary colour</label>
            <input
              type="color"
              value={instance.primaryColor}
              onChange={(e) => save({ primaryColor: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Retention (days)</label>
            <input
              type="number"
              value={instance.retentionDays}
              onChange={(e) => save({ retentionDays: parseInt(e.target.value, 10) })}
            />
          </div>
          <div className="field">
            <label>Privacy notice (HTML)</label>
            <textarea
              rows={4}
              value={instance.privacyNoticeHtml}
              onChange={(e) =>
                setInstance({ ...instance, privacyNoticeHtml: e.target.value })
              }
              onBlur={() => save({ privacyNoticeHtml: instance.privacyNoticeHtml })}
            />
          </div>
        </div>

        <div className="card">
          <h2>SumUp payment</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={instance.paymentEnabled}
              onChange={(e) => save({ paymentEnabled: e.target.checked })}
            />
            Require payment to start
          </label>
          <div className="field mt-md">
            <label>Price (pence)</label>
            <input
              type="number"
              value={instance.paymentAmountMinor}
              onChange={(e) =>
                save({ paymentAmountMinor: parseInt(e.target.value, 10) })
              }
            />
          </div>
          <div className="field">
            <label>SumUp reader ID</label>
            <input
              value={instance.sumupReaderId ?? ""}
              onChange={(e) =>
                setInstance({ ...instance, sumupReaderId: e.target.value || null })
              }
              onBlur={() => save({ sumupReaderId: instance.sumupReaderId })}
            />
          </div>
        </div>

        <div className="card">
          <h2>Photos &amp; sharing</h2>
          <div className="field">
            <label>Max photos per session (retakes + 1)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={instance.maxPhotoVariants ?? 3}
              onChange={(e) =>
                save({ maxPhotoVariants: parseInt(e.target.value, 10) || 3 })
              }
            />
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={instance.enableQrShare ?? true}
              onChange={(e) => save({ enableQrShare: e.target.checked })}
            />
            QR code share (instead of download-only)
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={instance.enableDownload ?? false}
              onChange={(e) => save({ enableDownload: e.target.checked })}
            />
            Show download button on booth
          </label>
        </div>

        <div className="card">
          <h2>Windows print (this kiosk PC)</h2>
          <p className="card-hint">
            Run the print bridge on the booth machine:{" "}
            <code>pnpm --filter @photobooth/print-bridge dev</code>
          </p>
          <label className="toggle">
            <input
              type="checkbox"
              checked={instance.enablePrint ?? false}
              onChange={(e) => save({ enablePrint: e.target.checked })}
            />
            Enable print button
          </label>
          <div className="field mt-md">
            <label>Windows printer name (exact)</label>
            <input
              placeholder="e.g. DNP DS620"
              value={instance.windowsPrinterName ?? ""}
              onChange={(e) =>
                setInstance({
                  ...instance,
                  windowsPrinterName: e.target.value || null,
                })
              }
              onBlur={() =>
                save({ windowsPrinterName: instance.windowsPrinterName })
              }
            />
            <small>
              List names via{" "}
              <a
                href="http://127.0.0.1:39100/printers"
                target="_blank"
                rel="noreferrer"
              >
                http://127.0.0.1:39100/printers
              </a>
            </small>
          </div>
          <div className="field">
            <label>Print bridge URL</label>
            <input
              value={instance.printBridgeUrl ?? "http://127.0.0.1:39100"}
              onChange={(e) =>
                setInstance({
                  ...instance,
                  printBridgeUrl: e.target.value || null,
                })
              }
              onBlur={() => save({ printBridgeUrl: instance.printBridgeUrl })}
            />
          </div>
        </div>

        <div className="card">
          <h2>Branding frame</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={instance.frameEnabled}
              onChange={(e) => save({ frameEnabled: e.target.checked })}
            />
            Enable frame overlay
          </label>
          <div className="field mt-md">
            <label>Frame asset</label>
            <select
              value={instance.frameAssetId ?? ""}
              onChange={(e) => save({ frameAssetId: e.target.value || null })}
            >
              <option value="">— None —</option>
              {frames.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <h2>AI filters</h2>
          <p className="card-hint">
            Filters shown to guests on this booth. At least one must remain active.
          </p>
          {instance.filterPresets.length === 0 ? (
            <p className="empty-state mb-md">No filters yet — add one below.</p>
          ) : (
            <ul className="filter-list">
              {instance.filterPresets.map((f) => (
                <li
                  key={f.id}
                  className={`filter-list__item ${editingFilterId === f.id ? "filter-list__item--editing" : ""}`}
                >
                  {editingFilterId === f.id ? (
                    <form className="filter-list__edit" onSubmit={saveFilter}>
                      <div className="field">
                        <label>Name</label>
                        <input
                          value={editFilter.name}
                          onChange={(e) =>
                            setEditFilter({ ...editFilter, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="field">
                        <label>Prompt</label>
                        <textarea
                          rows={5}
                          value={editFilter.promptTemplate}
                          onChange={(e) =>
                            setEditFilter({
                              ...editFilter,
                              promptTemplate: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={editFilter.isDefault}
                          onChange={(e) =>
                            setEditFilter({
                              ...editFilter,
                              isDefault: e.target.checked,
                            })
                          }
                        />
                        Default filter for this booth
                      </label>
                      <div className="filter-list__edit-actions">
                        <button type="submit" className="btn">
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={cancelEditFilter}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="filter-list__body">
                        <strong>{f.name}</strong>
                        {f.isDefault ? (
                          <span className="filter-list__badge">Default</span>
                        ) : null}
                        <p className="filter-list__prompt">{f.promptTemplate}</p>
                      </div>
                      <div className="filter-list__actions">
                        <button
                          type="button"
                          className="btn secondary filter-list__edit-btn"
                          onClick={() => startEditFilter(f)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn danger filter-list__delete"
                          onClick={() => deleteFilter(f)}
                          disabled={instance.filterPresets.length <= 1}
                          title={
                            instance.filterPresets.length <= 1
                              ? "Cannot delete the only filter"
                              : `Delete ${f.name}`
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addFilter}>
            <div className="field">
              <label>Name</label>
              <input
                value={newFilter.name}
                onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Prompt</label>
              <textarea
                rows={3}
                value={newFilter.promptTemplate}
                onChange={(e) =>
                  setNewFilter({ ...newFilter, promptTemplate: e.target.value })
                }
                required
              />
            </div>
            <button type="submit" className="btn btn--cta">
              Add filter
            </button>
          </form>
        </div>

        <div className="card">
          <h2>API secret</h2>
          <button type="button" className="btn secondary" onClick={rotateSecret}>
            Rotate secret
          </button>
          {rotatedSecret ? (
            <div className="alert alert--warning mt-md">
              New secret: <code>{rotatedSecret}</code>
            </div>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
