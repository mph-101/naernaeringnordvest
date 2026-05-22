import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface Props {
  followeeId: string;
  displayName?: string | null;
  className?: string;
}

/**
 * Follow / unfollow another user. Renders nothing when:
 *  - viewer not logged in
 *  - viewer is the same person as followeeId (can't follow yourself)
 *
 * Mirrors FollowCompanyButton's pattern (optimistic toggle, toast, revert).
 */
export function FollowUserButton({ followeeId, displayName, className }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";

  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setUserId(s?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId || !followeeId || userId === followeeId) {
      setLoading(false);
      setIsFollowing(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("followee_id", followeeId)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setIsFollowing(!!data);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [userId, followeeId]);

  // Hide for anonymous or self
  if (!userId || userId === followeeId) return null;

  const handleClick = async () => {
    if (working) return;
    setWorking(true);
    const was = isFollowing;
    setIsFollowing(!was);

    try {
      if (was) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", userId)
          .eq("followee_id", followeeId);
        if (error) throw error;
        toast.success(isNo ? `Slutter å følge ${displayName || ""}` : `Unfollowed ${displayName || ""}`);
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: userId, followee_id: followeeId });
        if (error) throw error;
        toast.success(isNo ? `Følger nå ${displayName || ""}` : `Now following ${displayName || ""}`);
      }
    } catch (e: any) {
      setIsFollowing(was);
      toast.error(e?.message || (isNo ? "Noe gikk galt" : "Something went wrong"));
    } finally {
      setWorking(false);
    }
  };

  const base = "px-4 py-2 rounded-full text-sm font-subhead font-semibold transition-colors flex items-center gap-1.5";
  const style = isFollowing
    ? "bg-card border border-border text-foreground hover:bg-secondary"
    : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || working}
      aria-pressed={isFollowing}
      className={`${base} ${style} ${className ?? ""}`}
    >
      {loading || working ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {isFollowing ? (isNo ? "Følger" : "Following") : (isNo ? "Følg" : "Follow")}
    </button>
  );
}
