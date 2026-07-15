import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  authorId: string;
  authorName: string;
  currentVoiceId: string | null;
  clonedAt: string | null;
  onCloned: () => void;
}

export const AuthorVoiceSection = ({ authorId, authorName, currentVoiceId, clonedAt, onCloned }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "cloning">("idle");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Kun lydfiler", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Maks 20 MB", variant: "destructive" });
      return;
    }

    setStage("uploading");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      const path = `voice-samples/${authorId}-${Date.now()}.${file.name.split(".").pop() ?? "mp3"}`;
      const { error: upErr } = await supabase.storage
        .from("audio-uploads")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      setStage("cloning");
      const { data, error } = await supabase.functions.invoke("clone-author-voice", {
        body: { authorId, sampleStoragePath: path },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Stemme klonet", description: `${authorName} har nå AI-stemme.` });
      onCloned();
    } catch (e: any) {
      toast({ title: "Kloning feilet", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setStage("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = stage !== "idle";

  return (
    <div className="border border-border rounded-lg p-4 bg-secondary/30">
      <div className="flex items-center gap-2 mb-2">
        <Mic className="w-4 h-4 text-accent" />
        <h4 className="text-sm font-subhead font-semibold text-foreground">Stemmeprofil (AI)</h4>
        {currentVoiceId && (
          <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
            <Check className="w-2.5 h-2.5 inline mr-0.5" />klonet
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Last opp 1–3 minutter ren tale (helst forfatteren leser en avisartikkel høyt, ingen bakgrunnsstøy).
        ElevenLabs lager en AI-versjon av stemmen som brukes til lyd-modus.
      </p>
      {clonedAt && (
        <p className="text-xs text-muted-foreground mb-3">
          Sist klonet: {new Date(clonedAt).toLocaleString("nb-NO")}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 mr-1.5" />
          )}
          {stage === "uploading" ? "Laster opp…" : stage === "cloning" ? "Kloner stemme…" : currentVoiceId ? "Klon på nytt" : "Last opp lydprøve"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {!currentVoiceId && (
        <p className="text-[0.6875rem] text-muted-foreground mt-2 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          Krever at ELEVENLABS_API_KEY er konfigurert i Lovable Cloud.
        </p>
      )}
    </div>
  );
};
