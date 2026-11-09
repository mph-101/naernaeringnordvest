// Lets a full-screen page (the pre-launch page) switch off the app-wide
// overlays that the provider trees mount next to every route (mascot,
// feature walkthrough). A tiny external store, because those overlays are
// siblings of the page and cannot be reached through props or context.
import { useLayoutEffect, useSyncExternalStore } from "react";

let hiddenCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => hiddenCount > 0;

/** True while at least one mounted page has asked for the overlays to go. */
export function useGlobalChromeHidden(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Call from a page that must render with no app-wide overlays. */
export function useHideGlobalChrome(): void {
  // Layout effect: the resulting re-render is flushed before paint, so the
  // overlays never flash on screen.
  useLayoutEffect(() => {
    hiddenCount += 1;
    emit();
    return () => {
      hiddenCount -= 1;
      emit();
    };
  }, []);
}
