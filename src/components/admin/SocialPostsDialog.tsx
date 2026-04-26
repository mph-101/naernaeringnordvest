import { useEffect, useState } from "react";
import { Loader2, Copy, Check, Sparkles, Linkedin, Facebook, Instagram, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SocialPostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  excerpt: string;
  body: string;
  category?: string;
}

interface Drafts {
  linkedin: string;
  facebook: string;
  instagram: string;
}

const LIMITS: Record<keyof Drafts, number> = {
  linkedin: 1300,
  facebook: 240,
  instagram: 2200,
};

const META: Record<keyof Drafts, { label: string; helper: string; Icon: typeof Linkedin }> = {
  linkedin: { label: "LinkedIn", helper: "Profesjonell tone, 2–4 setninger.", Icon: Linkedin },
  facebook: { label: "Facebook / X", helper: "Kort krok, under 240 tegn.", Icon: Facebook },
  instagram: { label: "Instagram", helper: "Caption med 3–5 hashtags.", Icon: Instagram },
};

export const SocialPostsDialog = ({
  open,
  onOpenChange,
  title,
  excerpt,
  body,
  category,
}: SocialPostsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [copied, setCopied] = useState<keyof Drafts | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-posts", {
        body: { title, excerpt, body, category, language: "no" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDrafts({
        linkedin: data?.linkedin ?? "",
        facebook: data?.facebook ?? "",
        instagram: data?.instagram ?? "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukjent feil";
      toast({ title: "Klarte ikke generere", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !drafts && !loading) {
      void generate();
    }
    if (!open) {
      // Drop drafts when closed so reopening regenerates against latest content.
      setDrafts(null);
      setCopied(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateDraft = (key: keyof Drafts, value: string) => {
    setDrafts((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const copy = async (key: keyof Drafts) => {
    if (!drafts) return;
    try {
      await navigator.clipboard.writeText(drafts[key]);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
      toast({ title: "Kopiert", description: `${META[key].label}-utkast er på utklippstavlen.` });
    } catch {
      toast({ title: "Klarte ikke kopiere", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            SoMe-forslag
          </DialogTitle>
          <DialogDescription>
            AI-genererte utkast for LinkedIn, Facebook/X og Instagram. Rediger fritt og kopier.
          </DialogDescription>
        </DialogHeader>

        {loading && !drafts && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Genererer forslag...</span>
          </div>
        )}

        {drafts && (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {(Object.keys(META) as (keyof Drafts)[]).map((key) => {
              const { label, helper, Icon } = META[key];
              const value = drafts[key];
              const tooLong = value.length > LIMITS[key];
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {label}
                      <span className="text-xs font-normal text-muted-foreground">— {helper}</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(key)}
                      className="gap-1.5 h-7 px-2"
                    >
                      {copied === key ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Kopier
                    </Button>
                  </div>
                  <Textarea
                    value={value}
                    onChange={(e) => updateDraft(key, e.target.value)}
                    rows={key === "facebook" ? 3 : 5}
                    className="text-sm"
                  />
                  <div className={`text-xs text-right ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
                    {value.length} / {LIMITS[key]} tegn
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Generer på nytt
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Lukk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};