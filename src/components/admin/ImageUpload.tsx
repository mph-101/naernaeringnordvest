import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  currentUrl?: string;
  onUpload: (url: string) => void;
  bucket?: string;
}

export const ImageUpload = ({ currentUrl, onUpload, bucket = "article-images" }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Feil", description: "Kun bildefiler er tillatt", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Feil", description: "Maks filstørrelse er 5 MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      setPreview(publicUrl);
      onUpload(publicUrl);
      toast({ title: "Lastet opp", description: "Bildet er lastet opp" });
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
              <span className="text-xs text-muted-foreground">Maks 5 MB</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
};
