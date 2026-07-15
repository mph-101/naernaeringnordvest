import { useEffect, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SingleProps {
  mode: "single";
  value: string | null;
  onChange: (slug: string | null) => void;
  disabledSlug?: string | null;
  placeholder?: string;
}

interface MultiProps {
  mode: "multi";
  value: string[];
  onChange: (slugs: string[]) => void;
  disabledSlug?: string | null;
}

type Props = SingleProps | MultiProps;

export function RegionPicker(props: Props) {
  const [regions, setRegions] = useState<EditorialRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegions()
      .then(setRegions)
      .catch(() => setRegions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-xs text-muted-foreground">Laster regioner...</div>;
  }

  if (props.mode === "single") {
    return (
      <Select
        value={props.value || ""}
        onValueChange={(v) => props.onChange(v || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder={props.placeholder || "Velg region"} />
        </SelectTrigger>
        <SelectContent>
          {regions.map((r) => (
            <SelectItem key={r.slug} value={r.slug} disabled={r.slug === props.disabledSlug}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // multi
  const selected = new Set(props.value);
  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((r) => {
        const isSelected = selected.has(r.slug);
        const isDisabled = r.slug === props.disabledSlug;
        return (
          <button
            key={r.slug}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (isSelected) props.onChange(props.value.filter((s) => s !== r.slug));
              else props.onChange([...props.value, r.slug]);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subhead border transition-all ${
              isDisabled
                ? "border-dashed border-border bg-muted/30 text-muted-foreground cursor-not-allowed"
                : isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-secondary"
            }`}
            title={isDisabled ? "Forfatterens egen region (alltid mottaker)" : undefined}
          >
            {isSelected ? <Check className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {r.name}
            {isDisabled && <span className="text-[0.625rem] opacity-70">(egen)</span>}
          </button>
        );
      })}
    </div>
  );
}
