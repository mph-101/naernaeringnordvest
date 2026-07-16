import { useState } from "react";
import { StickyNote, Share2, Mail, Check, Copy, Linkedin } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { JournalistContactDialog } from "./JournalistContactDialog";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

interface Props {
  articleId: string;
  articleTitle: string;
  authorName: string;
  journalistId: string | null;
}

export function ArticleEngagementBar({ articleId, articleTitle, authorName, journalistId }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = isNo
    ? { heading: "Hva nå?", lead: "Engasjer deg i saken", note: "Skriv et notat", noteDesc: "Lagre dine tanker om saken", share: "Del artikkelen", shareDesc: "Send videre til noen som bør lese", contact: "Kontakt journalisten", contactDesc: (n: string) => `Skriv direkte til ${n}`, copied: "Lenke kopiert", copy: "Kopier lenke" }
    : { heading: "What's next?", lead: "Engage with this story", note: "Write a note", noteDesc: "Save your thoughts on this story", share: "Share the article", shareDesc: "Send to someone who should read it", contact: "Contact the journalist", contactDesc: (n: string) => `Write directly to ${n}`, copied: "Link copied", copy: "Copy link" };

  const url = typeof window !== "undefined" ? window.location.href : "";

  const onNote = () => {
    trackEvent("engagement_note_click", { article_id: articleId });
    window.dispatchEvent(new CustomEvent("nn:open-article-notes"));
  };

  const onShare = async () => {
    trackEvent("engagement_share_click", { article_id: articleId });
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: articleTitle, url }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const onContact = () => {
    trackEvent("engagement_contact_click", { article_id: articleId });
    setContactOpen(true);
  };

  return (
    <section data-tour="article-engagement" className="mb-12">
      <div className="flex items-end justify-between mb-5">
        <div>
          {/* Rolig etikett — uppercase-eyebrow er et anti-mønster (DESIGN.md) */}
          <p className="text-sm font-subhead font-medium text-accent-ink">{t.heading}</p>
          <h2 className="font-headline text-xl font-bold text-headline mt-1">{t.lead}</h2>
        </div>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="LinkedIn"
          onClick={() => trackEvent("engagement_share_linkedin", { article_id: articleId })}
          className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors"
        >
          <Linkedin className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ActionCard icon={StickyNote} title={t.note} desc={t.noteDesc} onClick={onNote} />
        <ActionCard
          icon={copied ? Check : Share2}
          title={t.share}
          desc={t.shareDesc}
          onClick={onShare}
          accent={copied}
          tertiaryIcon={Copy}
          tertiaryLabel={t.copy}
        />
        <ActionCard icon={Mail} title={t.contact} desc={t.contactDesc(authorName)} onClick={onContact} />
      </div>

      <JournalistContactDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        articleId={articleId}
        articleTitle={articleTitle}
        authorName={authorName}
        journalistId={journalistId}
      />
    </section>
  );
}

interface ActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
  accent?: boolean;
  tertiaryIcon?: React.ComponentType<{ className?: string }>;
  tertiaryLabel?: string;
}
function ActionCard({ icon: Icon, title, desc, onClick, accent }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group text-left p-5 rounded-2xl border bg-card card-interactive transition-all ${accent ? "border-accent" : "border-border hover:border-accent/40"}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${accent ? "bg-accent text-accent-foreground" : "bg-accent/10 text-accent-ink group-hover:bg-accent group-hover:text-accent-foreground"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-subhead text-base font-semibold text-headline mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground font-body leading-snug">{desc}</p>
    </button>
  );
}