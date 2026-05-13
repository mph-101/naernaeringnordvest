import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, X, Plus, Sparkles, Loader2, CloudOff, Cloud, Languages, Building2, SpellCheck, Check, XCircle, MapPin, GitFork, Share2, Wand2, FileCheck, Heading2, Undo2, ExternalLink, Crop as CropIcon, Eye, Megaphone } from "lucide-react";
import { ArticlePreviewDialog } from "./ArticlePreviewDialog";
import { PrePublishChecklist, buildPublishChecklist } from "./PrePublishChecklist";
import { Dialog as ImproveDialog, DialogContent as ImproveDialogContent, DialogHeader as ImproveDialogHeader, DialogTitle as ImproveDialogTitle, DialogFooter as ImproveDialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineDiff } from "./InlineDiff";
import { RichTextEditor } from "./RichTextEditor";
import { ImageUpload } from "./ImageUpload";
import { ArticleGalleryEditor } from "./ArticleGalleryEditor";
import { ArticleVariantsManager } from "./ArticleVariantsManager";
import { ImageCropDialog } from "./ImageCropDialog";
import type { ImageCrop, ImageFocal } from "@/lib/image-crop";
import { cropToBackgroundStyle, parseCrop, parseFocal } from "@/lib/image-crop";
import { CategorySelect } from "./CategorySelect";
import { AudioTranscriber, type AudioTranscriberHandle } from "./AudioTranscriber";
import { ProofreadRules, loadProofreadRules, loadProofreadSettings, loadProofreadSettingsFromDb, type ProofreadRule } from "./ProofreadRules";
import { ChartGenerator } from "@/components/charts/ChartGenerator";
import type { ChartData } from "@/components/charts/ArticleChart";
import { FactBoxLibraryDialog } from "@/components/factbox/FactBoxLibraryDialog";
import { encodeFactBox, type FactBoxData } from "@/components/factbox/FactBox";
import { SourceCardDialog } from "@/components/source-card/SourceCardDialog";
import { encodeSourceCard, type SourceCardData } from "@/components/source-card/SourceCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArticleTagInput } from "./ArticleTagInput";
import { AIDraftFromSourcesButton } from "./AIDraftFromSourcesButton";
import { RegionPicker } from "./RegionPicker";
import { AuthorSelect } from "./AuthorSelect";
import { SocialPostsDialog } from "./SocialPostsDialog";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";
import type { Tag as ArticleTag } from "@/lib/tag-utils";

interface ArticleEditorProps {
  articleId: string | null;
  onBack: () => void;
}

type ArticleStatus = "draft" | "review" | "published";

const STATUS_CONFIG: Record<ArticleStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Kladd", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  review: { label: "Klar til gjennomlesning", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  published: { label: "Publisert", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function calcReadTime(body: string, type: string): string {
  const words = stripHtml(body).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 220));
  const suffix = type === "video" ? "min video" : type === "podcast" ? "min lytting" : "min lesing";
  return `${mins} ${suffix}`;
}

export const ArticleEditor = ({ articleId, onBack }: ArticleEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  // Local mirror of articleId so we can flip a freshly-created draft into
  // "edit mode" without remounting the editor.
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(articleId);
  // Re-sync if the parent passes a different id (e.g. opening another article).
  useEffect(() => {
    setCurrentArticleId(articleId);
  }, [articleId]);
  const [generatingPoints, setGeneratingPoints] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [suggestingCompanies, setSuggestingCompanies] = useState(false);
  const [generatingTitleExcerpt, setGeneratingTitleExcerpt] = useState(false);
  const [proofreading, setProofreading] = useState(false);
  const [generatingSubheadings, setGeneratingSubheadings] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [proofSuggestions, setProofSuggestions] = useState<{ id: string; original: string; suggestion: string; reason: string; category: string }[]>([]);
  // Undo stack for accepted proofreading changes. Each entry captures the
  // body BEFORE the change plus the suggestion(s) that were applied, so we
  // can both restore the text and re-add the suggestion(s) to the panel.
  const [proofUndoStack, setProofUndoStack] = useState<
    { previousBody: string; restored: { id: string; original: string; suggestion: string; reason: string; category: string }[] }[]
  >([]);
  const [improving, setImproving] = useState(false);
  const [improveFocus, setImproveFocus] = useState<string[]>(["sitater", "lenker", "lengde", "struktur", "stil"]);
  const [improvePopoverOpen, setImprovePopoverOpen] = useState(false);
  const [improveResult, setImproveResult] = useState<{
    improved_body: string;
    summary: string;
    issues_found: string[];
    word_count_before: number;
    word_count_after: number;
  } | null>(null);
  const [composedBody, setComposedBody] = useState<string>("");
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<{ chart: ChartData; pos: number } | null>(null);
  const [factBoxDialogOpen, setFactBoxDialogOpen] = useState(false);
  const [editingFactBox, setEditingFactBox] = useState<{ data: FactBoxData; pos: number } | null>(null);
  const [sourceCardDialogOpen, setSourceCardDialogOpen] = useState(false);
  const [editingSourceCard, setEditingSourceCard] = useState<{ data: SourceCardData; pos: number } | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const { toast } = useToast();
  const [companyTags, setCompanyTags] = useState<{ orgnr: string; company_name: string }[]>([]);
  const [articleTags, setArticleTags] = useState<ArticleTag[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ orgnr: string; navn: string }[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [suggestedCompanyNames, setSuggestedCompanyNames] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<any>(null);
  const audioRef = useRef<AudioTranscriberHandle>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const dragCounterRef = useRef(0);

  const [form, setForm] = useState({
    title: "",
    title_en: "",
    excerpt: "",
    excerpt_en: "",
    body: "",
    body_en: "",
    category: "",
    author: "",
    co_authors: [] as string[],
    type: "article" as "article" | "video" | "podcast",
    premium: false,
    read_time: "",
    image_url: "",
    image_crop: null as ImageCrop | null,
    image_focal: null as ImageFocal | null,
    key_points: [] as string[],
    key_points_en: [] as string[],
    status: "draft" as ArticleStatus,
    region_slug: null as string | null,
  });
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [sharedRegions, setSharedRegions] = useState<string[]>([]);
  // Track the body that was last published so we can write a revision diff
  // (and only on actual changes) when the editor publishes again.
  const [lastPublishedBody, setLastPublishedBody] = useState<string>("");
  const [changeNote, setChangeNote] = useState<string>("");
  const [forkedFromArticleId, setForkedFromArticleId] = useState<string | null>(null);
  const [forkedFromTitle, setForkedFromTitle] = useState<string | null>(null);
  const [allRegions, setAllRegions] = useState<EditorialRegion[]>([]);
  const [forking, setForking] = useState(false);

  // Pre-publish checklist: items must all be done before status can be set
  // to "published" (and before submit is allowed with that status). The list
  // is derived on every render so it always reflects unsaved edits.
  const publishChecklist = buildPublishChecklist({
    author: form.author,
    imageUrl: form.image_url,
    excerpt: form.excerpt,
    tagCount: articleTags.length,
    body: form.body,
  });
  const canPublish = publishChecklist.every((i) => i.done);

  // Load regions list once
  useEffect(() => {
    fetchRegions().then(setAllRegions).catch(() => {});
  }, []);

  // Hydrate proofread settings from the user's profile so their last-chosen
  // focus areas + language profile are restored across sessions and devices.
  useEffect(() => {
    loadProofreadSettingsFromDb().catch(() => {});
  }, []);

  // For new articles: default region to the journalist's primary editorial region
  useEffect(() => {
    if (articleId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("editorial_region")
        .eq("user_id", user.id)
        .maybeSingle();
      const slug = (data as any)?.editorial_region as string | null | undefined;
      if (slug) setForm((prev) => (prev.region_slug ? prev : { ...prev, region_slug: slug }));
    })();
  }, [articleId]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    if (articleId) fetchArticle();
  }, [articleId]);

  // Auto-calculate read time when body or type changes
  useEffect(() => {
    if (form.body && form.body.length > 20) {
      const calculated = calcReadTime(form.body, form.type);
      if (calculated !== form.read_time) {
        // Use updateForm so the new read_time is included in auto-save
        updateForm({ read_time: calculated });
      }
    }
  }, [form.body, form.type]);

  // Auto-save (debounced). For new articles, the first auto-save creates
  // the row so subsequent edits update in place.
  const triggerAutoSave = useCallback(() => {
    setAutoSaveStatus("unsaved");
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      void runAutoSave();
    }, 1200);
  }, []);

  // Performs the actual save. Extracted so we can also call it
  // synchronously from beforeunload / onBack to flush pending edits.
  const runAutoSave = useCallback(async () => {
    const currentForm = formRef.current;
    if (!currentForm) return;
    // Need at least a title before we'll create a draft row
    if (!currentForm.title || !currentForm.title.trim()) return;
    setAutoSaveStatus("saving");
    const payload = {
      title: currentForm.title,
      title_en: currentForm.title_en || null,
      excerpt: currentForm.excerpt,
      excerpt_en: currentForm.excerpt_en || null,
      body: currentForm.body,
      body_en: currentForm.body_en || null,
      category: currentForm.category,
      author: currentForm.author,
      co_authors: currentForm.co_authors ?? [],
      type: currentForm.type,
      premium: currentForm.premium,
      read_time: currentForm.read_time || null,
      image_url: currentForm.image_url || null,
      image_crop: currentForm.image_crop ?? null,
      image_focal: currentForm.image_focal ?? null,
      key_points: currentForm.key_points,
      key_points_en: currentForm.key_points_en,
      status: currentForm.status,
      published: currentForm.status === "published",
      published_at: currentForm.status === "published" ? new Date().toISOString() : null,
      region_slug: currentForm.region_slug || null,
    } as any;
    try {
      if (currentArticleId) {
        const { error } = await supabase
          .from("articles")
          .update(payload)
          .eq("id", currentArticleId);
        if (error) throw error;
      } else {
        // First auto-save: create the row so future edits can update in place.
        // Insert a minimal record (excerpt/category/author may still be empty,
        // so fall back to safe defaults that satisfy NOT NULL constraints).
        const insertPayload = {
          ...payload,
          excerpt: payload.excerpt || "",
          category: payload.category || "Annet",
          author: payload.author || "",
        };
        const { data: inserted, error } = await supabase
          .from("articles")
          .insert(insertPayload)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted?.id) setCurrentArticleId(inserted.id);
      }
      setAutoSaveStatus("saved");
    } catch {
      setAutoSaveStatus("unsaved");
    }
  }, [currentArticleId]);

  // Flush pending edits when the user closes the tab or navigates away.
  useEffect(() => {
    const flush = () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
        autoSaveRef.current = null;
        void runAutoSave();
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveStatus === "unsaved") {
        // Try a synchronous flush so we don't lose data
        flush();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flush();
    };
  }, [autoSaveStatus, runAutoSave]);

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    triggerAutoSave();
  };

  // Track first render so we don't auto-sync relations right after fetchArticle
  // populates them (which would just re-write the same data).
  const relationsHydratedRef = useRef(false);
  useEffect(() => {
    // Reset whenever the loaded article changes
    relationsHydratedRef.current = false;
  }, [articleId]);

  // Debounced auto-save of company tags, article tags and shared regions.
  // Only runs once we have a persisted article id.
  useEffect(() => {
    if (!currentArticleId) return;
    if (!relationsHydratedRef.current) {
      // Skip the very first run after hydration
      relationsHydratedRef.current = true;
      return;
    }
    setAutoSaveStatus("unsaved");
    const t = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        // Company tags
        await supabase.from("article_company_tags").delete().eq("article_id", currentArticleId);
        if (companyTags.length > 0) {
          await supabase.from("article_company_tags").insert(
            companyTags.map((t) => ({
              article_id: currentArticleId,
              orgnr: t.orgnr,
              company_name: t.company_name,
            })),
          );
        }
        // Article tags
        await supabase.from("article_tags").delete().eq("article_id", currentArticleId);
        if (articleTags.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("article_tags").insert(
            articleTags.map((tag) => ({
              article_id: currentArticleId,
              tag_id: tag.id,
              created_by: user?.id,
            })),
          );
        }
        // Shared regions
        await supabase.from("article_shared_regions" as any).delete().eq("article_id", currentArticleId);
        const targets = sharedRegions.filter((s) => s && s !== formRef.current?.region_slug);
        if (targets.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("article_shared_regions" as any).insert(
            targets.map((region_slug) => ({
              article_id: currentArticleId,
              region_slug,
              shared_by: user?.id,
            })),
          );
        }
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("unsaved");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [currentArticleId, companyTags, articleTags, sharedRegions]);

  const fetchArticle = async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("articles").select("*").eq("id", articleId).single();
      if (error) throw error;
      setForm({
        title: data.title || "",
        title_en: data.title_en || "",
        excerpt: data.excerpt || "",
        excerpt_en: data.excerpt_en || "",
        body: data.body || "",
        body_en: data.body_en || "",
        category: data.category || "",
        author: data.author || "",
        co_authors: ((data as any).co_authors as string[] | null) ?? [],
        type: (data.type as "article" | "video" | "podcast") || "article",
        premium: data.premium || false,
        read_time: data.read_time || "",
        image_url: data.image_url || "",
        image_crop: parseCrop((data as any).image_crop),
        image_focal: parseFocal((data as any).image_focal),
        key_points: (data.key_points as string[]) || [],
        key_points_en: (data.key_points_en as string[]) || [],
        status: ((data as any).status as ArticleStatus) || (data.published ? "published" : "draft"),
        region_slug: ((data as any).region_slug as string | null) ?? null,
      });
      setForkedFromArticleId(((data as any).forked_from_article_id as string | null) ?? null);
      const { data: tags } = await supabase.from("article_company_tags").select("orgnr, company_name").eq("article_id", articleId);
      setCompanyTags(tags || []);
      const { data: tagLinks } = await supabase
        .from("article_tags")
        .select("tags(id, name, slug, description)")
        .eq("article_id", articleId);
      setArticleTags(((tagLinks || []).map((r: any) => r.tags).filter(Boolean)) as ArticleTag[]);
      const { data: shared } = await supabase
        .from("article_shared_regions" as any)
        .select("region_slug")
        .eq("article_id", articleId);
      setSharedRegions(((shared || []) as any[]).map((r: any) => r.region_slug as string));
      const forkParent = ((data as any).forked_from_article_id as string | null) ?? null;
      if (forkParent) {
        const { data: parent } = await supabase.from("articles").select("title").eq("id", forkParent).maybeSingle();
        setForkedFromTitle(parent?.title ?? null);
      } else {
        setForkedFromTitle(null);
      }
    } catch {
      toast({ title: "Feil", description: "Kunne ikke hente artikkelen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Hard guard: if the user somehow has status=published but the checklist
    // is incomplete (e.g. tags removed after promoting), refuse to save and
    // demote back to draft so nothing accidentally goes live half-baked.
    if (form.status === "published" && !canPublish) {
      toast({
        title: "Kan ikke publisere",
        description: "Fullfør publiseringskravene før du lagrer som publisert.",
        variant: "destructive",
      });
      updateForm({ status: "draft" });
      return;
    }
    setSaving(true);
    try {
      const articleData = {
        title: form.title,
        title_en: form.title_en || null,
        excerpt: form.excerpt,
        excerpt_en: form.excerpt_en || null,
        body: form.body,
        body_en: form.body_en || null,
        category: form.category,
        author: form.author,
        co_authors: form.co_authors ?? [],
        type: form.type,
        premium: form.premium,
        read_time: form.read_time || null,
        image_url: form.image_url || null,
        image_crop: form.image_crop ?? null,
        image_focal: form.image_focal ?? null,
        key_points: form.key_points,
        key_points_en: form.key_points_en,
        status: form.status,
        published: form.status === "published",
        published_at: form.status === "published" ? new Date().toISOString() : null,
        region_slug: form.region_slug || null,
      } as any;

      const syncSharedRegions = async (id: string) => {
        await supabase.from("article_shared_regions" as any).delete().eq("article_id", id);
        // Filter out the article's own region (that's implicit)
        const targets = sharedRegions.filter((s) => s && s !== form.region_slug);
        if (targets.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("article_shared_regions" as any).insert(
            targets.map((region_slug) => ({ article_id: id, region_slug, shared_by: user?.id })),
          );
        }
      };

      const idForUpdate = currentArticleId;
      if (idForUpdate) {
        const { error } = await supabase.from("articles").update(articleData).eq("id", idForUpdate);
        if (error) throw error;
        await supabase.from("article_company_tags").delete().eq("article_id", idForUpdate);
        if (companyTags.length > 0) {
          await supabase.from("article_company_tags").insert(
            companyTags.map((t) => ({ article_id: idForUpdate, orgnr: t.orgnr, company_name: t.company_name }))
          );
        }
        await supabase.from("article_tags").delete().eq("article_id", idForUpdate);
        if (articleTags.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("article_tags").insert(
            articleTags.map((t) => ({ article_id: idForUpdate, tag_id: t.id, created_by: user?.id }))
          );
        }
        await syncSharedRegions(idForUpdate);
        toast({ title: "Lagret", description: "Artikkelen er oppdatert" });
      } else {
        const { data: inserted, error } = await supabase
          .from("articles")
          .insert(articleData)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted?.id) {
          setCurrentArticleId(inserted.id);
          await syncSharedRegions(inserted.id);
        }
        toast({ title: "Opprettet", description: "Artikkelen er opprettet" });
        onBack();
      }
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const forkArticle = async () => {
    if (!articleId) return;
    setForking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Determine the user's primary editorial region for the new fork
      let targetRegion: string | null = null;
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("editorial_region")
          .eq("user_id", user.id)
          .maybeSingle();
        targetRegion = ((prof as any)?.editorial_region as string | null) ?? null;
      }
      const forkData = {
        title: `${form.title} (regional versjon)`,
        title_en: form.title_en || null,
        excerpt: form.excerpt,
        excerpt_en: form.excerpt_en || null,
        body: form.body,
        body_en: form.body_en || null,
        category: form.category,
        author: form.author,
        type: form.type,
        premium: form.premium,
        read_time: form.read_time || null,
        image_url: form.image_url || null,
        image_crop: form.image_crop ?? null,
        image_focal: form.image_focal ?? null,
        key_points: form.key_points,
        key_points_en: form.key_points_en,
        status: "draft" as ArticleStatus,
        published: false,
        published_at: null,
        region_slug: targetRegion,
        forked_from_article_id: articleId,
        created_by: user?.id ?? null,
      } as any;
      const { data: inserted, error } = await supabase
        .from("articles")
        .insert(forkData)
        .select("id")
        .single();
      if (error) throw error;
      // Copy company tags
      if (companyTags.length > 0 && inserted?.id) {
        await supabase.from("article_company_tags").insert(
          companyTags.map((t) => ({ article_id: inserted.id, orgnr: t.orgnr, company_name: t.company_name })),
        );
      }
      // Copy article tags
      if (articleTags.length > 0 && inserted?.id) {
        await supabase.from("article_tags").insert(
          articleTags.map((t) => ({ article_id: inserted.id, tag_id: t.id, created_by: user?.id })),
        );
      }
      toast({ title: "Forket", description: "En ny regional versjon er opprettet som kladd" });
      onBack();
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setForking(false);
    }
  };

  const generateKeyPoints = async (isEnglish = false) => {
    const bodyText = isEnglish ? form.body_en : form.body;
    if (!bodyText || bodyText.length < 50) {
      toast({ title: "For kort", description: "Brødteksten må være minst 50 tegn", variant: "destructive" });
      return;
    }
    setGeneratingPoints(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-key-points", {
        body: { body: bodyText, language: isEnglish ? "en" : "no" },
      });
      if (error) throw error;
      if (data?.points?.length) {
        updateForm({ [isEnglish ? "key_points_en" : "key_points"]: data.points });
        toast({ title: "Generert", description: "Hovedpunktene er generert" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPoints(false);
    }
  };

  const generateTitleExcerpt = async () => {
    if (!form.body || form.body.length < 50) {
      toast({ title: "For kort", description: "Brødteksten må være minst 50 tegn", variant: "destructive" });
      return;
    }
    setGeneratingTitleExcerpt(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-title-excerpt", {
        body: { body: form.body },
      });
      if (error) throw error;
      if (data?.title || data?.excerpt) {
        updateForm({
          ...(data.title ? { title: data.title } : {}),
          ...(data.excerpt ? { excerpt: data.excerpt } : {}),
        });
        toast({ title: "Generert", description: "Tittel og ingress er generert" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingTitleExcerpt(false);
    }
  };

  const proofreadBody = async () => {
    if (!form.body || form.body.length < 50) {
      toast({ title: "For kort", description: "Brødteksten må være minst 50 tegn", variant: "destructive" });
      return;
    }
    setProofreading(true);
    setProofSuggestions([]);
    setProofUndoStack([]);
    try {
      const customRules = loadProofreadRules();
      const settings = loadProofreadSettings();

      // Apply local rule matches first (deterministic, fast)
      const localSuggestions: { original: string; suggestion: string; reason: string; category: string }[] = [];
      const plainText = form.body.replace(/<[^>]*>/g, " ");
      for (const r of customRules) {
        if (!r.from) continue;
        const escaped = r.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "i");
        const match = plainText.match(re);
        if (match) {
          localSuggestions.push({
            original: match[0],
            suggestion: r.to,
            reason: r.reason || "Egen regel",
            category: r.category || "stil",
          });
        }
      }

      const { data, error } = await supabase.functions.invoke("proofread-article", {
        body: { body: form.body, customRules, profile: settings.profile, focusAreas: settings.focusAreas },
      });
      if (error) throw error;
      const aiSuggestions = data?.suggestions || [];
      // Merge, dedupe by original+suggestion, assign stable ids
      const seen = new Set<string>();
      const merged = [...localSuggestions, ...aiSuggestions]
        .filter((s: any) => {
          const key = `${s.original}→${s.suggestion}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return Boolean(s.original) && Boolean(s.suggestion);
        })
        .map((s: any, i: number) => ({
          id: `ps-${Date.now()}-${i}`,
          original: s.original,
          suggestion: s.suggestion,
          reason: s.reason || "",
          category: s.category || "stil",
        }));
      if (merged.length) {
        setProofSuggestions(merged);
        toast({ title: "Språkvask fullført", description: `${merged.length} forslag funnet` });
      } else {
        toast({ title: "Ingen forslag", description: "Teksten ser bra ut!" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setProofreading(false);
    }
  };

  const generateSubheadings = async () => {
    if (!form.body || form.body.length < 100) {
      toast({ title: "For kort", description: "Brødteksten må være minst 100 tegn", variant: "destructive" });
      return;
    }
    setGeneratingSubheadings(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-subheadings", {
        body: { body: form.body },
      });
      if (error) throw error;
      if (data?.body && data.inserted > 0) {
        updateForm({ body: data.body });
        toast({ title: "Mellomtitler lagt til", description: `${data.inserted} mellomtitler generert` });
      } else {
        toast({ title: "Ingen mellomtitler", description: "Teksten er for kort eller har for få avsnitt" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingSubheadings(false);
    }
  };

  const improveBody = async () => {
    if (!form.body || form.body.length < 50) {
      toast({ title: "For kort", description: "Brødteksten må være minst 50 tegn", variant: "destructive" });
      return;
    }
    if (improveFocus.length === 0) {
      toast({ title: "Velg minst ett fokusområde", variant: "destructive" });
      return;
    }
    setImprovePopoverOpen(false);
    setImproving(true);
    setImproveResult(null);
    try {
      const { data: gls } = await supabase
        .from("editorial_guidelines")
        .select("article_type, display_name, rules, min_paragraphs, max_words")
        .eq("article_type", form.type)
        .maybeSingle();
      const { data, error } = await supabase.functions.invoke("improve-article-body", {
        body: { body: form.body, guideline: gls ?? null, articleType: form.type, focusAreas: improveFocus },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.result?.improved_body) throw new Error("Ingen forbedring returnert");
      setImproveResult(data.result);
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setImproving(false);
    }
  };

  const applyImprovedBody = () => {
    if (!improveResult) return;
    // If the composed text from accepted hunks matches the full improved
    // version, use the AI's HTML directly to preserve markup. Otherwise
    // rebuild HTML from the user's per-hunk decisions as paragraphs.
    const stripHtml = (h: string) =>
      h
        .replace(/<\s*(p|h[1-6]|li|blockquote|br|div)[^>]*>/gi, "\n")
        .replace(/<\/\s*(p|h[1-6]|li|blockquote|div)\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const fullImprovedPlain = stripHtml(improveResult.improved_body);
    const fullOriginalPlain = stripHtml(form.body);
    let nextBody: string;
    if (composedBody.trim() === fullImprovedPlain.trim()) {
      nextBody = improveResult.improved_body;
    } else if (composedBody.trim() === fullOriginalPlain.trim()) {
      nextBody = form.body;
    } else {
      const paragraphs = composedBody
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("\n");
      nextBody = paragraphs || improveResult.improved_body;
    }
    updateForm({ body: nextBody });
    toast({ title: "Brødtekst oppdatert", description: improveResult.summary });
    setImproveResult(null);
    setComposedBody("");
  };

  // Replace a plain-text occurrence inside HTML body without touching tags.
  // We walk only text nodes so HTML structure stays intact and we always
  // find the term even when it sits inside <p>, <strong> etc.
  const replaceInHtmlBody = (html: string, original: string, suggestion: string): { html: string; replaced: boolean } => {
    if (!original) return { html, replaced: false };
    let replaced = false;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div id="__nn_root">${html}</div>`, "text/html");
      const root = doc.getElementById("__nn_root");
      if (!root) return { html, replaced: false };
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let n: Node | null = walker.nextNode();
      while (n) {
        nodes.push(n as Text);
        n = walker.nextNode();
      }
      for (const textNode of nodes) {
        const value = textNode.nodeValue || "";
        const idx = value.indexOf(original);
        if (idx >= 0) {
          textNode.nodeValue = value.slice(0, idx) + suggestion + value.slice(idx + original.length);
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        // Fallback: case-insensitive search across the whole text
        for (const textNode of nodes) {
          const value = textNode.nodeValue || "";
          const lower = value.toLowerCase();
          const idx = lower.indexOf(original.toLowerCase());
          if (idx >= 0) {
            textNode.nodeValue = value.slice(0, idx) + suggestion + value.slice(idx + original.length);
            replaced = true;
            break;
          }
        }
      }
      return { html: replaced ? root.innerHTML : html, replaced };
    } catch {
      // Last-resort fallback: naive string replace
      if (html.includes(original)) {
        return { html: html.replace(original, suggestion), replaced: true };
      }
      return { html, replaced: false };
    }
  };

  const applyProofSuggestionById = useCallback((id: string) => {
    setProofSuggestions(prev => {
      const s = prev.find(p => p.id === id);
      if (!s) return prev;
      const previousBody = form.body;
      const { html: newBody, replaced } = replaceInHtmlBody(previousBody, s.original, s.suggestion);
      if (!replaced) {
        toast({ title: "Fant ikke teksten", description: `Kunne ikke finne "${s.original}" i brødteksten`, variant: "destructive" });
        return prev;
      }
      updateForm({ body: newBody });
      setProofUndoStack(stack => [...stack, { previousBody, restored: [s] }]);
      toast({ title: "Endret", description: `"${s.original}" → "${s.suggestion}"` });
      return prev.filter(p => p.id !== id);
    });
  }, [form.body, toast, updateForm]);

  const dismissProofSuggestionById = useCallback((id: string) => {
    setProofSuggestions(prev => prev.filter(p => p.id !== id));
  }, []);

  const applyAllProofSuggestions = () => {
    if (proofSuggestions.length === 0) return;
    const previousBody = form.body;
    let newBody = previousBody;
    const appliedSuggestions: typeof proofSuggestions = [];
    const skipped: typeof proofSuggestions = [];
    for (const s of proofSuggestions) {
      const { html, replaced } = replaceInHtmlBody(newBody, s.original, s.suggestion);
      if (replaced) {
        newBody = html;
        appliedSuggestions.push(s);
      } else {
        skipped.push(s);
      }
    }
    if (appliedSuggestions.length > 0) {
      updateForm({ body: newBody });
      setProofUndoStack(stack => [...stack, { previousBody, restored: appliedSuggestions }]);
    }
    setProofSuggestions(skipped);
    if (appliedSuggestions.length > 0) {
      toast({
        title: "Alle forslag godtatt",
        description: `${appliedSuggestions.length} endring${appliedSuggestions.length === 1 ? "" : "er"} brukt${skipped.length ? `, ${skipped.length} hoppet over` : ""}`,
      });
    } else {
      toast({ title: "Ingen endringer", description: "Fant ingen treff å bruke", variant: "destructive" });
    }
  };

  const undoLastProofChange = useCallback(() => {
    setProofUndoStack(stack => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      updateForm({ body: last.previousBody });
      // Re-add the rolled-back suggestions to the panel so the journalist
      // can choose to apply them again (or dismiss them).
      setProofSuggestions(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const restored = last.restored.filter(r => !existingIds.has(r.id));
        return [...restored, ...prev];
      });
      const count = last.restored.length;
      toast({
        title: "Angret",
        description: `${count} endring${count === 1 ? "" : "er"} rullet tilbake`,
      });
      return stack.slice(0, -1);
    });
  }, [toast, updateForm]);

  // Bridge inline accept/reject buttons rendered as ProseMirror widget
  // decorations back into React state. The buttons dispatch DOM CustomEvents
  // because they live outside the React tree.
  useEffect(() => {
    const onAccept = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) applyProofSuggestionById(id);
    };
    const onReject = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) dismissProofSuggestionById(id);
    };
    window.addEventListener("nn:proofread-accept", onAccept);
    window.addEventListener("nn:proofread-reject", onReject);
    return () => {
      window.removeEventListener("nn:proofread-accept", onAccept);
      window.removeEventListener("nn:proofread-reject", onReject);
    };
  }, [applyProofSuggestionById, dismissProofSuggestionById]);

  // Cmd/Ctrl+Z hurtigtast for å angre siste språkvask-endring. Aktiv kun
  // når undo-stacken har innhold, slik at TipTap sin egen undo fortsatt
  // fungerer ellers. Vi bruker capture-fasen for å rekke å overstyre
  // editorens egen handler før den ser eventet.
  useEffect(() => {
    if (proofUndoStack.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isUndo =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === "z" || e.key === "Z");
      if (!isUndo) return;
      e.preventDefault();
      e.stopPropagation();
      undoLastProofChange();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [proofUndoStack.length, undoLastProofChange]);

  const translateToEnglish = async () => {
    if (!form.body || form.body.length < 20) {
      toast({ title: "For kort", description: "Skriv norsk innhold først", variant: "destructive" });
      return;
    }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-article", {
        body: { title: form.title, excerpt: form.excerpt, body: form.body },
      });
      if (error) throw error;
      if (data?.title_en || data?.body_en) {
        updateForm({
          title_en: data.title_en || form.title_en,
          excerpt_en: data.excerpt_en || form.excerpt_en,
          body_en: data.body_en || form.body_en,
        });
        toast({ title: "Oversatt", description: "Artikkelen er oversatt til engelsk" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  const suggestCompanies = async () => {
    if (!form.body || form.body.length < 50) return;
    setSuggestingCompanies(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-companies", {
        body: { body: form.body },
      });
      if (error) throw error;
      if (data?.companies?.length) {
        setSuggestedCompanyNames(data.companies);
        toast({ title: "Foreslått", description: `${data.companies.length} selskaper funnet i teksten` });
      } else {
        toast({ title: "Ingen funnet", description: "Ingen selskaper identifisert i teksten" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setSuggestingCompanies(false);
    }
  };

  const lookupAndAddCompany = async (name: string) => {
    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
      // Strip legal suffix so Brreg's AND-search returns a broader candidate pool.
      // The proxy ranks results and prefers exact "X AS"/"X ASA" matches.
      const stripped = name.trim().replace(/\s+(AS|ASA|SA|ANS|DA|BA)$/i, "").trim();
      const queries = stripped && stripped.toLowerCase() !== name.trim().toLowerCase()
        ? [stripped, name]
        : [name];

      let c: any = null;
      for (const q of queries) {
        const res = await fetch(`${baseUrl}?action=search&q=${encodeURIComponent(q)}&size=8`, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const d = await res.json();
        c = d.companies?.[0];
        if (c?.orgnr) break;
      }

      if (c?.orgnr) {
        const orgnr = c.orgnr;
        if (!companyTags.some(t => t.orgnr === orgnr)) {
          setCompanyTags(prev => [...prev, { orgnr, company_name: c.navn }]);
        }
        setSuggestedCompanyNames(prev => prev.filter(n => n !== name));
      } else {
        toast({ title: "Ikke funnet", description: `Fant ikke «${name}» i Brønnøysundregisteret`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err?.message || "Kunne ikke søke", variant: "destructive" });
    }
  };

  const handleKeyPointChange = (index: number, value: string, isEnglish = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    const newPoints = [...form[field]];
    newPoints[index] = value;
    updateForm({ [field]: newPoints });
  };

  const addKeyPoint = (isEnglish = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    updateForm({ [field]: [...form[field], ""] });
  };

  const removeKeyPoint = (index: number, isEnglish = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    updateForm({ [field]: form[field].filter((_, i) => i !== index) });
  };

  const handleAudioTranscript = (text: string) => {
    const current = form.body;
    const separator = current ? "<p></p>" : "";
    updateForm({ body: current + separator + `<p>${text}</p>` });
  };

  const handleInsertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop();
      const path = `inline/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("article-images").upload(path, file);
      if (error) {
        toast({ title: "Feil", description: error.message, variant: "destructive" });
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("article-images").getPublicUrl(path);
      updateForm({ body: form.body + `<img src="${publicUrl}" alt="" />` });
    };
    input.click();
  };

  const handleInsertChart = (chart: ChartData) => {
    // Encode chart data as base64 JSON inside a figure block so it survives
    // round-trips through the rich text editor and is rendered as a React
    // component on the public article page.
    const json = JSON.stringify(chart);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const figureHtml = `<figure data-nn-chart="true" data-chart="${encoded}"><p><strong>${chart.title}</strong> — ${chart.source}</p></figure>`;

    const editor = editorInstanceRef.current;
    if (editingChart && editor) {
      // Replace the existing chart node at its known position
      const node = editor.state.doc.nodeAt(editingChart.pos);
      if (node && node.type.name === "chartFigure") {
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: editingChart.pos, to: editingChart.pos + node.nodeSize },
            figureHtml,
          )
          .run();
        toast({ title: "Graf oppdatert", description: chart.title });
        setEditingChart(null);
        return;
      }
    }

    // Insert at the current cursor position if we have an editor, otherwise append
    if (editor) {
      editor.chain().focus().insertContent(figureHtml + "<p></p>").run();
    } else {
      updateForm({ body: form.body + figureHtml + "<p></p>" });
    }
    toast({ title: "Graf satt inn", description: chart.title });
  };

  const handleEditChart = (chart: ChartData, pos: number) => {
    setEditingChart({ chart, pos });
    setChartDialogOpen(true);
  };

  const handleCloseChartDialog = () => {
    setChartDialogOpen(false);
    setEditingChart(null);
  };

  const handleInsertFactBox = (data: FactBoxData) => {
    const encoded = encodeFactBox(data);
    const html = `<aside data-nn-factbox="true" data-factbox="${encoded}"><p><strong>${data.title}</strong></p></aside>`;
    const editor = editorInstanceRef.current;

    if (editingFactBox && editor) {
      const node = editor.state.doc.nodeAt(editingFactBox.pos);
      if (node && node.type.name === "factBox") {
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: editingFactBox.pos, to: editingFactBox.pos + node.nodeSize },
            html,
          )
          .run();
        toast({ title: "Faktaboks oppdatert", description: data.title });
        setEditingFactBox(null);
        return;
      }
    }

    if (editor) {
      editor.chain().focus().insertContent(html + "<p></p>").run();
    } else {
      updateForm({ body: form.body + html + "<p></p>" });
    }
    toast({ title: "Faktaboks satt inn", description: data.title });
  };

  const handleEditFactBox = (data: FactBoxData, pos: number) => {
    setEditingFactBox({ data, pos });
    setFactBoxDialogOpen(true);
  };

  const handleCloseFactBoxDialog = () => {
    setFactBoxDialogOpen(false);
    setEditingFactBox(null);
  };

  const handleInsertSourceCard = (data: SourceCardData) => {
    const encoded = encodeSourceCard(data);
    const html = `<aside data-nn-source-card="true" data-source-card="${encoded}"><p><strong>${data.name}</strong></p></aside>`;
    const editor = editorInstanceRef.current;

    if (editingSourceCard && editor) {
      const node = editor.state.doc.nodeAt(editingSourceCard.pos);
      if (node && node.type.name === "sourceCard") {
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: editingSourceCard.pos, to: editingSourceCard.pos + node.nodeSize },
            html,
          )
          .run();
        toast({ title: "Kildepresentasjon oppdatert", description: data.name });
        setEditingSourceCard(null);
        setSourceCardDialogOpen(false);
        return;
      }
    }

    if (editor) {
      editor.chain().focus().insertContent(html + "<p></p>").run();
    } else {
      updateForm({ body: form.body + html + "<p></p>" });
    }
    toast({ title: "Kildepresentasjon satt inn", description: data.name });
    setSourceCardDialogOpen(false);
    setEditingSourceCard(null);
  };

  const handleEditSourceCard = (data: SourceCardData, pos: number) => {
    setEditingSourceCard({ data, pos });
    setSourceCardDialogOpen(true);
  };

  const handleCloseSourceCardDialog = () => {
    setSourceCardDialogOpen(false);
    setEditingSourceCard(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with status */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-headline text-2xl font-semibold text-headline">
            {articleId ? "Rediger artikkel" : "Ny artikkel"}
          </h2>
        </div>

        {(articleId || currentArticleId) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {autoSaveStatus === "saved" && <><Cloud className="w-3.5 h-3.5 text-green-500" /> Lagret</>}
            {autoSaveStatus === "saving" && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lagrer...</>}
            {autoSaveStatus === "unsaved" && <><CloudOff className="w-3.5 h-3.5 text-amber-500" /> Ulagret</>}
          </div>
        )}

        <button
          type="button"
          onClick={() => setPreviewDialogOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-subhead font-medium text-foreground bg-card hover:bg-muted border border-border rounded-full transition-colors"
          title="Live forhåndsvisning av usav nede endringer"
        >
          <Eye className="w-3.5 h-3.5" />
          Live preview
        </button>

        {(articleId || currentArticleId) && (
          <a
            href={`/article/${articleId || currentArticleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-subhead font-medium text-foreground bg-card hover:bg-muted border border-border rounded-full transition-colors"
            title={form.status === "published" ? "Åpne publisert artikkel i ny fane" : "Åpne lagret kladd i ny fane"}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {form.status === "published" ? "Gå til artikkel" : "Åpne lagret"}
          </a>
        )}

        <div className="flex items-center gap-2">
          {(["draft", "review", "published"] as ArticleStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (s === "published" && !canPublish) {
                  toast({
                    title: "Kan ikke publisere ennå",
                    description: "Fullfør publiseringskravene under for å aktivere publisering.",
                    variant: "destructive",
                  });
                  return;
                }
                updateForm({ status: s });
              }}
              disabled={s === "published" && !canPublish}
              title={s === "published" && !canPublish ? "Fullfør publiseringskravene først" : undefined}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                form.status === s
                  ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              } ${s === "published" && !canPublish ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
          <PrePublishChecklist items={publishChecklist} variant="compact" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Pre-publish checklist — surfaced when not yet published so editors
            can see exactly what's missing without hunting through fields. */}
        {form.status !== "published" && !canPublish && (
          <PrePublishChecklist items={publishChecklist} variant="card" />
        )}
        {/* Featured Image */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-4">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">Hovedbilde</h3>
          <ImageUpload
            currentUrl={form.image_url}
            onUpload={(url) =>
              // Reset crop/focal when a new image is uploaded — they don't apply to the new image
              updateForm({ image_url: url, image_crop: null, image_focal: null })
            }
          />
          {form.image_url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {form.image_crop || form.image_focal ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-accent" />
                      <span>
                        {form.image_crop && form.image_focal
                          ? "Utsnitt + fokuspunkt satt"
                          : form.image_crop
                          ? "Utsnitt satt"
                          : "Fokuspunkt satt"}
                      </span>
                    </>
                  ) : (
                    <span>Bruker hele bildet (sentrert)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(form.image_crop || form.image_focal) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateForm({ image_crop: null, image_focal: null })}
                    >
                      Tilbakestill
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCropDialogOpen(true)}
                  >
                    <CropIcon className="w-3.5 h-3.5 mr-1.5" />
                    Velg utsnitt
                  </Button>
                </div>
              </div>
              {/* Live preview in both formats */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Hero (16:9)</div>
                  <div
                    className="relative w-full rounded-md overflow-hidden border border-border bg-muted"
                    style={(() => { const bg = cropToBackgroundStyle(form.image_crop, form.image_focal); return { aspectRatio: "16 / 9", backgroundImage: `url(${form.image_url})`, backgroundRepeat: "no-repeat", backgroundSize: bg.size, backgroundPosition: bg.position }; })()}
                    aria-label="Hero forhåndsvisning"
                  />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Kort (4:3)</div>
                  <div
                    className="relative w-full rounded-md overflow-hidden border border-border bg-muted"
                    style={(() => { const bg = cropToBackgroundStyle(form.image_crop, form.image_focal); return { aspectRatio: "4 / 3", backgroundImage: `url(${form.image_url})`, backgroundRepeat: "no-repeat", backgroundSize: bg.size, backgroundPosition: bg.position }; })()}
                    aria-label="Kort forhåndsvisning"
                  />
                </div>
              </div>
            </div>
          )}
          {form.image_url && (
            <ImageCropDialog
              open={cropDialogOpen}
              onOpenChange={setCropDialogOpen}
              imageUrl={form.image_url}
              initialCrop={form.image_crop}
              initialFocal={form.image_focal}
              onSave={(crop, focal) => updateForm({ image_crop: crop, image_focal: focal })}
            />
          )}
        </div>

        {/* Bildegalleri */}
        <ArticleGalleryEditor articleId={articleId} />

        {/* A/B-testing av tittel + bilde */}
        {currentArticleId && (
          <ArticleVariantsManager
            articleId={currentArticleId}
            baselineTitle={form.title}
            baselineImage={form.image_url || null}
          />
        )}

        {/* Norwegian content */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-headline text-lg font-medium text-headline">Norsk innhold</h3>
            <div className="flex gap-2 flex-wrap">
              <AIDraftFromSourcesButton
                onApply={(draft) => updateForm({
                  title: draft.title,
                  excerpt: draft.excerpt,
                  body: draft.body,
                  key_points: draft.key_points,
                })}
              />
              <Button type="button" variant="outline" size="sm" onClick={generateTitleExcerpt} disabled={generatingTitleExcerpt || !form.body || form.body.length < 50} className="gap-2">
                {generatingTitleExcerpt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingTitleExcerpt ? "Genererer..." : "Generer tittel/ingress"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSocialDialogOpen(true)}
                disabled={!form.title || !form.body || form.body.length < 50}
                className="gap-2"
                title="Generer SoMe-utkast for LinkedIn, Facebook/X og Instagram"
              >
                <Megaphone className="w-3.5 h-3.5" />
                SoMe-forslag
              </Button>
              <AudioTranscriber ref={audioRef} onTranscript={handleAudioTranscript} />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Tittel *</Label>
            <Input id="title" value={form.title} onChange={(e) => updateForm({ title: e.target.value })} placeholder="Artikkelens tittel" className="mt-1.5" required />
          </div>

          <div>
            <Label htmlFor="excerpt">Ingress *</Label>
            <Textarea id="excerpt" value={form.excerpt} onChange={(e) => updateForm({ excerpt: e.target.value })} placeholder="Kort beskrivelse av artikkelen" className="mt-1.5" required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Brødtekst *</Label>
              <div className="flex items-center gap-1 flex-wrap">
                <ProofreadRules />
                <Button type="button" variant="outline" size="sm" onClick={proofreadBody} disabled={proofreading || !form.body || form.body.length < 50} className="gap-2">
                  {proofreading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SpellCheck className="w-3.5 h-3.5" />}
                  {proofreading ? "Analyserer..." : "Språkvask"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSubheadings}
                  disabled={generatingSubheadings || !form.body || form.body.length < 100}
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
                      disabled={improving || !form.body || form.body.length < 50}
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
                            <label
                              key={f.id}
                              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                            >
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
                          onClick={() =>
                            setImproveFocus(["sitater", "lenker", "lengde", "struktur", "stil"])
                          }
                        >
                          Velg alle
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={improveBody}
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
              <RichTextEditor
                content={form.body}
                onChange={(html) => updateForm({ body: html })}
                onImageUpload={handleInsertImage}
                onInsertChart={() => { setEditingChart(null); setChartDialogOpen(true); }}
                onEditChart={handleEditChart}
                onInsertFactBox={() => { setEditingFactBox(null); setFactBoxDialogOpen(true); }}
                onEditFactBox={handleEditFactBox}
                onInsertSourceCard={() => { setEditingSourceCard(null); setSourceCardDialogOpen(true); }}
                onEditSourceCard={handleEditSourceCard}
                editorRef={(ed) => { editorInstanceRef.current = ed; }}
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
                    // Color classes per category, themed via semantic tokens.
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
                      onClick={undoLastProofChange}
                      className="h-7 gap-1.5 text-xs"
                      title={`Angre siste endring (⌘/Ctrl+Z) — ${proofUndoStack.length} kan angres`}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Angre siste
                    </Button>
                  )}
                  {proofSuggestions.length > 0 && (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={applyAllProofSuggestions} className="h-7 gap-1.5 text-xs">
                        <Check className="w-3.5 h-3.5" />
                        Godta alle
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setProofSuggestions([])} className="h-7 text-xs">
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
              <Button type="button" variant="outline" size="sm" onClick={() => generateKeyPoints(false)} disabled={generatingPoints} className="gap-2">
                {generatingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generer automatisk
              </Button>
            </div>
            <div className="space-y-2">
              {form.key_points.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={point} onChange={(e) => handleKeyPointChange(index, e.target.value)} placeholder={`Punkt ${index + 1}`} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeKeyPoint(index)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addKeyPoint()}><Plus className="w-4 h-4 mr-1" /> Legg til punkt</Button>
            </div>
          </div>
        </div>

        {/* English content */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-headline text-lg font-medium text-headline">Engelsk innhold</h3>
            <Button type="button" variant="outline" size="sm" onClick={translateToEnglish} disabled={translating} className="gap-2">
              {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
              {translating ? "Oversetter..." : "Oversett automatisk"}
            </Button>
          </div>

          <div>
            <Label htmlFor="title_en">Title</Label>
            <Input id="title_en" value={form.title_en} onChange={(e) => updateForm({ title_en: e.target.value })} placeholder="Article title in English" className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="excerpt_en">Excerpt</Label>
            <Textarea id="excerpt_en" value={form.excerpt_en} onChange={(e) => updateForm({ excerpt_en: e.target.value })} placeholder="Short description in English" className="mt-1.5" />
          </div>

          <div>
            <Label>Body</Label>
            <div className="mt-1.5">
              <RichTextEditor content={form.body_en} onChange={(html) => updateForm({ body_en: html })} placeholder="Article content in English..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Key Points (English)</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => generateKeyPoints(true)} disabled={generatingPoints || !form.body_en} className="gap-2">
                {generatingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Auto-generate
              </Button>
            </div>
            <div className="space-y-2">
              {form.key_points_en.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={point} onChange={(e) => handleKeyPointChange(index, e.target.value, true)} placeholder={`Point ${index + 1}`} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeKeyPoint(index, true)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addKeyPoint(true)}><Plus className="w-4 h-4 mr-1" /> Add point</Button>
            </div>
          </div>
        </div>

        {/* Region & sharing */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-headline text-lg font-medium text-headline flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              Redaksjon
            </h3>
            {articleId && form.title && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={forkArticle}
                disabled={forking}
                className="gap-2"
                title="Lag en regional versjon (kladd) som du kan tilpasse"
              >
                {forking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitFork className="w-3.5 h-3.5" />}
                {forking ? "Forker..." : "Fork som regional versjon"}
              </Button>
            )}
          </div>

          {forkedFromArticleId && (
            <div className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-xs text-foreground/80 flex items-center gap-2">
              <GitFork className="w-3.5 h-3.5 text-accent" />
              Basert på{" "}
              <button
                type="button"
                onClick={() => window.open(`/article/${forkedFromArticleId}`, "_blank")}
                className="underline hover:text-accent font-medium"
              >
                {forkedFromTitle || "originalartikkel"}
              </button>
            </div>
          )}

          <div>
            <Label>Hovedredaksjon</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Region som eier artikkelen.</p>
            <RegionPicker
              mode="single"
              value={form.region_slug}
              onChange={(slug) => updateForm({ region_slug: slug })}
              placeholder="Velg redaksjon"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="m-0">Del med andre redaksjoner</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Velg redaksjoner som også skal kunne se og bruke denne artikkelen.
            </p>
            <RegionPicker
              mode="multi"
              value={sharedRegions}
              onChange={setSharedRegions}
              disabledSlug={form.region_slug}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">Metadata</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 lg:col-span-3">
              <Label>Kategori *</Label>
              <div className="mt-1.5">
                <CategorySelect value={form.category} onChange={(val) => updateForm({ category: val })} />
              </div>
            </div>

            <div>
              <Label htmlFor="author">Forfatter *</Label>
              <AuthorSelect
                value={form.author}
                onChange={(name) => updateForm({ author: name })}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="co_authors">Ekstra bylines (kommaseparert)</Label>
              <Input
                id="co_authors"
                value={(form.co_authors ?? []).join(", ")}
                onChange={(e) =>
                  updateForm({
                    co_authors: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="F.eks. Foto: Kari Nordmann, Bidrag: Ola Hansen"
                className="mt-1.5"
              />
              {form.co_authors && form.co_authors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.co_authors.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-subhead"
                    >
                      {name}
                      <button
                        type="button"
                        aria-label={`Fjern ${name}`}
                        onClick={() =>
                          updateForm({
                            co_authors: form.co_authors.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <select id="type" value={form.type} onChange={(e) => updateForm({ type: e.target.value as any })} className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="article">Artikkel</option>
                <option value="video">Video</option>
                <option value="podcast">Podcast</option>
              </select>
            </div>

            <div>
              <Label htmlFor="read_time">Lesetid (auto)</Label>
              <Input id="read_time" value={form.read_time} onChange={(e) => updateForm({ read_time: e.target.value })} placeholder="Beregnes automatisk" className="mt-1.5" />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch id="premium" checked={form.premium} onCheckedChange={(checked) => updateForm({ premium: checked })} />
              <Label htmlFor="premium" className="cursor-pointer">Premium-artikkel</Label>
            </div>
          </div>
        </div>

        {/* Company Tags */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-headline text-lg font-medium text-headline">Selskapskobling</h3>
            <Button type="button" variant="outline" size="sm" onClick={suggestCompanies} disabled={suggestingCompanies} className="gap-2">
              {suggestingCompanies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
              Foreslå fra tekst
            </Button>
          </div>

          {/* AI Suggestions */}
          {suggestedCompanyNames.length > 0 && (() => {
            const remaining = suggestedCompanyNames.filter(
              (name) => !companyTags.some((t) => t.company_name?.toLowerCase().trim() === name.toLowerCase().trim())
            );
            return (
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-xs text-muted-foreground">AI-forslag (klikk for å legge til):</p>
                {remaining.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={async () => {
                      for (const name of remaining) {
                        await lookupAndAddCompany(name);
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Legg til alle ({remaining.length})
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedCompanyNames.map((name) => {
                  const added = companyTags.some(
                    (t) => t.company_name?.toLowerCase().trim() === name.toLowerCase().trim()
                  );
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => !added && lookupAndAddCompany(name)}
                      disabled={added}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-colors ${
                        added
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-default"
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      }`}
                      title={added ? "Allerede lagt til" : "Legg til som tag"}
                    >
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
                        added ? "bg-emerald-500/20" : "bg-accent/20"
                      }`}>
                        {added ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                      </span>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {companyTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {companyTags.map((tag) => (
                <Badge key={tag.orgnr} variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
                  <span className="font-subhead text-xs">{tag.company_name || tag.orgnr}</span>
                  <span className="text-[10px] text-muted-foreground">({tag.orgnr})</span>
                  <button type="button" onClick={() => setCompanyTags(companyTags.filter((t) => t.orgnr !== tag.orgnr))} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Label htmlFor="company_search">Søk etter selskap</Label>
            <Input
              id="company_search"
              value={companySearch}
              onChange={(e) => {
                const val = e.target.value;
                setCompanySearch(val);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                if (val.length >= 2) {
                  setShowResults(true);
                  debounceRef.current = setTimeout(() => {
                    setSearchingCompanies(true);
                    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
                    fetch(`${baseUrl}?action=search&q=${encodeURIComponent(val)}&size=8`, {
                      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                    })
                      .then((r) => r.json())
                      .then((d) => setSearchResults(d.companies?.map((c: any) => ({ orgnr: c.organisasjonsnummer, navn: c.navn })) || []))
                      .catch(() => setSearchResults([]))
                      .finally(() => setSearchingCompanies(false));
                  }, 350);
                } else {
                  setSearchResults([]);
                  setShowResults(false);
                }
              }}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="Skriv selskapsnavn eller org.nr..."
              className="mt-1.5"
              autoComplete="off"
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((r) => {
                  const alreadyAdded = companyTags.some((t) => t.orgnr === r.orgnr);
                  return (
                    <button
                      key={r.orgnr}
                      type="button"
                      disabled={alreadyAdded}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 disabled:opacity-40"
                      onClick={() => {
                        setCompanyTags([...companyTags, { orgnr: r.orgnr, company_name: r.navn }]);
                        setCompanySearch("");
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                    >
                      <span className="font-subhead text-sm truncate">{r.navn}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{r.orgnr}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {searchingCompanies && (
              <div className="absolute right-3 top-9 text-xs text-muted-foreground">Søker...</div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-4">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">
            Tags
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Nøkkelord vises som klikkbare chips nederst i artikkelen og knytter sammen relatert innhold.
          </p>
          <ArticleTagInput
            value={articleTags}
            onChange={setArticleTags}
            articleTitle={form.title}
            articleBody={form.body}
          />
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={onBack}>Avbryt</Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </form>

      <ArticlePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        article={{
          id: currentArticleId,
          title: form.title,
          excerpt: form.excerpt,
          body: composedBody || form.body,
          category: form.category,
          author: form.author,
          read_time: form.read_time,
          image_url: form.image_url,
          image_crop: form.image_crop,
          image_focal: form.image_focal,
          key_points: form.key_points,
        }}
      />

      <SocialPostsDialog
        open={socialDialogOpen}
        onOpenChange={setSocialDialogOpen}
        title={form.title}
        excerpt={form.excerpt}
        body={composedBody || form.body}
        category={form.category}
      />

      <Dialog
        open={chartDialogOpen}
        onOpenChange={(open) => (open ? setChartDialogOpen(true) : handleCloseChartDialog())}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChart ? "Rediger graf" : "Sett inn graf"}</DialogTitle>
          </DialogHeader>
          <ChartGenerator
            key={editingChart ? `edit-${editingChart.pos}` : "new"}
            articleTitle={form.title}
            articleExcerpt={form.excerpt}
            initialChart={editingChart?.chart || null}
            onInsert={handleInsertChart}
            onClose={handleCloseChartDialog}
          />
        </DialogContent>
      </Dialog>

      <FactBoxLibraryDialog
        open={factBoxDialogOpen}
        onOpenChange={(open) => (open ? setFactBoxDialogOpen(true) : handleCloseFactBoxDialog())}
        onInsert={handleInsertFactBox}
        initial={editingFactBox?.data || null}
      />

      <SourceCardDialog
        open={sourceCardDialogOpen}
        onOpenChange={(open) => (open ? setSourceCardDialogOpen(true) : handleCloseSourceCardDialog())}
        onInsert={handleInsertSourceCard}
        initial={editingSourceCard?.data || null}
      />

      <ImproveDialog open={!!improveResult} onOpenChange={(open) => !open && setImproveResult(null)}>
        <ImproveDialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <ImproveDialogHeader>
            <ImproveDialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              AI-forbedret brødtekst
            </ImproveDialogTitle>
          </ImproveDialogHeader>
          {improveResult && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm font-body text-foreground">{improveResult.summary}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Ord før: <strong className="text-foreground">{improveResult.word_count_before}</strong></span>
                  <span>→</span>
                  <span>Ord etter: <strong className="text-foreground">{improveResult.word_count_after}</strong></span>
                </div>
              </div>

              {improveResult.issues_found.length > 0 && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-2">
                    <FileCheck className="w-3.5 h-3.5" />
                    Endringer ({improveResult.issues_found.length})
                  </Label>
                  <ul className="space-y-1.5">
                    {improveResult.issues_found.map((issue, i) => (
                      <li key={i} className="text-sm font-body text-foreground/80 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Visuell diff</Label>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-accent/25" />
                      Lagt til
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-destructive/20" />
                      Fjernet
                    </span>
                  </div>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  <InlineDiff
                    original={form.body}
                    improved={improveResult.improved_body}
                    onResultChange={setComposedBody}
                  />
                </div>
              </div>
            </div>
          )}
          <ImproveDialogFooter>
            <Button variant="outline" onClick={() => setImproveResult(null)}>Avbryt</Button>
            <Button onClick={applyImprovedBody} className="gap-2">
              <Check className="w-4 h-4" />
              Bruk forbedret versjon
            </Button>
          </ImproveDialogFooter>
        </ImproveDialogContent>
      </ImproveDialog>
    </div>
  );
};
