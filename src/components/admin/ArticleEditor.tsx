import { useState, useEffect, useRef, useCallback } from "react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, X, Plus, Loader2, CloudOff, Cloud, Building2, Check, MapPin, GitFork, Share2, Wand2, FileCheck, ExternalLink, Crop as CropIcon, Eye } from "lucide-react";
import { ArticlePreviewDialog } from "./ArticlePreviewDialog";
import { PrePublishChecklist, buildPublishChecklist } from "./PrePublishChecklist";
import { Dialog as ImproveDialog, DialogContent as ImproveDialogContent, DialogHeader as ImproveDialogHeader, DialogTitle as ImproveDialogTitle, DialogFooter as ImproveDialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { InlineDiff } from "./InlineDiff";
import { ImageUpload } from "./ImageUpload";
import { ArticleGalleryEditor } from "./ArticleGalleryEditor";
import { ArticleVariantsManager } from "./ArticleVariantsManager";
import { ImageCropDialog } from "./ImageCropDialog";
import type { ImageCrop, ImageFocal } from "@/lib/image-crop";
import { cropToBackgroundStyle, parseCrop, parseFocal } from "@/lib/image-crop";
import { CategorySelect } from "./CategorySelect";
import { loadProofreadSettingsFromDb } from "./ProofreadRules";
import { ChartGenerator } from "@/components/charts/ChartGenerator";
import type { ChartData } from "@/components/charts/ArticleChart";
import { FactBoxLibraryDialog } from "@/components/factbox/FactBoxLibraryDialog";
import { encodeFactBox, type FactBoxData } from "@/components/factbox/FactBox";
import { SourceCardDialog } from "@/components/source-card/SourceCardDialog";
import { encodeSourceCard, type SourceCardData } from "@/components/source-card/SourceCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArticleTagInput } from "./ArticleTagInput";
import { CollapsibleSection } from "./CollapsibleSection";
import { ArticleProvenancePanel } from "./ArticleProvenancePanel";
import { useArticleProvenance } from "@/hooks/useArticleProvenance";
import type { AgentExposure } from "@/lib/agent-provenance/types";
import { RegionPicker } from "./RegionPicker";
import { AuthorSelect } from "./AuthorSelect";
import { InlineImagePicker, type InlineImageResult } from "./InlineImagePicker";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";
import type { Tag as ArticleTag } from "@/lib/tag-utils";
import { ArticleMediaEmbed } from "@/components/ArticleMediaEmbed";
import { ArticleEditorBody } from "./ArticleEditorBody";
import { useArticleProofreading } from "@/hooks/useArticleProofreading";
import { useArticleAI } from "@/hooks/useArticleAI";

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
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(articleId);
  useEffect(() => {
    setCurrentArticleId(articleId);
  }, [articleId]);
  const [composedBody, setComposedBody] = useState<string>("");
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<{ chart: ChartData; pos: number } | null>(null);
  const [factBoxDialogOpen, setFactBoxDialogOpen] = useState(false);
  const [editingFactBox, setEditingFactBox] = useState<{ data: FactBoxData; pos: number } | null>(null);
  const [inlineImagePickerOpen, setInlineImagePickerOpen] = useState(false);
  const [inlineImg, setInlineImg] = useState<{ url: string; alt: string; caption: string; credit: string; source: string } | null>(null);
  const [insertingInlineImg, setInsertingInlineImg] = useState(false);
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<any>(null);

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
    media_url: "",
    pinned_position: null as number | null,
    image_caption: "",
    image_credit: "",
    image_source: "",
    scheduled_publish_at: null as string | null,
    collab_enabled: false,
    agent_exposure: "headline_plus_dek" as AgentExposure,
  });
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [sharedRegions, setSharedRegions] = useState<string[]>([]);
  const [lastPublishedBody, setLastPublishedBody] = useState<string>("");
  const [lastPublishedTitle, setLastPublishedTitle] = useState<string>("");
  const [lastPublishedExcerpt, setLastPublishedExcerpt] = useState<string>("");
  const [lastPublishedImageUrl, setLastPublishedImageUrl] = useState<string>("");
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState<string>("");
  const [forkedFromArticleId, setForkedFromArticleId] = useState<string | null>(null);
  const [forkedFromTitle, setForkedFromTitle] = useState<string | null>(null);
  const [allRegions, setAllRegions] = useState<EditorialRegion[]>([]);
  const [forking, setForking] = useState(false);

  // Agent-provenance child rows (sources/responses/corrections). Self-loads on
  // currentArticleId; persisted in handleSave via provenance.save(id).
  const provenance = useArticleProvenance(currentArticleId);

  const publishChecklist = buildPublishChecklist({
    author: form.author,
    imageUrl: form.image_url,
    excerpt: form.excerpt,
    tagCount: articleTags.length,
    body: form.body,
    sourceCount: provenance.sources.length,
    responseCount: provenance.responses.length,
    regionSlug: form.region_slug,
  });
  // Advisory items (e.g. provenance) nudge but never block publishing.
  const canPublish = publishChecklist.every((i) => i.advisory || i.done);
  const hasAdvisoryNudge = publishChecklist.some((i) => i.advisory && !i.done);

  // --- Hooks for AI and proofreading ---
  const getBody = useCallback(() => formRef.current?.body || "", []);
  const updateBodyFromProof = useCallback((body: string) => {
    setForm((prev) => ({ ...prev, body }));
    triggerAutoSave();
  }, []);

  const proofHook = useArticleProofreading(getBody, updateBodyFromProof);

  const getFormForAI = useCallback(() => {
    const f = formRef.current;
    return {
      title: f?.title || "",
      excerpt: f?.excerpt || "",
      body: f?.body || "",
      body_en: f?.body_en || "",
      title_en: f?.title_en || "",
      excerpt_en: f?.excerpt_en || "",
      type: f?.type || "article",
    };
  }, []);

  const updateFormFromAI = useCallback((updates: Record<string, any>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    triggerAutoSave();
  }, []);

  const aiHook = useArticleAI(getFormForAI, updateFormFromAI);

  // --- Effects ---

  useEffect(() => {
    fetchRegions().then(setAllRegions).catch(() => {});
  }, []);

  useEffect(() => {
    loadProofreadSettingsFromDb().catch(() => {});
  }, []);

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

  useEffect(() => {
    if (form.body && form.body.length > 20) {
      const calculated = calcReadTime(form.body, form.type);
      if (calculated !== form.read_time) {
        updateForm({ read_time: calculated });
      }
    }
  }, [form.body, form.type]);

  // --- Auto-save ---

  const triggerAutoSave = useCallback(() => {
    setAutoSaveStatus("unsaved");
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      void runAutoSave();
    }, 1200);
  }, []);

  const runAutoSave = useCallback(async () => {
    const currentForm = formRef.current;
    if (!currentForm) return;
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
      published_at: currentForm.status === "published"
        ? (originalPublishedAt || new Date().toISOString())
        : null,
      region_slug: currentForm.region_slug || null,
      pinned_position: currentForm.pinned_position ?? null,
      image_caption: currentForm.image_caption?.trim() || null,
      image_credit: currentForm.image_credit?.trim() || null,
      image_source: currentForm.image_source?.trim() || null,
      scheduled_publish_at: currentForm.scheduled_publish_at || null,
      collab_enabled: currentForm.collab_enabled,
    } as any;
    try {
      if (currentArticleId) {
        const { error } = await supabase
          .from("articles")
          .update(payload)
          .eq("id", currentArticleId);
        if (error) throw error;
      } else {
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
        if (inserted?.id) {
          setCurrentArticleId(inserted.id);
          if (payload.published_at) setOriginalPublishedAt(payload.published_at);
        }
      }
      setAutoSaveStatus("saved");
    } catch {
      setAutoSaveStatus("unsaved");
    }
  }, [currentArticleId, originalPublishedAt]);

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

  const relationsHydratedRef = useRef(false);
  useEffect(() => {
    relationsHydratedRef.current = false;
  }, [articleId]);

  useEffect(() => {
    if (!currentArticleId) return;
    if (!relationsHydratedRef.current) {
      relationsHydratedRef.current = true;
      return;
    }
    setAutoSaveStatus("unsaved");
    const t = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
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

  // --- Data fetching ---

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
        media_url: ((data as any).media_url as string | null) ?? "",
        pinned_position: ((data as any).pinned_position as number | null) ?? null,
        image_caption: ((data as any).image_caption as string | null) ?? "",
        image_credit: ((data as any).image_credit as string | null) ?? "",
        image_source: ((data as any).image_source as string | null) ?? "",
        scheduled_publish_at: ((data as any).scheduled_publish_at as string | null) ?? null,
        collab_enabled: ((data as any).collab_enabled as boolean | null) ?? false,
        agent_exposure: ((data as any).agent_exposure as AgentExposure) ?? "headline_plus_dek",
      });
      setLastPublishedBody(data.published ? (data.body || "") : "");
      setLastPublishedTitle(data.published ? (data.title || "") : "");
      setLastPublishedExcerpt(data.published ? (data.excerpt || "") : "");
      setLastPublishedImageUrl(data.published ? (data.image_url || "") : "");
      setOriginalPublishedAt(data.published_at ?? null);
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

  // --- Submit ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        published_at: form.status === "published"
          ? (originalPublishedAt || new Date().toISOString())
          : null,
        region_slug: form.region_slug || null,
        media_url: form.media_url?.trim() ? form.media_url.trim() : null,
        pinned_position: form.pinned_position ?? null,
        image_caption: form.image_caption?.trim() || null,
        image_credit: form.image_credit?.trim() || null,
        image_source: form.image_source?.trim() || null,
        scheduled_publish_at: form.scheduled_publish_at || null,
        collab_enabled: form.collab_enabled,
        agent_exposure: form.agent_exposure,
      } as any;

      const syncSharedRegions = async (id: string) => {
        await supabase.from("article_shared_regions" as any).delete().eq("article_id", id);
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
        const bodyChanged = form.body !== lastPublishedBody;
        const titleChanged = form.title !== lastPublishedTitle;
        const excerptChanged = form.excerpt !== lastPublishedExcerpt;
        const imageChanged = (form.image_url || "") !== lastPublishedImageUrl;
        const hasChange = bodyChanged || titleChanged || excerptChanged || imageChanged;
        if (form.status === "published" && hasChange) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: latest } = await supabase
              .from("article_revisions" as any)
              .select("revision_number")
              .eq("article_id", idForUpdate)
              .order("revision_number", { ascending: false })
              .limit(1)
              .maybeSingle();
            const nextNum = ((latest as any)?.revision_number ?? 0) + 1;
            const wc = stripHtml(form.body).split(/\s+/).filter(Boolean).length;
            const parts: string[] = [];
            if (bodyChanged && lastPublishedBody) {
              const prevWc = stripHtml(lastPublishedBody).split(/\s+/).filter(Boolean).length;
              const delta = wc - prevWc;
              parts.push(`${delta >= 0 ? "+" : ""}${delta} ord (${wc} totalt)`);
            } else if (bodyChanged) {
              parts.push(`${wc} ord`);
            }
            if (titleChanged) parts.push("tittel endret");
            if (excerptChanged) parts.push("ingress endret");
            if (imageChanged) parts.push("bilde endret");
            const summary = parts.join(", ") || null;
            await supabase.from("article_revisions" as any).insert({
              article_id: idForUpdate,
              revision_number: nextNum,
              title: form.title,
              body: form.body,
              body_diff_summary: summary,
              change_note: changeNote.trim() || null,
              word_count: wc,
              changed_by: user?.id ?? null,
              changed_by_name: form.author || null,
            });
            setLastPublishedBody(form.body);
            setLastPublishedTitle(form.title);
            setLastPublishedExcerpt(form.excerpt);
            setLastPublishedImageUrl(form.image_url || "");
            setChangeNote("");
          } catch (revErr) {
            console.warn("Could not write revision", revErr);
          }
        }
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
        await provenance.save(idForUpdate);
        if (!originalPublishedAt && articleData.published_at) {
          setOriginalPublishedAt(articleData.published_at);
        }
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
          if (articleData.published_at) setOriginalPublishedAt(articleData.published_at);
          await syncSharedRegions(inserted.id);
          await provenance.save(inserted.id);
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

  // --- Fork ---

  const forkArticle = async () => {
    if (!articleId) return;
    setForking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      if (companyTags.length > 0 && inserted?.id) {
        await supabase.from("article_company_tags").insert(
          companyTags.map((t) => ({ article_id: inserted.id, orgnr: t.orgnr, company_name: t.company_name })),
        );
      }
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

  // --- Inline image helpers ---

  const handleInsertImage = () => {
    setInlineImagePickerOpen(true);
  };

  const handleInlineImageSelected = (result: InlineImageResult) => {
    setInlineImg({ url: result.url, alt: result.alt, caption: result.caption, credit: result.credit, source: result.source });
  };

  const escapeAttr = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const confirmInsertInlineImage = () => {
    if (!inlineImg) return;
    setInsertingInlineImg(true);
    const { url, alt, caption, credit, source } = inlineImg;
    const attrs = [
      'data-nn-image="true"',
      caption.trim() ? `data-caption="${escapeAttr(caption.trim())}"` : "",
      credit.trim() ? `data-credit="${escapeAttr(credit.trim())}"` : "",
      source.trim() ? `data-source="${escapeAttr(source.trim())}"` : "",
    ].filter(Boolean).join(" ");
    const figureHtml = `<figure ${attrs}><img src="${url}" alt="${escapeAttr(alt.trim())}" /></figure>`;
    updateForm({ body: form.body + figureHtml });
    setInlineImg(null);
    setInsertingInlineImg(false);
  };

  // --- Chart/FactBox/SourceCard insert ---

  const handleInsertChart = (chart: ChartData) => {
    const json = JSON.stringify(chart);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const figureHtml = `<figure data-nn-chart="true" data-chart="${encoded}"><p><strong>${chart.title}</strong> — ${chart.source}</p></figure>`;

    const editor = editorInstanceRef.current;
    if (editingChart && editor) {
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

  // --- Apply improved body ---

  const applyImprovedBody = () => {
    if (!aiHook.improveResult) return;
    const stripH = (h: string) =>
      h
        .replace(/<\s*(p|h[1-6]|li|blockquote|br|div)[^>]*>/gi, "\n")
        .replace(/<\/\s*(p|h[1-6]|li|blockquote|div)\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const fullImprovedPlain = stripH(aiHook.improveResult.improved_body);
    const fullOriginalPlain = stripH(form.body);
    let nextBody: string;
    if (composedBody.trim() === fullImprovedPlain.trim()) {
      nextBody = aiHook.improveResult.improved_body;
    } else if (composedBody.trim() === fullOriginalPlain.trim()) {
      nextBody = form.body;
    } else {
      const paragraphs = composedBody
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("\n");
      nextBody = paragraphs || aiHook.improveResult.improved_body;
    }
    updateForm({ body: nextBody });
    toast({ title: "Brødtekst oppdatert", description: aiHook.improveResult.summary });
    aiHook.setImproveResult(null);
    setComposedBody("");
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Header with status */}
      <div className="mb-6 space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
            aria-label="Tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-headline text-xl sm:text-2xl font-semibold text-headline truncate flex-1 min-w-0">
            {articleId ? "Rediger artikkel" : "Ny artikkel"}
          </h2>
          {(articleId || currentArticleId) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              {autoSaveStatus === "saved" && <><Cloud className="w-3.5 h-3.5 text-green-500" /> <span className="hidden sm:inline">Lagret</span></>}
              {autoSaveStatus === "saving" && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span className="hidden sm:inline">Lagrer...</span></>}
              {autoSaveStatus === "unsaved" && <><CloudOff className="w-3.5 h-3.5 text-amber-500" /> <span className="hidden sm:inline">Ulagret</span></>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <button
            type="button"
            onClick={() => setPreviewDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-subhead font-medium text-foreground bg-card hover:bg-muted border border-border rounded-full transition-colors"
            title="Live forhåndsvisning av usav nede endringer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live preview</span>
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
              <span>{form.status === "published" ? "Gå til artikkel" : "Åpne lagret"}</span>
            </a>
          )}

          <div className="flex items-center gap-1.5">
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
                  updateForm({ status: s, ...(s === "published" ? { scheduled_publish_at: null } : {}) });
                }}
                disabled={s === "published" && !canPublish}
                title={s === "published" && !canPublish ? "Fullfør publiseringskravene først" : undefined}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
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

          {form.status !== "published" && (
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="scheduled-publish" className="text-xs text-muted-foreground whitespace-nowrap">
                Planlagt publisering:
              </Label>
              <input
                id="scheduled-publish"
                type="datetime-local"
                value={form.scheduled_publish_at ? form.scheduled_publish_at.slice(0, 16) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateForm({ scheduled_publish_at: val ? new Date(val).toISOString() : null });
                }}
                className="h-8 px-2 text-xs rounded-md border border-input bg-background"
              />
              {form.scheduled_publish_at && (
                <button
                  type="button"
                  onClick={() => updateForm({ scheduled_publish_at: null })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {form.scheduled_publish_at && form.status !== "published" && (
            <div className="mt-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium inline-flex items-center gap-1.5">
              Planlagt: {new Date(form.scheduled_publish_at).toLocaleString("nb-NO", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Change note for the public revision log */}
        {form.status === "published" && lastPublishedBody && (form.body !== lastPublishedBody || form.title !== lastPublishedTitle || form.excerpt !== lastPublishedExcerpt || (form.image_url || "") !== lastPublishedImageUrl) && (
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
            <Label htmlFor="change-note" className="text-xs font-subhead font-semibold uppercase tracking-wider text-accent">
              Endringsnotat (vises i åpenhetsloggen)
            </Label>
            <Input
              id="change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="F.eks. «La til kommentar fra ordfører» eller «Korrigerte tall i tabell»"
              className="mt-2"
            />
          </div>
        )}
        {form.status !== "published" && (!canPublish || hasAdvisoryNudge) && (
          <PrePublishChecklist items={publishChecklist} variant="card" />
        )}

        {/* Featured Image */}
        <CollapsibleSection title="Hovedbilde" defaultOpen storageKey="featured-image">
          <ImageUpload
            currentUrl={form.image_url}
            onUpload={(url) =>
              updateForm({ image_url: url, image_crop: null, image_focal: null })
            }
            onUploadWithMeta={(meta) =>
              updateForm({
                image_url: meta.url,
                image_crop: null,
                image_focal: null,
                image_caption: meta.caption || form.image_caption,
                image_credit: meta.photographer || form.image_credit,
                image_source: meta.source || form.image_source,
              })
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
          {form.image_url && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div>
                <Label htmlFor="image-caption" className="text-xs text-muted-foreground">Bildetekst</Label>
                <Input
                  id="image-caption"
                  value={form.image_caption}
                  onChange={(e) => updateForm({ image_caption: e.target.value })}
                  placeholder="Beskriv hva bildet viser"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="image-credit" className="text-xs text-muted-foreground">Fotograf / kreditering</Label>
                  <Input
                    id="image-credit"
                    value={form.image_credit}
                    onChange={(e) => updateForm({ image_credit: e.target.value })}
                    placeholder="Foto: Navn Navnesen"
                  />
                </div>
                <div>
                  <Label htmlFor="image-source" className="text-xs text-muted-foreground">Kilde / lisens</Label>
                  <Input
                    id="image-source"
                    value={form.image_source}
                    onChange={(e) => updateForm({ image_source: e.target.value })}
                    placeholder="NTB, Unsplash, etc."
                  />
                </div>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <ArticleGalleryEditor articleId={articleId} />

        {/* Norwegian content — extracted to ArticleEditorBody */}
        <ArticleEditorBody
          body={form.body}
          title={form.title}
          excerpt={form.excerpt}
          category={form.category}
          keyPoints={form.key_points}
          keyPointsEn={form.key_points_en}
          articleId={currentArticleId}
          collabEnabled={form.collab_enabled}
          onBodyChange={(html) => updateForm({ body: html })}
          onFormUpdate={updateForm}
          editorRef={(ed) => { editorInstanceRef.current = ed; }}
          proofreading={proofHook.proofreading}
          proofSuggestions={proofHook.proofSuggestions}
          proofUndoStack={proofHook.proofUndoStack}
          onProofread={proofHook.proofreadBody}
          onApplyAllProof={proofHook.applyAllProofSuggestions}
          onDismissAllProof={proofHook.clearProofSuggestions}
          onUndoLastProof={proofHook.undoLastProofChange}
          generatingPoints={aiHook.generatingPoints}
          generatingTitleExcerpt={aiHook.generatingTitleExcerpt}
          generatingSubheadings={aiHook.generatingSubheadings}
          improving={aiHook.improving}
          onGenerateKeyPoints={aiHook.generateKeyPoints}
          onGenerateTitleExcerpt={aiHook.generateTitleExcerpt}
          onGenerateSubheadings={aiHook.generateSubheadings}
          onImproveBody={aiHook.improveBody}
          onApplyDraft={(draft) => updateForm({
            title: draft.title,
            excerpt: draft.excerpt,
            body: draft.body,
            key_points: draft.key_points,
          })}
          onInsertImage={handleInsertImage}
          onInsertChart={() => { setEditingChart(null); setChartDialogOpen(true); }}
          onEditChart={handleEditChart}
          onInsertFactBox={() => { setEditingFactBox(null); setFactBoxDialogOpen(true); }}
          onEditFactBox={handleEditFactBox}
          onInsertSourceCard={() => { setEditingSourceCard(null); setSourceCardDialogOpen(true); }}
          onEditSourceCard={handleEditSourceCard}
        />

        {/* A/B-testing av tittel + bilde */}
        {currentArticleId && (
          <ArticleVariantsManager
            articleId={currentArticleId}
            baselineTitle={form.title}
            baselineImage={form.image_url || null}
          />
        )}

        {/* Region & sharing */}
        <CollapsibleSection
          title="Redaksjon"
          icon={MapPin}
          storageKey="region"
          headerRight={articleId && form.title ? (
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
          ) : undefined}
        >

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
        </CollapsibleSection>

        {/* Metadata */}
        <CollapsibleSection title="Metadata" storageKey="metadata">

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

            {(form.type === "video" || form.type === "podcast") && (
              <div className="md:col-span-2">
                <Label htmlFor="media_url">
                  {form.type === "video" ? "Video-URL (YouTube, Vimeo eller .mp4)" : "Lyd-URL (Spotify, SoundCloud, Apple Podcasts eller .mp3)"}
                </Label>
                <Input
                  id="media_url"
                  value={form.media_url}
                  onChange={(e) => updateForm({ media_url: e.target.value })}
                  placeholder={form.type === "video" ? "https://www.youtube.com/watch?v=..." : "https://open.spotify.com/episode/..."}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Limes inn fra leverandøren. Spilleren vises øverst i artikkelen.
                </p>
                {form.media_url.trim() && (
                  <div className="mt-3">
                    <p className="text-xs font-subhead font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Forhåndsvisning
                    </p>
                    <ArticleMediaEmbed
                      url={form.media_url}
                      type={form.type as "video" | "podcast"}
                      title={form.title}
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="read_time">Lesetid (auto)</Label>
              <Input id="read_time" value={form.read_time} onChange={(e) => updateForm({ read_time: e.target.value })} placeholder="Beregnes automatisk" className="mt-1.5" />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch id="premium" checked={form.premium} onCheckedChange={(checked) => updateForm({ premium: checked })} />
              <Label htmlFor="premium" className="cursor-pointer">Premium-artikkel</Label>
            </div>

            <div className="pt-2">
              <Label htmlFor="pinned_position">Fest til posisjon i nyhetsflyten</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  id="pinned_position"
                  type="number"
                  min={1}
                  max={20}
                  value={form.pinned_position ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === "") return updateForm({ pinned_position: null });
                    const n = parseInt(v, 10);
                    updateForm({ pinned_position: Number.isFinite(n) && n > 0 ? n : null });
                  }}
                  placeholder="Ikke festet"
                  className="w-32"
                />
                {form.pinned_position != null && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => updateForm({ pinned_position: null })}>
                    Fjern festing
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                1 = øverst (hovedsak), 2 = neste kort, osv. La stå tom for kronologisk plassering.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Company Tags */}
        <CollapsibleSection
          title="Selskapskobling"
          storageKey="company-tags"
          headerRight={
            <Button type="button" variant="outline" size="sm" onClick={aiHook.suggestCompanies} disabled={aiHook.suggestingCompanies} className="gap-2">
              {aiHook.suggestingCompanies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
              Foreslå fra tekst
            </Button>
          }
        >

          {/* AI Suggestions */}
          {aiHook.suggestedCompanies.length > 0 && (() => {
            const isAdded = (s: { name: string; orgnr: string | null }) =>
              (s.orgnr && companyTags.some((t) => t.orgnr === s.orgnr)) ||
              companyTags.some((t) => t.company_name?.toLowerCase().trim() === s.name.toLowerCase().trim());

            const remaining = aiHook.suggestedCompanies.filter((s) => !isAdded(s));

            const addOne = async (s: { name: string; orgnr: string | null }) => {
              if (s.orgnr) {
                if (!companyTags.some((t) => t.orgnr === s.orgnr)) {
                  setCompanyTags((prev) => [...prev, { orgnr: s.orgnr!, company_name: s.name }]);
                }
                return;
              }
              await aiHook.lookupAndAddCompany(s.name, companyTags, (tag) => setCompanyTags((prev) => [...prev, tag]));
            };

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
                      for (const s of remaining) {
                        await addOne(s);
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Legg til alle ({remaining.length})
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {aiHook.suggestedCompanies.map((s) => {
                  const added = isAdded(s);
                  return (
                    <button
                      key={`${s.name}-${s.orgnr ?? "none"}`}
                      type="button"
                      onClick={() => !added && addOne(s)}
                      disabled={added}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-colors ${
                        added
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-default"
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      }`}
                      title={added ? "Allerede lagt til" : s.orgnr ? `Legg til (${s.orgnr})` : "Manuell BRREG-oppslag"}
                    >
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
                        added ? "bg-emerald-500/20" : "bg-accent/20"
                      }`}>
                        {added ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                      </span>
                      {s.name}
                      {!s.orgnr && !added && (
                        <span className="text-[9px] text-muted-foreground ml-1">?</span>
                      )}
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
                    const baseUrl = `${SUPABASE_URL}/functions/v1/brreg-proxy`;
                    fetch(`${baseUrl}?action=search&q=${encodeURIComponent(val)}&size=8`, {
                      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
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
        </CollapsibleSection>

        {/* Tags */}
        <CollapsibleSection title="Tags" storageKey="tags">
          <p className="text-xs text-muted-foreground -mt-2">
            Nøkkelord vises som klikkbare chips nederst i artikkelen og knytter sammen relatert innhold.
          </p>
          <ArticleTagInput
            value={articleTags}
            onChange={setArticleTags}
            articleTitle={form.title}
            articleBody={form.body}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Proveniens (for agenter)" storageKey="provenance">
          <ArticleProvenancePanel
            sources={provenance.sources}
            setSources={provenance.setSources}
            responses={provenance.responses}
            setResponses={provenance.setResponses}
            corrections={provenance.corrections}
            setCorrections={provenance.setCorrections}
            exposure={form.agent_exposure}
            onExposureChange={(e) => updateForm({ agent_exposure: e })}
          />
        </CollapsibleSection>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={onBack}>Avbryt</Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Lagrer..." : form.status === "published" ? "Oppdater artikkel" : "Lagre og publiser"}
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

      <InlineImagePicker
        open={inlineImagePickerOpen}
        onOpenChange={setInlineImagePickerOpen}
        onSelect={handleInlineImageSelected}
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

      <ImproveDialog open={!!aiHook.improveResult} onOpenChange={(open) => !open && aiHook.setImproveResult(null)}>
        <ImproveDialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <ImproveDialogHeader>
            <ImproveDialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              AI-forbedret brødtekst
            </ImproveDialogTitle>
          </ImproveDialogHeader>
          {aiHook.improveResult && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm font-body text-foreground">{aiHook.improveResult.summary}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Ord før: <strong className="text-foreground">{aiHook.improveResult.word_count_before}</strong></span>
                  <span>→</span>
                  <span>Ord etter: <strong className="text-foreground">{aiHook.improveResult.word_count_after}</strong></span>
                </div>
              </div>

              {aiHook.improveResult.issues_found.length > 0 && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-2">
                    <FileCheck className="w-3.5 h-3.5" />
                    Endringer ({aiHook.improveResult.issues_found.length})
                  </Label>
                  <ul className="space-y-1.5">
                    {aiHook.improveResult.issues_found.map((issue, i) => (
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
                    improved={aiHook.improveResult.improved_body}
                    onResultChange={setComposedBody}
                  />
                </div>
              </div>
            </div>
          )}
          <ImproveDialogFooter>
            <Button variant="outline" onClick={() => aiHook.setImproveResult(null)}>Avbryt</Button>
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
