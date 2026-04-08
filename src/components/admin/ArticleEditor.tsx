import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ArticleEditorProps {
  articleId: string | null;
  onBack: () => void;
}

export const ArticleEditor = ({ articleId, onBack }: ArticleEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [companyTags, setCompanyTags] = useState<{ orgnr: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ orgnr: string; navn: string }[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  });

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const fetchArticle = async () => {
    if (!articleId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

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
      });

      // Fetch company tags
      const { data: tags } = await supabase
        .from("article_company_tags")
        .select("orgnr, company_name")
        .eq("article_id", articleId);
      setCompanyTags(tags || []);
    } catch (error: any) {
      toast({
        title: "Feil",
        description: "Kunne ikke hente artikkelen",
        variant: "destructive",
      });
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
      };

      if (articleId) {
        const { error } = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", articleId);

        if (error) throw error;

        // Sync company tags
        await supabase.from("article_company_tags").delete().eq("article_id", articleId);
        if (companyTags.length > 0) {
          await supabase.from("article_company_tags").insert(
            companyTags.map((t) => ({ article_id: articleId, orgnr: t.orgnr, company_name: t.company_name }))
          );
        }

        toast({
          title: "Lagret",
          description: "Artikkelen er oppdatert",
        });
      } else {
        const { error } = await supabase
          .from("articles")
          .insert(articleData);

        if (error) throw error;
        toast({
          title: "Opprettet",
          description: "Artikkelen er opprettet",
        });
        onBack();
      }
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPointChange = (index: number, value: string, isEnglish: boolean = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    const newPoints = [...form[field]];
    newPoints[index] = value;
    setForm({ ...form, [field]: newPoints });
  };

  const addKeyPoint = (isEnglish: boolean = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    setForm({ ...form, [field]: [...form[field], ""] });
  };

  const removeKeyPoint = (index: number, isEnglish: boolean = false) => {
    const field = isEnglish ? "key_points_en" : "key_points";
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-headline text-2xl font-semibold text-headline">
          {articleId ? "Rediger artikkel" : "Ny artikkel"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">
            Norsk innhold
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Artikkelens tittel"
                className="mt-1.5"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="excerpt">Ingress *</Label>
              <Textarea
                id="excerpt"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Kort beskrivelse av artikkelen"
                className="mt-1.5"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="body">Brødtekst *</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Artikkelens innhold"
                className="mt-1.5 min-h-[300px]"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label>Hovedpunkter</Label>
              <div className="space-y-2 mt-1.5">
                {form.key_points.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={point}
                      onChange={(e) => handleKeyPointChange(index, e.target.value)}
                      placeholder={`Punkt ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeKeyPoint(index)}
                    >
                      Fjern
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addKeyPoint()}>
                  Legg til punkt
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">
            Engelsk innhold (valgfritt)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="title_en">Title</Label>
              <Input
                id="title_en"
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                placeholder="Article title in English"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="excerpt_en">Excerpt</Label>
              <Textarea
                id="excerpt_en"
                value={form.excerpt_en}
                onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })}
                placeholder="Short description in English"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="body_en">Body</Label>
              <Textarea
                id="body_en"
                value={form.body_en}
                onChange={(e) => setForm({ ...form, body_en: e.target.value })}
                placeholder="Article content in English"
                className="mt-1.5 min-h-[200px]"
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">
            Metadata
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="f.eks. Medierettigheter"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="author">Forfatter *</Label>
              <Input
                id="author"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Forfatterens navn"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="article">Artikkel</option>
                <option value="video">Video</option>
                <option value="podcast">Podcast</option>
              </select>
            </div>

            <div>
              <Label htmlFor="read_time">Lesetid</Label>
              <Input
                id="read_time"
                value={form.read_time}
                onChange={(e) => setForm({ ...form, read_time: e.target.value })}
                placeholder="f.eks. 5 min lesing"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="image_url">Bilde-URL</Label>
              <Input
                id="image_url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="premium"
                checked={form.premium}
                onCheckedChange={(checked) => setForm({ ...form, premium: checked })}
              />
              <Label htmlFor="premium" className="cursor-pointer">
                Premium-artikkel
              </Label>
            </div>
          </div>
        </div>

        {/* Company Tags */}
        <div className="bg-card rounded-xl p-6 shadow-soft space-y-6">
          <h3 className="font-headline text-lg font-medium text-headline border-b border-border pb-3">
            Selskapskobling
          </h3>
          <p className="text-sm text-muted-foreground">
            Koble artikkelen til selskaper via organisasjonsnummer. Artikkelen vises da på selskapsprofilen.
          </p>

          {companyTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {companyTags.map((tag) => (
                <Badge key={tag.orgnr} variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
                  <span className="font-subhead text-xs">{tag.company_name || tag.orgnr}</span>
                  <span className="text-[10px] text-muted-foreground">({tag.orgnr})</span>
                  <button
                    type="button"
                    onClick={() => setCompanyTags(companyTags.filter((t) => t.orgnr !== tag.orgnr))}
                    className="ml-1 hover:text-destructive"
                  >
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
                if (val.length >= 2) {
                  setSearchingCompanies(true);
                  setShowResults(true);
                  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
                  fetch(`${baseUrl}?action=search&q=${encodeURIComponent(val)}&size=8`, {
                    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                  })
                    .then((r) => r.json())
                    .then((d) => setSearchResults(d.companies?.map((c: any) => ({ orgnr: c.organisasjonsnummer, navn: c.navn })) || []))
                    .catch(() => setSearchResults([]))
                    .finally(() => setSearchingCompanies(false));
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
          <Button type="button" variant="outline" onClick={onBack}>
            Avbryt
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </form>
    </div>
  );
};
