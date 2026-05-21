import {
  PRINT_ASPECT_RATIO,
  PRINT_WIDTH_PX,
  PRINT_HEIGHT_PX,
} from "@photobooth/shared";

/** Crop video frame to 4:6 portrait and draw mirrored for selfie camera */
export function capturePortraitFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetAspect = PRINT_ASPECT_RATIO;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  const videoAspect = vw / vh;
  if (videoAspect > targetAspect) {
    sh = vh;
    sw = Math.round(vh * targetAspect);
    sx = Math.round((vw - sw) / 2);
  } else if (videoAspect < targetAspect) {
    sw = vw;
    sh = Math.round(vw / targetAspect);
    sy = Math.round((vh - sh) / 2);
  }

  canvas.width = PRINT_WIDTH_PX;
  canvas.height = PRINT_HEIGHT_PX;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.translate(PRINT_WIDTH_PX, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PRINT_WIDTH_PX, PRINT_HEIGHT_PX);
  ctx.restore();
}

export const PRINT_LABEL = "6×4″ portrait (1200×1800)";
