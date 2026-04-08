import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { MapPin, X, ChevronDown, Check } from "lucide-react";
import { FYLKER, getKommunenummerForFylke } from "@/data/regions";

interface GeoFilterProps {
  selectedFylker: string[];
  selectedKommuner: string[];
  onFylkerChange: (fylker: string[]) => void;
  onKommunerChange: (kommuner: string[]) => void;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-body text-foreground hover:border-accent/40 transition-colors min-w-[140px]"
      >
        <span className="truncate">
          {selected.length === 0
            ? label
            : selected.length === 1
              ? options.find((o) => o.value === selected[0])?.label || selected[0]
              : `${selected.length} valgt`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-body text-foreground hover:bg-secondary/60 transition-colors text-left"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                selected.includes(opt.value) ? "bg-primary border-primary" : "border-border"
              }`}>
                {selected.includes(opt.value) && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GeoFilter({ selectedFylker, selectedKommuner, onFylkerChange, onKommunerChange }: GeoFilterProps) {
  const { language } = useTheme();
  const isNo = language === "no";

  const fylkeOptions = FYLKER.map((f) => ({ value: f.navn, label: f.navn }));

  const kommuneOptions = selectedFylker.length > 0
    ? FYLKER.filter((f) => selectedFylker.includes(f.navn))
        .flatMap((f) => f.kommuner.map((k) => ({ value: k.nummer, label: `${k.navn} (${f.navn})` })))
    : [];

  const hasFilter = selectedFylker.length > 0 || selectedKommuner.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MapPin className="w-4 h-4 text-muted-foreground" />
      <MultiSelectDropdown
        label={isNo ? "Velg fylker" : "Select counties"}
        options={fylkeOptions}
        selected={selectedFylker}
        onChange={(val) => {
          onFylkerChange(val);
          // Remove kommuner that no longer belong to selected fylker
          const validKommuner = FYLKER.filter((f) => val.includes(f.navn))
            .flatMap((f) => f.kommuner.map((k) => k.nummer));
          onKommunerChange(selectedKommuner.filter((k) => validKommuner.includes(k)));
        }}
      />
      {selectedFylker.length > 0 && kommuneOptions.length > 0 && (
        <MultiSelectDropdown
          label={isNo ? "Velg kommuner" : "Select municipalities"}
          options={kommuneOptions}
          selected={selectedKommuner}
          onChange={onKommunerChange}
        />
      )}
      {hasFilter && (
        <button
          onClick={() => { onFylkerChange([]); onKommunerChange([]); }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-subhead text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-3 h-3" /> {isNo ? "Nullstill" : "Reset"}
        </button>
      )}
      {selectedFylker.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-1">
          {selectedFylker.map((f) => (
            <span key={f} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full font-body">
              {f}
            </span>
          ))}
          {selectedKommuner.map((k) => {
            const kommune = FYLKER.flatMap((f) => f.kommuner).find((kk) => kk.nummer === k);
            return (
              <span key={k} className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full font-body">
                {kommune?.navn || k}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Helper: get comma-separated kommunenummer for selected geo filters */
export function getKommuneParam(selectedFylker: string[], selectedKommuner: string[]): string {
  if (selectedKommuner.length > 0) return selectedKommuner.join(",");
  if (selectedFylker.length > 0) return selectedFylker.flatMap(getKommunenummerForFylke).join(",");
  return "";
}
