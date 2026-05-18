import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Upload, UserCircle2, Crop } from "lucide-react";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { AuthorVoiceSection } from "./AuthorVoiceSection";

interface Author {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  elevenlabs_voice_id?: string | null;
  voice_cloned_at?: string | null;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const emptyForm = {
  id: null as string | null,
  name: "",
  slug: "",
  title: "",
  bio: "",
  email: "",
  avatar_url: "",
  active: true,
};

export const AuthorsManager = () => {
  const { toast } = useToast();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const fetchAuthors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("authors")
      .select("*")
      .order("active", { ascending: false })
      .order("name", { ascending: true });
    if (error) {
      toast({
        title: "Kunne ikke hente forfattere",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAuthors((data ?? []) as Author[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Author) => {
    setForm({
      id: a.id,
      name: a.name,
      slug: a.slug,
      title: a.title ?? "",
      bio: a.bio ?? "",
      email: a.email ?? "",
      avatar_url: a.avatar_url ?? "",
      active: a.active,
    });
    setDialogOpen(true);
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    setUploading(true);
    try {
      const filename = `${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("author-avatars")
        .upload(filename, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("author-avatars").getPublicUrl(filename);
      setForm((prev) => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (err: any) {
      toast({
        title: "Opplasting feilet",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setCropSource(url);
    setCropOpen(true);
  };

  const handleEditExistingAvatar = () => {
    if (!form.avatar_url) return;
    setCropSource(form.avatar_url);
    setCropOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Navn er påkrevd", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const slug = (form.slug.trim() || slugify(form.name)).slice(0, 80);
      const payload = {
        name: form.name.trim(),
        slug,
        title: form.title.trim() || null,
        bio: form.bio.trim() || null,
        email: form.email.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        active: form.active,
      };
      if (form.id) {
        const { error } = await supabase
          .from("authors")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("authors")
          .insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
      toast({ title: form.id ? "Forfatter oppdatert" : "Forfatter opprettet" });
      setDialogOpen(false);
      await fetchAuthors();
    } catch (err: any) {
      toast({
        title: "Lagring feilet",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Author) => {
    if (!confirm(`Slett forfatter "${a.name}"? Eksisterende artikler beholder navnet som tekst.`)) {
      return;
    }
    const { error } = await supabase.from("authors").delete().eq("id", a.id);
    if (error) {
      toast({
        title: "Kunne ikke slette",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Forfatter slettet" });
    await fetchAuthors();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">
            Forfattere
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Opprett byline-profiler som artikler kan velge fra
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Ny forfatter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : authors.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-soft">
          <UserCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-body">
            Ingen forfattere ennå. Opprett den første.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {authors.map((a) => (
            <div
              key={a.id}
              className="bg-card rounded-xl p-5 shadow-soft flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                {a.avatar_url ? (
                  <img
                    src={a.avatar_url}
                    alt={a.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <UserCircle2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-base font-medium text-headline truncate">
                      {a.name}
                    </h3>
                    {!a.active && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        inaktiv
                      </span>
                    )}
                  </div>
                  {a.title && (
                    <p className="text-xs text-primary font-medium truncate">{a.title}</p>
                  )}
                </div>
              </div>
              {a.bio && (
                <p className="text-sm text-muted-foreground font-body line-clamp-3 flex-1">
                  {a.bio}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(a)}
                  className="flex-1"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(a)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Rediger forfatter" : "Ny forfatter"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle2 className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Label className="text-xs">Byline-bilde</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md cursor-pointer transition-colors">
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Last opp
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelected(f);
                        // reset so same file can be re-selected
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {form.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleEditExistingAvatar}
                    >
                      <Crop className="w-3.5 h-3.5 mr-1" />
                      Juster utsnitt
                    </Button>
                  )}
                  {form.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((p) => ({ ...p, avatar_url: "" }))}
                    >
                      Fjern
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="a-name">Navn *</Label>
              <Input
                id="a-name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    name: e.target.value,
                    slug: p.id ? p.slug : slugify(e.target.value),
                  }))
                }
                placeholder="Kari Nordmann"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="a-title">Tittel / rolle</Label>
                <Input
                  id="a-title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Journalist"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="a-email">E-post</Label>
                <Input
                  id="a-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="kari@firma.no"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="a-bio">Kort beskrivelse</Label>
              <Textarea
                id="a-bio"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Erfaren næringslivsjournalist med fokus på lokal industri."
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="a-active"
                checked={form.active}
                onCheckedChange={(c) => setForm((p) => ({ ...p, active: c }))}
              />
              <Label htmlFor="a-active" className="cursor-pointer">
                Aktiv (vises i forfatter-velgeren)
              </Label>
            </div>

            {form.id && (
              <AuthorVoiceSection
                authorId={form.id}
                authorName={form.name}
                currentVoiceId={authors.find((a) => a.id === form.id)?.elevenlabs_voice_id ?? null}
                clonedAt={authors.find((a) => a.id === form.id)?.voice_cloned_at ?? null}
                onCloned={fetchAuthors}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cropSource && (
        <AvatarCropDialog
          open={cropOpen}
          onOpenChange={(o) => {
            setCropOpen(o);
            if (!o) {
              // Revoke object URL only if it's a blob URL (file upload)
              if (cropSource.startsWith("blob:")) URL.revokeObjectURL(cropSource);
              setCropSource(null);
            }
          }}
          imageUrl={cropSource}
          onSave={uploadAvatarBlob}
        />
      )}
    </div>
  );
};