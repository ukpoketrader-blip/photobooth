import { z } from "zod";

export const boothAccessVerifySchema = z.object({
  password: z.string().min(1).max(200),
});

export const createSessionSchema = z.object({
  consentVersion: z.string(),
  marketingOptIn: z.boolean().default(false),
});

export const createPaymentSchema = z.object({
  mode: z.enum(["checkout", "terminal"]).default("checkout"),
});

export const selectJobSchema = z.object({
  jobId: z.string().cuid(),
});

export const createOrganisationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const createBoothInstanceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
  paymentEnabled: z.boolean().optional(),
  paymentAmountMinor: z.number().int().min(50).optional(),
  paymentCurrency: z.string().length(3).optional(),
  sumupReaderId: z.string().optional().nullable(),
  frameEnabled: z.boolean().optional(),
  frameAssetId: z.string().cuid().optional().nullable(),
  privacyNoticeHtml: z.string().optional(),
  maxPhotoVariants: z.number().int().min(1).max(5).optional(),
  enablePrint: z.boolean().optional(),
  enableQrShare: z.boolean().optional(),
  enableDownload: z.boolean().optional(),
  windowsPrinterName: z.string().max(200).optional().nullable(),
  printBridgeUrl: z.string().max(500).optional().nullable(),
});

export const updateBoothInstanceSchema = createBoothInstanceSchema.partial();

export const createFilterPresetSchema = z.object({
  name: z.string().min(1).max(100),
  promptTemplate: z.string().min(10).max(4000),
  negativePrompt: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
});

export const updateFilterPresetSchema = createFilterPresetSchema.partial();

export const createFrameAssetSchema = z.object({
  name: z.string().min(1).max(100),
  canvasWidth: z.number().int().min(100).max(4096),
  canvasHeight: z.number().int().min(100).max(4096),
  photoInsetX: z.number().int().min(0),
  photoInsetY: z.number().int().min(0),
  photoInsetW: z.number().int().min(1),
  photoInsetH: z.number().int().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateBoothInstanceInput = z.infer<typeof createBoothInstanceSchema>;
export type CreateFilterPresetInput = z.infer<typeof createFilterPresetSchema>;
