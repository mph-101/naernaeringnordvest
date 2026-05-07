/**
 * Helpers for applying article image crop + focal point to <img> / background-image.
 *
 * Crop rect and focal point are stored as percentages (0-100) relative to the
 * original uploaded image. We use object-fit: cover with object-position to
 * approximate the crop without a server-side image pipeline.
 *
 * Strategy:
 * - If crop is set, we render the image with object-position so the chosen
 *   crop rect is centered in the visible viewport (approximation).
 * - If focal is set (without crop), we use it directly as object-position.
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
 * Convert crop + focal into background-image styles that emulate the crop
 * by zooming into the chosen rectangle while preserving the image aspect
 * ratio. Returns a uniform background-size (single percent applied to both
 * axes via a single value) and a background-position.
 *
 * Uses cover-style uniform zoom: scale = max(100/cropW, 100/cropH).
 * If only a focal point is set, falls back to background-size: cover.
 */
export function cropToBackgroundStyle(
  crop: ImageCrop | null | undefined,
  focal: ImageFocal | null | undefined,
): { size: string; position: string } {
  // Always preserve image aspect ratio — never stretch or distort.
  // We use background-size: cover (fills the container without changing
  // the image's proportions) and pan to the crop's focal centre via
  // background-position. The crop rectangle therefore drives FRAMING
  // (which part of the image to keep visible), not zoom level. This is
  // the safest behaviour when the container's aspect ratio differs from
  // the crop's, and matches what `<img object-fit: cover>` does.
  return {
    size: "cover",
    position: cropToObjectPosition(crop, focal),
  };
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
