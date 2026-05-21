import sharp from "sharp";

export interface FrameInset {
  canvasWidth: number;
  canvasHeight: number;
  photoInsetX: number;
  photoInsetY: number;
  photoInsetW: number;
  photoInsetH: number;
}

export async function compositeWithFrame(
  styledImage: Buffer,
  frameOverlay: Buffer,
  inset: FrameInset
): Promise<Buffer> {
  const fitted = await sharp(styledImage)
    .resize(inset.photoInsetW, inset.photoInsetH, {
      fit: "cover",
      position: "centre",
    })
    .toBuffer();

  const base = await sharp({
    create: {
      width: inset.canvasWidth,
      height: inset.canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: fitted, left: inset.photoInsetX, top: inset.photoInsetY },
      { input: frameOverlay, left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  return base;
}
