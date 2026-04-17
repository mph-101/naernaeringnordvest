// Domain types + small helpers for the Hjernevelvet section.

export interface HjernevelvWriter {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  expertise: string[];
  region_slug: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  active: boolean;
  created_at: string;
}

export interface HjernevelvArticle {
  id: string;
  writer_id: string;
  region_slug: string | null;
  topic: string | null;
  title: string;
  excerpt: string;
  body: string;
  read_time: string | null;
  image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

export type PanelFormat = "digital" | "physical" | "hybrid";
export type PanelStatus = "planned" | "open" | "live" | "completed" | "cancelled";

export interface HjernevelvPanel {
  id: string;
  region_slug: string | null;
  title: string;
  description: string | null;
  topic: string | null;
  format: PanelFormat;
  status: PanelStatus;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
  max_attendees: number | null;
  cover_image_url: string | null;
  created_at: string;
}

export type QuestionStatus = "pending" | "approved" | "rejected" | "answered";

export interface PanelQuestion {
  id: string;
  panel_id: string;
  user_id: string;
  display_name: string | null;
  question: string;
  status: QuestionStatus;
  is_anonymous: boolean;
  upvotes: number;
  moderator_note: string | null;
  created_at: string;
}

export interface PanelRegistration {
  id: string;
  panel_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  comment: string | null;
  attended: boolean | null;
  created_at: string;
}

export const FORMAT_LABEL: Record<PanelFormat, { no: string; en: string }> = {
  digital: { no: "Digitalt", en: "Digital" },
  physical: { no: "Fysisk", en: "In person" },
  hybrid: { no: "Hybrid", en: "Hybrid" },
};

export const STATUS_LABEL: Record<PanelStatus, { no: string; en: string }> = {
  planned: { no: "Planlagt", en: "Planned" },
  open: { no: "Åpen for påmelding", en: "Open for registration" },
  live: { no: "Pågår nå", en: "Live now" },
  completed: { no: "Avsluttet", en: "Completed" },
  cancelled: { no: "Avlyst", en: "Cancelled" },
};

export function formatPanelDate(iso: string, lang: "no" | "en"): string {
  const d = new Date(iso);
  const locale = lang === "no" ? "nb-NO" : "en-US";
  return d.toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
