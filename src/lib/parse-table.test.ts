import { describe, it, expect } from "vitest";
import { parseTable } from "./parse-table";

describe("parseTable", () => {
  describe("delimiter detection", () => {
    it("detects tab delimiter (Excel paste)", () => {
      const result = parseTable("År\tOmsetning\n2023\t12,5");
      expect(result?.delimiter).toBe("\t");
      expect(result?.headers).toEqual(["År", "Omsetning"]);
    });

    it("detects semicolon delimiter (European CSV)", () => {
      const result = parseTable("År;Omsetning\n2023;12,5");
      expect(result?.delimiter).toBe(";");
    });

    it("detects comma delimiter (standard CSV)", () => {
      const result = parseTable("Year,Revenue\n2023,12.5");
      expect(result?.delimiter).toBe(",");
    });
  });

  describe("number formats", () => {
    it("parses English decimals (12.5)", () => {
      const result = parseTable("Year\tRevenue\n2023\t12.5\n2024\t21.4");
      expect(result?.rows[0][1]).toBe(12.5);
      expect(result?.rows[1][1]).toBe(21.4);
    });

    it("parses Norwegian decimals (12,5)", () => {
      const result = parseTable("År\tOmsetning\n2023\t12,5\n2024\t21,4");
      expect(result?.rows[0][1]).toBe(12.5);
      expect(result?.rows[1][1]).toBe(21.4);
    });

    it("parses mixed format with comma decimal and dot thousands (1.234,56)", () => {
      const result = parseTable("År\tBeløp\n2023\t1.234,56");
      expect(result?.rows[0][1]).toBe(1234.56);
    });

    it("parses mixed format with dot decimal and comma thousands (1,234.56)", () => {
      const result = parseTable("Year\tAmount\n2023\t1,234.56");
      expect(result?.rows[0][1]).toBe(1234.56);
    });

    it("parses negative numbers", () => {
      const result = parseTable("År\tResultat\n2023\t-1234,5\n2024\t-12.5");
      expect(result?.rows[0][1]).toBe(-1234.5);
      expect(result?.rows[1][1]).toBe(-12.5);
    });
  });

  describe("thousands separators", () => {
    it("treats space as thousands separator (1 234 567)", () => {
      const result = parseTable("År\tOmsetning\n2023\t1 234 567");
      expect(result?.rows[0][1]).toBe(1234567);
    });

    it("treats non-breaking space as thousands separator", () => {
      const result = parseTable("År\tOmsetning\n2023\t1\u00A0234\u00A0567");
      expect(result?.rows[0][1]).toBe(1234567);
    });

    it("treats multiple dots as thousands separators (1.234.567)", () => {
      const result = parseTable("År\tOmsetning\n2023\t1.234.567");
      expect(result?.rows[0][1]).toBe(1234567);
    });

    it("keeps single dot as English decimal (1234.5)", () => {
      const result = parseTable("Year\tRevenue\n2023\t1234.5");
      expect(result?.rows[0][1]).toBe(1234.5);
    });

    it("treats space + Norwegian decimal correctly (1 234,56)", () => {
      const result = parseTable("År\tBeløp\n2023\t1 234,56");
      expect(result?.rows[0][1]).toBe(1234.56);
    });
  });

  describe("percentages", () => {
    it("parses percentage with English decimal (12.5%)", () => {
      const result = parseTable("Kategori\tAndel\nA\t12.5%");
      expect(result?.rows[0][1]).toBe(12.5);
    });

    it("parses percentage with Norwegian decimal (12,5%)", () => {
      const result = parseTable("Kategori\tAndel\nA\t12,5%");
      expect(result?.rows[0][1]).toBe(12.5);
    });

    it("parses integer percentage (45%)", () => {
      const result = parseTable("Kategori\tAndel\nA\t45%");
      expect(result?.rows[0][1]).toBe(45);
    });
  });

  describe("non-numeric values", () => {
    it("preserves text in cells", () => {
      const result = parseTable("Navn\tBy\nKari\tOslo\nOla\tBergen");
      expect(result?.rows[0][0]).toBe("Kari");
      expect(result?.rows[0][1]).toBe("Oslo");
    });

    it("preserves year strings as numbers when bare", () => {
      const result = parseTable("År\tVerdi\n2023\t100");
      expect(result?.rows[0][0]).toBe(2023);
      expect(result?.rows[0][1]).toBe(100);
    });

    it("returns empty string for empty cells", () => {
      const result = parseTable("A\tB\n1\t");
      expect(result?.rows[0][1]).toBe("");
    });
  });

  describe("quoted CSV values", () => {
    it("handles quoted fields with embedded commas", () => {
      const result = parseTable('Name,City\n"Smith, John",Oslo');
      expect(result?.rows[0][0]).toBe("Smith, John");
      expect(result?.rows[0][1]).toBe("Oslo");
    });

    it("handles escaped double quotes inside quoted fields", () => {
      const result = parseTable('A,B\n"He said ""hi""",1');
      expect(result?.rows[0][0]).toBe('He said "hi"');
    });
  });

  describe("edge cases", () => {
    it("returns null for empty input", () => {
      expect(parseTable("")).toBeNull();
      expect(parseTable("   ")).toBeNull();
    });

    it("returns null when only header row is present", () => {
      expect(parseTable("A\tB")).toBeNull();
    });

    it("pads short rows to header length", () => {
      const result = parseTable("A\tB\tC\n1\t2");
      expect(result?.rows[0]).toEqual([1, 2, ""]);
    });

    it("trims rows longer than header to header length", () => {
      const result = parseTable("A\tB\n1\t2\t3");
      expect(result?.rows[0]).toEqual([1, 2]);
    });

    it("handles \\r\\n line endings", () => {
      const result = parseTable("A\tB\r\n1\t2\r\n3\t4");
      expect(result?.rowCount).toBe(2);
      expect(result?.rows[1]).toEqual([3, 4]);
    });

    it("ignores blank lines", () => {
      const result = parseTable("A\tB\n\n1\t2\n\n3\t4\n");
      expect(result?.rowCount).toBe(2);
    });

    it("fills empty header cells with 'Kolonne'", () => {
      const result = parseTable("A\t\tC\n1\t2\t3");
      expect(result?.headers).toEqual(["A", "Kolonne", "C"]);
    });
  });

  describe("real-world fixture: regnskap (Norwegian financials)", () => {
    it("parses a multi-year revenue table with NOK formatting", () => {
      const input =
        "År\tOmsetning\tResultat\n" +
        "2020\t12,5\t1,2\n" +
        "2021\t14,1\t1,8\n" +
        "2022\t16,3\t2,1\n" +
        "2023\t18,9\t2,7\n" +
        "2024\t21,4\t3,4";
      const result = parseTable(input);
      expect(result?.rowCount).toBe(5);
      expect(result?.columnCount).toBe(3);
      expect(result?.rows.map((r) => r[1])).toEqual([12.5, 14.1, 16.3, 18.9, 21.4]);
    });
  });
});
