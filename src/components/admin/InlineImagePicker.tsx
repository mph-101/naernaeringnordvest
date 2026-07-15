import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, Sparkles, Library, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ArchiveAsset {
  id: string;
  public_url: string;
  alt_text: string;
  caption: string;
  photographer: string;
  source: string | null;
}

export interface InlineImageResult {
  url: string;
  alt: string;
  caption: string;
  credit: string;
  source: string;
}

interface InlineImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: InlineImageResult) => void;
}

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

const MAX_BYTES = 5 * 1024 * 1024;

export const InlineImagePicker = ({ open, onOpenChange, onSelect }: InlineImagePickerProps) => {
  const [tab, setTab] = useState<"archive" | "upload">("archive");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveAssets, setArchiveAssets] = useState<ArchiveAsset[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [source, setSource] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadArchive = async () => {
    if (archiveAssets.length > 0) return;
    setArchiveLoading(true);
    const { data, error } = await (supabase as any)
      .from("media_assets")
      .select("id, public_url, alt_text, caption, photographer, source")
      .order("created_at", { ascending: false })
      .limit(200);
    setArchiveLoading(false);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    setArchiveAssets((data as ArchiveAsset[]) || []);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      loadArchive();
    } else {
      setPendingFile(null);
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl("");
      setAltText("");
      setCaption("");
      setPhotographer("");
      setSource("");
    }
    onOpenChange(isOpen);
  };

  const pickFromArchive = (asset: ArchiveAsset) => {
    onSelect({
      url: asset.public_url,
      alt: asset.alt_text || "",
      caption: asset.caption || "",
      credit: asset.photographer || "",
      source: asset.source || "",
    });
    handleOpen(false);
  };

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
    setPendingPreviewUrl(URL.createObjectURL(file));
    setAltText("");
    setCaption("");
    setPhotographer("");
    setSource("");
  };

  const handleSuggest = async () => {
    if (!pendingFile) return;
    setSuggesting(true);
    try {
      const imageBase64 = await fileToBase64(pendingFile);
      const { data, error } = await supabase.functions.invoke("suggest-image-meta", {
        body: { imageBase64, mimeType: pendingFile.type, hint: caption || altText || "" },
      });
      if (error) throw error;
      if (data?.alt_text && !altText.trim()) setAltText(data.alt_text);
      if (data?.caption && !caption.trim()) setCaption(data.caption);
      if (data?.photographer && !photographer.trim()) setPhotographer(data.photographer);
      toast({ title: "AI-forslag klart" });
    } catch (err: any) {
      toast({ title: "AI-forslag feilet", description: err.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const handleUploadAndSelect = async () => {
    if (!pendingFile) return;
    if (!altText.trim() || !caption.trim() || !photographer.trim()) {
      toast({ title: "Manglende metadata", description: "Alt-tekst, bildetekst og fotograf er påkrevd.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("article-images").upload(path, pendingFile, {
        contentType: pendingFile.type,
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("article-images").getPublicUrl(path);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from("media_assets").insert({
          storage_path: path,
          public_url: publicUrl,
          bucket: "article-images",
          mime_type: pendingFile.type,
          file_size: pendingFile.size,
          alt_text: altText.trim(),
          caption: caption.trim(),
          photographer: photographer.trim(),
          source: source.trim() || null,
          uploaded_by: user.id,
        });
      }

      onSelect({
        url: publicUrl,
        alt: altText.trim(),
        caption: caption.trim(),
        credit: photographer.trim(),
        source: source.trim(),
      });
      handleOpen(false);
      toast({ title: "Lastet opp", description: "Bildet er lagret i mediearkivet" });
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filteredArchive = archiveAssets.filter((a) => {
    const q = archiveSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      a.caption?.toLowerCase().includes(q) ||
      a.alt_text?.toLowerCase().includes(q) ||
      a.photographer?.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sett inn bilde</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-2 mb-4">
          <button
            type="button"
            onClick={() => setTab("archive")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === "archive" ? "bg-accent/10 text-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Library className="w-3.5 h-3.5 inline mr-1.5" />
            Mediearkiv
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === "upload" ? "bg-accent/10 text-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Upload className="w-3.5 h-3.5 inline mr-1.5" />
            Last opp nytt
          </button>
        </div>

        {tab === "archive" && (
          <>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="Søk i bildetekst, alt-tekst eller fotograf…"
                className="pl-9"
              />
            </div>
            {archiveLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Laster mediearkiv…
              </div>
            ) : filteredArchive.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Ingen bilder funnet. Bytt til «Last opp nytt» for å legge til et bilde.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredArchive.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickFromArchive(a)}
                    className="text-left bg-muted/30 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  >
                    <img src={a.public_url} alt={a.alt_text} className="w-full aspect-video object-cover" loading="lazy" />
                    <div className="p-2">
                      <p className="text-xs line-clamp-2">{a.caption}</p>
                      <p className="text-[0.625rem] text-muted-foreground mt-1">Foto: {a.photographer}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "upload" && (
          <div className="space-y-4">
            {!pendingFile ? (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Klikk for å velge bilde</span>
                  <span className="text-xs text-muted-foreground">Maks 5 MB</span>
                </button>
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFilePicked} className="hidden" />
              </>
            ) : (
              <>
                <div className="flex gap-3 items-start">
                  {pendingPreviewUrl && (
                    <img src={pendingPreviewUrl} alt="Forhåndsvisning" className="w-24 h-24 object-cover rounded border border-border flex-shrink-0" />
                  )}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{pendingFile.name} · {(pendingFile.size / 1024).toFixed(0)} KB</div>
                    <Button type="button" size="sm" variant="outline" onClick={handleSuggest} disabled={suggesting || uploading} className="w-full">
                      {suggesting ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analyserer…</> : <><Sparkles className="w-3.5 h-3.5 mr-2" />Foreslå med AI</>}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Alt-tekst <span className="text-destructive">*</span></Label>
                  <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Kort beskrivelse for skjermlesere" />
                </div>
                <div>
                  <Label>Bildetekst <span className="text-destructive">*</span></Label>
                  <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Hva viser bildet?" rows={2} />
                </div>
                <div>
                  <Label>Fotograf <span className="text-destructive">*</span></Label>
                  <Input value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="Navn Navnesen" />
                </div>
                <div>
                  <Label>Kilde / lisens (valgfri)</Label>
                  <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="NTB, Creative Commons, etc." />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setPendingFile(null); if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl); setPendingPreviewUrl(""); }}>
                    Velg annet bilde
                  </Button>
                  <Button onClick={handleUploadAndSelect} disabled={uploading}>
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Laster opp…</> : "Sett inn"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}

        {tab === "archive" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpen(false)}>Lukk</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
