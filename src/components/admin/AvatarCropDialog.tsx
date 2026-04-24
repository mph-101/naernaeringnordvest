import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Source image (object URL or remote URL) to crop. */
  imageUrl: string;
  /** Called with a square cropped JPEG blob ready for upload. */
  onSave: (blob: Blob) => Promise<void> | void;
}

const OUTPUT_SIZE = 512; // px — square output for byline avatar
const VIEWPORT = 280; // px — on-screen circular crop area

/**
 * Lightweight square avatar cropper with zoom + drag positioning.
 * Renders a circular viewport over the source image and produces a
 * centred square JPEG blob via canvas. No external library required.
 */
export const AvatarCropDialog = ({
  open,
  onOpenChange,
  imageUrl,
  onSave,
}: AvatarCropDialogProps) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // px offset from centre
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [saving, setSaving] = useState(false);

  // Reset whenever a new image is opened
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setNaturalSize(null);
    }
  }, [open, imageUrl]);

  // Base size: scale image so the shorter side covers the viewport
  const baseSize = (() => {
    if (!naturalSize) return { w: VIEWPORT, h: VIEWPORT };
    const ratio = naturalSize.w / naturalSize.h;
    if (ratio >= 1) {
      return { w: VIEWPORT * ratio, h: VIEWPORT };
    }
    return { w: VIEWPORT, h: VIEWPORT / ratio };
  })();

  const displaySize = { w: baseSize.w * zoom, h: baseSize.h * zoom };

  const clampOffset = (x: number, y: number) => {
    const maxX = Math.max(0, (displaySize.w - VIEWPORT) / 2);
    const maxY = Math.max(0, (displaySize.h - VIEWPORT) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
  };

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.x;
    const dy = t.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
  };

  const handleZoomChange = (val: number[]) => {
    const next = val[0] ?? 1;
    setZoom(next);
    // Re-clamp offset to keep image covering the viewport at new zoom
    if (naturalSize) {
      const ratio = naturalSize.w / naturalSize.h;
      const newSize =
        ratio >= 1
          ? { w: VIEWPORT * ratio * next, h: VIEWPORT * next }
          : { w: VIEWPORT * next, h: (VIEWPORT / ratio) * next };
      const maxX = Math.max(0, (newSize.w - VIEWPORT) / 2);
      const maxY = Math.max(0, (newSize.h - VIEWPORT) / 2);
      setOffset((o) => ({
        x: Math.max(-maxX, Math.min(maxX, o.x)),
        y: Math.max(-maxY, Math.min(maxY, o.y)),
      }));
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!imgRef.current || !naturalSize) return;
    setSaving(true);
    try {
      // Map viewport coords -> source image coords.
      const scale = naturalSize.w / displaySize.w; // px-source per px-display
      const cropSizeSrc = VIEWPORT * scale;
      // Centre of viewport in source coordinates
      const cx = naturalSize.w / 2 - offset.x * scale;
      const cy = naturalSize.h / 2 - offset.y * scale;
      const sx = Math.max(0, cx - cropSizeSrc / 2);
      const sy = Math.max(0, cy - cropSizeSrc / 2);
      const sSize = Math.min(cropSizeSrc, naturalSize.w - sx, naturalSize.h - sy);

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          0.9,
        );
      });
      await onSave(blob);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Juster utsnitt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            className="relative mx-auto bg-muted/50 overflow-hidden select-none"
            style={{
              width: VIEWPORT,
              height: VIEWPORT,
              cursor: dragging ? "grabbing" : "grab",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Source image, centred + offset */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Utsnitt-kilde"
              crossOrigin="anonymous"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              className="absolute pointer-events-none max-w-none"
              style={{
                width: displaySize.w,
                height: displaySize.h,
                left: `calc(50% - ${displaySize.w / 2}px + ${offset.x}px)`,
                top: `calc(50% - ${displaySize.h / 2}px + ${offset.y}px)`,
              }}
            />
            {/* Circular mask overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `0 0 0 9999px hsl(var(--background) / 0.7)`,
                borderRadius: "9999px",
              }}
            />
            <div className="absolute inset-0 pointer-events-none rounded-full ring-2 ring-primary/60" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Zoom</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Tilbakestill
              </Button>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={handleZoomChange}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Dra bildet for å plassere ansiktet. Bruk zoom for å beskjære.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !naturalSize}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lagre utsnitt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};