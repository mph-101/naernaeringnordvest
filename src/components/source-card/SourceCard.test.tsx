import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SourceCard } from "./SourceCard";

/**
 * Visual regression guards for SourceCard typography & layout.
 * These tests fail fast if a future style change re-introduces:
 *  - undersized portrait
 *  - missing or clipped role/title
 *  - broken vertical alignment between portrait and text block
 *  - lost hierarchy between name (headline) and role (accent-ink label)
 *
 * We assert against class names and inline styles because jsdom does not
 * compute layout. The `data-nn-source-card` root and the structural classes
 * below are what the published article HTML and the in-editor TipTap node
 * view both rely on.
 */
describe("SourceCard typography regression", () => {
  const data = {
    name: "Jens Stoltenberg",
    role: "Finansminister (Ap)",
    image_url: "https://example.com/avatar.jpg",
    quote: "Vi må prioritere stramt.",
  };

  it("renders both name and role text", () => {
    const { getByText } = render(<SourceCard data={data} />);
    expect(getByText(data.name)).toBeInTheDocument();
    expect(getByText(data.role)).toBeInTheDocument();
  });

  it("renders a 64x64 portrait with hard size caps to prevent oversize rendering", () => {
    const { container } = render(<SourceCard data={data} />);
    const img = container.querySelector("img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.getAttribute("width")).toBe("64");
    expect(img!.getAttribute("height")).toBe("64");
    expect(img!.style.width).toBe("64px");
    expect(img!.style.height).toBe("64px");
    // Tailwind caps as defensive fallback against parent prose styles.
    expect(img!.className).toMatch(/!max-w-\[64px\]/);
    expect(img!.className).toMatch(/!max-h-\[64px\]/);
  });

  it("renders a 64px placeholder when no image_url is provided", () => {
    const { container } = render(<SourceCard data={{ ...data, image_url: null }} />);
    expect(container.querySelector("img")).toBeNull();
    const placeholder = container.querySelector(".w-16.h-16");
    expect(placeholder).not.toBeNull();
  });

  it("vertically centers portrait and text against each other", () => {
    const { container } = render(<SourceCard data={data} />);
    const row = container.querySelector("[data-nn-source-card] > div") as HTMLElement;
    expect(row.className).toMatch(/items-stretch/);
    // Portrait wrapper and text block must both opt into self-center so
    // they always align to the row's midline regardless of name wrapping.
    const children = Array.from(row.children) as HTMLElement[];
    expect(children).toHaveLength(2);
    children.forEach((child) => {
      expect(child.className).toMatch(/self-center/);
    });
  });

  it("keeps clear hierarchy: serif headline name, calm accent-ink role", () => {
    const { getByText } = render(<SourceCard data={data} />);
    const name = getByText(data.name);
    const role = getByText(data.role);

    expect(name.className).toMatch(/font-headline/);
    expect(name.className).toMatch(/font-bold/);
    expect(name.className).toMatch(/text-headline/);

    // Rolig etikett: normal case, tekst-trygg accent-ink — uppercase-eyebrows
    // er et anti-mønster (DESIGN.md), hierarkiet bæres av serif-kontrasten.
    expect(role.className).not.toMatch(/uppercase/);
    expect(role.className).toMatch(/text-accent-ink/);
    // Role should not visually outweigh the name.
    expect(role.className).not.toMatch(/font-bold/);
  });

  it("does not apply text-clipping utilities to name or role", () => {
    const { getByText } = render(<SourceCard data={data} />);
    const name = getByText(data.name);
    const role = getByText(data.role);
    [name, role].forEach((el) => {
      expect(el.className).not.toMatch(/truncate/);
      expect(el.className).not.toMatch(/line-clamp-/);
      expect(el.className).not.toMatch(/whitespace-nowrap/);
      expect(el.className).not.toMatch(/overflow-hidden/);
    });
  });

  it("renders the optional quote with a 1px neutral border (no accent stripe)", () => {
    const { container } = render(<SourceCard data={data} />);
    const quote = container.querySelector("blockquote");
    expect(quote).not.toBeNull();
    expect(quote!.textContent).toContain(data.quote);
    // Fargede side-striper >1px er bannlyst (DESIGN.md) — 1px nøytral kant.
    expect(quote!.className).toMatch(/border-l(?!-)/);
    expect(quote!.className).not.toMatch(/border-l-2/);
    expect(quote!.className).toMatch(/border-border/);
  });

  it("omits the role paragraph entirely when role is missing (no empty gap)", () => {
    const { container } = render(<SourceCard data={{ ...data, role: undefined }} />);
    const paragraphs = container.querySelectorAll("[data-nn-source-card] p");
    expect(paragraphs.length).toBe(1);
  });
});