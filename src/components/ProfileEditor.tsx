import { useEffect, useRef, useState } from "react";
import { Camera, Pencil, X, Check, Loader2, User, MapPin, Building, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";

const legacyRegions = [
  { id: "more_og_romsdal", labelNo: "Møre og Romsdal", labelEn: "Møre og Romsdal" },
  { id: "vestlandet", labelNo: "Vestlandet", labelEn: "Western Norway" },
  { id: "nord_norge", labelNo: "Nord-Norge", labelEn: "Northern Norway" },
  { id: "trondelag", labelNo: "Trøndelag", labelEn: "Trøndelag" },
  { id: "ostlandet", labelNo: "Østlandet", labelEn: "Eastern Norway" },
  { id: "sorlandet", labelNo: "Sørlandet", labelEn: "Southern Norway" },
];

interface ProfileEditorProps {
  userId: string;
  userEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  userRegion: string | null;
  onUpdate: (updates: { displayName?: string; avatarUrl?: string; region?: string }) => void;
}

export function ProfileEditor({ userId, userEmail, displayName, avatarUrl, userRegion, onUpdate }: ProfileEditorProps) {
  const { language, setRegion: setThemeRegion } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(displayName || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(userRegion || "");
  const [editorialRegion, setEditorialRegion] = useState<string>("");
  const [editorialRegions, setEditorialRegions] = useState<EditorialRegion[]>([]);
  const [mascotEnabled, setMascotEnabled] = useState<boolean>(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNo = language === "no";

  const t = isNo
    ? { edit: "Rediger", save: "Lagre", cancel: "Avbryt", saved: "Lagret!", uploadError: "Feil ved opplasting", namePlaceholder: "Visningsnavn", changePhoto: "Endre bilde", region: "Region (lesefilter)", editorial: "Min redaksjon" }
    : { edit: "Edit", save: "Save", cancel: "Cancel", saved: "Saved!", uploadError: "Upload error", namePlaceholder: "Display name", changePhoto: "Change photo", region: "Region (read filter)", editorial: "My editorial" };

  useEffect(() => {
    fetchRegions().then(setEditorialRegions).catch(() => {});
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("editorial_region, mascot_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      const slug = (data as any)?.editorial_region as string | null | undefined;
      if (slug) setEditorialRegion(slug);
      const me = (data as any)?.mascot_enabled;
      if (typeof me === "boolean") setMascotEnabled(me);
    })();
  }, [userId]);

  const handleSaveName = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nameValue.trim() || null })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onUpdate({ displayName: nameValue.trim() || undefined });
    setEditing(false);
    toast.success(t.saved);
  };

  const handleRegionChange = async (regionId: string) => {
    setSelectedRegion(regionId);
    setThemeRegion(regionId);
    const { error } = await supabase
      .from("profiles")
      .update({ region: regionId } as any)
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    onUpdate({ region: regionId });
    toast.success(t.saved);
  };

  const handleEditorialChange = async (slug: string) => {
    setEditorialRegion(slug);
    const { error } = await supabase
      .from("profiles")
      .update({ editorial_region: slug || null } as any)
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(t.saved);
  };

  const handleMascotToggle = async (next: boolean) => {
    setMascotEnabled(next);
    // When re-enabling, also clear the completed-tour flag so the guide
    // can show again right away.
    const updates: Record<string, unknown> = { mascot_enabled: next };
    if (next) updates.tour_completed_at = null;
    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    window.dispatchEvent(new CustomEvent("nn:mascot-toggle", { detail: { enabled: next } }));
    if (next) {
      // Restart the tour from the beginning immediately
      window.dispatchEvent(new CustomEvent("nn:mascot-start"));
    }
    toast.success(t.saved);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(isNo ? "Kun bildefiler er tillatt" : "Only image files allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(isNo ? "Maks 2MB" : "Max 2MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { setUploading(false); toast.error(t.uploadError); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    setUploading(false);
    if (updateError) { toast.error(updateError.message); return; }
    onUpdate({ avatarUrl: url });
    toast.success(t.saved);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-accent" />
            )}
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors cursor-pointer" aria-label={t.changePhoto}>
            {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder={t.namePlaceholder} className="flex-1 min-w-0 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg font-headline text-lg font-bold text-headline focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveName()} />
              <button onClick={handleSaveName} disabled={saving} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => { setEditing(false); setNameValue(displayName || ""); }} className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-2xl font-bold text-headline truncate">{displayName || userEmail}</h1>
              <button onClick={() => { setNameValue(displayName || ""); setEditing(true); }} className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          {displayName && !editing && <p className="text-sm text-muted-foreground font-body truncate">{userEmail}</p>}
        </div>
      </div>

      {/* Region selector (lesefilter) */}
      <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl mb-2">
        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-subhead font-medium text-muted-foreground">{t.region}:</span>
        <select
          value={selectedRegion}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-body text-foreground focus:outline-none cursor-pointer"
        >
          <option value="">{isNo ? "Velg region" : "Select region"}</option>
          {legacyRegions.map(r => (
            <option key={r.id} value={r.id}>{isNo ? r.labelNo : r.labelEn}</option>
          ))}
        </select>
      </div>

      {/* Editorial region (for journalists) */}
      {editorialRegions.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
          <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-subhead font-medium text-muted-foreground">{t.editorial}:</span>
          <select
            value={editorialRegion}
            onChange={(e) => handleEditorialChange(e.target.value)}
            className="flex-1 bg-transparent text-sm font-body text-foreground focus:outline-none cursor-pointer"
          >
            <option value="">{isNo ? "Ingen redaksjon" : "No editorial"}</option>
            {editorialRegions.map(r => (
              <option key={r.slug} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Mascot guide toggle */}
      <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl mt-2">
        <Compass className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-subhead font-medium text-muted-foreground flex-1">
          {isNo ? "Vis kompass-guiden" : "Show compass guide"}
        </span>
        <button
          onClick={() => handleMascotToggle(!mascotEnabled)}
          aria-pressed={mascotEnabled}
          className={`relative w-11 h-6 rounded-full transition-colors ${mascotEnabled ? "bg-accent" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${mascotEnabled ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </div>
  );
}
