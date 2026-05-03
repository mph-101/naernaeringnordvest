import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArticleByline } from "@/components/ArticleByline";
import { ArticleBody } from "@/components/charts/ArticleBody";
import { pickDropcapVariant, dropcapClassName } from "@/lib/dropcap";
import { cropToBackgroundStyle, parseCrop, parseFocal, type ImageCrop, type ImageFocal } from "@/lib/image-crop";
import { getArticleImage } from "@/lib/articles";
import { Eye } from "lucide-react";

interface PreviewArticle {
  id?: string | null;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  read_time?: string | null;
  image_url?: string | null;
  image_crop?: ImageCrop | null;
  image_focal?: ImageFocal | null;
  key_points?: string[];
}

interface ArticlePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: PreviewArticle;
}

/**
 * Renders a live preview of an unsaved/unpublished article exactly the way
 * it will appear on the public article page. Used by the admin editor so
 * journalists can verify layout before publishing.
 */
export const ArticlePreviewDialog = ({ open, onOpenChange, article }: ArticlePreviewDialogProps) => {
  const heroImage = article.image_url
    ? `url(${article.image_url})`
    : getArticleImage(article.id || "preview", article.category);
  const heroBg = article.image_url
    ? cropToBackgroundStyle(parseCrop(article.image_crop), parseFocal(article.image_focal))
    : { size: "cover", position: "center" };

  const isHtml = /<[a-z][\s\S]*>/i.test(article.body);
  const dropClass = dropcapClassName(pickDropcapVariant(article.category, article.body));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 font-subhead text-sm font-semibold">
            <Eye className="w-4 h-4 text-accent" />
            Live forhåndsvisning
            <span className="text-xs font-normal text-muted-foreground ml-2">
              Slik ser artikkelen ut når den publiseres
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="bg-background">
          {/* Hero */}
          <div className="relative w-full h-64 md:h-[420px] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{ backgroundImage: heroImage, backgroundRepeat: "no-repeat", backgroundSize: heroBg.size, backgroundPosition: heroBg.position }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            <div className="relative flex items-end h-full max-w-xl mx-auto w-full px-6 pb-8">
              {article.category && (
                <span className="inline-block px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-subhead font-medium rounded-full border border-white/20">
                  {article.category}
                </span>
              )}
            </div>
          </div>

          <article className="max-w-xl mx-auto px-6 pt-10 pb-14">
            <h1 className="font-headline text-2xl md:text-3xl lg:text-4xl font-bold text-headline leading-[1.15] mb-6">
              {article.title || <span className="text-muted-foreground italic">Uten tittel</span>}
            </h1>

            <ArticleByline
              authorName={article.author || "—"}
              publishedAt="Forhåndsvisning"
              readTime={article.read_time || ""}
            />

            {article.key_points && article.key_points.length > 0 && (
              <div className="bg-card rounded-2xl p-7 mb-12 border border-border shadow-soft">
                <h2 className="font-subhead text-xs font-semibold text-accent uppercase tracking-[0.15em] mb-5">
                  Nøkkelpunkter
                </h2>
                <ul className="space-y-4">
                  {article.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <span className="w-7 h-7 bg-accent/10 text-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-subhead text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="text-foreground font-body leading-relaxed text-[0.95rem]">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              {article.body && isHtml ? (
                <ArticleBody html={article.body} category={article.category} />
              ) : article.body ? (
                article.body.split("\n\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className={`text-foreground font-body leading-[1.6] mb-6 ${
                      index === 0 ? `text-lg md:text-xl font-medium text-headline ${dropClass}` : "text-base md:text-lg"
                    }`}
                  >
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground italic">Ingen brødtekst ennå.</p>
              )}
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
};