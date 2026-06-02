import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";
import { useToast } from "@/hooks/use-toast";

interface ImproveResult {
  improved_body: string;
  summary: string;
  issues_found: string[];
  word_count_before: number;
  word_count_after: number;
}

export interface SuggestedCompany {
  name: string;
  orgnr: string | null;
}

export function useArticleAI(
  getForm: () => { title: string; excerpt: string; body: string; body_en: string; title_en: string; excerpt_en: string; type: string },
  updateForm: (updates: Record<string, any>) => void,
) {
  const { toast } = useToast();

  const [generatingPoints, setGeneratingPoints] = useState(false);
  const [generatingTitleExcerpt, setGeneratingTitleExcerpt] = useState(false);
  const [generatingSubheadings, setGeneratingSubheadings] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [suggestingCompanies, setSuggestingCompanies] = useState(false);
  const [suggestedCompanies, setSuggestedCompanies] = useState<SuggestedCompany[]>([]);
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<ImproveResult | null>(null);

  const generateKeyPoints = async (isEnglish = false) => {
    const form = getForm();
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
    const form = getForm();
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

  const generateSubheadings = async () => {
    const form = getForm();
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

  const improveBody = async (improveFocus: string[]) => {
    const form = getForm();
    if (!form.body || form.body.length < 50) {
      toast({ title: "For kort", description: "Brødteksten må være minst 50 tegn", variant: "destructive" });
      return;
    }
    if (improveFocus.length === 0) {
      toast({ title: "Velg minst ett fokusområde", variant: "destructive" });
      return;
    }
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

  const translateToEnglish = async () => {
    const form = getForm();
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
    const form = getForm();
    if (!form.body || form.body.length < 50) return;
    setSuggestingCompanies(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-companies", {
        body: { body: form.body },
      });
      if (error) throw error;
      if (data?.companies?.length) {
        const normalized: SuggestedCompany[] = data.companies.map((c: any) =>
          typeof c === "string" ? { name: c, orgnr: null } : { name: c.name, orgnr: c.orgnr ?? null }
        );
        setSuggestedCompanies(normalized);
        toast({ title: "Foreslått", description: `${normalized.length} selskaper funnet i teksten` });
      } else {
        toast({ title: "Ingen funnet", description: "Ingen selskaper identifisert i teksten" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setSuggestingCompanies(false);
    }
  };

  const lookupAndAddCompany = async (
    name: string,
    companyTags: { orgnr: string; company_name: string }[],
    addCompanyTag: (tag: { orgnr: string; company_name: string }) => void,
  ) => {
    try {
      const baseUrl = `${SUPABASE_URL}/functions/v1/brreg-proxy`;
      const stripped = name.trim().replace(/\s+(AS|ASA|SA|ANS|DA|BA)$/i, "").trim();
      const queries = stripped && stripped.toLowerCase() !== name.trim().toLowerCase()
        ? [stripped, name]
        : [name];

      let c: any = null;
      for (const q of queries) {
        const res = await fetch(`${baseUrl}?action=search&q=${encodeURIComponent(q)}&size=8`, {
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        });
        const d = await res.json();
        c = d.companies?.[0];
        if (c?.orgnr) break;
      }

      if (c?.orgnr) {
        const orgnr = c.orgnr;
        if (!companyTags.some(t => t.orgnr === orgnr)) {
          addCompanyTag({ orgnr, company_name: c.navn });
        }
        setSuggestedCompanies(prev => prev.filter(s => s.name !== name));
      } else {
        toast({ title: "Ikke funnet", description: `Fant ikke «${name}» i Brønnøysundregisteret`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err?.message || "Kunne ikke søke", variant: "destructive" });
    }
  };

  return {
    generatingPoints,
    generatingTitleExcerpt,
    generatingSubheadings,
    translating,
    suggestingCompanies,
    suggestedCompanies,
    setSuggestedCompanies,
    improving,
    improveResult,
    setImproveResult,
    generateKeyPoints,
    generateTitleExcerpt,
    generateSubheadings,
    improveBody,
    translateToEnglish,
    suggestCompanies,
    lookupAndAddCompany,
  };
}
