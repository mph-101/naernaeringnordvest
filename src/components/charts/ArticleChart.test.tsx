import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { ArticleChart, type ChartData, type ChartType } from "./ArticleChart";

// Mock the logo import so tests don't depend on asset resolution
vi.mock("@/assets/logo.png", () => ({ default: "logo.png" }));

// Recharts uses ResponsiveContainer which needs dimensions in jsdom.
// Stub it to render children directly with a fixed size.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 320 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

beforeAll(() => {
  // Recharts internals occasionally probe these
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
});

const baseSource = "Kilde: SSB (2024)";

const fixtures: Record<ChartType, ChartData> = {
  bar: {
    type: "bar",
    title: "Omsetning per region",
    subtitle: "Millioner kroner",
    source: baseSource,
    xAxisLabel: "Region",
    yAxisLabel: "MNOK",
    headers: ["Region", "Omsetning"],
    rows: [
      ["Møre", 1200],
      ["Vestland", 2100],
      ["Trøndelag", 980],
    ],
  },
  line: {
    type: "line",
    title: "Vekst over tid",
    source: baseSource,
    xAxisLabel: "År",
    yAxisLabel: "Indeks",
    headers: ["År", "Selskap A", "Selskap B"],
    rows: [
      ["2020", 100, 90],
      ["2021", 110, 95],
      ["2022", 125, 105],
      ["2023", 140, 120],
    ],
  },
  area: {
    type: "area",
    title: "Akkumulert vekst",
    source: baseSource,
    headers: ["År", "Verdi"],
    rows: [
      ["2020", 100],
      ["2021", 130],
      ["2022", 170],
    ],
  },
  pie: {
    type: "pie",
    title: "Markedsandeler",
    source: baseSource,
    headers: ["Aktør", "Andel"],
    rows: [
      ["Aktør A", 45],
      ["Aktør B", 30],
      ["Aktør C", 25],
    ],
  },
  scatter: {
    type: "scatter",
    title: "Ansatte vs omsetning",
    source: baseSource,
    xAxisLabel: "Ansatte",
    yAxisLabel: "Omsetning (MNOK)",
    headers: ["Ansatte", "Omsetning"],
    rows: [
      [10, 12],
      [25, 40],
      [50, 90],
      [120, 250],
    ],
  },
  stackedBar: {
    type: "stackedBar",
    title: "Sammensatt omsetning",
    source: baseSource,
    headers: ["År", "Produkt", "Tjeneste"],
    rows: [
      ["2021", 200, 150],
      ["2022", 240, 180],
      ["2023", 290, 220],
    ],
  },
  horizontalBar: {
    type: "horizontalBar",
    title: "Topp 5 selskaper",
    source: baseSource,
    xAxisLabel: "MNOK",
    headers: ["Selskap", "Omsetning"],
    rows: [
      ["Acme", 540],
      ["Bravo", 480],
      ["Charlie", 410],
      ["Delta", 360],
      ["Echo", 310],
    ],
  },
};

describe("ArticleChart snapshots", () => {
  (Object.keys(fixtures) as ChartType[]).forEach((type) => {
    it(`matches snapshot for ${type}`, () => {
      const { container } = render(<ArticleChart data={fixtures[type]} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it("renders title, subtitle and source in the figure caption", () => {
    const { getByText } = render(<ArticleChart data={fixtures.bar} />);
    expect(getByText("Omsetning per region")).toBeInTheDocument();
    expect(getByText("Millioner kroner")).toBeInTheDocument();
    expect(getByText(baseSource)).toBeInTheDocument();
  });

  it("returns null when headers or rows are empty", () => {
    const { container } = render(
      <ArticleChart data={{ ...fixtures.bar, headers: [], rows: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
