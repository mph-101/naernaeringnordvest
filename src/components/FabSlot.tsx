import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Shared floating-action-button stack.
 *
 * Several independent features render a FAB in the bottom-right corner
 * (the compass guide, article notes, and parked features like the sports
 * AI chat). They live in different parts of the tree and don't know about
 * each other, so left to their own `fixed bottom-x right-x` rules they
 * stack on top of one another.
 *
 * FabSlot solves that by portalling every FAB into a single shared
 * container that lays them out as a vertical column. The first FabSlot to
 * mount lazily creates the container on <body>, so no provider wiring is
 * needed — a feature just wraps its button in <FabSlot> and it joins the
 * stack. When only one feature is active, the column holds a single item
 * and looks identical to a lone FAB.
 */

const STACK_ID = "nn-fab-stack";

function getStackContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(STACK_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = STACK_ID;
    // flex-col-reverse: lower `order` sits at the bottom (anchored corner),
    // higher `order` stacks upward. pointer-events-none on the column so the
    // gaps between buttons don't swallow clicks; each slot re-enables them.
    el.className =
      "fixed bottom-5 right-5 z-50 flex flex-col-reverse items-end gap-3 pointer-events-none";
    document.body.appendChild(el);
  }
  return el;
}

interface FabSlotProps {
  children: ReactNode;
  /**
   * Controls vertical position within the stack. Lower numbers anchor to the
   * bottom corner, higher numbers stack above. Defaults to 0.
   */
  order?: number;
}

export function FabSlot({ children, order = 0 }: FabSlotProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(getStackContainer());
  }, []);

  if (!container) return null;

  return createPortal(
    <div style={{ order }} className="pointer-events-auto">
      {children}
    </div>,
    container,
  );
}
