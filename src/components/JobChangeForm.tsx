import { useState } from "react";
import { Briefcase, Link as LinkIcon, Sparkles, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

type ChangeType = "new_job" | "job_change" | "promotion";

interface JobChangeFormProps {
  onSubmitted?: () => void;
}

export const JobChangeForm = ({ onSubmitted }: JobChangeFormProps) => {
  const { language } = useTheme();
  const isNo = language === "no";

  const [mode, setMode] = useState<"form" | "paste">("form");
  const [personName, setPersonName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [oldRole, setOldRole] = useState("");
  const [oldCompany, setOldCompany] = useState("");
  const [changeType, setChangeType] = useState<ChangeType>("new_job");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [generatedNotice, setGeneratedNotice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const t = isNo
    ? {
        title: "Meld inn jobbendring",
        subtitle: "Tips oss om noen som har byttet jobb, fått ny jobb eller rykket opp",
        formMode: "Fyll inn skjema",
        pasteMode: "Lim inn tekst/lenke",
        name: "Navn",
        newRole: "Ny rolle",
        newCompany: "Nytt selskap",
        oldRole: "Gammel rolle",
        oldCompany: "Gammelt selskap",
        type: "Type endring",
        newJob: "Ny jobb",
        jobChange: "Byttet jobb",
        promotion: "Rykket opp",
        sourceUrl: "Kilde-URL (valgfritt)",
        pasteLabel: "Lim inn tekst fra LinkedIn eller annen kilde",
        generate: "Generer notis",
        regenerate: "Generer på nytt",
        submit: "Send inn",
        generating: "Genererer...",
        submitting: "Sender...",
        success: "Takk! Jobbendringen er sendt inn og venter på godkjenning.",
        loginRequired: "Du må logge inn for å melde inn jobbendringer.",
        generatedLabel: "Generert notis (kan redigeres)",
      }
    : {
        title: "Report a job change",
        subtitle: "Let us know about someone who changed jobs, got a new position or was promoted",
        formMode: "Fill in form",
        pasteMode: "Paste text/link",
        name: "Name",
        newRole: "New role",
        newCompany: "New company",
        oldRole: "Previous role",
        oldCompany: "Previous company",
        type: "Type of change",
        newJob: "New job",
        jobChange: "Job change",
        promotion: "Promotion",
        sourceUrl: "Source URL (optional)",
        pasteLabel: "Paste text from LinkedIn or another source",
        generate: "Generate notice",
        regenerate: "Regenerate",
        submit: "Submit",
        generating: "Generating...",
        submitting: "Submitting...",
        success: "Thank you! The job change has been submitted and is pending review.",
        loginRequired: "You need to log in to report job changes.",
        generatedLabel: "Generated notice (editable)",
      };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const body =
        mode === "paste"
          ? { source_text: sourceText, person_name: personName || "ukjent" }
          : { person_name: personName, new_role: newRole, new_company: newCompany, old_role: oldRole, old_company: oldCompany, change_type: changeType };

      const { data, error } = await supabase.functions.invoke("generate-job-notice", { body });
      if (error) throw error;
      setGeneratedNotice(data.notice || "");
    } catch (e: any) {
      toast.error(e.message || "Feil ved generering");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t.loginRequired);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("job_changes").insert({
        person_name: personName,
        new_role: newRole || null,
        new_company: newCompany || null,
        old_role: oldRole || null,
        old_company: oldCompany || null,
        change_type: changeType,
        source_url: sourceUrl || null,
        source_text: mode === "paste" ? sourceText || null : null,
        generated_notice: generatedNotice || null,
        submitted_by: session.user.id,
      } as any);
      if (error) throw error;
      toast.success(t.success);
      setPersonName(""); setNewRole(""); setNewCompany(""); setOldRole(""); setOldCompany("");
      setSourceUrl(""); setSourceText(""); setGeneratedNotice("");
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message || "Feil");
    } finally {
      setSubmitting(false);
    }
  };

  const canGenerate = mode === "paste" ? sourceText.trim().length > 10 : personName.trim().length > 0;
  const canSubmit = personName.trim().length > 0 && generatedNotice.trim().length > 0;

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

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode("form")} className={`px-3 py-1.5 rounded-full text-sm font-subhead font-medium transition-all ${mode === "form" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
          {t.formMode}
        </button>
        <button onClick={() => setMode("paste")} className={`px-3 py-1.5 rounded-full text-sm font-subhead font-medium transition-all ${mode === "paste" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
          <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
          {t.pasteMode}
        </button>
      </div>

      <div className="space-y-3">
        {/* Name always shown */}
        <input
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder={t.name}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {mode === "form" ? (
          <>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as ChangeType)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="new_job">{t.newJob}</option>
              <option value="job_change">{t.jobChange}</option>
              <option value="promotion">{t.promotion}</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={t.newRole} className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder={t.newCompany} className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={oldRole} onChange={(e) => setOldRole(e.target.value)} placeholder={t.oldRole} className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={oldCompany} onChange={(e) => setOldCompany(e.target.value)} placeholder={t.oldCompany} className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder={t.sourceUrl} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </>
        ) : (
          <>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={t.pasteLabel}
              rows={5}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder={t.sourceUrl} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-subhead font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? t.generating : generatedNotice ? t.regenerate : t.generate}
        </button>

        {/* Generated notice */}
        {generatedNotice && (
          <div>
            <label className="text-xs text-muted-foreground font-body mb-1 block">{t.generatedLabel}</label>
            <textarea
              value={generatedNotice}
              onChange={(e) => setGeneratedNotice(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-primary/30 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        )}

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
