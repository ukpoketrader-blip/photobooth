import { getFlowPhases, stepToPhaseIndex } from "@/lib/booth-steps";
import type { BoothStep } from "@/lib/booth-steps";

type StepProgressProps = {
  step: BoothStep;
  paymentEnabled: boolean;
};

export function StepProgress({ step, paymentEnabled }: StepProgressProps) {
  const phases = getFlowPhases(paymentEnabled);
  const activeIndex = stepToPhaseIndex(step, paymentEnabled);

  if (activeIndex < 0) return null;

  return (
    <div className="step-progress" role="progressbar" aria-valuenow={activeIndex + 1} aria-valuemin={1} aria-valuemax={phases.length}>
      {phases.map((_, i) => (
        <div
          key={phases[i]}
          className={[
            "step-progress__segment",
            i < activeIndex ? "step-progress__segment--done" : "",
            i === activeIndex ? "step-progress__segment--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}
