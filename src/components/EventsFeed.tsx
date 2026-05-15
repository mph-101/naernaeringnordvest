import { useEffect, useState } from "react";
import { Calendar, MapPin, ArrowRight, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface EventItem {
  id: string;
  title: string;
  start_at: string;
  end_at?: string | null;
  location: string | null;
  category: string | null;
  image_url: string | null;
  description?: string | null;
}

export const EventsFeed = () => {
  const { language } = useTheme();
  const isNo = language === "no";
  const navigate = useNavigate();
  const [items, setItems] = useState<EventItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, location, category, image_url, description")
        .eq("status", "approved")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(5);
      setItems((data as any[]) || []);
    };
    fetchData();
  }, []);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isNo ? "nb-NO" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const toIcsDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const escapeIcs = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

  const downloadIcs = (e: React.MouseEvent, item: EventItem) => {
    e.stopPropagation();
    const start = toIcsDate(item.start_at);
    const end = toIcsDate(
      item.end_at || new Date(new Date(item.start_at).getTime() + 60 * 60 * 1000).toISOString(),
    );
    const uid = `${item.id}@naernaering`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Naer Naering//Events//NO",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(item.title)}`,
      item.location ? `LOCATION:${escapeIcs(item.location)}` : "",
      item.description ? `DESCRIPTION:${escapeIcs(item.description)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.replace(/[^a-z0-9æøå]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-headline text-lg font-semibold text-headline">
            {isNo ? "Arrangementer" : "Events"}
          </h2>
        </div>
        <button
          onClick={() => navigate("/arrangementer")}
          className="text-sm text-primary font-subhead font-medium hover:underline inline-flex items-center gap-1"
        >
          {isNo ? "Se alle" : "See all"} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body py-4 text-center">
          {isNo ? "Ingen kommende arrangementer" : "No upcoming events"}
        </p>
      ) : (
        <ul className="-my-3">
          {items.map((item) => (
            <li key={item.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => navigate(`/arrangementer/${item.id}`)}
                className="w-full flex items-start gap-3 py-3 text-left hover:bg-muted/30 cursor-pointer transition-colors"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-subhead font-semibold text-sm text-headline truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {fmtDate(item.start_at)}
                  </p>
                  {item.location && (
                    <p className="text-xs text-muted-foreground font-body mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </p>
                  )}
                </div>
                {item.category && (
                  <span className="px-1.5 py-0.5 text-[10px] font-subhead font-medium rounded bg-primary/10 text-primary flex-shrink-0">
                    {item.category}
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => downloadIcs(e, item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      downloadIcs(e as any, item);
                    }
                  }}
                  title={isNo ? "Legg til i kalender" : "Add to calendar"}
                  aria-label={isNo ? "Legg til i kalender" : "Add to calendar"}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                >
                  <CalendarPlus className="w-4 h-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
