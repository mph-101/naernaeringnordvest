import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, X, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export interface UploadedImageMeta {
  url: string;
  mediaId?: string;
  alt_text: string;
  caption: string;
  photographer: string;
  source?: string;
}

interface ImageUploadProps {
  currentUrl?: string;
  /** Called with just the URL for backwards compatibility. Prefer onUploadWithMeta. */
  onUpload: (url: string) => void;
  /** Optional: receive full metadata + media_assets row id */
  onUploadWithMeta?: (meta: UploadedImageMeta) => void;
  bucket?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

export const ImageUpload = ({ currentUrl, onUpload, onUploadWithMeta, bucket = "article-images" }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [source, setSource] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Feil", description: "Kun bildefiler er tillatt", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Feil", description: "Maks filstørrelse er 5 MB", variant: "destructive" });
      return;
    }
    setPendingFile(file);
    setAltText("");
    setCaption("");
    setPhotographer("");
    setSource("");
    setMetaOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    const altOk = altText.trim().length > 0;
    const capOk = caption.trim().length > 0;
    const photoOk = photographer.trim().length > 0;
    if (!altOk || !capOk || !photoOk) {
      toast({
        title: "Manglende metadata",
        description: "Alt-tekst, bildetekst og fotograf er påkrevd.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, pendingFile, {
        contentType: pendingFile.type,
      });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      // Persist to media_assets archive
      let mediaId: string | undefined;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await (supabase as any)
          .from("media_assets")
          .insert({
            storage_path: path,
            public_url: publicUrl,
            bucket,
            mime_type: pendingFile.type,
            file_size: pendingFile.size,
            alt_text: altText.trim(),
            caption: caption.trim(),
            photographer: photographer.trim(),
            source: source.trim() || null,
            uploaded_by: user.id,
          })
          .select("id")
          .single();
        if (!error && data) mediaId = data.id;
      }

      setPreview(publicUrl);
      onUpload(publicUrl);
      onUploadWithMeta?.({
        url: publicUrl,
        mediaId,
        alt_text: altText.trim(),
        caption: caption.trim(),
        photographer: photographer.trim(),
        source: source.trim() || undefined,
      });

      toast({ title: "Lastet opp", description: "Bildet er lagret i mediearkivet" });
      setMetaOpen(false);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setMetaOpen(false);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={() => { setPreview(""); onUpload(""); }}
            className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Klikk for å laste opp bilde</span>
              <span className="text-xs text-muted-foreground">Maks 5 MB · krever bildetekst, fotograf og alt-tekst</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFilePicked} className="hidden" />

      <Dialog open={metaOpen} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bildemetadata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingFile && (
              <div className="text-xs text-muted-foreground">
                {pendingFile.name} · {(pendingFile.size / 1024).toFixed(0)} KB
              </div>
            )}
            <div>
              <Label htmlFor="img-alt">
                Alt-tekst <span className="text-destructive">*</span>
              </Label>
              <Input
                id="img-alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Kort beskrivelse for skjermlesere"
                maxLength={250}
              />
            </div>
            <div>
              <Label htmlFor="img-caption">
                Bildetekst <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="img-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Hva viser bildet?"
                rows={2}
                maxLength={500}
              />
            </div>
            <div>
              <Label htmlFor="img-photographer">
                Fotograf / kreditering <span className="text-destructive">*</span>
              </Label>
              <Input
                id="img-photographer"
                value={photographer}
                onChange={(e) => setPhotographer(e.target.value)}
                placeholder="f.eks. Ola Nordmann"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="img-source">Kilde / lisens (valgfri)</Label>
              <Input
                id="img-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="f.eks. NTB, Creative Commons"
                maxLength={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={uploading}>Avbryt</Button>
            <Button onClick={handleConfirmUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Laster opp…</> : "Last opp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
