import { useState, useRef } from "react";
import { Camera, Pencil, X, Check, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface ProfileEditorProps {
  userId: string;
  userEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  onUpdate: (updates: { displayName?: string; avatarUrl?: string }) => void;
}

export function ProfileEditor({ userId, userEmail, displayName, avatarUrl, onUpdate }: ProfileEditorProps) {
  const { language } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(displayName || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = language === "no"
    ? { edit: "Rediger", save: "Lagre", cancel: "Avbryt", saved: "Lagret!", uploadError: "Feil ved opplasting", namePlaceholder: "Visningsnavn", changePhoto: "Endre bilde" }
    : { edit: "Edit", save: "Save", cancel: "Cancel", saved: "Saved!", uploadError: "Upload error", namePlaceholder: "Display name", changePhoto: "Change photo" };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(language === "no" ? "Kun bildefiler er tillatt" : "Only image files allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === "no" ? "Maks 2MB" : "Max 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error(t.uploadError);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", userId);

    setUploading(false);
    if (updateError) { toast.error(updateError.message); return; }
    onUpdate({ avatarUrl: url });
    toast.success(t.saved);
  };

  return (
    <div className="flex items-center gap-4 mb-8">
      {/* Avatar */}
      <div className="relative group">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-accent" />
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors cursor-pointer"
          aria-label={t.changePhoto}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder={t.namePlaceholder}
              className="flex-1 min-w-0 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg font-headline text-lg font-bold text-headline focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <button onClick={handleSaveName} disabled={saving} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => { setEditing(false); setNameValue(displayName || ""); }} className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl font-bold text-headline truncate">
              {displayName || userEmail}
            </h1>
            <button onClick={() => { setNameValue(displayName || ""); setEditing(true); }} className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors flex-shrink-0">
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
        {displayName && !editing && (
          <p className="text-sm text-muted-foreground font-body truncate">{userEmail}</p>
        )}
      </div>
    </div>
  );
}
