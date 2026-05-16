import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NotificationsSection({ userId, isNo }: { userId: string; isNo: boolean }) {
  const [pushImportant, setPushImportant] = useState(false);
  const [cap, setCap] = useState(5);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("push_important, monthly_cap")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setPushImportant(!!data.push_important);
        setCap(data.monthly_cap ?? 5);
      }
      setLoaded(true);
    })();
  }, [userId]);

  const save = async (updates: { push_important?: boolean; monthly_cap?: number }) => {
    const next = {
      user_id: userId,
      push_important: updates.push_important ?? pushImportant,
      monthly_cap: updates.monthly_cap ?? cap,
    };
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(next, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(isNo ? "Lagret" : "Saved");
  };

  const t = isNo
    ? {
        title: "Varsler",
        desc: "Velg hvilke push-varsler du vil motta.",
        important: "Viktige saker",
        importantHint: "Vi sender kun de viktigste nyhetene — maks {n} i måneden.",
        cap: "Maks per måned",
      }
    : {
        title: "Notifications",
        desc: "Choose which push notifications you want to receive.",
        important: "Important stories",
        importantHint: "We only send the most important news — up to {n} per month.",
        cap: "Max per month",
      };

  if (!loaded) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-accent" />
        <h3 className="font-headline text-lg font-semibold text-headline">{t.title}</h3>
      </div>
      <p className="text-sm text-muted-foreground font-body mb-5">{t.desc}</p>

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-subhead font-medium text-foreground">{t.important}</p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              {t.importantHint.replace("{n}", String(cap))}
            </p>
          </div>
          <Switch
            checked={pushImportant}
            onCheckedChange={(v) => { setPushImportant(v); save({ push_important: v }); }}
          />
        </div>

        {pushImportant && (
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
            <label htmlFor="cap" className="text-sm font-subhead font-medium text-foreground">{t.cap}</label>
            <select
              id="cap"
              value={cap}
              onChange={(e) => { const v = Number(e.target.value); setCap(v); save({ monthly_cap: v }); }}
              className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {[1, 3, 5, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}