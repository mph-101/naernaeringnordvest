import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { loadProofreadRules, loadProofreadSettings } from "@/components/admin/ProofreadRules";

export interface ProofSuggestion {
  id: string;
  original: string;
  suggestion: string;
  reason: string;
  category: string;
}

interface UndoEntry {
  previousBody: string;
  restored: ProofSuggestion[];
}

function replaceInHtmlBody(html: string, original: string, suggestion: string): { html: string; replaced: boolean } {
  if (!original) return { html, replaced: false };
  let replaced = false;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="__nn_root">${html}</div>`, "text/html");
    const root = doc.getElementById("__nn_root");
    if (!root) return { html, replaced: false };
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null = walker.nextNode();
    while (n) {
      nodes.push(n as Text);
      n = walker.nextNode();
    }
    for (const textNode of nodes) {
      const value = textNode.nodeValue || "";
      const idx = value.indexOf(original);
      if (idx >= 0) {
        textNode.nodeValue = value.slice(0, idx) + suggestion + value.slice(idx + original.length);
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      for (const textNode of nodes) {
        const value = textNode.nodeValue || "";
        const lower = value.toLowerCase();
        const idx = lower.indexOf(original.toLowerCase());
        if (idx >= 0) {
          textNode.nodeValue = value.slice(0, idx) + suggestion + value.slice(idx + original.length);
          replaced = true;
          break;
        }
      }
    }
    return { html: replaced ? root.innerHTML : html, replaced };
  } catch {
    if (html.includes(original)) {
      return { html: html.replace(original, suggestion), replaced: true };
    }
    return { html, replaced: false };
  }
}

export function useArticleProofreading(
  getBody: () => string,
  updateBody: (body: string) => void,
) {
  const { toast } = useToast();
  const [proofreading, setProofreading] = useState(false);
  const [proofSuggestions, setProofSuggestions] = useState<ProofSuggestion[]>([]);
  const [proofUndoStack, setProofUndoStack] = useState<UndoEntry[]>([]);

  const proofreadBody = async () => {
    const body = getBody();
    if (!body || body.length < 50) {
      toast({ title: "For kort", description: "Brødteksten må være minst 50 tegn", variant: "destructive" });
      return;
    }
    setProofreading(true);
    setProofSuggestions([]);
    setProofUndoStack([]);
    try {
      const customRules = loadProofreadRules();
      const settings = loadProofreadSettings();

      const localSuggestions: { original: string; suggestion: string; reason: string; category: string }[] = [];
      const plainText = body.replace(/<[^>]*>/g, " ");
      for (const r of customRules) {
        if (!r.from) continue;
        const escaped = r.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "i");
        const match = plainText.match(re);
        if (match) {
          localSuggestions.push({
            original: match[0],
            suggestion: r.to,
            reason: r.reason || "Egen regel",
            category: r.category || "stil",
          });
        }
      }

      const { data, error } = await supabase.functions.invoke("proofread-article", {
        body: { body, customRules, profile: settings.profile, focusAreas: settings.focusAreas },
      });
      if (error) throw error;
      const aiSuggestions = data?.suggestions || [];
      const seen = new Set<string>();
      const merged = [...localSuggestions, ...aiSuggestions]
        .filter((s: any) => {
          const key = `${s.original}→${s.suggestion}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return Boolean(s.original) && Boolean(s.suggestion);
        })
        .map((s: any, i: number) => ({
          id: `ps-${Date.now()}-${i}`,
          original: s.original,
          suggestion: s.suggestion,
          reason: s.reason || "",
          category: s.category || "stil",
        }));
      if (merged.length) {
        setProofSuggestions(merged);
        toast({ title: "Språkvask fullført", description: `${merged.length} forslag funnet` });
      } else {
        toast({ title: "Ingen forslag", description: "Teksten ser bra ut!" });
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setProofreading(false);
    }
  };

  const applyProofSuggestionById = useCallback((id: string) => {
    setProofSuggestions(prev => {
      const s = prev.find(p => p.id === id);
      if (!s) return prev;
      const previousBody = getBody();
      const { html: newBody, replaced } = replaceInHtmlBody(previousBody, s.original, s.suggestion);
      if (!replaced) {
        toast({ title: "Fant ikke teksten", description: `Kunne ikke finne "${s.original}" i brødteksten`, variant: "destructive" });
        return prev;
      }
      updateBody(newBody);
      setProofUndoStack(stack => [...stack, { previousBody, restored: [s] }]);
      toast({ title: "Endret", description: `"${s.original}" → "${s.suggestion}"` });
      return prev.filter(p => p.id !== id);
    });
  }, [getBody, updateBody, toast]);

  const dismissProofSuggestionById = useCallback((id: string) => {
    setProofSuggestions(prev => prev.filter(p => p.id !== id));
  }, []);

  const applyAllProofSuggestions = () => {
    if (proofSuggestions.length === 0) return;
    const previousBody = getBody();
    let newBody = previousBody;
    const appliedSuggestions: ProofSuggestion[] = [];
    const skipped: ProofSuggestion[] = [];
    for (const s of proofSuggestions) {
      const { html, replaced } = replaceInHtmlBody(newBody, s.original, s.suggestion);
      if (replaced) {
        newBody = html;
        appliedSuggestions.push(s);
      } else {
        skipped.push(s);
      }
    }
    if (appliedSuggestions.length > 0) {
      updateBody(newBody);
      setProofUndoStack(stack => [...stack, { previousBody, restored: appliedSuggestions }]);
    }
    setProofSuggestions(skipped);
    if (appliedSuggestions.length > 0) {
      toast({
        title: "Alle forslag godtatt",
        description: `${appliedSuggestions.length} endring${appliedSuggestions.length === 1 ? "" : "er"} brukt${skipped.length ? `, ${skipped.length} hoppet over` : ""}`,
      });
    } else {
      toast({ title: "Ingen endringer", description: "Fant ingen treff å bruke", variant: "destructive" });
    }
  };

  const undoLastProofChange = useCallback(() => {
    setProofUndoStack(stack => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      updateBody(last.previousBody);
      setProofSuggestions(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const restored = last.restored.filter(r => !existingIds.has(r.id));
        return [...restored, ...prev];
      });
      const count = last.restored.length;
      toast({
        title: "Angret",
        description: `${count} endring${count === 1 ? "" : "er"} rullet tilbake`,
      });
      return stack.slice(0, -1);
    });
  }, [updateBody, toast]);

  // Bridge inline accept/reject buttons from ProseMirror decorations
  useEffect(() => {
    const onAccept = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) applyProofSuggestionById(id);
    };
    const onReject = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) dismissProofSuggestionById(id);
    };
    window.addEventListener("nn:proofread-accept", onAccept);
    window.addEventListener("nn:proofread-reject", onReject);
    return () => {
      window.removeEventListener("nn:proofread-accept", onAccept);
      window.removeEventListener("nn:proofread-reject", onReject);
    };
  }, [applyProofSuggestionById, dismissProofSuggestionById]);

  // Ctrl/Cmd+Z override for proofreading undo
  useEffect(() => {
    if (proofUndoStack.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isUndo =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === "z" || e.key === "Z");
      if (!isUndo) return;
      e.preventDefault();
      e.stopPropagation();
      undoLastProofChange();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [proofUndoStack.length, undoLastProofChange]);

  const clearProofSuggestions = useCallback(() => {
    setProofSuggestions([]);
  }, []);

  return {
    proofreading,
    proofSuggestions,
    proofUndoStack,
    proofreadBody,
    applyProofSuggestionById,
    dismissProofSuggestionById,
    applyAllProofSuggestions,
    undoLastProofChange,
    clearProofSuggestions,
  };
}
