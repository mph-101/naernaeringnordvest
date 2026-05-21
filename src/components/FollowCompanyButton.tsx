import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface Props {
  orgnr: string;
  companyName?: string;
  /** Optional className override for the wrapper button */
  className?: string;
}

/**
 * Follow / unfollow a company. Renders nothing when the user is not logged in.
 * Performs optimistic toggling and reverts on error.
 *
 * The first time a user follows a company, we also seed company_roles_cache
 * and company_status_cache so the refresh-roles-and-status job has a
 * baseline snapshot to diff against (no false-positive notification on first
 * weekly run).
 */
export function FollowCompanyButton({ orgnr, companyName, className }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [working, setWorking] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setUserId(s?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId || !orgnr) {
      setLoading(false);
      setIsFollowing(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    supabase
      .from("company_follows")
      .select("id")
      .eq("user_id", userId)
      .eq("orgnr", orgnr)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setIsFollowing(!!data);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [userId, orgnr]);

  // No render when logged out — keeps the button from teasing anonymous users.
  if (!userId) return null;

  const handleClick = async () => {
    if (working) return;
    setWorking(true);
    const wasFollowing = isFollowing;

    // Optimistic
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from("company_follows")
          .delete()
          .eq("user_id", userId)
          .eq("orgnr", orgnr);
        if (error) throw error;
        toast.success(
          isNo
            ? `Du følger ikke lenger ${companyName || orgnr}`
            : `Unfollowed ${companyName || orgnr}`
        );
      } else {
        const { error } = await supabase
          .from("company_follows")
          .insert({ user_id: userId, orgnr, company_name: companyName ?? null });
        if (error) throw error;
        toast.success(
          isNo
            ? `Du følger nå ${companyName || orgnr}`
            : `Now following ${companyName || orgnr}`
        );
      }
    } catch (e: any) {
      setIsFollowing(wasFollowing); // revert
      toast.error(e?.message || (isNo ? "Noe gikk galt" : "Something went wrong"));
    } finally {
      setWorking(false);
    }
  };

  const base = "px-4 py-2 rounded-lg text-sm font-subhead transition-colors flex items-center gap-1.5";
  const active = isFollowing
    ? "bg-accent text-accent-foreground hover:bg-accent/90"
    : "bg-card border border-border text-foreground hover:bg-secondary";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || working}
      aria-pressed={isFollowing}
      className={`${base} ${active} ${className ?? ""}`}
    >
      {loading || working ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <BellRing className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {isFollowing ? (isNo ? "Følger" : "Following") : (isNo ? "Følg" : "Follow")}
    </button>
  );
}
