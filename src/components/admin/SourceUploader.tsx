import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, FileText, Mic, ImageIcon, Link2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SourceUploaderProps {
  onUploaded: (sourceId: string) => void;
}

type SourceType = "text" | "document" | "audio" | "image" | "url";

const TYPE_BUCKET_FOLDER: Record<SourceType, string> = {
  text: "",
  document: "documents",
  audio: "audio",
  image: "images",
  url: "",
};

export const SourceUploader = ({ onUploaded }: SourceUploaderProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<SourceType>("text");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle("");
    setTextContent("");
    setUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const insertSource = async (payload: {
    sourceType: SourceType;
    title: string;
    content?: string;
    source_url?: string;
    file_url?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Ikke innlogget");
    const { data, error } = await (supabase as any)
      .from("article_sources")
      .insert({
        uploaded_by: user.id,
        source_type: payload.sourceType,
        title: payload.title,
        content: payload.content ?? null,
        source_url: payload.source_url ?? null,
        file_url: payload.file_url ?? null,
        metadata: payload.metadata ?? {},
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  };

  const handleSubmit = async () => {
    setBusy(true);
    try {
      if (tab === "text") {
        if (!title.trim() || !textContent.trim()) {
          toast({ title: "Mangler tittel eller innhold", variant: "destructive" });
          setBusy(false);
          return;
        }
        const id = await insertSource({ sourceType: "text", title: title.trim(), content: textContent.trim() });
        toast({ title: "Kilde lagt til" });
        onUploaded(id);
        reset();
      } else if (tab === "url") {
        if (!url.trim()) {
          toast({ title: "Mangler URL", variant: "destructive" });
          setBusy(false);
          return;
        }
        // Create row immediately, extract in background
        const id = await insertSource({
          sourceType: "url",
          title: title.trim() || url.trim(),
          source_url: url.trim(),
          metadata: { status: "processing" },
        });
        // Fire async extraction (don't await — let UI poll)
        supabase.functions.invoke("extract-source-async", { body: { sourceId: id } }).catch((e) => {
          console.error("async extract dispatch failed", e);
        });
        toast({ title: "URL lagt til", description: "Henter innhold i bakgrunnen…" });
        onUploaded(id);
        reset();
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          toast({ title: "Velg en fil", variant: "destructive" });
          setBusy(false);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Ikke innlogget");
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${TYPE_BUCKET_FOLDER[tab]}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("article-sources").upload(path, file, {
          contentType: file.type,
        });
        if (upErr) throw upErr;

        // Create row immediately with processing status
        const id = await insertSource({
          sourceType: tab,
          title: title.trim() || file.name,
          file_url: path,
          metadata: { mime: file.type, size: file.size, original_name: file.name, status: "processing" },
        });
        // Fire async extraction
        supabase.functions.invoke("extract-source-async", { body: { sourceId: id } }).catch((e) => {
          console.error("async extract dispatch failed", e);
        });
        toast({ title: "Kilde lastet opp", description: "Henter tekst i bakgrunnen…" });
        onUploaded(id);
        reset();
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Feil",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h3 className="font-headline text-lg font-medium text-headline mb-4">Legg til kilde</h3>
      <Tabs value={tab} onValueChange={(v) => setTab(v as SourceType)}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="text"><FileText className="w-4 h-4 mr-1" />Tekst</TabsTrigger>
          <TabsTrigger value="document"><Upload className="w-4 h-4 mr-1" />Dokument</TabsTrigger>
          <TabsTrigger value="audio"><Mic className="w-4 h-4 mr-1" />Lyd</TabsTrigger>
          <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-1" />Bilde</TabsTrigger>
          <TabsTrigger value="url"><Link2 className="w-4 h-4 mr-1" />URL</TabsTrigger>
        </TabsList>

        <div className="space-y-3">
          <div>
            <Label htmlFor="source-title">Tittel (valgfri for filer)</Label>
            <Input id="source-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beskrivende navn på kilden" />
          </div>

          <TabsContent value="text" className="m-0">
            <Label htmlFor="source-text">Lim inn tekst</Label>
            <Textarea id="source-text" value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={8} placeholder="Pressmelding, e-post, notater…" />
          </TabsContent>

          <TabsContent value="document" className="m-0">
            <Label htmlFor="source-doc">PDF, DOCX eller TXT</Label>
            <Input id="source-doc" ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" />
          </TabsContent>

          <TabsContent value="audio" className="m-0">
            <Label htmlFor="source-audio">Lydfil (MP3, WAV, M4A)</Label>
            <Input id="source-audio" ref={fileRef} type="file" accept="audio/*" />
          </TabsContent>

          <TabsContent value="image" className="m-0">
            <Label htmlFor="source-image">Bilde med tekst (skjermbilde, scan)</Label>
            <Input id="source-image" ref={fileRef} type="file" accept="image/*" />
          </TabsContent>

          <TabsContent value="url" className="m-0">
            <Label htmlFor="source-url">URL</Label>
            <Input id="source-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </TabsContent>

          <Button onClick={handleSubmit} disabled={busy} className="w-full">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Behandler…</> : "Legg til kilde"}
          </Button>
        </div>
      </Tabs>
    </div>
  );
};
