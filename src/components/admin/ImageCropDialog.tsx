import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crop as CropIcon, Target, RotateCcw } from "lucide-react";
import type { ImageCrop, ImageFocal } from "@/lib/image-crop";
import { cropToObjectPosition } from "@/lib/image-crop";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialCrop?: ImageCrop | null;
  initialFocal?: ImageFocal | null;
  onSave: (crop: ImageCrop | null, focal: ImageFocal | null) => void;
}

type Mode = "crop" | "focal";

const ASPECTS = {
  free: { label: "Fritt", value: undefined as number | undefined },
  hero: { label: "Hero 16:9", value: 16 / 9 },
  card: { label: "Kort 4:3", value: 4 / 3 },
};

/**
 * Convert a percent-based ImageCrop to a react-image-crop `Crop` object.
 */
function cropFromPercent(c: ImageCrop | null | undefined): Crop | undefined {
  if (!c) return undefined;
  return { unit: "%", x: c.x, y: c.y, width: c.width, height: c.height };
}

export const ImageCropDialog = ({
  open,
  onOpenChange,
  imageUrl,
  initialCrop,
  initialFocal,
  onSave,
}: ImageCropDialogProps) => {
  const [mode, setMode] = useState<Mode>("crop");
  const [aspect, setAspect] = useState<number | undefined>(ASPECTS.hero.value);
  const [crop, setCrop] = useState<Crop | undefined>(cropFromPercent(initialCrop));
  const [focal, setFocal] = useState<ImageFocal | null>(initialFocal ?? null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const focalImgRef = useRef<HTMLImageElement | null>(null);

  // Reset state when dialog opens with new image
  useEffect(() => {
    if (open) {
      setCrop(cropFromPercent(initialCrop));
      setFocal(initialFocal ?? null);
      setMode("crop");
    }
  }, [open, initialCrop, initialFocal]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      if (!crop && aspect) {
        const next = centerCrop(
          makeAspectCrop({ unit: "%", width: 80 }, aspect, width, height),
          width,
          height,
        );
        setCrop(next);
      }
    },
    [crop, aspect],
  );

  const handleAspectChange = (a: number | undefined) => {
    setAspect(a);
    if (imgRef.current && a) {
      const { width, height } = imgRef.current;
      const next = centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, a, width, height),
        width,
        height,
      );
      setCrop(next);
    }
  };

  const handleFocalClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFocal({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleSave = () => {
    let saved: ImageCrop | null = null;
    if (crop && crop.width > 0 && crop.height > 0) {
      saved = {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
      };
    }
    onSave(saved, focal);
    onOpenChange(false);
  };

  const handleReset = () => {
    setCrop(undefined);
    setFocal(null);
  };

  // Preview helpers — apply crop + focal to small format previews
  const previewObjectPosition = cropToObjectPosition(
    crop ? { x: crop.x as number, y: crop.y as number, width: crop.width as number, height: crop.height as number } : null,
    focal,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Velg bildeutsnitt</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 border-b border-border pb-3">
          <Button
            type="button"
            variant={mode === "crop" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("crop")}
          >
            <CropIcon className="w-4 h-4 mr-1.5" /> Utsnitt
          </Button>
          <Button
            type="button"
            variant={mode === "focal" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("focal")}
          >
            <Target className="w-4 h-4 mr-1.5" /> Fokuspunkt
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Tilbakestill
          </Button>
        </div>

        {mode === "crop" ? (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Sideforhold:</Label>
              {Object.entries(ASPECTS).map(([key, { label, value }]) => (
                <Button
                  key={key}
                  type="button"
                  variant={aspect === value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleAspectChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex justify-center bg-muted/30 rounded-lg p-3 max-h-[50vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={aspect}
                keepSelection
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop kilde"
                  onLoad={onImageLoad}
                  className="max-h-[45vh] w-auto"
                />
              </ReactCrop>
            </div>
            <p className="text-xs text-muted-foreground">
              Dra for å endre utsnittet. Sideforhold låses til valgt format.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center bg-muted/30 rounded-lg p-3 max-h-[50vh] overflow-auto">
              <div className="relative inline-block">
                <img
                  ref={focalImgRef}
                  src={imageUrl}
                  alt="Fokuspunkt-kilde"
                  onClick={handleFocalClick}
                  className="max-h-[45vh] w-auto cursor-crosshair"
                />
                {focal && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${focal.x}%`,
                      top: `${focal.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-accent shadow-lg bg-accent/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Klikk på bildet for å sette fokuspunktet. Dette holder motivet i sentrum når bildet beskjæres til ulike formater.
            </p>
          </div>
        )}

        {/* Live preview in both formats */}
        <div className="border-t border-border pt-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
            Forhåndsvisning
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Hero (16:9)</div>
              <div className="relative w-full rounded-md overflow-hidden border border-border bg-muted" style={{ aspectRatio: "16 / 9" }}>
                <img
                  src={imageUrl}
                  alt="Hero forhåndsvisning"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: previewObjectPosition }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Kort (4:3)</div>
              <div className="relative w-full rounded-md overflow-hidden border border-border bg-muted" style={{ aspectRatio: "4 / 3" }}>
                <img
                  src={imageUrl}
                  alt="Kort forhåndsvisning"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: previewObjectPosition }}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleSave}>
            Lagre utsnitt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
