import { useState, useEffect, useMemo } from "react";
import { Calendar, MapPin, Plus, ExternalLink, Clock, Loader2, CheckCircle2, AlertCircle, Trash2, ImagePlus, X, Sparkles, Megaphone } from "lucide-react";
import { Header } from "@/components/Header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { EventFeaturedCheckout } from "@/components/EventFeaturedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  location_url: string | null;
  url: string | null;
  organizer: string | null;
  category: string | null;
  region_slug: string | null;
  image_url: string | null;
  status: string;
  submitted_by: string;
  moderation_note: string | null;
  is_featured?: boolean;
  featured_until?: string | null;
}

const FEATURED_PRICE_NOK = 1990;

const Arrangementer = () => {
  const { language } = useTheme();
  const { userId, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();
  const isStaff = hasRole("admin") || hasRole("editor");
  const canSubmit = isAuthenticated;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [promoteEventId, setPromoteEventId] = useState<string | null>(null);

  const t = language === "no"
    ? {
        title: "Arrangementer",
        subtitle: "Næringslivsarrangementer i regionen",
        submit: "Foreslå arrangement",
        loginToSubmit: "Logg inn for å foreslå",
        freeToCreate: "Gratis å foreslå",
        upcoming: "Kommende",
        past: "Tidligere",
        empty: "Ingen godkjente arrangementer ennå.",
        myEvents: "Mine forslag",
        statusPending: "Venter på godkjenning",
        statusApproved: "Godkjent",
        statusRejected: "Avvist",
        formTitle: "Foreslå nytt arrangement",
        eventTitle: "Tittel",
        description: "Beskrivelse",
        startAt: "Start",
        endAt: "Slutt (valgfritt)",
        location: "Sted",
        url: "Lenke til arrangementet",
        organizer: "Arrangør",
        category: "Kategori",
        cancel: "Avbryt",
        send: "Send inn til godkjenning",
        moderationInfo: "Forslaget gjennomgås av redaksjonen før det publiseres.",
        delete: "Slett",
        addToCal: "Legg til i kalender",
        moderatorNote: "Tilbakemelding fra redaksjonen",
        all: "Alle",
        searchPlaceholder: "Søk i arrangementer...",
        noMatch: "Ingen arrangementer matcher filteret.",
        image: "Bilde (valgfritt)",
        imageHint: "Maks 5 MB. JPG, PNG eller WebP.",
        chooseImage: "Velg bilde",
        removeImage: "Fjern bilde",
        imageTooLarge: "Bildet er for stort (maks 5 MB).",
        imageWrongType: "Kun JPG, PNG eller WebP er tillatt.",
        uploadingImage: "Laster opp bilde...",
        featured: "Fremhevet",
        promote: "Fremhev arrangementet",
        promoteAgain: "Fremhev",
        alreadyFeatured: "Allerede fremhevet",
        promoteTitle: "Få mer oppmerksomhet rundt arrangementet",
        promoteDesc: "Profilering gir badge og topp-plassering i feeden, og inkludering i nyhetsbrev frem til arrangementet starter.",
        promotePrice: `Engangsbeløp ${FEATURED_PRICE_NOK} kr`,
        promoteSkip: "Ikke nå",
        promoteCheckoutTitle: "Betal for fremhevet arrangement",
      }
    : {
        title: "Events",
        subtitle: "Business events in the region",
        submit: "Suggest event",
        loginToSubmit: "Log in to suggest",
        freeToCreate: "Free to submit",
        upcoming: "Upcoming",
        past: "Past",
        empty: "No approved events yet.",
        myEvents: "My submissions",
        statusPending: "Awaiting approval",
        statusApproved: "Approved",
        statusRejected: "Rejected",
        formTitle: "Suggest a new event",
        eventTitle: "Title",
        description: "Description",
        startAt: "Start",
        endAt: "End (optional)",
        location: "Location",
        url: "Event link",
        organizer: "Organizer",
        category: "Category",
        cancel: "Cancel",
        send: "Submit for approval",
        moderationInfo: "Submissions are reviewed by editors before publication.",
        delete: "Delete",
        addToCal: "Add to calendar",
        moderatorNote: "Feedback from editors",
        all: "All",
        searchPlaceholder: "Search events...",
        noMatch: "No events match the filter.",
        image: "Image (optional)",
        imageHint: "Max 5 MB. JPG, PNG or WebP.",
        chooseImage: "Choose image",
        removeImage: "Remove image",
        imageTooLarge: "Image is too large (max 5 MB).",
        imageWrongType: "Only JPG, PNG or WebP allowed.",
        uploadingImage: "Uploading image...",
        featured: "Featured",
        promote: "Promote this event",
        promoteAgain: "Promote",
        alreadyFeatured: "Already featured",
        promoteTitle: "Boost reach for your event",
        promoteDesc: "Promotion gives a badge and top placement in the feed, plus inclusion in the newsletter until the event starts.",
        promotePrice: `One-time ${FEATURED_PRICE_NOK} NOK`,
        promoteSkip: "Not now",
        promoteCheckoutTitle: "Pay to feature this event",
      };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("start_at", { ascending: true });
    setEvents((data ?? []) as EventItem[]);

    if (userId) {
      const { data: mine } = await supabase
        .from("events")
        .select("*")
        .eq("submitted_by", userId)
        .order("created_at", { ascending: false });
      setMyEvents((mine ?? []) as EventItem[]);
    } else {
      setMyEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: EventItem[] = [];
    const pa: EventItem[] = [];
    const q = search.trim().toLowerCase();
    const filtered = events.filter((e) => {
      if (activeCategory !== "all" && (e.category || "").toLowerCase() !== activeCategory.toLowerCase()) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q) ||
        (e.organizer || "").toLowerCase().includes(q)
      );
    });
    for (const e of filtered) {
      const ref = new Date(e.end_at || e.start_at);
      if (ref >= now) up.push(e); else pa.push(e);
    }
    pa.reverse();
    return { upcoming: up, past: pa };
  }, [events, activeCategory, search]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const c = (e.category || "").trim();
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString(language === "no" ? "nb-NO" : "en-US", {
        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch { return s; }
  };

  const buildIcsUrl = (e: EventItem) => {
    const dt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NaerNaering//EN",
      "BEGIN:VEVENT",
      `UID:${e.id}@naernaering`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${dt(e.start_at)}`,
      `DTEND:${dt(e.end_at || e.start_at)}`,
      `SUMMARY:${(e.title || "").replace(/\n/g, " ")}`,
      `DESCRIPTION:${(e.description || "").replace(/\n/g, "\\n")}`,
      e.location ? `LOCATION:${e.location.replace(/\n/g, " ")}` : "",
      e.url ? `URL:${e.url}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === "no" ? "Slettet" : "Deleted");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl text-headline">{t.title}</h1>
            <p className="text-muted-foreground font-body mt-2">{t.subtitle}</p>
          </div>
          <div>
            {canSubmit ? (
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                >
                  <Plus className="w-4 h-4" /> {t.submit}
                </button>
                <span className="text-[0.6875rem] text-muted-foreground">{t.freeToCreate}</span>
              </div>
            ) : !isAuthenticated ? (
              <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground underline">
                {t.loginToSubmit}
              </button>
            ) : null}
          </div>
        </div>

        {myEvents.length > 0 && (
          <section className="mb-10">
            <h2 className="font-headline text-xl text-headline mb-3">{t.myEvents}</h2>
            <div className="space-y-3">
              {myEvents.map((e) => (
                <div key={e.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{e.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        e.status === "pending" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                        e.status === "rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-emerald-500/15 text-emerald-600"
                      }`}>
                        {e.status === "pending" && <Clock className="w-3 h-3" />}
                        {e.status === "rejected" && <AlertCircle className="w-3 h-3" />}
                        {e.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                        {e.status === "pending" ? t.statusPending : e.status === "rejected" ? t.statusRejected : t.statusApproved}
                      </span>
                      {e.is_featured && (
                        <span className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-primary/15 text-primary">
                          <Sparkles className="w-3 h-3" /> {t.featured}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(e.start_at)}</p>
                    {e.moderation_note && (
                      <p className="text-xs text-muted-foreground mt-2"><span className="font-medium">{t.moderatorNote}:</span> {e.moderation_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!e.is_featured && e.status !== "rejected" && new Date(e.start_at) > new Date() && (
                      <button
                        onClick={() => setPromoteEventId(e.id)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                        title={t.promote}
                      >
                        <Megaphone className="w-3.5 h-3.5" /> {t.promoteAgain}
                      </button>
                    )}
                    {e.status === "pending" && (
                      <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive p-2 rounded-lg" title={t.delete}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {(categories.length > 0 || events.length > 0) && (
              <div className="mb-6 space-y-3">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full sm:max-w-md px-4 py-2.5 rounded-full bg-card border border-border text-sm focus:outline-none focus:border-primary"
                />
                {categories.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveCategory("all")}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        activeCategory === "all"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {t.all} <span className="opacity-70 ml-1">{events.length}</span>
                    </button>
                    {categories.map(([cat, count]) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          activeCategory.toLowerCase() === cat.toLowerCase()
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {cat} <span className="opacity-70 ml-1">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <section className="mb-12">
              <h2 className="font-headline text-xl text-headline mb-4">{t.upcoming}</h2>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center bg-card rounded-xl border border-border">
                  {activeCategory !== "all" || search ? t.noMatch : t.empty}
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {upcoming.map((e) => (
                    <article key={e.id} onClick={() => navigate(`/arrangementer/${e.id}`)}
                      className={`bg-card border rounded-2xl overflow-hidden hover:shadow-soft transition-shadow flex flex-col cursor-pointer ${e.is_featured ? "border-primary/60 ring-1 ring-primary/30" : "border-border"}`}>
                      {e.image_url && <img src={e.image_url} alt="" className="w-full h-40 object-cover" loading="lazy" />}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {e.is_featured && (
                            <span className="text-[0.625rem] px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-primary text-primary-foreground uppercase tracking-wide font-bold">
                              <Sparkles className="w-3 h-3" /> {t.featured}
                            </span>
                          )}
                          {e.category && <span className="text-xs text-primary font-medium uppercase tracking-wide">{e.category}</span>}
                        </div>
                        <h3 className="font-headline text-lg text-headline leading-snug">{e.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Calendar className="w-4 h-4" /> {formatDate(e.start_at)}
                        </div>
                        {e.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" /> <span className="truncate">{e.location}</span>
                          </div>
                        )}
                        {e.description && <p className="text-sm text-foreground/80 mt-3 line-clamp-3">{e.description}</p>}
                        <div className="mt-auto pt-4 flex items-center gap-3 flex-wrap" onClick={(ev) => ev.stopPropagation()}>
                          {e.url && (
                            <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                              {language === "no" ? "Mer info" : "More info"} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <a href={buildIcsUrl(e)} download={`${e.title}.ics`} className="text-sm text-muted-foreground hover:text-foreground">
                            {t.addToCal}
                          </a>
                          {e.organizer && <span className="text-xs text-muted-foreground ml-auto">{e.organizer}</span>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="font-headline text-xl text-headline mb-4">{t.past}</h2>
                <div className="space-y-2">
                  {past.map((e) => (
                    <div key={e.id} onClick={() => navigate(`/arrangementer/${e.id}`)}
                      className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium truncate">{e.title}</h3>
                        <p className="text-xs text-muted-foreground">{formatDate(e.start_at)}{e.location ? ` · ${e.location}` : ""}</p>
                      </div>
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-xs text-primary hover:underline shrink-0">
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {showForm && (
        <EventForm
          t={t}
          onClose={() => setShowForm(false)}
          submitting={submitting}
          setSubmitting={setSubmitting}
          userId={userId}
          onCreated={(newId) => { setShowForm(false); load(); if (newId) setPromoteEventId(newId); }}
        />
      )}
      {promoteEventId && (
        <PromoteDialog
          t={t}
          eventId={promoteEventId}
          onClose={() => { setPromoteEventId(null); load(); }}
        />
      )}
    </div>
  );
};

interface FormProps {
  t: any;
  onClose: () => void;
  submitting: boolean;
  setSubmitting: (b: boolean) => void;
  userId: string | null;
  onCreated: (createdId?: string) => void;
}

const EventForm = ({ t, onClose, submitting, setSubmitting, userId, onCreated }: FormProps) => {
  const [form, setForm] = useState({
    title: "", description: "", start_at: "", end_at: "",
    location: "", url: "", organizer: "", category: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error(t.imageWrongType);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error(t.imageTooLarge);
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.title.trim() || !form.start_at) return;
    setSubmitting(true);

    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("event-images").upload(path, imageFile, {
        cacheControl: "3600", upsert: false, contentType: imageFile.type,
      });
      if (up.error) {
        setSubmitting(false);
        toast.error(up.error.message);
        return;
      }
      const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
      image_url = pub.publicUrl;
    }

    const { data: created, error } = await supabase.from("events").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      location: form.location.trim() || null,
      url: form.url.trim() || null,
      organizer: form.organizer.trim() || null,
      category: form.category.trim() || null,
      image_url,
      submitted_by: userId,
      status: "pending",
    }).select("id").single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t.moderationInfo);
    clearImage();
    onCreated(created?.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}
        className="bg-card rounded-2xl shadow-elevated w-full max-w-lg p-6 my-8">
        <h2 className="font-headline text-xl text-headline mb-1">{t.formTitle}</h2>
        <p className="text-xs text-muted-foreground mb-5">{t.moderationInfo}</p>
        <div className="space-y-3">
          <Field label={t.eventTitle} required>
            <input required className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t.description}>
            <textarea rows={3} className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.startAt} required>
              <input required type="datetime-local" className="form-input" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </Field>
            <Field label={t.endAt}>
              <input type="datetime-local" className="form-input" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </Field>
          </div>
          <Field label={t.location}>
            <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label={t.url}>
            <input type="url" placeholder="https://" className="form-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.organizer}>
              <input className="form-input" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
            </Field>
            <Field label={t.category}>
              <input className="form-input" placeholder="Frokostmøte, konferanse..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
          </div>
          <Field label={t.image}>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="" className="w-full h-40 object-cover" />
                <button type="button" onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                  aria-label={t.removeImage}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-border bg-background hover:bg-muted cursor-pointer text-sm text-muted-foreground">
                <ImagePlus className="w-4 h-4" /> {t.chooseImage}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
              </label>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t.imageHint}</p>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted">{t.cancel}</button>
          <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.send}
          </button>
        </div>
        <style>{`.form-input{width:100%;padding:.55rem .75rem;border-radius:.6rem;background:hsl(var(--background));border:1px solid hsl(var(--border));font-size:.9rem;outline:none;}.form-input:focus{border-color:hsl(var(--primary));}`}</style>
      </form>
    </div>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs font-medium text-muted-foreground mb-1 inline-block">{label}{required && " *"}</span>
    {children}
  </label>
);

const PromoteDialog = ({ t, eventId, onClose }: { t: any; eventId: string; onClose: () => void }) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const returnUrl = `${window.location.origin}/arrangementer?promoted=1`;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-elevated w-full max-w-lg p-6 my-8">
        {!showCheckout ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <h2 className="font-headline text-xl text-headline">{t.promoteTitle}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t.promoteDesc}</p>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{t.promote}</span>
                <span className="font-headline text-2xl text-headline">{FEATURED_PRICE_NOK} kr</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.promotePrice}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted">{t.promoteSkip}</button>
              <button onClick={() => setShowCheckout(true)}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> {t.promote}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-lg text-headline">{t.promoteCheckoutTitle}</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
            </div>
            <PaymentTestModeBanner />
            <div className="mt-3">
              <EventFeaturedCheckout eventId={eventId} returnUrl={returnUrl} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Arrangementer;