import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, AtSign, Loader2, Check, AlertCircle, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

type SocialUrls = {
  linkedin?: string;
  x?: string;
  mastodon?: string;
  bluesky?: string;
  website?: string;
  signal?: string;
};

const PUBLIC_ROLES = ["journalist", "contributor", "editor"] as const;

// Reserved usernames — these would clash with existing routes
const RESERVED_USERNAMES = new Set([
  "admin", "api", "_next", "varsler", "profil", "profile", "tall", "grupper",
  "groups", "stillinger", "jobs", "lytt", "login", "logout", "register",
  "signup", "settings", "innstillinger", "om-oss", "kontakt", "team",
  "redaksjonelle-prinsipper", "personvern", "vilkar", "innholdsmerking",
  "eierskap", "cookies", "tilgjengelighet", "hjernevelvet", "hjernetrim",
  "arrangementer", "events", "sak", "article", "tag", "nyhetsbrev",
  "newsletter", "unsubscribe", "abonnement", "subscribe", "velkommen",
  "onboarding", "mine-delte-notater", "nullstill-passord", "reset-password",
  "idrett",
]);

// Slugify a name into a candidate username
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")          // strip diacritics
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,29}$/;

interface Props {
  userId: string;
  displayName: string | null;
}

/**
 * Renders the journalist-only profile fields (username, bio, title, beat,
 * contact_email, social URLs). The whole section auto-hides when the
 * signed-in user doesn't have a public-facing role.
 */
export function JournalistFieldsSection({ userId, displayName }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";

  const [isPublic, setIsPublic] = useState<boolean | null>(null);  // null = loading
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [beat, setBeat] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [social, setSocial] = useState<SocialUrls>({});

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid" | "reserved">("idle");
  const [saving, setSaving] = useState<string | null>(null);  // tracks which field is saving

  const t = isNo
    ? {
        section: "Journalist-profil",
        sectionDesc: "Vises offentlig på /@brukernavn",
        usernameLabel: "Brukernavn",
        usernameHelp: "Kun små bokstaver, tall og bindestrek. Eksempel: magnus-harnes",
        usernameTaken: "Brukernavnet er opptatt",
        usernameInvalid: "Ugyldig format. Bruk små bokstaver, tall og bindestrek",
        usernameReserved: "Brukernavnet er reservert",
        usernameOk: "Tilgjengelig",
        bioLabel: "Bio",
        bioHelp: "Kort beskrivelse av deg som vises på profilen",
        titleLabel: "Tittel",
        titlePlaceholder: "F.eks. Redaksjonssjef",
        beatLabel: "Område",
        beatPlaceholder: "F.eks. Næringsliv, M&A",
        contactLabel: "Kontakt-e-post",
        contactPlaceholder: "Offentlig e-post (kan være annen enn innloggings-e-post)",
        socialLabel: "Sosiale lenker",
        save: "Lagre",
        saved: "Lagret",
      }
    : {
        section: "Journalist profile",
        sectionDesc: "Shown publicly at /@username",
        usernameLabel: "Username",
        usernameHelp: "Lowercase letters, digits, and hyphens. Example: magnus-harnes",
        usernameTaken: "Username is taken",
        usernameInvalid: "Invalid format. Use lowercase letters, digits, and hyphens",
        usernameReserved: "Username is reserved",
        usernameOk: "Available",
        bioLabel: "Bio",
        bioHelp: "Short description shown on your profile",
        titleLabel: "Title",
        titlePlaceholder: "E.g. Editor-in-chief",
        beatLabel: "Beat",
        beatPlaceholder: "E.g. Business, M&A",
        contactLabel: "Contact email",
        contactPlaceholder: "Public email (can differ from login email)",
        socialLabel: "Social links",
        save: "Save",
        saved: "Saved",
      };

  // Load roles + profile fields
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!mounted) return;
      const hasPublicRole = (roles || []).some((r: any) => PUBLIC_ROLES.includes(r.role));
      setIsPublic(hasPublicRole);

      if (hasPublicRole) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, bio, title, beat, contact_email, social_urls")
          .eq("user_id", userId)
          .maybeSingle();
        if (!mounted || !profile) return;
        setUsername((profile as any).username || "");
        setBio((profile as any).bio || "");
        setTitle((profile as any).title || "");
        setBeat((profile as any).beat || "");
        setContactEmail((profile as any).contact_email || "");
        setSocial(((profile as any).social_urls as SocialUrls) || {});
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  // Username uniqueness validation on blur
  const checkUsername = async (value: string) => {
    const v = value.trim().toLowerCase();
    if (!v) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_REGEX.test(v)) {
      setUsernameStatus("invalid");
      return;
    }
    if (RESERVED_USERNAMES.has(v)) {
      setUsernameStatus("reserved");
      return;
    }
    setUsernameStatus("checking");
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("username", v)
      .neq("user_id", userId)
      .maybeSingle();
    setUsernameStatus(data ? "taken" : "ok");
  };

  const saveField = async (field: string, value: any, key: string) => {
    setSaving(key);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("user_id", userId);
    setSaving(null);
    if (error) { toast.error(error.message); return false; }
    toast.success(t.saved);
    return true;
  };

  const saveUsername = async () => {
    if (usernameStatus !== "ok" && usernameStatus !== "idle") return;
    const v = username.trim().toLowerCase() || null;
    await saveField("username", v, "username");
  };

  const saveSocial = async (next: SocialUrls) => {
    setSocial(next);
    await saveField("social_urls", next, "social");
  };

  // Loading or not a public role → render nothing
  if (isPublic === null) return null;
  if (!isPublic) return null;

  const suggestion = displayName ? slugify(displayName) : "";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold text-headline">{t.section}</h3>
            <p className="text-sm text-muted-foreground font-body">{t.sectionDesc}</p>
          </div>
        </div>
        <Link
          to="/profil/stream"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-xs font-subhead font-semibold hover:bg-destructive/20 transition-colors flex-shrink-0"
        >
          <Radio className="w-3.5 h-3.5" />
          {isNo ? "Live-stream" : "Live stream"}
        </Link>
      </div>

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="text-sm font-subhead font-medium text-foreground mb-1.5 flex items-center gap-1.5">
            <AtSign className="w-3.5 h-3.5" />
            {t.usernameLabel}
          </label>
          <div className="relative">
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setUsernameStatus("idle"); }}
              onBlur={(e) => checkUsername(e.target.value)}
              placeholder={suggestion ? `f.eks. ${suggestion}` : "magnus-harnes"}
              className="input pr-10"
              maxLength={30}
            />
            {usernameStatus === "checking" && (
              <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {usernameStatus === "ok" && (
              <Check className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
            )}
            {(usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "reserved") && (
              <AlertCircle className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-destructive" />
            )}
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {usernameStatus === "taken" && <span className="text-destructive">{t.usernameTaken}</span>}
            {usernameStatus === "invalid" && <span className="text-destructive">{t.usernameInvalid}</span>}
            {usernameStatus === "reserved" && <span className="text-destructive">{t.usernameReserved}</span>}
            {usernameStatus === "ok" && <span className="text-emerald-600 dark:text-emerald-400">{t.usernameOk}</span>}
            {(usernameStatus === "idle" || usernameStatus === "checking") && t.usernameHelp}
          </p>
          {(usernameStatus === "ok" || usernameStatus === "idle") && (
            <button
              onClick={saveUsername}
              disabled={saving === "username" || usernameStatus === "checking"}
              className="mt-2 px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-xs font-subhead font-semibold hover:bg-accent/90 disabled:opacity-50"
            >
              {saving === "username" ? <Loader2 className="w-3 h-3 animate-spin inline" /> : t.save}
            </button>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.titleLabel}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField("title", title.trim() || null, "title")}
            placeholder={t.titlePlaceholder}
            className="input"
            maxLength={80}
          />
        </div>

        {/* Beat */}
        <div>
          <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.beatLabel}</label>
          <input
            value={beat}
            onChange={(e) => setBeat(e.target.value)}
            onBlur={() => saveField("beat", beat.trim() || null, "beat")}
            placeholder={t.beatPlaceholder}
            className="input"
            maxLength={120}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.bioLabel}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={() => saveField("bio", bio.trim() || null, "bio")}
            rows={4}
            maxLength={500}
            placeholder={t.bioHelp}
            className="input resize-none"
          />
          <p className="text-xs text-muted-foreground font-body mt-1">{bio.length}/500</p>
        </div>

        {/* Contact email */}
        <div>
          <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.contactLabel}</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            onBlur={() => saveField("contact_email", contactEmail.trim() || null, "contact_email")}
            placeholder={t.contactPlaceholder}
            className="input"
            maxLength={200}
          />
        </div>

        {/* Social URLs */}
        <div>
          <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.socialLabel}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              ["linkedin", "LinkedIn"],
              ["x", "X / Twitter"],
              ["bluesky", "Bluesky"],
              ["mastodon", "Mastodon"],
              ["website", "Nettside"],
              ["signal", "Signal"],
            ] as [keyof SocialUrls, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-subhead text-muted-foreground mb-1 block">{label}</label>
                <input
                  value={social[key] || ""}
                  onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                  onBlur={() => {
                    const trimmed: SocialUrls = {};
                    for (const k in social) {
                      const v = (social[k as keyof SocialUrls] || "").trim();
                      if (v) trimmed[k as keyof SocialUrls] = v;
                    }
                    saveSocial(trimmed);
                  }}
                  placeholder={key === "signal" ? "+47 ..." : "https://..."}
                  className="input text-xs"
                  maxLength={200}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
