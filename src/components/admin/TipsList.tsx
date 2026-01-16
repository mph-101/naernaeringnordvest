import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Mail, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Tip {
  id: string;
  journalist_id: string;
  journalist_name: string;
  content: string;
  follow_up_email: string | null;
  created_at: string;
}

export const TipsList = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJournalist, setSelectedJournalist] = useState<string | null>(null);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      // Note: This requires admin access via edge function in production
      // For now, we show a placeholder since tips table has SELECT USING (false)
      setTips([]);
    } catch (error) {
      console.error("Error fetching tips:", error);
    } finally {
      setLoading(false);
    }
  };

  const journalists = ["redaksjonen", "ingrid-solberg", "erik-nordahl", "maria-henriksen", "anders-kristiansen", "karin-moe"];
  const journalistNames: Record<string, string> = {
    "redaksjonen": "Redaksjonen",
    "ingrid-solberg": "Ingrid Solberg",
    "erik-nordahl": "Erik Nordahl",
    "maria-henriksen": "Maria Henriksen",
    "anders-kristiansen": "Anders Kristiansen",
    "karin-moe": "Karin Moe"
  };

  const filteredTips = selectedJournalist 
    ? tips.filter(t => t.journalist_id === selectedJournalist)
    : tips;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline text-2xl font-semibold text-headline">
          Innkomne tips
        </h2>
      </div>

      {/* Filter by journalist */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedJournalist(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedJournalist === null 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          Alle
        </button>
        {journalists.map((j) => (
          <button
            key={j}
            onClick={() => setSelectedJournalist(j)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedJournalist === j 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {journalistNames[j]}
          </button>
        ))}
      </div>

      {filteredTips.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-soft">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-headline text-xl font-medium text-headline mb-2">
            Ingen tips ennå
          </h3>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            Tips sendes via den sikre tipskanalen på team-siden og vises her når de kommer inn.
          </p>
          <p className="text-sm text-muted-foreground font-body mt-4">
            Merk: For å se tips må du ha en admin-rolle med SELECT-tilgang.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTips.map((tip) => (
            <div key={tip.id} className="bg-card rounded-xl p-6 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-headline font-body">
                      Til: {tip.journalist_name}
                    </p>
                    <p className="text-sm text-muted-foreground font-body flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(tip.created_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                    </p>
                  </div>
                </div>
                {tip.follow_up_email && (
                  <a
                    href={`mailto:${tip.follow_up_email}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    {tip.follow_up_email}
                  </a>
                )}
              </div>
              <p className="text-foreground font-body whitespace-pre-wrap">
                {tip.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
