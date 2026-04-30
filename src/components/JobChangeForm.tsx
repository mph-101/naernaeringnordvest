import { useState, useRef } from "react";
import { Briefcase, Loader2, Send, ImagePlus, X, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface JobChangeFormProps {
  onSubmitted?: () => void;
}

export const JobChangeForm = ({ onSubmitted }: JobChangeFormProps) => {
  const { language } = useTheme();
  const isNo = language === "no";

  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoCredit, setPhotoCredit] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = isNo
    ? {
        title: "Tips om jobbendring",
        subtitle: "Send oss en lenke til kilden – redaksjonen tar seg av resten",
        sourceUrl: "Kilde-URL (f.eks. LinkedIn-innlegg)",
        sourceText: "Tilleggsinformasjon (valgfritt)",
        sourceTextPlaceholder: "Eventuell tekst, sitat eller kontekst",
        submit: "Send inn tips",
        submitting: "Sender...",
        success: "Takk! Tipset er mottatt og redaksjonen vurderer det.",
        loginRequired: "Du må logge inn for å sende inn tips.",
        addImage: "Legg til bilde (valgfritt)",
        photoCredit: "Fotokreditering (påkrevd hvis bilde)",
        urlRequired: "Kilde-URL er påkrevd",
        photoCreditRequired: "Fotokreditering er påkrevd når du legger ved bilde",
        editorialNote: "Redaksjonen skriver selve notisen basert på tipset.",
      }
    : {
        title: "Tip about a job change",
        subtitle: "Send us a link to the source – the editorial team handles the rest",
        sourceUrl: "Source URL (e.g. LinkedIn post)",
        sourceText: "Additional info (optional)",
        sourceTextPlaceholder: "Any text, quote or context",
        submit: "Submit tip",
        submitting: "Submitting...",
        success: "Thanks! The tip has been received and the editorial team will review it.",
        loginRequired: "You need to log in to submit tips.",
        addImage: "Add image (optional)",
        photoCredit: "Photo credit (required if image)",
        urlRequired: "Source URL is required",
        photoCreditRequired: "Photo credit is required when attaching an image",
        editorialNote: "The editorial team writes the actual notice based on the tip.",
      };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isNo ? "Maks 5 MB" : "Max 5 MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t.loginRequired);
      return;
    }

    if (!sourceUrl.trim()) {
      toast.error(t.urlRequired);
      return;
    }
    if (imageFile && !photoCredit.trim()) {
      toast.error(t.photoCreditRequired);
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("job-images").upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("job-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("job_changes").insert({
        person_name: null,
        change_type: "new_job",
        source_url: sourceUrl.trim(),
        source_text: sourceText.trim() || null,
        generated_notice: null,
        submitted_by: session.user.id,
        image_url: imageUrl,
        photo_credit: imageUrl ? photoCredit.trim() : null,
      } as any);
      if (error) throw error;
      toast.success(t.success);
      setSourceUrl(""); setSourceText("");
      removeImage(); setPhotoCredit("");
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message || "Feil");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = sourceUrl.trim().length > 0 && (!imageFile || photoCredit.trim().length > 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-headline text-lg font-semibold text-headline">{t.title}</h3>
          <p className="text-sm text-muted-foreground font-body">{t.subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Source URL — required */}
        <div className="relative">
          <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={`${t.sourceUrl} *`}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Optional text */}
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder={t.sourceTextPlaceholder}
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />

        {/* Image upload — optional */}
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-border" />
              <button onClick={removeImage} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-sm font-subhead text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ImagePlus className="w-4 h-4" /> {t.addImage}
            </button>
          )}
        </div>

        {/* Photo credit — only when image attached */}
        {imageFile && (
          <input
            value={photoCredit}
            onChange={(e) => setPhotoCredit(e.target.value)}
            placeholder={`${t.photoCredit} *`}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}

        <p className="text-xs text-muted-foreground font-body italic">{t.editorialNote}</p>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-subhead font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-soft"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? t.submitting : t.submit}
        </button>
      </div>
    </div>
  );
};
