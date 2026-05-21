export const CONSENT_VERSION = "1.0";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_FRAME_BYTES = 5 * 1024 * 1024;
export const JOB_POLL_INTERVAL_MS = 2000;
export const DEFAULT_RETENTION_DAYS = 7;
export const PAYMENT_UNLOCK_TTL_MINUTES = 15;

/** 6×4 inch portrait (4″ wide × 6″ tall) for dye-sub print */
export const PRINT_WIDTH_IN = 4;
export const PRINT_HEIGHT_IN = 6;
export const PRINT_DPI = 300;
export const PRINT_WIDTH_PX = PRINT_WIDTH_IN * PRINT_DPI; // 1200
export const PRINT_HEIGHT_PX = PRINT_HEIGHT_IN * PRINT_DPI; // 1800
/** width / height for camera & crop */
export const PRINT_ASPECT_RATIO = PRINT_WIDTH_PX / PRINT_HEIGHT_PX; // 2:3

/** Max photos per session (initial + retakes) */
export const MAX_PHOTO_VARIANTS = 3;
