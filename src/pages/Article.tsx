import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { ArticleByline } from "@/components/ArticleByline";
import { ArticleDiscussion } from "@/components/ArticleDiscussion";
import { TagChips } from "@/components/TagChips";
import { ArticleNotes } from "@/components/ArticleNotes";
import { RelatedByTags } from "@/components/RelatedByTags";
import { CompanyMiniProfile } from "@/components/CompanyMiniProfile";
import { ArticleGallery } from "@/components/ArticleGallery";
import { ArticleBody } from "@/components/charts/ArticleBody";
import { pickDropcapVariant, dropcapClassName } from "@/lib/dropcap";
import { cropToBackgroundStyle, parseCrop, parseFocal } from "@/lib/image-crop";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { getArticleImage } from "@/lib/articles";
import { supabase } from "@/integrations/supabase/client";
import { useArticleTracking } from "@/hooks/useArticleTracking";
import { useArticleVariant, logVariantCompleted } from "@/hooks/useArticleVariant";

interface ArticleData {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  type: string;
  premium: boolean;
  read_time: string | null;
  image_url: string | null;
  image_crop: any;
  image_focal: any;
  published_at: string | null;
  key_points: any;
  title_en: string | null;
  excerpt_en: string | null;
  body_en: string | null;
  key_points_en: any;
}

function timeAgo(dateStr: string, lang: "no" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return lang === "no" ? `${days}d siden` : `${days}d ago`;
  if (hours > 0) return lang === "no" ? `${hours}t siden` : `${hours}h ago`;
  return lang === "no" ? "Nå" : "Now";
}

const Article = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useTheme();
  const t = translations[language];
  const [companyTags, setCompanyTags] = useState<{ orgnr: string; company_name: string }[]>([]);
  const [readProgress, setReadProgress] = useState(0);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [previewBodyEn, setPreviewBodyEn] = useState<string | null>(null);
  const variant = useArticleVariant(article?.id);
  const completedRef = useState({ done: false })[0];

  useEffect(() => {
    if (!id) return;
    const fetchArticle = async () => {
      const { data } = await supabase.from("articles").select("*").eq("id", id).single();
      setArticle(data);
      setLoading(false);

      // For premium articles, ask the server whether the caller has full access
      // and, if not, get a safe preview (excerpt + first paragraph).
      if (data?.premium) {
        const { data: access } = await supabase.functions.invoke("check-article-access", {
          body: { articleId: data.id },
        });
        if (access?.access === "full") {
          setHasFullAccess(true);
        } else {
          setHasFullAccess(false);
          setPreviewBody(access?.preview ?? null);
          setPreviewBodyEn(access?.preview_en ?? null);
        }
        setAccessChecked(true);
      } else {
        setHasFullAccess(true);
        setAccessChecked(true);
      }
    };
    fetchArticle();
    supabase.from("article_company_tags").select("orgnr, company_name").eq("article_id", id).then(({ data }) => setCompanyTags(data || []));
  }, [id]);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) setReadProgress(Math.min(100, (scrollTop / docHeight) * 100));
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Track view, read time, scroll depth + funnel events
  useArticleTracking(article?.id, !!article?.premium);

  // Mark the assigned A/B variant as "completed" once the reader scrolls
  // past the body. We rely on the read-progress signal already tracked.
  useEffect(() => {
    if (!article?.id || !variant || completedRef.done) return;
    if (readProgress >= 80) {
      completedRef.done = true;
      logVariantCompleted(article.id, variant.variant_key);
    }
  }, [readProgress, article?.id, variant, completedRef]);

  if (loading || (article?.premium && !accessChecked)) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-headline text-2xl font-bold text-headline mb-3">
            {language === "no" ? "Artikkel ikke funnet" : "Article not found"}
          </h1>
          <p className="text-muted-foreground font-body mb-6">
            {language === "no" ? "Denne artikkelen finnes ikke eller er fjernet." : "This article doesn't exist or has been removed."}
          </p>
          <button onClick={() => navigate("/")} className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
            {language === "no" ? "Tilbake til forsiden" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  // Resolve language-aware fields
  const baselineTitle = language === "en" && article.title_en ? article.title_en : article.title;
  // For variant B, use the alternative title only on the Norwegian view.
  const title = variant?.variant_key === "B" && variant.title && language === "no" ? variant.title : baselineTitle;
  const excerpt = language === "en" && article.excerpt_en ? article.excerpt_en : article.excerpt;
  const fullBody = language === "en" && article.body_en ? article.body_en : article.body;
  const preview = language === "en" && previewBodyEn ? previewBodyEn : previewBody;
  const body = hasFullAccess ? fullBody : (preview ?? "");
  const keyPoints: string[] = language === "en" && article.key_points_en?.length ? article.key_points_en : (article.key_points || []);
  const publishedAt = article.published_at ? timeAgo(article.published_at, language) : "";
  const readTime = article.read_time || "";
  const variantImageUrl = variant?.variant_key === "B" ? variant.image_url ?? null : null;
  const effectiveImageUrl = variantImageUrl || article.image_url;
  const effectiveCrop = variantImageUrl ? variant?.image_crop ?? null : article.image_crop;
  const effectiveFocal = variantImageUrl ? variant?.image_focal ?? null : article.image_focal;
  const heroImage = effectiveImageUrl ? `url(${effectiveImageUrl})` : getArticleImage(article.id, article.category);
  const heroBg = effectiveImageUrl
    ? cropToBackgroundStyle(parseCrop(effectiveCrop), parseFocal(effectiveFocal))
    : { size: "cover", position: "center" };

  const BackButton = () => (
    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 font-body text-sm group">
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      {language === "no" ? "Tilbake" : "Back"}
    </button>
  );

  // Check if body contains HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  const showPaywall = article.premium && !hasFullAccess;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent">
        <div className="h-full bg-accent transition-[width] duration-100 ease-out" style={{ width: `${readProgress}%` }} />
      </div>

      <Header showSearch={false} />

      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[60vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: heroImage,
            backgroundRepeat: 'no-repeat',
            backgroundSize: heroBg.size,
            backgroundPosition: heroBg.position,
            // Hint the browser to keep the layer on its own composited
            // surface so background-position is repainted cheaply on
            // resize without re-laying out neighbouring content.
            willChange: 'background-position',
            backfaceVisibility: 'hidden',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        <div className="relative flex items-end h-full max-w-xl mx-auto w-full px-6 pb-8">
          <span className="inline-block px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-subhead font-medium rounded-full border border-white/20">{article.category}</span>
        </div>
      </div>

      <article className="max-w-xl mx-auto px-6 pt-10 pb-14">
        <BackButton />
        <h1 className="font-headline text-2xl md:text-3xl lg:text-4xl font-bold text-headline leading-[1.15] mb-6 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>{title}</h1>
        <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <ArticleByline authorName={article.author} publishedAt={publishedAt} readTime={readTime} />
        </div>

        {keyPoints.length > 0 && (
          <div className="bg-card rounded-2xl p-7 mb-12 border border-border shadow-soft animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            <h2 className="font-subhead text-xs font-semibold text-accent uppercase tracking-[0.15em] mb-5">
              {language === "no" ? "Nøkkelpunkter" : "Key Points"}
            </h2>
            <ul className="space-y-4">
              {keyPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-4">
                  <span className="w-7 h-7 bg-accent/10 text-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-subhead text-sm font-bold">{index + 1}</span>
                  <span className="text-foreground font-body leading-relaxed text-[0.95rem]">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-16 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          {body && isHtml ? (
            <ArticleBody html={body} category={article.category} />
          ) : body ? (
            (() => {
              const dropClass = dropcapClassName(pickDropcapVariant(article.category, body));
              return body.split('\n\n').map((paragraph, index) => (
                <p key={index} className={`text-foreground font-body leading-[1.6] mb-[7em] ${index === 0 ? `text-lg md:text-xl font-medium text-headline ${dropClass}` : "text-base md:text-lg"}`}>
                  {paragraph}
                </p>
              ));
            })()
          ) : null}

          {showPaywall && (
            <div className="relative -mt-24 pt-24">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-elevated">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-headline mb-3">{t.subscribeTitle}</h2>
                <p className="text-muted-foreground font-body mb-8 max-w-md mx-auto leading-relaxed">{t.subscribeDesc}</p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <button
                    onClick={() => navigate("/abonnement")}
                    className="w-full py-3.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
                  >
                    {t.subscribeButton}
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full py-3.5 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    {t.signIn}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <ArticleGallery articleId={id!} />

        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground/40 text-lg">✦</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {companyTags.length > 0 && (
          <div className="mb-12">
            <h2 className="font-headline text-xl font-bold text-headline mb-5">
              {language === "no" ? "Omtalte selskaper" : "Featured Companies"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyTags.map((tag) => (
                <CompanyMiniProfile key={tag.orgnr} orgnr={tag.orgnr} companyName={tag.company_name} />
              ))}
            </div>
          </div>
        )}

        <TagChips articleId={id!} className="mb-6" />

        <RelatedByTags articleId={id!} />

        <ArticleDiscussion articleId={id!} authorName={article.author} />
      </article>

      <ArticleNotes articleId={id!} articleTitle={title} />

      <footer className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="font-headline text-xl font-bold text-headline mb-1.5">{t.brandName}</h2>
              <p className="text-sm text-muted-foreground font-body">{t.footerTagline}</p>
            </div>
            <nav className="flex items-center gap-8 text-sm font-body text-muted-foreground">
              <a href="/team" className="hover:text-foreground transition-colors">{t.footerAbout}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerContact}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerPrivacy}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerTerms}</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Article;
