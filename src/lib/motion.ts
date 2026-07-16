// WCAG 2.3.3: JS-drevet scrolling må selv respektere prefers-reduced-motion —
// CSS-resetten i index.css når ikke scrollIntoView/scrollBy-animasjoner.
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const scrollBehavior = (): ScrollBehavior =>
  prefersReducedMotion() ? "auto" : "smooth";
