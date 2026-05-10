/**
 * Helpers for applying article image crop + focal point to <img> / background-image.
 *
 * Crop rect and focal point are stored as percentages (0-100) relative to the
 * original uploaded image. We use object-fit/background-size: cover with
 * object-position/background-position to pan without distorting the image.
 *
 * Strategy:
 * - If crop is set, we center the crop rect in the visible viewport.
 * - If focal is set, we use it only as a position hint.
 * - Without either, default to 50% 50% (center).
 */

export interface ImageCrop {
  x: number; // 0-100, top-left of crop rect
  y: number; // 0-100
  width: number; // 0-100
  height: number; // 0-100
}

export interface ImageFocal {
  x: number; // 0-100
  y: number; // 0-100
}

/**
 * Convert crop + focal into a CSS object-position string ("X% Y%").
 * Used with object-fit: cover. The result keeps the focal point of the
 * crop rect roughly centered in the visible area.
 */
export function cropToObjectPosition(
  crop: ImageCrop | null | undefined,
  focal: ImageFocal | null | undefined,
): string {
  // Focal point inside the original image (default = center of crop, or 50/50)
  let fx: number;
  let fy: number;
  if (focal) {
    fx = focal.x;
    fy = focal.y;
  } else if (crop) {
    fx = crop.x + crop.width / 2;
    fy = crop.y + crop.height / 2;
  } else {
    fx = 50;
    fy = 50;
  }
  // Clamp to [0, 100]
  fx = Math.max(0, Math.min(100, fx));
  fy = Math.max(0, Math.min(100, fy));
  return `${fx.toFixed(2)}% ${fy.toFixed(2)}%`;
}

/**
 * Precision mode: combine crop rect + focal point into a single, more accurate
 * background-position. The idea is to map the focal point — expressed in the
 * coordinate system of the original image — into the coordinate system of the
 * crop rectangle, so that with `background-size: cover` the focal point lands
 * as close as possible to the centre of the visible viewport.
 *
 * Falls back to crop-centre, focal alone, or 50/50 when inputs are missing.
 * Never changes background-size — caller keeps `cover` to preserve aspect.
 */
export function cropFocalToPrecisePosition(
  crop: ImageCrop | null | undefined,
  focal: ImageFocal | null | undefined,
): string {
  if (crop && focal) {
    // Where does the focal point sit *inside* the crop rect, as 0-100?
    const relX = ((focal.x - crop.x) / crop.width) * 100;
    const relY = ((focal.y - crop.y) / crop.height) * 100;
    const fx = Math.max(0, Math.min(100, relX));
    const fy = Math.max(0, Math.min(100, relY));
    return `${fx.toFixed(2)}% ${fy.toFixed(2)}%`;
  }
  return cropToObjectPosition(crop, focal);
}

/**
 * Convert crop + focal into background-image styles. Focus/crop only affects
 * background-position; background-size stays `cover` so we never add extra
 * zoom/scale or stretch the image.
 */
export function cropToBackgroundStyle(
  crop: ImageCrop | null | undefined,
  focal: ImageFocal | null | undefined,
  options?: { precise?: boolean },
): { size: string; position: string } {
  // Always preserve image aspect ratio — never stretch or distort.
  // background-size stays `cover`; only background-position changes.
  // When `precise` is true and both crop + focal are set, we map the
  // focal point into the crop's local coordinate system for a tighter,
  // more predictable framing.
  const position = options?.precise
    ? cropFocalToPrecisePosition(crop, focal)
    : cropToObjectPosition(crop, focal);
  return { size: "cover", position };
}

/**
 * Parse a value coming from Supabase jsonb (could be null, object, or string).
 */
export function parseCrop(v: unknown): ImageCrop | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const nums = ["x", "y", "width", "height"].map((k) => Number(o[k]));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [x, y, width, height] = nums;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

export function parseFocal(v: unknown): ImageFocal | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
