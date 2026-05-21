import sharp from "sharp";
import { PRINT_WIDTH_PX, PRINT_HEIGHT_PX } from "@photobooth/shared";

/** Crop/resize to 6×4″ portrait (1200×1800 @ 300 DPI) for dye-sub output */
export async function normalizeToPrintSize(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(PRINT_WIDTH_PX, PRINT_HEIGHT_PX, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: 92 })
    .toBuffer();
}
