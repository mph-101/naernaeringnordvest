import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, X, Plus, Sparkles, Loader2, CloudOff, Cloud, Languages, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./RichTextEditor";
import { ImageUpload } from "./ImageUpload";
import { CategorySelect } from "./CategorySelect";
import { AudioTranscriber } from "./AudioTranscriber";

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
  const [generatingPoints, setGeneratingPoints] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [suggestingCompanies, setSuggestingCompanies] = useState(false);
  const { toast } = useToast();
  const [companyTags, setCompanyTags] = useState<{ orgnr: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ orgnr: string; navn: string }[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [suggestedCompanyNames, setSuggestedCompanyNames] = useState<string[]>([]);
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
    type: "article" as "article" | "video" | "podcast",
    premium: false,
    read_time: "",
    image_url: "",
    key_points: [] as string[],
    key_points_en: [] as string[],
    status: "draft" as ArticleStatus,
  });

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
        setForm(prev => ({ ...prev, read_time: calculated }));
      }
    }
  }, [form.body, form.type]);

  // Auto-save (debounced, only for existing articles)
  const triggerAutoSave = useCallback(() => {
    if (!articleId) return;
    setAutoSaveStatus("unsaved");
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      const currentForm = formRef.current;
      if (!currentForm || !currentForm.title) return;
      setAutoSaveStatus("saving");
      try {
        const { error } = await supabase.from("articles").update({
          title: currentForm.title,
          title_en: currentForm.title_en || null,
          excerpt: currentForm.excerpt,
          excerpt_en: currentForm.excerpt_en || null,
          body: currentForm.body,
          body_en: currentForm.body_en || null,
          category: currentForm.category,
          author: currentForm.author,
          type: currentForm.type,
          premium: currentForm.premium,
          read_time: currentForm.read_time || null,
          image_url: currentForm.image_url || null,
          key_points: currentForm.key_points,
          key_points_en: currentForm.key_points_en,
          status: currentForm.status,
          published: currentForm.status === "published",
          published_at: currentForm.status === "published" ? new Date().toISOString() : null,
        }).eq("id", articleId);
        if (!error) setAutoSaveStatus("saved");
        else setAutoSaveStatus("unsaved");
      } catch {
        setAutoSaveStatus("unsaved");
      }
    }, 3000);
  }, [articleId]);

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    triggerAutoSave();
  };

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
        type: (data.type as "article" | "video" | "podcast") || "article",
        premium: data.premium || false,
        read_time: data.read_time || "",
        image_url: data.image_url || "",
        key_points: (data.key_points as string[]) || [],
        key_points_en: (data.key_points_en as string[]) || [],
        status: ((data as any).status as ArticleStatus) || (data.published ? "published" : "draft"),
      });
      const { data: tags } = await supabase.from("article_company_tags").select("orgnr, company_name").eq("article_id", articleId);
      setCompanyTags(tags || []);
    } catch {
      toast({ title: "Feil", description: "Kunne ikke hente artikkelen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        type: form.type,
        premium: form.premium,
        read_time: form.read_time || null,
        image_url: form.image_url || null,
        key_points: form.key_points,
        key_points_en: form.key_points_en,
        status: form.status,
        published: form.status === "published",
        published_at: form.status === "published" ? new Date().toISOString() : null,
      };

      if (articleId) {
        const { error } = await supabase.from("articles").update(articleData).eq("id", articleId);
        if (error) throw error;
        await supabase.from("article_company_tags").delete().eq("article_id", articleId);
        if (companyTags.length > 0) {
          await supabase.from("article_company_tags").insert(
            companyTags.map((t) => ({ article_id: articleId, orgnr: t.orgnr, company_name: t.company_name }))
          );
        }
        toast({ title: "Lagret", description: "Artikkelen er oppdatert" });
      } else {
        const { error } = await supabase.from("articles").insert(articleData);
        if (error) throw error;
        toast({ title: "Opprettet", description: "Artikkelen er opprettet" });
        onBack();
      }
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
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
      const res = await fetch(`${baseUrl}?action=search&q=${encodeURIComponent(name)}&size=1`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const d = await res.json();
      const c = d.companies?.[0];
      if (c) {
        const orgnr = c.organisasjonsnummer;
        if (!companyTags.some(t => t.orgnr === orgnr)) {
          setCompanyTags(prev => [...prev, { orgnr, company_name: c.navn }]);
        }
      }
      setSuggestedCompanyNames(prev => prev.filter(n => n !== name));
    } catch {}
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

        {articleId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {autoSaveStatus === "saved" && <><Cloud className="w-3.5 h-3.5 text-green-500" /> Lagret</>}
            {autoSaveStatus === "saving" && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lagrer...</>}
            {autoSaveStatus === "unsaved" && <><CloudOff className="w-3.5 h-3.5 text-amber-500" /> Ulagret</>}
          </div>
        )}

        <div className="flex items-center gap-2">
          {(["draft", "review", "published"] as ArticleStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateForm({ status: s })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                form.status === s
                  ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Featured Image */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-4">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">Hovedbilde</h3>
          <ImageUpload currentUrl={form.image_url} onUpload={(url) => updateForm({ image_url: url })} />
        </div>

        {/* Norwegian content */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-headline text-lg font-medium text-headline">Norsk innhold</h3>
            <AudioTranscriber onTranscript={handleAudioTranscript} />
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
            <Label>Brødtekst *</Label>
            <div className="mt-1.5">
              <RichTextEditor content={form.body} onChange={(html) => updateForm({ body: html })} onImageUpload={handleInsertImage} placeholder="Skriv artikkelens innhold her..." />
            </div>
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
              <Input id="author" value={form.author} onChange={(e) => updateForm({ author: e.target.value })} placeholder="Forfatterens navn" className="mt-1.5" required />
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
          {suggestedCompanyNames.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">AI-forslag (klikk for å legge til):</p>
              <div className="flex flex-wrap gap-2">
                {suggestedCompanyNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => lookupAndAddCompany(name)}
                    className="px-3 py-1 text-xs rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          )}

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

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={onBack}>Avbryt</Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </form>
    </div>
  );
};
