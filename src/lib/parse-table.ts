/**
 * Lightweight CSV / TSV parser tailored for chart input pasted from
 * Excel, Google Sheets, or plain CSV files. Auto-detects delimiter
 * (tab > semicolon > comma), strips wrapping quotes, and normalises
 * Norwegian decimal commas (e.g. "1 234,5" -> 1234.5) when the value
 * looks numeric.
 */

export interface ParsedTable {
  headers: string[];
  rows: (string | number)[][];
  delimiter: "\t" | ";" | ",";
  rowCount: number;
  columnCount: number;
}

const detectDelimiter = (sample: string): "\t" | ";" | "," => {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (tabs >= Math.max(semis, commas) && tabs > 0) return "\t";
  if (semis >= commas && semis > 0) return ";";
  return ",";
};

const splitLine = (line: string, delim: string): string[] => {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((c) => c.trim());
};

const coerceCell = (raw: string): string | number => {
  if (raw === "" || raw == null) return "";
  const trimmed = raw.trim();
  const isPct = trimmed.endsWith("%");
  const core = (isPct ? trimmed.slice(0, -1) : trimmed).trim();

  // Strip spaces and non-breaking spaces used as thousands separators
  const noSpaces = core.replace(/[\s\u00A0]/g, "");

  // Determine decimal separator. If both "," and "." appear, the LAST one wins
  // (e.g. "1.234,56" -> ",", "1,234.56" -> "."). If only one appears, decide:
  //   - "," is decimal (Norwegian default)
  //   - "." is decimal IF it has 1-2 occurrences with non-3-digit groupings,
  //     otherwise treat as thousands separator (e.g. "1.234" = 1234).
  let normalised = noSpaces;
  const hasComma = noSpaces.includes(",");
  const hasDot = noSpaces.includes(".");

  if (hasComma && hasDot) {
    const lastComma = noSpaces.lastIndexOf(",");
    const lastDot = noSpaces.lastIndexOf(".");
    if (lastComma > lastDot) {
      // "," is decimal, "." is thousands
      normalised = noSpaces.replace(/\./g, "").replace(",", ".");
    } else {
      // "." is decimal, "," is thousands
      normalised = noSpaces.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Treat "," as decimal separator
    normalised = noSpaces.replace(/,/g, ".");
  } else if (hasDot) {
    // Single dot — keep as-is (English decimal). Multiple dots = thousands.
    const dotCount = (noSpaces.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalised = noSpaces.replace(/\./g, "");
    }
  }

  if (/^-?\d+(\.\d+)?$/.test(normalised)) {
    const n = Number(normalised);
    if (!isNaN(n)) return isPct ? n : n;
  }
  return raw;
};

export const parseTable = (input: string): ParsedTable | null => {
  const text = (input || "").trim();
  if (!text) return null;

  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const headers = splitLine(lines[0], delimiter).map((h) => h || "Kolonne");
  const rows = lines.slice(1).map((line) => {
    const parts = splitLine(line, delimiter);
    // Normalise length to header count
    while (parts.length < headers.length) parts.push("");
    return parts.slice(0, headers.length).map(coerceCell);
  });

  return {
    headers,
    rows,
    delimiter,
    rowCount: rows.length,
    columnCount: headers.length,
  };
};
