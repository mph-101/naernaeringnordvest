import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Mail, User, Clock, CheckCircle, Eye, XCircle } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type TipStatus = "new" | "reviewing" | "followed_up" | "dismissed";

interface Tip {
  id: string;
  journalist_id: string;
  journalist_name: string;
  content: string;
  follow_up_email: string | null;
  status: TipStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<TipStatus, string> = {
  new: "Ny",
  reviewing: "Til vurdering",
  followed_up: "Fulgt opp",
  dismissed: "Forkastet",
};

const STATUS_COLORS: Record<TipStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  followed_up: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-500",
};

export const TipsList = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJournalist, setSelectedJournalist] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TipStatus | "all">("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const { data, error } = await supabase
        .from("tips")
        .select("id, journalist_id, journalist_name, content, follow_up_email, status, reviewed_by, reviewed_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTips((data as Tip[]) ?? []);
    } catch (error) {
      console.error("Error fetching tips:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (tipId: string, newStatus: TipStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("tips")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", tipId);

    if (error) {
      toast({ title: "Feil", description: "Kunne ikke oppdatere status.", variant: "destructive" });
      return;
    }

    setTips((prev) =>
      prev.map((t) =>
        t.id === tipId ? { ...t, status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() } : t
      )
    );
  };

  const journalistMap = new Map<string, string>();
  for (const tip of tips) {
    if (!journalistMap.has(tip.journalist_id)) {
      journalistMap.set(tip.journalist_id, tip.journalist_name);
    }
  }

  const filteredTips = tips.filter((t) => {
    if (selectedJournalist && t.journalist_id !== selectedJournalist) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

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

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "new", "reviewing", "followed_up", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {s === "all" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filter by journalist */}
      {journalistMap.size > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedJournalist(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedJournalist === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Alle journalister
          </button>
          {[...journalistMap.entries()].map(([id, name]) => (
            <button
              key={id}
              onClick={() => setSelectedJournalist(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedJournalist === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

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
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTips.map((tip) => (
            <div key={tip.id} className={`bg-card rounded-xl p-6 shadow-soft ${tip.status === "dismissed" ? "opacity-60" : ""}`}>
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
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[tip.status]}`}>
                    {STATUS_LABELS[tip.status]}
                  </span>
                  {tip.follow_up_email && (
                    <a
                      href={`mailto:${tip.follow_up_email}`}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <p className="text-foreground font-body whitespace-pre-wrap mb-4">
                {tip.content}
              </p>

              {/* Status actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                {tip.status !== "reviewing" && (
                  <button
                    onClick={() => updateStatus(tip.id, "reviewing")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Til vurdering
                  </button>
                )}
                {tip.status !== "followed_up" && (
                  <button
                    onClick={() => updateStatus(tip.id, "followed_up")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Fulgt opp
                  </button>
                )}
                {tip.status !== "dismissed" && (
                  <button
                    onClick={() => updateStatus(tip.id, "dismissed")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                    Forkast
                  </button>
                )}
                {tip.reviewed_at && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Vurdert {format(new Date(tip.reviewed_at), "d. MMM yyyy", { locale: nb })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
