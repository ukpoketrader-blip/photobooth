import type { ReactNode } from "react";
import { BoothHeader } from "./BoothHeader";
import { StepProgress } from "./StepProgress";
import type { BoothStep } from "@/lib/booth-steps";

type BoothShellProps = {
  boothName: string;
  logoUrl?: string | null;
  step: BoothStep;
  paymentEnabled: boolean;
  centered?: boolean;
  children: ReactNode;
};

export function BoothShell({
  boothName,
  logoUrl,
  step,
  paymentEnabled,
  centered,
  children,
}: BoothShellProps) {
  return (
    <div className="booth-shell">
      <div className="booth-ambient" aria-hidden>
        <span className="booth-ambient__orb booth-ambient__orb--1" />
        <span className="booth-ambient__orb booth-ambient__orb--2" />
      </div>
      <BoothHeader boothName={boothName} logoUrl={logoUrl} />
      <StepProgress step={step} paymentEnabled={paymentEnabled} />
      <div className="booth-safe">
        <div className={`booth-content ${centered ? "booth-content--center" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
