import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
}

export const CategorySelect = ({ value, onChange }: CategorySelectProps) => {
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [newCat, setNewCat] = useState("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name, slug").order("name");
    setCategories(data || []);
  };

  const handleAdd = async () => {
    if (!newCat.trim()) return;
    setAdding(true);
    const slug = newCat.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-æøå]/g, "");
    const { error } = await supabase.from("categories").insert({ name: newCat.trim(), slug });
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } else {
      onChange(newCat.trim());
      setNewCat("");
      fetchCategories();
    }
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              value === cat.name
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {cat.name}
            {value === cat.name && <Check className="w-3 h-3 ml-1 inline" />}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="Ny kategori..."
          className="text-sm"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={adding || !newCat.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
