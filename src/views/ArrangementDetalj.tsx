import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import { Calendar, MapPin, ExternalLink, ArrowLeft, Loader2, Building2, Tag, MapPinned, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

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
}

const ArrangementDetalj = () => {
  const id = getUrlParam();
  const navigate = useNavigate();
  const { language } = useTheme();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalMenu, setShowCalMenu] = useState(false);

  const t = language === "no"
    ? {
        back: "Tilbake",
        loading: "Laster...",
        notFound: "Arrangementet finnes ikke eller er ikke godkjent.",
        when: "Når",
        where: "Hvor",
        organizer: "Arrangør",
        category: "Kategori",
        moreInfo: "Mer informasjon",
        addToCal: "Legg til i kalender",
        google: "Google Kalender",
        outlook: "Outlook",
        ics: "Last ned (.ics)",
        openMap: "Åpne i kart",
        about: "Om arrangementet",
      }
    : {
        back: "Back",
        loading: "Loading...",
        notFound: "Event not found or not approved.",
        when: "When",
        where: "Where",
        organizer: "Organizer",
        category: "Category",
        moreInfo: "More information",
        addToCal: "Add to calendar",
        google: "Google Calendar",
        outlook: "Outlook",
        ics: "Download (.ics)",
        openMap: "Open in maps",
        about: "About the event",
      };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setEvent((data ?? null) as EventItem | null);
      setLoading(false);
    };
    load();
  }, [id]);

  const formatDateRange = (start: string, end: string | null) => {
    const locale = language === "no" ? "nb-NO" : "en-US";
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    const dOpts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const tOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    if (!e) return `${s.toLocaleDateString(locale, dOpts)} · ${s.toLocaleTimeString(locale, tOpts)}`;
    const sameDay = s.toDateString() === e.toDateString();
    if (sameDay) {
      return `${s.toLocaleDateString(locale, dOpts)} · ${s.toLocaleTimeString(locale, tOpts)} – ${e.toLocaleTimeString(locale, tOpts)}`;
    }
    return `${s.toLocaleDateString(locale, dOpts)} ${s.toLocaleTimeString(locale, tOpts)} – ${e.toLocaleDateString(locale, dOpts)} ${e.toLocaleTimeString(locale, tOpts)}`;
  };

  const calendarLinks = useMemo(() => {
    if (!event) return null;
    const fmt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const start = fmt(event.start_at);
    const end = fmt(event.end_at || event.start_at);
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || "");
    const loc = encodeURIComponent(event.location || "");
    const google = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${loc}`;
    const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${text}&startdt=${encodeURIComponent(event.start_at)}&enddt=${encodeURIComponent(event.end_at || event.start_at)}&body=${details}&location=${loc}&path=/calendar/action/compose&rru=addevent`;
    const icsLines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NaerNaering//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@naernaering`,
      `DTSTAMP:${fmt(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${(event.title || "").replace(/\n/g, " ")}`,
      `DESCRIPTION:${(event.description || "").replace(/\n/g, "\\n")}`,
      event.location ? `LOCATION:${event.location.replace(/\n/g, " ")}` : "",
      event.url ? `URL:${event.url}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines)}`;
    return { google, outlook, ics };
  }, [event]);

  const mapsUrl = event?.location_url || (event?.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!event || event.status !== "approved") {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-6">{t.notFound}</p>
          <button onClick={() => navigate("/arrangementer")} className="inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        {event.image_url && (
          <div className="rounded-2xl overflow-hidden mb-6 border border-border">
            <img src={event.image_url} alt={event.title} className="w-full h-64 sm:h-80 object-cover" />
          </div>
        )}

        {event.category && (
          <span className="inline-block text-xs text-primary font-medium uppercase tracking-wide mb-2">{event.category}</span>
        )}
        <h1 className="font-headline text-3xl sm:text-4xl text-headline leading-tight">{event.title}</h1>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <InfoRow icon={<Calendar className="w-4 h-4" />} label={t.when}>
            <span className="text-foreground">{formatDateRange(event.start_at, event.end_at)}</span>
          </InfoRow>
          {event.location && (
            <InfoRow icon={<MapPin className="w-4 h-4" />} label={t.where}>
              <span className="text-foreground">{event.location}</span>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <MapPinned className="w-3 h-3" /> {t.openMap}
                </a>
              )}
            </InfoRow>
          )}
          {event.organizer && (
            <InfoRow icon={<Building2 className="w-4 h-4" />} label={t.organizer}>
              <span className="text-foreground">{event.organizer}</span>
            </InfoRow>
          )}
          {event.category && (
            <InfoRow icon={<Tag className="w-4 h-4" />} label={t.category}>
              <span className="text-foreground">{event.category}</span>
            </InfoRow>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 flex-wrap relative">
          <button
            onClick={() => setShowCalMenu((v) => !v)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 font-medium"
          >
            <Calendar className="w-4 h-4" /> {t.addToCal}
          </button>
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border hover:bg-muted text-foreground">
              {t.moreInfo} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {showCalMenu && calendarLinks && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCalMenu(false)} />
              <div className="absolute top-full mt-2 left-0 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden min-w-[200px]">
                <a href={calendarLinks.google} target="_blank" rel="noopener noreferrer" onClick={() => setShowCalMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted">
                  <ExternalLink className="w-3.5 h-3.5" /> {t.google}
                </a>
                <a href={calendarLinks.outlook} target="_blank" rel="noopener noreferrer" onClick={() => setShowCalMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted border-t border-border">
                  <ExternalLink className="w-3.5 h-3.5" /> {t.outlook}
                </a>
                <a href={calendarLinks.ics} download={`${event.title}.ics`} onClick={() => setShowCalMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted border-t border-border">
                  <Download className="w-3.5 h-3.5" /> {t.ics}
                </a>
              </div>
            </>
          )}
        </div>

        {event.description && (
          <section className="mt-10">
            <h2 className="font-headline text-xl text-headline mb-3">{t.about}</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none font-body text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const InfoRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1">
      {icon} {label}
    </div>
    <div className="text-sm">{children}</div>
  </div>
);

export default ArrangementDetalj;