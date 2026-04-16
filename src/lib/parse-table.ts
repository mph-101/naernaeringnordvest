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
  // Try Norwegian numeric: "1 234,56" or "1.234,56" -> 1234.56
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (/^-?\d+(\.\d+)?%?$/.test(cleaned)) {
    const isPct = cleaned.endsWith("%");
    const n = Number(isPct ? cleaned.slice(0, -1) : cleaned);
    if (!isNaN(n)) return n;
  }
  // Plain English numeric: "1234.5"
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    if (!isNaN(n)) return n;
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
