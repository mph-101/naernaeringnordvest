import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, User, Calendar, Lock } from "lucide-react";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { getArticleById } from "@/lib/articles";

const Article = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useTheme();
  const t = translations[language];
  
  const article = id ? getArticleById(id, language) : undefined;

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-headline mb-4">
            {language === "no" ? "Artikkel ikke funnet" : "Article not found"}
          </h1>
          <button
            onClick={() => navigate("/")}
            className="text-accent hover:underline font-body"
          >
            {language === "no" ? "Tilbake til forsiden" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  // If premium, show paywall
  if (article.premium) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        
        <article className="max-w-3xl mx-auto px-6 py-12">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === "no" ? "Tilbake" : "Back"}
          </button>

          {/* Category & Meta */}
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1.5 bg-accent/10 text-accent text-sm font-subhead font-medium rounded-full">
              {article.category}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-body">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-headline text-2xl md:text-3xl lg:text-4xl font-bold text-headline leading-tight mb-6">
            {article.title}
          </h1>

          {/* Author & Date */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-body mb-8 pb-8 border-b border-border">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {article.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {article.publishedAt}
            </span>
          </div>

          {/* Preview text with fade */}
          <div className="relative mb-8">
            <p className="text-foreground font-body text-lg leading-relaxed">
              {article.excerpt}
            </p>
            <div className="h-24 bg-gradient-to-t from-background to-transparent absolute bottom-0 left-0 right-0" />
          </div>

          {/* Paywall */}
          <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-soft">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-headline text-xl font-bold text-headline mb-3">
              {t.subscribeTitle}
            </h2>
            <p className="text-muted-foreground font-body mb-6 max-w-md mx-auto">
              {t.subscribeDesc}
            </p>
            <div className="space-y-3 max-w-xs mx-auto">
              <button className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                {t.subscribeButton}
              </button>
              <button className="w-full py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">
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
      <Header showSearch={false} />
      
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === "no" ? "Tilbake" : "Back"}
        </button>

        {/* Category & Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1.5 bg-accent/10 text-accent text-sm font-subhead font-medium rounded-full">
            {article.category}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-body">
            <Clock className="w-4 h-4" />
            {article.readTime}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-headline text-2xl md:text-3xl lg:text-4xl font-bold text-headline leading-tight mb-6">
          {article.title}
        </h1>

        {/* Author & Date */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground font-body mb-8">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {article.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {article.publishedAt}
          </span>
        </div>

        {/* Key Points */}
        <div className="bg-surface-subtle rounded-2xl p-6 mb-8 border border-border">
          <h2 className="font-subhead text-sm font-semibold text-accent uppercase tracking-wide mb-4">
            {language === "no" ? "Nøkkelpunkter" : "Key Points"}
          </h2>
          <ul className="space-y-3">
            {article.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-subhead text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-foreground font-body leading-relaxed">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Body */}
        <div className="prose prose-lg max-w-none">
          {article.body.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-foreground font-body text-lg leading-relaxed mb-6">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="font-headline text-lg font-medium text-headline mb-1">
                {t.brandName}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {t.footerTagline}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm font-body text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">{t.footerAbout}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerContact}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerPrivacy}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerTerms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Article;
