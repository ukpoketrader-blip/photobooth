export type BoothStep =
  | "loading"
  | "consent"
  | "payment"
  | "filter"
  | "camera"
  | "processing"
  | "preview"
  | "select"
  | "share"
  | "error";

export type FlowPhase = "welcome" | "pay" | "look" | "capture" | "deliver";

const PHASE_LABELS: Record<FlowPhase, string> = {
  welcome: "Welcome",
  pay: "Pay",
  look: "Look",
  capture: "Capture",
  deliver: "Get photo",
};

export function getFlowPhases(paymentEnabled: boolean): FlowPhase[] {
  if (paymentEnabled) {
    return ["welcome", "pay", "look", "capture", "deliver"];
  }
  return ["welcome", "look", "capture", "deliver"];
}

export function stepToPhaseIndex(
  step: BoothStep,
  paymentEnabled: boolean
): number {
  const phases = getFlowPhases(paymentEnabled);
  let phase: FlowPhase = "welcome";

  switch (step) {
    case "loading":
    case "error":
      return -1;
    case "consent":
      phase = "welcome";
      break;
    case "payment":
      phase = "pay";
      break;
    case "filter":
      phase = "look";
      break;
    case "camera":
    case "processing":
    case "preview":
    case "select":
      phase = "capture";
      break;
    case "share":
      phase = "deliver";
      break;
  }

  return phases.indexOf(phase);
}

export { PHASE_LABELS };
