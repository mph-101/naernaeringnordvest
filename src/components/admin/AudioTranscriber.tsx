import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Upload, Loader2, FileAudio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioTranscriberProps {
  onTranscript: (text: string) => void;
}

export const AudioTranscriber = ({ onTranscript }: AudioTranscriberProps) => {
  const [uploading, setUploading] = useState(false);
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

    setFileName(file.name);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: formData,
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
      setUploading(false);
      setFileName("");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Transkriberer {fileName}...
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Last opp lyd
          </>
        )}
      </Button>
      <input ref={inputRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
    </div>
  );
};
