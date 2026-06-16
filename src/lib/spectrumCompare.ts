import { MAX_WAVELENGTH_POINTS } from "@/lib/simulatorParams";

const MIN_SCALE = 1e-6;
const MAX_SCALE = 1e6;

export interface ComparableSpectrum {
  name: string;
  wavelength_nm: number[];
  intensity: number[];
  meta: {
    point_count: number;
    range_min_nm: number;
    range_max_nm: number;
    converted_from_angstrom: boolean;
  };
}

interface HeaderInfo {
  wavelengthIndex: number;
  intensityIndex: number;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  apos: "'",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    const key = entity.toLowerCase();
    if (key[0] === "#") {
      const radix = key[1] === "x" ? 16 : 10;
      const value = Number.parseInt(key.slice(radix === 16 ? 2 : 1), radix);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    }
    return HTML_ENTITIES[key] ?? "";
  });
}

function textFromMaybeHtml(text: string) {
  let selected = text;
  const preMatch = text.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) selected = preMatch[1];
  selected = selected
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|table|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(selected);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let idx = 0; idx < line.length; idx += 1) {
    const char = line[idx];
    if (char === '"') {
      if (quoted && line[idx + 1] === '"') {
        cell += '"';
        idx += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function splitDelimitedLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes("|")) return line.split("|");
  if (line.includes(";")) return line.split(";");
  if (line.includes(",")) return parseCsvLine(line);
  return line.trim().split(/\s+/);
}

function parseNumberToken(token: unknown) {
  if (token == null) return null;
  const cleaned = String(token)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .replace(/,/g, "");
  if (!cleaned || /[a-df-z]/i.test(cleaned.replace(/[eE][+-]?\d+$/, ""))) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function extractNumericValues(line: string) {
  const matches = line.match(
    /[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g,
  );
  if (!matches) return [];
  return matches.map(parseNumberToken).filter(isFiniteNumber);
}

function isWavelengthHeader(line: string) {
  const lower = line.toLowerCase();
  return lower.includes("wavelength") || lower.includes("lambda") || /\bwl\b/.test(lower);
}

function findHeaderInfo(line: string): HeaderInfo {
  const labels = splitDelimitedLine(line).map((cell) => cell.trim().toLowerCase());
  const wavelengthIndex = labels.findIndex(
    (label) => label.includes("wavelength") || label.includes("lambda") || /^wl\b/.test(label),
  );
  const sumIndex = labels.findIndex((label) => label === "sum" || label.startsWith("sum "));
  const intensityIndex = labels.findIndex(
    (label) => label.includes("intensity") || label.includes("flux") || label.includes("signal"),
  );
  return {
    wavelengthIndex: wavelengthIndex >= 0 ? wavelengthIndex : 0,
    intensityIndex: sumIndex >= 0 ? sumIndex : intensityIndex >= 0 ? intensityIndex : 1,
  };
}

function rowFromDelimitedCells(line: string, headerInfo: HeaderInfo) {
  const cells = splitDelimitedLine(line);
  const wavelength = parseNumberToken(cells[headerInfo.wavelengthIndex]);
  const intensity = parseNumberToken(cells[headerInfo.intensityIndex]);
  if (isFiniteNumber(wavelength) && isFiniteNumber(intensity)) {
    return [wavelength, intensity] as const;
  }
  return null;
}

function rowFromLine(line: string, headerInfo: HeaderInfo | null) {
  if (headerInfo) {
    return rowFromDelimitedCells(line, headerInfo);
  }

  const numericValues = extractNumericValues(line);
  if (numericValues.length < 2) return null;
  return [numericValues[0], numericValues[1]] as const;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
}

function clampScale(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function interpolateSorted(xValues: number[], yValues: number[], x: number) {
  if (xValues.length < 2 || x < xValues[0] || x > xValues[xValues.length - 1]) return null;
  let lo = 0;
  let hi = xValues.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (xValues[mid] <= x) lo = mid;
    else hi = mid;
  }
  const x0 = xValues[lo];
  const x1 = xValues[hi];
  const y0 = yValues[lo];
  const y1 = yValues[hi];
  if (x1 === x0) return y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

function normalizeRows(rows: readonly (readonly [number, number])[], sourceName: string) {
  if (rows.length < 2) {
    throw new Error(`${sourceName} must contain at least two wavelength/intensity rows.`);
  }
  if (rows.length > MAX_WAVELENGTH_POINTS) {
    throw new Error(
      `${sourceName} has ${rows.length} points; the browser upload limit is ${MAX_WAVELENGTH_POINTS}.`,
    );
  }

  let wavelengthValues = rows.map((row) => row[0]);
  const medianWavelength = median(wavelengthValues);
  const convertedFromAngstrom = medianWavelength > 1000;
  if (convertedFromAngstrom) {
    wavelengthValues = wavelengthValues.map((value) => value / 10);
  }

  const paired = rows
    .map((row, idx) => ({ wavelength: wavelengthValues[idx], intensity: row[1] }))
    .filter((row) => Number.isFinite(row.wavelength) && Number.isFinite(row.intensity))
    .sort((a, b) => a.wavelength - b.wavelength);

  if (paired.length < 2) {
    throw new Error(`${sourceName} does not contain enough finite wavelength/intensity values.`);
  }

  return {
    name: sourceName,
    wavelength_nm: paired.map((row) => row.wavelength),
    intensity: paired.map((row) => row.intensity),
    meta: {
      point_count: paired.length,
      range_min_nm: paired[0].wavelength,
      range_max_nm: paired[paired.length - 1].wavelength,
      converted_from_angstrom: convertedFromAngstrom,
    },
  } satisfies ComparableSpectrum;
}

export function parseComparableSpectrumText(
  text: string,
  sourceName = "Pasted",
): ComparableSpectrum {
  const plainText = textFromMaybeHtml(text);
  const lines = plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  if (lines.length === 0) throw new Error(`${sourceName} is empty.`);

  const hasWavelengthHeader = lines.some(isWavelengthHeader);
  let tableStarted = !hasWavelengthHeader;
  let headerInfo: HeaderInfo | null = null;
  const rows: (readonly [number, number])[] = [];

  for (const line of lines) {
    if (isWavelengthHeader(line)) {
      tableStarted = true;
      headerInfo = findHeaderInfo(line);
      continue;
    }
    if (!tableStarted) continue;

    const row = rowFromLine(line, headerInfo);
    if (row) rows.push(row);
  }

  return normalizeRows(rows, sourceName);
}

export async function parseComparableSpectrumFile(file: File) {
  return parseComparableSpectrumText(await file.text(), file.name || "Uploaded spectrum");
}

export function estimateComparisonScale(
  simulatedWavelengthNm: readonly number[],
  simulatedIntensity: readonly number[],
  comparisonWavelengthNm: readonly number[],
  comparisonIntensity: readonly number[],
) {
  const simulatedRows = simulatedWavelengthNm
    .map((wavelength, idx) => [Number(wavelength), Number(simulatedIntensity[idx])] as const)
    .filter(([wavelength, intensity]) => Number.isFinite(wavelength) && Number.isFinite(intensity))
    .sort((a, b) => a[0] - b[0]);
  const comparisonRows = comparisonWavelengthNm
    .map((wavelength, idx) => [Number(wavelength), Number(comparisonIntensity[idx])] as const)
    .filter(([wavelength, intensity]) => Number.isFinite(wavelength) && Number.isFinite(intensity));

  if (simulatedRows.length < 2 || comparisonRows.length < 2) return 1;

  const simWavelengths = simulatedRows.map((row) => row[0]);
  const simIntensities = simulatedRows.map((row) => Math.max(0, row[1]));

  let simulatedMaxInOverlap = 0;
  let comparisonMaxInOverlap = 0;
  let matched = 0;

  for (const [wavelength, intensity] of comparisonRows) {
    const simAtWavelength = interpolateSorted(simWavelengths, simIntensities, wavelength);
    if (simAtWavelength == null) continue;
    simulatedMaxInOverlap = Math.max(simulatedMaxInOverlap, Math.max(0, simAtWavelength));
    comparisonMaxInOverlap = Math.max(comparisonMaxInOverlap, Math.max(0, intensity));
    matched += 1;
  }

  if (matched < 2 || simulatedMaxInOverlap <= 0 || comparisonMaxInOverlap <= 0) return 1;
  return clampScale(simulatedMaxInOverlap / comparisonMaxInOverlap);
}
