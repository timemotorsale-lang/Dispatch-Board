import { detectDocumentCorners, documentQualityHints, type DocumentCorners } from "./document-image";

export type AutoCaptureSample = { shades: Uint8Array; corners: DocumentCorners | null };

export function qualifyAutoCapture(pixels: Uint8ClampedArray, width: number, height: number, requireEdges: boolean): AutoCaptureSample | null {
  if (width < 24 || height < 24 || documentQualityHints(pixels, width, height).length) return null;
  const corners = requireEdges ? detectDocumentCorners(pixels, width, height) : null;
  if (requireEdges && (!corners || corners.some(p => p.horizontal < .025 || p.horizontal > .975 || p.vertical < .025 || p.vertical > .975))) return null;
  const shades = new Uint8Array(width * height);
  for (let index = 0; index < shades.length; index++) shades[index] = (pixels[index * 4] + pixels[index * 4 + 1] + pixels[index * 4 + 2]) / 3;
  return { shades, corners };
}

export function sameCaptureFrame(previous: AutoCaptureSample, current: AutoCaptureSample) {
  if (previous.shades.length !== current.shades.length) return false;
  if (previous.corners && current.corners) {
    const corners = current.corners;
    if (previous.corners.some((point, i) => Math.hypot(point.horizontal - corners[i].horizontal, point.vertical - corners[i].vertical) > .035)) return false;
  }
  let movement = 0, samples = 0, changed = 0;
  for (let index = 0; index < current.shades.length; index += 3) {
    const difference = Math.abs(current.shades[index] - previous.shades[index]);
    movement += difference; samples++; if (difference > 25) changed++;
  }
  return movement / samples < 5 && changed / samples < .075;
}
