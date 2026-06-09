// Editorial input for agent-provenance: sources, right-of-reply, corrections,
// and the agent_exposure level. Purely presentational — state lives in
// useArticleProvenance (passed in). Rendered as a CollapsibleSection in
// ArticleEditor's right column.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { AgentExposure } from "@/lib/agent-provenance/types";
import {
  emptyCorrection,
  emptyResponse,
  emptySource,
  type CorrectionRow,
  type ResponseRow,
  type SourceRow,
} from "@/hooks/useArticleProvenance";

interface Props {
  sources: SourceRow[];
  setSources: (rows: SourceRow[]) => void;
  responses: ResponseRow[];
  setResponses: (rows: ResponseRow[]) => void;
  corrections: CorrectionRow[];
  setCorrections: (rows: CorrectionRow[]) => void;
  exposure: AgentExposure;
  onExposureChange: (e: AgentExposure) => void;
}

const EXPOSURE_LABELS: Record<AgentExposure, string> = {
  headline_only: "Kun tittel",
  headline_plus_dek: "Tittel + ingress",
  summary: "Sammendrag (tittel + ingress + nøkkelpunkter)",
};

function update<T>(rows: T[], i: number, patch: Partial<T>): T[] {
  return rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
}
function removeAt<T>(rows: T[], i: number): T[] {
  return rows.filter((_, idx) => idx !== i);
}

export function ArticleProvenancePanel({
  sources,
  setSources,
  responses,
  setResponses,
  corrections,
  setCorrections,
  exposure,
  onExposureChange,
}: Props) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground -mt-2">
        Maskinlesbar kildebelegg for AI-agenter og søkemotorer. Vises aldri som
        brødtekst — kun som proveniens om saken.
      </p>

      {/* Eksponering */}
      <div className="space-y-1.5">
        <Label className="text-sm">Agent-eksponering</Label>
        <Select value={exposure} onValueChange={(v) => onExposureChange(v as AgentExposure)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(EXPOSURE_LABELS) as AgentExposure[]).map((k) => (
              <SelectItem key={k} value={k}>
                {EXPOSURE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Hvor mye av teksten agent-lagene gjengir. Påvirker ikke betalmuren.
        </p>
      </div>

      {/* Kilder */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Kilder</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setSources([...sources, emptySource()])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Kilde
          </Button>
        </div>
        {sources.length === 0 && (
          <p className="text-xs text-muted-foreground">Ingen kilder lagt til.</p>
        )}
        {sources.map((s, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <div className="flex gap-2">
              <Select value={s.kind} onValueChange={(v) => setSources(update(sources, i, { kind: v as SourceRow["kind"] }))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interviewee">Intervjuobjekt</SelectItem>
                  <SelectItem value="document">Dokument</SelectItem>
                  <SelectItem value="dataset">Datasett</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={s.kind === "interviewee" ? "Navn" : s.kind === "document" ? "Dokumenttittel" : "Datasett-navn"}
                value={s.name}
                onChange={(e) => setSources(update(sources, i, { name: e.target.value }))}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setSources(removeAt(sources, i))}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            {s.kind === "interviewee" && (
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Rolle" value={s.role} onChange={(e) => setSources(update(sources, i, { role: e.target.value }))} />
                <Input placeholder="Organisasjon" value={s.org} onChange={(e) => setSources(update(sources, i, { org: e.target.value }))} />
                <Input placeholder="Orgnr (9 siffer)" value={s.org_orgnr} onChange={(e) => setSources(update(sources, i, { org_orgnr: e.target.value }))} />
              </div>
            )}
            {s.kind === "document" && (
              <Input placeholder="Dokumenttype (årsregnskap, rettsdok …)" value={s.doc_type} onChange={(e) => setSources(update(sources, i, { doc_type: e.target.value }))} />
            )}
          </div>
        ))}
      </section>

      {/* Tilsvar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Tilsvar / samtidig imøtegåelse</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setResponses([...responses, emptyResponse()])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Part
          </Button>
        </div>
        {responses.length === 0 && (
          <p className="text-xs text-muted-foreground">Ingen parter lagt til.</p>
        )}
        {responses.map((r, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Part" value={r.party_name} onChange={(e) => setResponses(update(responses, i, { party_name: e.target.value }))} />
              <Input placeholder="Rolle i saken" value={r.party_role} onChange={(e) => setResponses(update(responses, i, { party_role: e.target.value }))} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setResponses(removeAt(responses, i))}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            <Select value={r.status} onValueChange={(v) => setResponses(update(responses, i, { status: v as ResponseRow["status"] }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="responded">Svarte</SelectItem>
                <SelectItem value="declined">Avslo å kommentere</SelectItem>
                <SelectItem value="no_reply">Svarte ikke</SelectItem>
                <SelectItem value="not_applicable">Ikke relevant</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Textarea
                placeholder="Intern merknad"
                value={r.note}
                rows={2}
                onChange={(e) => setResponses(update(responses, i, { note: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                🔒 Intern — vises aldri offentlig.
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Rettelser */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Rettelser</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setCorrections([...corrections, emptyCorrection()])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Rettelse
          </Button>
        </div>
        {corrections.length === 0 && (
          <p className="text-xs text-muted-foreground">Ingen rettelser.</p>
        )}
        {corrections.map((c, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <div className="flex gap-2">
              <Input
                type="date"
                className="w-44"
                value={c.corrected_at}
                onChange={(e) => setCorrections(update(corrections, i, { corrected_at: e.target.value }))}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setCorrections(removeAt(corrections, i))}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            <Textarea
              placeholder="Hva ble rettet"
              value={c.summary}
              rows={2}
              onChange={(e) => setCorrections(update(corrections, i, { summary: e.target.value }))}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
