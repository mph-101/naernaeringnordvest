import { describe, it, expect } from "vitest";
import {
  resolveMrKommuneFromText,
  applyMrKommune,
  MR_KOMMUNER,
  MR_KOMMUNE_NUMBERS,
} from "../../../supabase/functions/articles-chat/mr-kommuner";

describe("resolveMrKommuneFromText", () => {
  it("covers all 27 Møre og Romsdal kommuner", () => {
    expect(MR_KOMMUNER).toHaveLength(27);
    expect(MR_KOMMUNE_NUMBERS).toHaveLength(27);
    expect(MR_KOMMUNE_NUMBERS).toContain("1508"); // Ålesund (current code)
    expect(MR_KOMMUNE_NUMBERS).not.toContain("1507"); // stale Ålesund code
  });

  it("resolves a kommune named in the question", () => {
    expect(resolveMrKommuneFromText("hvor mange konkurser i Ulstein siste året")?.nummer).toBe("1516");
    expect(resolveMrKommuneFromText("nyetableringer i Volda")?.nummer).toBe("1577");
  });

  it("uses the current Ålesund code 1508, not the stale 1507", () => {
    expect(resolveMrKommuneFromText("næringslivet i Ålesund")?.nummer).toBe("1508");
  });

  it("resolves Herøy to MR (1515), not Nordland (1818)", () => {
    expect(resolveMrKommuneFromText("bedrifter i Herøy")?.nummer).toBe("1515");
  });

  it("matches whole words only — 'fjorden' is not 'Fjord'", () => {
    expect(resolveMrKommuneFromText("selskaper langs fjorden")).toBeNull();
    expect(resolveMrKommuneFromText("kommunen Fjord")?.nummer).toBe("1578");
  });

  it("returns null when no MR kommune is mentioned", () => {
    expect(resolveMrKommuneFromText("omsetning for Equinor")).toBeNull();
    expect(resolveMrKommuneFromText("")).toBeNull();
  });
});

describe("applyMrKommune", () => {
  it("fills kommunenummer into kommune-less BRREG queries and the Tall plan", () => {
    const brreg = [{ params: { sort: "antallAnsatte,desc" } }];
    const tall = { bankruptcies: true, kommunenummer: "" };
    const mr = applyMrKommune(brreg, tall, "største selskaper i Sunndal");
    expect(mr?.nummer).toBe("1563");
    expect(brreg[0].params.kommunenummer).toBe("1563");
    expect(tall.kommunenummer).toBe("1563");
  });

  it("does not overwrite a kommunenummer the planner already set", () => {
    const brreg = [{ params: { kommunenummer: "0301" } }];
    const tall = { kommunenummer: "0301" };
    applyMrKommune(brreg, tall, "selskaper i Molde"); // Molde = 1506
    expect(brreg[0].params.kommunenummer).toBe("0301");
    expect(tall.kommunenummer).toBe("0301");
  });

  it("is a no-op and returns null when no MR kommune is named", () => {
    const brreg = [{ params: {} as Record<string, string> }];
    const tall = { kommunenummer: "" };
    expect(applyMrKommune(brreg, tall, "Equinor sitt resultat")).toBeNull();
    expect(brreg[0].params.kommunenummer).toBeUndefined();
    expect(tall.kommunenummer).toBe("");
  });

  it("tolerates null brreg / null tall", () => {
    expect(() => applyMrKommune(null, null, "konkurser i Rauma")).not.toThrow();
    expect(applyMrKommune(null, null, "konkurser i Rauma")?.nummer).toBe("1539");
  });
});
