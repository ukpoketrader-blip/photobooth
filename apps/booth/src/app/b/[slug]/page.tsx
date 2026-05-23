"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch, getApiUrl, getApiBaseForDisplay } from "@/lib/api";
import {
  getStoredBoothAccessToken,
  setStoredBoothAccessToken,
} from "@/lib/booth-access";
import { capturePortraitFromVideo, PRINT_LABEL } from "@/lib/capture";
import { useCountdownCapture } from "@/lib/use-countdown-capture";
import { JOB_POLL_INTERVAL_MS } from "@photobooth/shared";
import { BoothShell } from "@/components/booth/BoothShell";
import { StepIntro } from "@/components/booth/StepIntro";
import type { BoothStep } from "@/lib/booth-steps";

type BoothConfig = {
  slug: string;
  name: string;
  branding: { primaryColor: string; secondaryColor: string; logoUrl?: string };
  privacyNoticeHtml: string;
  consentVersion: string;
  retentionDays: number;
  requireAge16: boolean;
  paymentEnabled: boolean;
  paymentDisplay: string | null;
  frameEnabled: boolean;
  maxPhotoVariants: number;
  outputs: {
    download: boolean;
    qrShare: boolean;
    email: boolean;
    print: boolean;
  };
  filters: { id: string; name: string; isDefault: boolean }[];
  dataRegion: string;
  accessGateEnabled?: boolean;
};

type ProcessedVariant = {
  jobId: string;
  captureId: string;
  sequenceIndex: number;
  outputUrl: string;
};

export default function BoothPage() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<BoothConfig | null>(null);
  const [step, setStep] = useState<BoothStep>("loading");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProcessedVariant[]>([]);
  const [retakesRemaining, setRetakesRemaining] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxPhotos, setMaxPhotos] = useState(3);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const applyConfig = useCallback((c: BoothConfig) => {
    setConfig(c);
    const def = c.filters.find((f) => f.isDefault) ?? c.filters[0];
    setSelectedFilter(def?.id ?? null);
    setMaxPhotos(c.maxPhotoVariants ?? 3);
    setStep("consent");
  }, []);

  const loadInstance = useCallback(
    async (boothAccessToken?: string | null) => {
      const token =
        boothAccessToken !== undefined
          ? boothAccessToken
          : getStoredBoothAccessToken();
      const c = await apiFetch<BoothConfig>(`/api/public/instances/${slug}`, {
        boothAccessToken: token,
      });
      if (c.accessGateEnabled && (!c.filters || c.filters.length === 0)) {
        setConfig({
          slug: c.slug,
          name: c.name,
          accessGateEnabled: true,
          branding: { primaryColor: "#070235", secondaryColor: "#4648d4" },
          privacyNoticeHtml: "",
          consentVersion: "",
          retentionDays: 7,
          requireAge16: false,
          paymentEnabled: false,
          paymentDisplay: null,
          frameEnabled: false,
          maxPhotoVariants: 3,
          outputs: { download: false, qrShare: true, email: false, print: false },
          filters: [],
          dataRegion: "",
        });
        setStep("gate");
        return;
      }
      applyConfig(c);
    },
    [slug, applyConfig]
  );

  useEffect(() => {
    loadInstance()
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(
          msg === "Failed to fetch"
            ? `Cannot reach the API. Start it with: pnpm --filter @photobooth/api dev (expected ${getApiBaseForDisplay()})`
            : msg
        );
        setStep("error");
      });
  }, [loadInstance]);

  const submitGatePassword = useCallback(async () => {
    setGateError(null);
    setGateSubmitting(true);
    try {
      const res = await apiFetch<{
        accessToken: string | null;
        accessGateEnabled: boolean;
      }>("/api/public/booth-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword }),
        boothAccessToken: null,
      });
      if (!res.accessToken) {
        setGateError("Access gate is not enabled on the server.");
        return;
      }
      setStoredBoothAccessToken(res.accessToken);
      setGatePassword("");
      setStep("loading");
      await loadInstance(res.accessToken);
    } catch (e) {
      setGateError(e instanceof Error ? e.message : "Invalid password");
    } finally {
      setGateSubmitting(false);
    }
  }, [gatePassword, loadInstance]);

  const refreshVariants = useCallback(async () => {
    if (!token || !sessionId) return null;
    const res = await apiFetch<{
      variants: ProcessedVariant[];
      retakesRemaining: number;
      attemptCount: number;
      maxPhotos: number;
    }>(`/api/public/sessions/${sessionId}/captures`, { token });
    setVariants(res.variants);
    setRetakesRemaining(res.retakesRemaining);
    setAttemptCount(res.attemptCount);
    setMaxPhotos(res.maxPhotos);
    return res;
  }, [token, sessionId]);

  useEffect(() => {
    if ((step === "preview" || step === "select") && token && sessionId) {
      refreshVariants();
    }
  }, [step, token, sessionId, refreshVariants]);

  const pollJobUntilDone = useCallback(
    async (jobId: string): Promise<{ outputUrl: string; shareUrl?: string }> => {
      const job = await apiFetch<{
        status: string;
        outputUrl?: string;
        shareUrl?: string;
        errorMessage?: string;
      }>(`/api/public/jobs/${jobId}`, { token: token! });

      if (job.status === "succeeded" && job.outputUrl) {
        return { outputUrl: job.outputUrl, shareUrl: job.shareUrl ?? undefined };
      }
      if (job.status === "failed") {
        throw new Error(job.errorMessage ?? "Processing failed");
      }
      await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
      return pollJobUntilDone(jobId);
    },
    [token]
  );

  const selectJob = useCallback(
    async (jobId: string) => {
      if (!token || !sessionId) return;
      const res = await apiFetch<{
        outputUrl: string;
        shareUrl: string | null;
      }>(`/api/public/sessions/${sessionId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        token,
        body: JSON.stringify({ jobId }),
      });
      setResultUrl(res.outputUrl);
      if (res.shareUrl) setShareUrl(res.shareUrl);
      setStep("share");
    },
    [token, sessionId]
  );

  const startSession = useCallback(async () => {
    if (!config) return;
    const res = await apiFetch<{
      sessionId: string;
      token: string;
      paymentStatus: string;
      paymentEnabled: boolean;
    }>(`/api/public/instances/${slug}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentVersion: config.consentVersion,
        marketingOptIn: false,
      }),
    });
    setToken(res.token);
    setSessionId(res.sessionId);
    if (res.paymentEnabled && res.paymentStatus === "pending") {
      setStep("payment");
    } else {
      setStep("filter");
    }
  }, [config, slug]);

  const initiatePayment = useCallback(async () => {
    if (!token || !sessionId) return;
    const res = await apiFetch<{ checkoutUrl?: string; status: string }>(
      `/api/public/sessions/${sessionId}/payment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        token,
        body: JSON.stringify({ mode: "checkout" }),
      }
    );
    if (res.checkoutUrl) setCheckoutUrl(res.checkoutUrl);
  }, [token, sessionId]);

  const pollPayment = useCallback(async () => {
    if (!token || !sessionId) return;
    const res = await apiFetch<{ paymentStatus: string }>(
      `/api/public/sessions/${sessionId}`,
      { token }
    );
    if (res.paymentStatus === "paid") setStep("filter");
  }, [token, sessionId]);

  const simulatePaymentDev = useCallback(async () => {
    if (!sessionId) return;
    await fetch(getApiUrl(`/api/webhooks/sumup/simulate/${sessionId}`), {
      method: "POST",
    });
    await pollPayment();
  }, [sessionId, pollPayment]);

  useEffect(() => {
    if (step !== "payment" || !token || !sessionId) return;
    initiatePayment();
    const id = setInterval(pollPayment, 2000);
    return () => clearInterval(id);
  }, [step, token, sessionId, initiatePayment, pollPayment]);

  const startCamera = useCallback(async () => {
    setPreviewUrl(null);
    setCurrentJobId(null);
    setStep("camera");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 2880 },
        aspectRatio: { ideal: 2 / 3 },
      },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !token ||
      !sessionId ||
      !selectedFilter
    )
      return;

    capturePortraitFromVideo(videoRef.current, canvasRef.current);
    stopCamera();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    setStep("processing");
    const form = new FormData();
    form.append("image", blob, "capture.jpg");
    form.append("filterPresetId", selectedFilter);

    const res = await fetch(
      getApiUrl(`/api/public/sessions/${sessionId}/captures`),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
      };
      const base =
        err.error ??
        (res.status === 502
          ? "Server error uploading photo (502)"
          : "Upload failed");
      setError(err.hint ? `${base} — ${err.hint}` : base);
      setStep("error");
      return;
    }

    const data = (await res.json()) as {
      jobId: string;
      retakesRemaining: number;
      attemptNumber: number;
    };
    setRetakesRemaining(data.retakesRemaining);
    setAttemptCount(data.attemptNumber);
    setCurrentJobId(data.jobId);

    try {
      const done = await pollJobUntilDone(data.jobId);
      setPreviewUrl(done.outputUrl);
      setCurrentJobId(data.jobId);
      try {
        await refreshVariants();
      } catch {
        /* preview still works from job poll */
      }
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setStep("error");
    }
  }, [
    token,
    sessionId,
    selectedFilter,
    stopCamera,
    pollJobUntilDone,
    refreshVariants,
  ]);

  const countdown = useCountdownCapture(captureAndProcess);

  const printPhoto = useCallback(async () => {
    if (!token || !sessionId) return;
    setPrinting(true);
    try {
      await apiFetch(`/api/public/sessions/${sessionId}/print`, {
        method: "POST",
        token,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Print failed");
    } finally {
      setPrinting(false);
    }
  }, [token, sessionId]);

  const canRetake = retakesRemaining > 0;
  const multiVariants = variants.length > 1;
  const logoUrl = config?.branding.logoUrl ?? null;

  if (step === "loading") {
    return (
      <div className="booth-fullscreen booth-fullscreen--splash">
        <div className="md-spinner md-spinner--on-surface" aria-hidden />
        <p className="text-headline-md">Warming up the lab…</p>
        <p className="text-body-lead">Almost ready for your close-up</p>
      </div>
    );
  }

  if (step === "gate" && config) {
    return (
      <div className="booth-fullscreen">
        <StepIntro
          eyebrow="Private preview"
          title="Enter access code"
          lead={`${config.name} is in development. Enter the password to start a session.`}
        />
        <div className="booth-gate-card md-card md-card--elevated">
          <label className="booth-gate-label" htmlFor="booth-gate-password">
            Access password
          </label>
          <input
            id="booth-gate-password"
            className="booth-gate-input"
            type="password"
            autoComplete="current-password"
            value={gatePassword}
            onChange={(e) => setGatePassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && gatePassword && !gateSubmitting) {
                void submitGatePassword();
              }
            }}
          />
          {gateError ? <p className="booth-gate-error">{gateError}</p> : null}
          <button
            type="button"
            className="md-btn md-btn--hero"
            disabled={!gatePassword || gateSubmitting}
            onClick={() => void submitGatePassword()}
          >
            {gateSubmitting ? "Checking…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="booth-fullscreen">
        <StepIntro
          eyebrow="Oops"
          title="Something went wrong"
          lead={error ?? "Please try again in a moment."}
        />
        <div className="md-btn-stack" style={{ maxWidth: 400, width: "100%" }}>
          <button
            type="button"
            className="md-btn md-btn--filled"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="processing-overlay" role="alert" aria-busy="true">
        <div className="processing-overlay__card">
          <div className="processing-overlay__spinner" aria-hidden>
            <div className="md-spinner" />
          </div>
          <h2 className="processing-overlay__title text-headline-lg">
            Working our magic
          </h2>
          <p className="processing-overlay__lead text-body-lead">
            Styling your portrait — usually 5–15 seconds
          </p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <BoothShell
      boothName={config.name}
      logoUrl={logoUrl}
      step={step}
      paymentEnabled={config.paymentEnabled}
      centered={step === "consent"}
    >
      {step === "consent" && (
        <>
          <p className="text-display-kiosk">Let&apos;s make magic</p>
          <p className="text-body-lead">
            Snap, style, and share — your portrait, lab-grade.
          </p>
          <div
            className="md-card privacy-html"
            dangerouslySetInnerHTML={{ __html: config.privacyNoticeHtml }}
          />
          <label className="md-checkbox-row">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            <span>
              I consent to my photo being processed for this photobooth. Photos
              are deleted after {config.retentionDays} days.
            </span>
          </label>
          {config.requireAge16 && (
            <label className="md-checkbox-row">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
              />
              <span>
                I confirm I am 16 or older (or have parental consent).
              </span>
            </label>
          )}
          <div className="md-btn-stack">
            <button
              type="button"
              className="md-btn md-btn--hero"
              disabled={
                !consentChecked || (config.requireAge16 && !ageConfirmed)
              }
              onClick={startSession}
            >
              Start my session
            </button>
          </div>
        </>
      )}

      {step === "payment" && (
        <>
          <StepIntro
            eyebrow="Almost there"
            title="Pay to play"
            lead={`Tap or scan to pay ${config.paymentDisplay}, then jump straight into the booth.`}
          />
          {checkoutUrl ? (
            <div className="qr-card">
              <p className="step-intro__eyebrow qr-card__caption">Scan to pay</p>
              <QRCodeSVG value={checkoutUrl} size={220} level="M" fgColor="#1e1b4b" bgColor="#ffffff" />
            </div>
          ) : (
            <div className="md-card">
              <p className="text-body-base">
                Use the card terminal beside you, then continue below.
              </p>
            </div>
          )}
          <div className="md-btn-stack">
            <button type="button" className="md-btn md-btn--hero" onClick={pollPayment}>
              I&apos;ve paid — let&apos;s go
            </button>
            {process.env.NODE_ENV === "development" && (
              <button
                type="button"
                className="md-btn md-btn--outlined"
                onClick={simulatePaymentDev}
              >
                [Dev] Simulate payment
              </button>
            )}
          </div>
        </>
      )}

      {step === "filter" && (
        <>
          <StepIntro
            eyebrow="Step 1"
            title="Pick your vibe"
            lead="Each look transforms your portrait in seconds. Tap one to continue."
          />
          <div className="filter-grid">
            {config.filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-card ${selectedFilter === f.id ? "filter-card--selected" : ""}`}
                onClick={() => setSelectedFilter(f.id)}
              >
                {f.name}
                {f.isDefault && (
                  <span className="status-pill" style={{ display: "block", marginTop: 8 }}>
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="md-btn-stack">
            <button
              type="button"
              className="md-btn md-btn--hero"
              disabled={!selectedFilter}
              onClick={startCamera}
            >
              Open camera
            </button>
          </div>
        </>
      )}

      {step === "camera" && (
        <>
          <StepIntro
            eyebrow="Step 2"
            title="Strike a pose"
            lead={`${PRINT_LABEL} · Photo ${attemptCount + 1} of ${maxPhotos}`}
          />
          <span className="status-pill status-pill--live">Live camera</span>
          <div className="photo-frame photo-frame--live">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {countdown.overlay}
          </div>
          <div className="md-btn-stack">
            <button
              type="button"
              className="md-btn md-btn--hero"
              disabled={countdown.isCounting}
              onClick={countdown.start}
            >
              Take photo
            </button>
            <button
              type="button"
              className="md-btn md-btn--outlined"
              disabled={countdown.isCounting}
              onClick={() => {
                stopCamera();
                setStep("filter");
              }}
            >
              Back
            </button>
          </div>
        </>
      )}

      {step === "preview" && previewUrl && currentJobId && (
        <>
          <StepIntro
            eyebrow="Looking good"
            title="Love it?"
            lead={`Photo ${attemptCount} of ${maxPhotos} — keep this one or try again.`}
          />
          <div className="photo-frame photo-frame--preview">
            <img src={previewUrl} alt="Your styled preview" />
          </div>
          <div className="md-btn-stack">
            <button
              type="button"
              className="md-btn md-btn--hero"
              onClick={() => selectJob(currentJobId)}
            >
              Yes — use this photo
            </button>
            {canRetake && (
              <button
                type="button"
                className="md-btn md-btn--outlined"
                onClick={startCamera}
              >
                Retake ({retakesRemaining} left)
              </button>
            )}
            {multiVariants && (
              <button
                type="button"
                className="md-btn md-btn--tonal"
                onClick={() => setStep("select")}
              >
                {!canRetake
                  ? `Choose your favourite (${variants.length} photos)`
                  : `Compare all ${variants.length} photos`}
              </button>
            )}
          </div>
        </>
      )}

      {step === "select" && (
        <>
          <StepIntro
            eyebrow="Final pick"
            title="Choose your star shot"
            lead="Tap your favourite — we'll get it ready to save, print, or share."
          />
          <div className="variant-grid">
            {variants.map((v, i) => (
              <button
                key={v.jobId}
                type="button"
                className="variant-card"
                onClick={() => selectJob(v.jobId)}
              >
                <img src={v.outputUrl} alt={`Option ${i + 1}`} />
                <span className="variant-card__label">Photo {i + 1}</span>
              </button>
            ))}
          </div>
          {canRetake && (
            <div className="md-btn-stack">
              <button
                type="button"
                className="md-btn md-btn--outlined"
                onClick={startCamera}
              >
                Retake ({retakesRemaining} left)
              </button>
            </div>
          )}
        </>
      )}

      {step === "share" && resultUrl && (
        <>
          <StepIntro
            eyebrow="You did it"
            title="Your photo is ready"
            lead="Scan, download, or print — take it with you."
          />

          {config.outputs.qrShare && shareUrl && (
            <div className="qr-card qr-card--celebrate">
              <p className="step-intro__eyebrow qr-card__caption">Scan to download</p>
              <QRCodeSVG
                value={shareUrl}
                size={260}
                level="M"
                fgColor="#1e1b4b"
                bgColor="#ffffff"
              />
              <p className="qr-card__url">{shareUrl.replace(/^https?:\/\//, "")}</p>
            </div>
          )}

          <div className="md-btn-stack">
            {config.outputs.download && (
              <button
                type="button"
                className="md-btn md-btn--hero"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = resultUrl;
                  a.download = "photobooth.jpg";
                  a.click();
                }}
              >
                Download photo
              </button>
            )}

            {config.outputs.print && (
              <button
                type="button"
                className="md-btn md-btn--filled"
                disabled={printing}
                onClick={printPhoto}
              >
                {printing ? "Sending to printer…" : "Print my photo"}
              </button>
            )}

            {!config.outputs.qrShare &&
              !config.outputs.download &&
              !config.outputs.print && (
                <p className="text-body-base">No output options are enabled.</p>
              )}

            <button
              type="button"
              className="md-btn md-btn--outlined"
              onClick={() => window.location.reload()}
            >
              Take another photo
            </button>
          </div>
        </>
      )}
    </BoothShell>
  );
}

