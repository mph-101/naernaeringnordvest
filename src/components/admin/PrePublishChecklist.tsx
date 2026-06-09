import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ChecklistItem {
  /** Stable id for the requirement (used for keys + tests). */
  id: string;
  /** Short user-facing label shown in the list. */
  label: string;
  /** Hint shown under the label when the item is incomplete. */
  hint: string;
  /** True when the requirement is satisfied. */
  done: boolean;
}

interface PrePublishChecklistProps {
  items: ChecklistItem[];
  /** Compact mode is rendered next to the status switcher; full mode is a card. */
  variant?: "card" | "compact";
}

/**
 * Pre-publish requirements list. The editor blocks promoting an article to
 * "published" until every item here returns `done: true`. We keep the data
 * shape (ChecklistItem[]) outside the component so the same checklist powers
 * both the inline guard and the visible status panel.
 */
export const PrePublishChecklist = ({ items, variant = "card" }: PrePublishChecklistProps) => {
  const remaining = items.filter((i) => !i.done).length;
  const allDone = remaining === 0;

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          allDone
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        }`}
        title={
          allDone
            ? "Alle publiseringskrav er oppfylt"
            : `${remaining} krav gjenstår før publisering`
        }
      >
        {allDone ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {allDone ? "Klar til publisering" : `${remaining} krav gjenstår`}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-5 ${
        allDone
          ? "border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-900/10"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        {allDone ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        )}
        <div>
          <h4 className="font-subhead font-semibold text-sm text-headline">
            {allDone ? "Klar til publisering" : "Før artikkelen kan publiseres"}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone
              ? "Alle krav er oppfylt. Sett status til «Publisert» og lagre."
              : `${remaining} av ${items.length} krav gjenstår.`}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-amber-400 dark:border-amber-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${
                  item.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {item.label}
              </div>
              {!item.done && (
                <div className="text-xs text-muted-foreground mt-0.5">{item.hint}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Pure helper that derives the checklist from the current editor form state.
 * Kept outside the component so callers can both render the list AND ask
 * "is this article publishable?" without re-rendering anything.
 */
export function buildPublishChecklist(input: {
  author: string;
  imageUrl: string | null | undefined;
  excerpt: string;
  tagCount: number;
  body: string;
  regionSlug: string | null | undefined;
}): ChecklistItem[] {
  const excerptTrimmed = input.excerpt.trim();
  const bodyTrimmed = input.body.trim();
  return [
    {
      id: "region",
      label: "Hovedredaksjon er valgt",
      hint: "Velg hvilken redaksjon saken tilhører i sidepanelet. En sak må tilhøre én hovedredaksjon før den kan publiseres.",
      done: !!input.regionSlug && input.regionSlug.trim().length > 0,
    },
    {
      id: "author",
      label: "Forfatter er valgt",
      hint: "Velg en forfatter fra listen i sidepanelet.",
      done: input.author.trim().length > 0,
    },
    {
      id: "image",
      label: "Hovedbilde er lastet opp",
      hint: "Last opp et hovedbilde øverst i editoren.",
      done: !!input.imageUrl && input.imageUrl.trim().length > 0,
    },
    {
      id: "tags",
      label: "Minst én emne-tag er lagt til",
      hint: "Tags hjelper lesere å finne relatert innhold.",
      done: input.tagCount > 0,
    },
    {
      id: "excerpt",
      label: "Ingress er fylt ut (minst 40 tegn)",
      hint: "Ingressen vises i feed og søk — skriv en kort, fengende oppsummering.",
      done: excerptTrimmed.length >= 40,
    },
    {
      id: "body",
      label: "Brødtekst er fylt ut",
      hint: "Skriv selve artikkelteksten før du publiserer.",
      done: bodyTrimmed.length >= 100,
    },
  ];
}