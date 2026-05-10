import { describe, it, expect } from "vitest";
import {
  cropToBackgroundStyle,
  cropToObjectPosition,
  cropFocalToPrecisePosition,
  type ImageCrop,
  type ImageFocal,
} from "./image-crop";

/**
 * Regresjonstester: fokuspunkt og crop skal ALDRI endre zoom/scale
 * på bilder (verken toppbilde eller innebilder). De skal kun påvirke
 * background-position. background-size må alltid være "cover" slik at
 * proporsjoner bevares uten ekstra inn-zoom eller strekking.
 */
describe("image-crop: focus point never affects zoom/scale", () => {
  const crops: Array<ImageCrop | null> = [
    null,
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 10, y: 20, width: 30, height: 40 }, // tett crop
    { x: 60, y: 60, width: 35, height: 35 },
  ];
  const focals: Array<ImageFocal | null> = [
    null,
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 100 },
    { x: 25, y: 75 },
  ];

  it("background-size is always 'cover' (default mode)", () => {
    for (const crop of crops) {
      for (const focal of focals) {
        const bg = cropToBackgroundStyle(crop, focal);
        expect(bg.size).toBe("cover");
      }
    }
  });

  it("background-size is always 'cover' (precision mode)", () => {
    for (const crop of crops) {
      for (const focal of focals) {
        const bg = cropToBackgroundStyle(crop, focal, { precise: true });
        expect(bg.size).toBe("cover");
      }
    }
  });

  it("never returns a scale/zoom-related token in size or position", () => {
    const forbidden = /(scale|zoom|\d+%\s+\d+%\s+\d)/i;
    for (const crop of crops) {
      for (const focal of focals) {
        const a = cropToBackgroundStyle(crop, focal);
        const b = cropToBackgroundStyle(crop, focal, { precise: true });
        expect(a.size).not.toMatch(forbidden);
        expect(b.size).not.toMatch(forbidden);
        expect(a.position).not.toMatch(/scale|zoom/i);
        expect(b.position).not.toMatch(/scale|zoom/i);
      }
    }
  });

  it("position values stay clamped to 0-100%", () => {
    for (const crop of crops) {
      for (const focal of focals) {
        for (const pos of [
          cropToObjectPosition(crop, focal),
          cropFocalToPrecisePosition(crop, focal),
        ]) {
          const matches = pos.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
          expect(matches).not.toBeNull();
          const [, x, y] = matches!;
          expect(Number(x)).toBeGreaterThanOrEqual(0);
          expect(Number(x)).toBeLessThanOrEqual(100);
          expect(Number(y)).toBeGreaterThanOrEqual(0);
          expect(Number(y)).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("changing focal point never changes background-size", () => {
    const crop: ImageCrop = { x: 10, y: 10, width: 40, height: 40 };
    const sizes = focals
      .filter((f): f is ImageFocal => f !== null)
      .flatMap((f) => [
        cropToBackgroundStyle(crop, f).size,
        cropToBackgroundStyle(crop, f, { precise: true }).size,
      ]);
    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBe("cover");
  });
});
