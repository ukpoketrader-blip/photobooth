"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { StepIntro } from "@/components/booth/StepIntro";

type SharePayload = {
  outputUrl: string;
  boothName: string;
  retentionDays: number;
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SharePayload>(`/api/public/share/${token}`)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Photo not found")
      );
  }, [token]);

  if (error) {
    return (
      <main className="share-page">
        <Image
          src="/brand/event-lab-logo.png"
          alt="Event Lab"
          width={140}
          height={36}
          className="share-page__logo"
        />
        <StepIntro eyebrow="Sorry" title="Photo not available" lead={error} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="share-page share-page--center">
        <div className="md-spinner md-spinner--on-surface" aria-hidden />
        <p className="text-body-lead">Loading your photo…</p>
      </main>
    );
  }

  return (
    <main className="share-page">
      <Image
        src="/brand/event-lab-logo.png"
        alt="Event Lab"
        width={140}
        height={36}
        className="share-page__logo"
      />
      <StepIntro
        eyebrow={data.boothName}
        title="Your portrait"
        lead="Long-press or use your browser menu to save."
      />
      <div className="share-page__photo md-card photo-frame--preview">
        <img src={data.outputUrl} alt="Shared photobooth" />
      </div>
      <p className="text-label-caps">
        Link expires after {data.retentionDays} days
      </p>
    </main>
  );
}
