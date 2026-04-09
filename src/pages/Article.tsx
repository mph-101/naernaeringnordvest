import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, User, Calendar, Lock, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { ArticleDiscussion } from "@/components/ArticleDiscussion";
import { ArticleNotes } from "@/components/ArticleNotes";
import { CompanyMiniProfile } from "@/components/CompanyMiniProfile";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { getArticleById, getArticleImage } from "@/lib/articles";
import { supabase } from "@/integrations/supabase/client";

const Article = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useTheme();
  const t = translations[language];
  const [companyTags, setCompanyTags] = useState<{ orgnr: string; company_name: string }[]>([]);
  const [readProgress, setReadProgress] = useState(0);
  
  const article = id ? getArticleById(id, language) : undefined;

  useEffect(() => {
    if (!id) return;
    supabase
      .from("article_company_tags")
      .select("orgnr, company_name")
      .eq("article_id", id)
      .then(({ data }) => setCompanyTags(data || []));
  }, [id]);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      setReadProgress(Math.min(100, (scrollTop / docHeight) * 100));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
          >
            {language === "no" ? "Tilbake til forsiden" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  const BackButton = () => (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 font-body text-sm group"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      {language === "no" ? "Tilbake" : "Back"}
    </button>
  );

  const ArticleMeta = ({ showBorder = false }: { showBorder?: boolean }) => (
    <div className={`flex items-center gap-4 text-sm text-muted-foreground font-body ${showBorder ? "mb-8 pb-8 border-b border-border" : "mb-10"}`}>
      <span className="flex items-center gap-2">
        <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="font-subhead font-medium text-foreground">{article.author}</span>
      </span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      <span className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        {article.publishedAt}
      </span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      <span className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        {article.readTime}
      </span>
    </div>
  );

  // If premium, show paywall
  if (article.premium) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        
        <article className="max-w-2xl mx-auto px-6 py-14">
          <BackButton />

          {/* Category */}
          <div className="mb-5">
            <span className="px-3 py-1.5 bg-accent/10 text-accent text-sm font-subhead font-medium rounded-full border border-accent/20">
              {article.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-headline text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-headline leading-[1.15] mb-6">
            {article.title}
          </h1>

          <ArticleMeta showBorder />

          {/* Preview text with fade */}
          <div className="relative mb-10">
            <p className="text-foreground font-body text-lg leading-[1.8]">
              {article.excerpt}
            </p>
            <div className="h-28 bg-gradient-to-t from-background to-transparent absolute bottom-0 left-0 right-0" />
          </div>

          {/* Paywall */}
          <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-elevated">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-headline text-2xl font-bold text-headline mb-3">
              {t.subscribeTitle}
            </h2>
            <p className="text-muted-foreground font-body mb-8 max-w-md mx-auto leading-relaxed">
              {t.subscribeDesc}
            </p>
            <div className="space-y-3 max-w-xs mx-auto">
              <button className="w-full py-3.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                {t.subscribeButton}
              </button>
              <button className="w-full py-3.5 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">
                {t.signIn}
              </button>
            </div>
          </div>
        </article>
      </div>
    );
  }

  // Free article - show full content
  return (
    <div className="min-h-screen bg-background">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent">
        <div
          className="h-full bg-accent transition-[width] duration-100 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <Header showSearch={false} />

      {/* Hero image */}
      <div
        className="relative w-full h-48 md:h-64 lg:h-72 flex items-end overflow-hidden"
        style={{ background: getArticleImage(article.id, article.category) }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        <div className="relative max-w-2xl mx-auto w-full px-6 pb-8">
          <span className="inline-block px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-subhead font-medium rounded-full mb-4 border border-white/20">
            {article.category}
          </span>
        </div>
      </div>
      
      <article className="max-w-2xl mx-auto px-6 pt-10 pb-14">
        <BackButton />

        {/* Title */}
        <h1 className="font-headline text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-headline leading-[1.15] mb-6 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          {article.title}
        </h1>

        {/* Author & Date */}
        <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <ArticleMeta />
        </div>

        {/* Key Points */}
        <div className="bg-card rounded-2xl p-7 mb-12 border border-border shadow-soft animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <h2 className="font-subhead text-xs font-semibold text-accent uppercase tracking-[0.15em] mb-5">
            {language === "no" ? "Nøkkelpunkter" : "Key Points"}
          </h2>
          <ul className="space-y-4">
            {article.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-4">
                <span className="w-7 h-7 bg-accent/10 text-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-subhead text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-foreground font-body leading-relaxed text-[0.95rem]">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Body */}
        <div className="mb-12 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          {article.body.split('\n\n').map((paragraph, index) => {
            // Style first paragraph as lead
            const isFirst = index === 0;
            return (
              <p
                key={index}
                className={`text-foreground font-body leading-[1.85] mb-7 ${
                  isFirst ? "text-lg md:text-xl font-medium text-headline" : "text-base md:text-lg"
                }`}
              >
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground/40 text-lg">✦</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Company Mini-Profiles */}
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

        {/* Discussion Section */}
        <ArticleDiscussion authorName={article.author} />
      </article>

      {/* Floating Notes */}
      <ArticleNotes articleId={id!} />

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="font-headline text-xl font-bold text-headline mb-1.5">
                {t.brandName}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {t.footerTagline}
              </p>
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
