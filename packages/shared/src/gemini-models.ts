/** Google Gemini image model IDs (Nano Banana family). */
export const GEMINI_IMAGE_MODEL_IDS = [
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
] as const;

export type GeminiImageModelId = (typeof GEMINI_IMAGE_MODEL_IDS)[number];

export const DEFAULT_GEMINI_IMAGE_MODEL: GeminiImageModelId =
  "gemini-3-pro-image-preview";

export const GEMINI_IMAGE_MODEL_OPTIONS: ReadonlyArray<{
  id: GeminiImageModelId;
  label: string;
  description: string;
}> = [
  {
    id: "gemini-3-pro-image-preview",
    label: "Nano Banana Pro",
    description: "Best fidelity (slower)",
  },
  {
    id: "gemini-3.1-flash-image-preview",
    label: "Nano Banana 2",
    description: "Faster generation",
  },
];

export function isGeminiImageModelId(value: string): value is GeminiImageModelId {
  return (GEMINI_IMAGE_MODEL_IDS as readonly string[]).includes(value);
}

export function resolveGeminiImageModel(
  instanceModel: string | null | undefined,
  envFallback?: string
): GeminiImageModelId {
  if (instanceModel && isGeminiImageModelId(instanceModel)) {
    return instanceModel;
  }
  if (envFallback && isGeminiImageModelId(envFallback)) {
    return envFallback;
  }
  return DEFAULT_GEMINI_IMAGE_MODEL;
}
