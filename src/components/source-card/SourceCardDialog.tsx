import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SourceCard, type SourceCardData } from "./SourceCard";

interface SourceCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (data: SourceCardData) => void;
  initial?: SourceCardData | null;
}

const empty = (): SourceCardData => ({
  name: "",
  role: "",
  image_url: "",
  quote: "",
});

export const SourceCardDialog = ({ open, onOpenChange, onInsert, initial }: SourceCardDialogProps) => {
  const [form, setForm] = useState<SourceCardData>(initial || empty());

  useEffect(() => {
    if (open) setForm(initial || empty());
  }, [open, initial]);

  const canSubmit = form.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Kildepresentasjon</DialogTitle>
          <DialogDescription>
            Presenter en kilde i artikkelen — portrettbilde, navn og rolle. Legg eventuelt til et kort sitat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Portrettbilde (valgfritt)</Label>
            <ImageUpload
              currentUrl={form.image_url || ""}
              onUpload={(url) => setForm({ ...form, image_url: url })}
            />
          </div>

          <div>
            <Label>Navn</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="F.eks. Per Willy Amundsen (Frp)"
            />
          </div>

          <div>
            <Label>Rolle / tittel</Label>
            <Input
              value={form.role || ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="F.eks. Leder for kontrollkomiteen på Stortinget"
            />
          </div>

          <div>
            <Label>Sitat (valgfritt)</Label>
            <Textarea
              value={form.quote || ""}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
              rows={3}
              placeholder="Et kort sitat fra kilden…"
            />
          </div>

          {form.name && (
            <div>
              <Label className="mb-2 block">Forhåndsvisning</Label>
              <SourceCard data={form} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button disabled={!canSubmit} onClick={() => onInsert(form)}>
              {initial ? "Oppdater" : "Sett inn"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};