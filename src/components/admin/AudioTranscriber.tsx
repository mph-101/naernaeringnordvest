import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface AudioTranscriberProps {
  onTranscript: (text: string) => void;
}

export interface AudioTranscriberHandle {
  uploadFile: (file: File) => Promise<void>;
  isProcessing: () => boolean;
}

type Stage = "idle" | "uploading" | "transcribing";

export const AudioTranscriber = forwardRef<AudioTranscriberHandle, AudioTranscriberProps>(
  ({ onTranscript }, ref) => {
    const [stage, setStage] = useState<Stage>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileName, setFileName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const stageRef = useRef<Stage>("idle");
    const { toast } = useToast();

    const setStageBoth = (s: Stage) => {
      stageRef.current = s;
      setStage(s);
    };

    const processFile = async (file: File) => {
      if (!file.type.startsWith("audio/")) {
        toast({ title: "Feil", description: "Kun lydfiler er tillatt", variant: "destructive" });
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({ title: "Feil", description: "Maks filstørrelse er 50 MB", variant: "destructive" });
        return;
      }

      setFileName(file.name);
      setStageBoth("uploading");
      setUploadProgress(0);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Ikke innlogget");

        const storagePath = `${session.user.id}/${Date.now()}_${file.name}`;
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
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload feilet: ${xhr.statusText}`));
          };
          xhr.onerror = () => reject(new Error("Nettverksfeil under opplasting"));

          const formData = new FormData();
          formData.append("", file);
          xhr.send(formData);
        });

        setStageBoth("transcribing");

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
        setStageBoth("idle");
        setUploadProgress(0);
        setFileName("");
        if (inputRef.current) inputRef.current.value = "";
      }
    };

    useImperativeHandle(ref, () => ({
      uploadFile: processFile,
      isProcessing: () => stageRef.current !== "idle",
    }));

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
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
            <Progress value={stage === "uploading" ? uploadProgress : 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stage === "uploading"
                ? `Laster opp: ${uploadProgress}%`
                : "Transkriberer med AI – dette kan ta litt tid..."}
            </p>
          </div>
        )}
      </div>
    );
  }
);

AudioTranscriber.displayName = "AudioTranscriber";
