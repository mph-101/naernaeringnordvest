import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  SpellCheck,
  Check,
  Heading2,
  Wand2,
  Undo2,
  Plus,
  X,
  Sparkles,
  Megaphone,
  Users,
} from "lucide-react";
import { CollaborativeRichTextEditor } from "./CollaborativeRichTextEditor";
import { ProofreadRules } from "./ProofreadRules";
import { AudioTranscriber, type AudioTranscriberHandle } from "./AudioTranscriber";
import { AIDraftFromSourcesButton } from "./AIDraftFromSourcesButton";
import { CollapsibleSection } from "./CollapsibleSection";
import { SocialPostsDialog } from "./SocialPostsDialog";
import type { ChartData } from "@/components/charts/ArticleChart";
import type { FactBoxData } from "@/components/factbox/FactBox";
import type { SourceCardData } from "@/components/source-card/SourceCard";
import type { ProofSuggestion } from "@/hooks/useArticleProofreading";

interface ArticleEditorBodyProps {
  body: string;
  title: string;
  excerpt: string;
  category: string;
  keyPoints: string[];
  keyPointsEn: string[];
  onBodyChange: (html: string) => void;
  onFormUpdate: (updates: Record<string, any>) => void;
  editorRef: (editor: any) => void;

  // Proofreading
  proofreading: boolean;
  proofSuggestions: ProofSuggestion[];
  proofUndoStack: { previousBody: string; restored: ProofSuggestion[] }[];
  onProofread: () => void;
  onApplyAllProof: () => void;
  onDismissAllProof: () => void;
  onUndoLastProof: () => void;

  // AI
  generatingPoints: boolean;
  generatingTitleExcerpt: boolean;
  generatingSubheadings: boolean;
  improving: boolean;
  onGenerateKeyPoints: (isEnglish?: boolean) => void;
  onGenerateTitleExcerpt: () => void;
  onGenerateSubheadings: () => void;
  onImproveBody: (focus: string[]) => void;
  onApplyDraft: (draft: { title: string; excerpt: string; body: string; key_points: string[] }) => void;

  // Insert handlers
  onInsertImage: () => void;
  onInsertChart: () => void;
  onEditChart: (chart: ChartData, pos: number) => void;
  onInsertFactBox: () => void;
  onEditFactBox: (data: FactBoxData, pos: number) => void;
  onInsertSourceCard: () => void;
  onEditSourceCard: (data: SourceCardData, pos: number) => void;

  // Collaboration
  articleId: string | null;
  collabEnabled: boolean;
}

export const ArticleEditorBody = ({
  body,
  title,
  excerpt,
  category,
  keyPoints,
  keyPointsEn,
  onBodyChange,
  onFormUpdate,
  editorRef,
  articleId,
  collabEnabled,
  proofreading,
  proofSuggestions,
  proofUndoStack,
  onProofread,
  onApplyAllProof,
  onDismissAllProof,
  onUndoLastProof,
  generatingPoints,
  generatingTitleExcerpt,
  generatingSubheadings,
  improving,
  onGenerateKeyPoints,
  onGenerateTitleExcerpt,
  onGenerateSubheadings,
  onImproveBody,
  onApplyDraft,
  onInsertImage,
  onInsertChart,
  onEditChart,
  onInsertFactBox,
  onEditFactBox,
  onInsertSourceCard,
  onEditSourceCard,
}: ArticleEditorBodyProps) => {
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  // Editorial staff (journalist and up) may turn collaboration on/off.
  const canToggleCollab = hasAnyRole(["admin", "editor", "journalist"]);
  const audioRef = useRef<AudioTranscriberHandle>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const dragCounterRef = useRef(0);
  const [improveFocus, setImproveFocus] = useState<string[]>(["sitater", "lenker", "lengde", "struktur", "stil"]);
  const [improvePopoverOpen, setImprovePopoverOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);

  const handleAudioTranscript = (text: string) => {
    const separator = body ? "<p></p>" : "";
    onBodyChange(body + separator + `<p>${text}</p>`);
  };

  const handleKeyPointChange = (index: number, value: string, isEnglish = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    const points = isEnglish ? [...keyPointsEn] : [...keyPoints];
    points[index] = value;
    onFormUpdate({ [field]: points });
  };

  const addKeyPoint = (isEnglish = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    const points = isEnglish ? keyPointsEn : keyPoints;
    onFormUpdate({ [field]: [...points, ""] });
  };

  const removeKeyPoint = (index: number, isEnglish = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    const points = isEnglish ? keyPointsEn : keyPoints;
    onFormUpdate({ [field]: points.filter((_, i) => i !== index) });
  };

  return (
    <>
      <CollapsibleSection
        title="Norsk innhold"
        defaultOpen
        storageKey="norwegian-content"
        headerRight={
          <div className="flex gap-2 flex-wrap">
            <AIDraftFromSourcesButton onApply={onApplyDraft} />
            <Button type="button" variant="outline" size="sm" onClick={onGenerateTitleExcerpt} disabled={generatingTitleExcerpt || !body || body.length < 50} className="gap-2">
              {generatingTitleExcerpt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generatingTitleExcerpt ? "Genererer..." : "Generer tittel/ingress"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSocialDialogOpen(true)}
              disabled={!title || !body || body.length < 50}
              className="gap-2"
              title="Generer SoMe-utkast for LinkedIn, Facebook/X og Instagram"
            >
              <Megaphone className="w-3.5 h-3.5" />
              SoMe-forslag
            </Button>
            <AudioTranscriber ref={audioRef} onTranscript={handleAudioTranscript} />
          </div>
        }
      >
        <div>
          <Label htmlFor="title">Tittel *</Label>
          <Input id="title" value={title} onChange={(e) => onFormUpdate({ title: e.target.value })} placeholder="Artikkelens tittel" className="mt-1.5" required />
        </div>

        <div>
          <Label htmlFor="excerpt">Ingress *</Label>
          <textarea id="excerpt" value={excerpt} onChange={(e) => onFormUpdate({ excerpt: e.target.value })} placeholder="Kort beskrivelse av artikkelen" className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Brødtekst *</Label>
            <div className="flex items-center gap-1 flex-wrap">
              <ProofreadRules />
              <Button type="button" variant="outline" size="sm" onClick={onProofread} disabled={proofreading || !body || body.length < 50} className="gap-2">
                {proofreading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SpellCheck className="w-3.5 h-3.5" />}
                {proofreading ? "Analyserer..." : "Språkvask"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerateSubheadings}
                disabled={generatingSubheadings || !body || body.length < 100}
                className="gap-2"
                title="Generer korte mellomtitler hvert 2.-3. avsnitt"
              >
                {generatingSubheadings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Heading2 className="w-3.5 h-3.5" />}
                {generatingSubheadings ? "Genererer..." : "Mellomtitler"}
              </Button>
              <Popover open={improvePopoverOpen} onOpenChange={setImprovePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={improving || !body || body.length < 50}
                    className="gap-2"
                    title="Sjekk mot retningslinjer: velg fokusområder"
                  >
                    {improving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    {improving ? "Forbedrer..." : "Forbedre brødtekst"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div>
                      <p className="font-heading text-sm font-medium">Fokusområder</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Velg hva AI skal sjekke og endre.</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { id: "sitater", label: "Sitatformat", desc: "« » og blockquote" },
                        { id: "lenker", label: "Kildelenker", desc: "Behold/normaliser <a>" },
                        { id: "lengde", label: "Ordtelling", desc: "Stram inn mot maks ord" },
                        { id: "struktur", label: "Struktur", desc: "Avsnitt og mellomtitler" },
                        { id: "stil", label: "Stil", desc: "Klarhet og tone" },
                      ].map((f) => {
                        const checked = improveFocus.includes(f.id);
                        return (
                          <label key={f.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setImproveFocus((prev) =>
                                  v ? [...new Set([...prev, f.id])] : prev.filter((x) => x !== f.id),
                                );
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-body text-foreground">{f.label}</div>
                              <div className="text-xs text-muted-foreground">{f.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setImproveFocus(["sitater", "lenker", "lengde", "struktur", "stil"])}
                      >
                        Velg alle
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setImprovePopoverOpen(false);
                          onImproveBody(improveFocus);
                        }}
                        disabled={improving || improveFocus.length === 0}
                        className="gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Start
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {canToggleCollab && (
            <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-body text-foreground">Samredigering</div>
                  <div className="text-xs text-muted-foreground">
                    {!articleId
                      ? "Lagre artikkelen først for å aktivere."
                      : collabEnabled
                        ? "På — flere kan redigere brødteksten samtidig i sanntid."
                        : "Av — vanlig redigering."}
                  </div>
                </div>
              </div>
              <Switch
                checked={collabEnabled}
                onCheckedChange={(v) => onFormUpdate({ collab_enabled: v })}
                disabled={!articleId}
                aria-label="Slå samredigering av eller på"
              />
            </div>
          )}
          <div
            className={`mt-1.5 relative rounded-lg transition-all ${
              isDraggingAudio ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
            }`}
            onDragEnter={(e) => {
              if (!Array.from(e.dataTransfer.types).includes("Files")) return;
              e.preventDefault();
              dragCounterRef.current += 1;
              setIsDraggingAudio(true);
            }}
            onDragOver={(e) => {
              if (Array.from(e.dataTransfer.types).includes("Files")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDragLeave={(e) => {
              if (!Array.from(e.dataTransfer.types).includes("Files")) return;
              e.preventDefault();
              dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
              if (dragCounterRef.current === 0) setIsDraggingAudio(false);
            }}
            onDrop={(e) => {
              if (!Array.from(e.dataTransfer.types).includes("Files")) return;
              e.preventDefault();
              dragCounterRef.current = 0;
              setIsDraggingAudio(false);
              const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("audio/"));
              if (!file) {
                toast({ title: "Ikke en lydfil", description: "Slipp en lydfil (mp3, wav, m4a osv.)", variant: "destructive" });
                return;
              }
              if (audioRef.current?.isProcessing()) {
                toast({ title: "Vent litt", description: "En lydfil behandles allerede", variant: "destructive" });
                return;
              }
              audioRef.current?.uploadFile(file);
            }}
          >
            <CollaborativeRichTextEditor
              articleId={articleId}
              collabEnabled={collabEnabled}
              content={body}
              onChange={onBodyChange}
              onImageUpload={onInsertImage}
              onInsertChart={onInsertChart}
              onEditChart={onEditChart}
              onInsertFactBox={onInsertFactBox}
              onEditFactBox={onEditFactBox}
              onInsertSourceCard={onInsertSourceCard}
              onEditSourceCard={onEditSourceCard}
              editorRef={editorRef}
              placeholder="Skriv artikkelens innhold her..."
              highlights={proofSuggestions.map((s) => ({
                id: s.id,
                text: s.original,
                suggestion: s.suggestion,
                reason: s.reason,
                category: s.category,
              }))}
            />
            {isDraggingAudio && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none z-10">
                <div className="bg-card px-4 py-2 rounded-lg shadow-soft text-sm font-medium text-foreground">
                  Slipp lydfilen for å transkribere
                </div>
              </div>
            )}
          </div>

          {(proofSuggestions.length > 0 || proofUndoStack.length > 0) && (
            <div className="mt-3 flex flex-col gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-foreground">
                  {proofSuggestions.length > 0 ? (
                    <>
                      <span className="font-medium">{proofSuggestions.length}</span>{" "}
                      forslag vises inline i brødteksten — klikk{" "}
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold align-middle">✓</span>{" "}
                      for å godta eller{" "}
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold align-middle">✕</span>{" "}
                      for å avvise
                    </>
                  ) : (
                    <span className="text-muted-foreground">Alle forslag behandlet — du kan fortsatt angre siste endring</span>
                  )}
                </span>
                {proofSuggestions.length > 0 && (() => {
                  const counts = proofSuggestions.reduce<Record<string, number>>((acc, s) => {
                    const cat = s.category || "stil";
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                  }, {});
                  const labels: Record<string, string> = {
                    anglisisme: "Anglisismer",
                    grammatikk: "Grammatikk",
                    skrivefeil: "Skrivefeil",
                    dialekt: "Dialekt",
                    stil: "Stil",
                    forenkling: "Forenkling",
                  };
                  const styles: Record<string, string> = {
                    anglisisme: "bg-destructive/15 text-destructive border-destructive/30",
                    grammatikk: "bg-destructive/20 text-destructive border-destructive/40",
                    skrivefeil: "bg-destructive/20 text-destructive border-destructive/40",
                    dialekt: "bg-accent text-accent-foreground border-accent-foreground/20",
                    stil: "bg-accent text-accent-foreground border-accent-foreground/20",
                    forenkling: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
                  };
                  const order = ["anglisisme", "grammatikk", "skrivefeil", "dialekt", "stil", "forenkling"];
                  const entries = Object.entries(counts).sort(
                    ([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
                  );
                  return (
                    <div className="flex flex-wrap items-center gap-1">
                      {entries.map(([cat, count]) => (
                        <span
                          key={cat}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${styles[cat] || styles.stil}`}
                          title={`${count} ${labels[cat] || cat}`}
                        >
                          <span className="font-bold tabular-nums">{count}</span>
                          <span>{labels[cat] || cat}</span>
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {proofUndoStack.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onUndoLastProof}
                    className="h-7 gap-1.5 text-xs"
                    title={`Angre siste endring (⌘/Ctrl+Z) — ${proofUndoStack.length} kan angres`}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Angre siste
                  </Button>
                )}
                {proofSuggestions.length > 0 && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={onApplyAllProof} className="h-7 gap-1.5 text-xs">
                      <Check className="w-3.5 h-3.5" />
                      Godta alle
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onDismissAllProof} className="h-7 text-xs">
                      Avvis alle
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Hovedpunkter</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => onGenerateKeyPoints(false)} disabled={generatingPoints} className="gap-2">
              {generatingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generer automatisk
            </Button>
          </div>
          <div className="space-y-2">
            {keyPoints.map((point, index) => (
              <div key={index} className="flex gap-2">
                <Input value={point} onChange={(e) => handleKeyPointChange(index, e.target.value)} placeholder={`Punkt ${index + 1}`} />
                <Button type="button" variant="outline" size="sm" onClick={() => removeKeyPoint(index)}><X className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addKeyPoint()}><Plus className="w-4 h-4 mr-1" /> Legg til punkt</Button>
          </div>
        </div>
      </CollapsibleSection>

      <SocialPostsDialog
        open={socialDialogOpen}
        onOpenChange={setSocialDialogOpen}
        title={title}
        excerpt={excerpt}
        body={body}
        category={category}
      />
    </>
  );
};
