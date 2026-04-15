import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface AudioTranscriberProps {
  onTranscript: (text: string) => void;
}

type Stage = "idle" | "uploading" | "transcribing";

export const AudioTranscriber = ({ onTranscript }: AudioTranscriberProps) => {
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast({ title: "Feil", description: "Kun lydfiler er tillatt", variant: "destructive" });
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxSize) {
      toast({ title: "Feil", description: "Maks filstørrelse er 50 MB", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setStage("uploading");
    setUploadProgress(0);

    try {
      // Upload to storage with XHR for progress tracking
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Ikke innlogget");

      const storagePath = `${session.user.id}/${Date.now()}_${file.name}`;

      // Use XMLHttpRequest for upload progress
      const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/audio-uploads/${storagePath}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
        xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader("x-upsert", "true");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload feilet: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Nettverksfeil under opplasting"));

        const formData = new FormData();
        formData.append("", file);
        xhr.send(formData);
      });

      // Transcribe
      setStage("transcribing");

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { storagePath },
      });

      if (error) throw error;

      if (data?.text) {
        onTranscript(data.text);
        toast({ title: "Transkribert", description: "Lydfilen er transkribert og lagt til i brødteksten" });
      } else {
        throw new Error("Ingen tekst mottatt");
      }
    } catch (err: any) {
      toast({ title: "Feil ved transkribering", description: err.message, variant: "destructive" });
    } finally {
      setStage("idle");
      setUploadProgress(0);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isProcessing = stage !== "idle";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {stage === "uploading" ? `Laster opp ${fileName}...` : `Transkriberer ${fileName}...`}
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Last opp lyd (maks 50 MB)
            </>
          )}
        </Button>
        <input ref={inputRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
      </div>

      {isProcessing && (
        <div className="space-y-1">
          <Progress
            value={stage === "uploading" ? uploadProgress : 100}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {stage === "uploading"
              ? `Laster opp: ${uploadProgress}%`
              : "Transkriberer med AI – dette kan ta litt tid..."}
          </p>
        </div>
      )}
    </div>
  );
};
