import { MAX_WAVELENGTH_POINTS } from "@/lib/simulatorParams";
import type { WavelengthGrid } from "@/stores/sessionStore";

// Little-endian .npy element readers, keyed by `${kind}${byteSize}`.
const NPY_READERS: Record<string, (view: DataView, offset: number) => number> = {
  f8: (v, o) => v.getFloat64(o, true),
  f4: (v, o) => v.getFloat32(o, true),
  i4: (v, o) => v.getInt32(o, true),
  u4: (v, o) => v.getUint32(o, true),
  i2: (v, o) => v.getInt16(o, true),
  u2: (v, o) => v.getUint16(o, true),
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function normalizeWavelengthGrid(values: number[], sourceName: string): WavelengthGrid {
  const wavelengths = values.map(Number).filter(Number.isFinite);

  if (wavelengths.length < 2)
    throw new Error(`${sourceName} must contain at least 2 wavelength points.`);
  if (wavelengths.length > MAX_WAVELENGTH_POINTS)
    throw new Error(
      `${sourceName} has ${wavelengths.length} points; limit is ${MAX_WAVELENGTH_POINTS}.`,
    );

  let ordered = wavelengths;
  const diffs = (arr: number[]) => arr.slice(1).map((v, i) => v - arr[i]);

  if (diffs(ordered).every((d) => d < 0)) ordered = [...ordered].reverse();

  const steps = diffs(ordered);
  if (!steps.every((d) => d > 0))
    throw new Error(`${sourceName} must be strictly monotonic with no duplicate wavelengths.`);

  return {
    wavelengths_nm: ordered,
    meta: {
      filename: sourceName,
      point_count: ordered.length,
      range_min_nm: ordered[0],
      range_max_nm: ordered[ordered.length - 1],
      step_min_nm: Math.min(...steps),
      step_max_nm: Math.max(...steps),
      step_median_nm: median(steps),
    },
  };
}

function numericToken(s: string): number | null {
  const v = Number(s.trim());
  return Number.isFinite(v) ? v : null;
}

export function parseTextGrid(text: string, sourceName: string): number[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split("#")[0].trim())
    .filter(Boolean)
    .map((line) => line.split(/[\s,;]+/).map(numericToken));

  if (rows.length === 0) throw new Error(`${sourceName} is empty.`);

  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  for (let col = 0; col < maxCols; col++) {
    const vals = rows.map((r) => r[col]).filter((v): v is number => v !== null);
    if (vals.length >= 2) return vals;
  }

  const flat = rows.flat().filter((v): v is number => v !== null);
  if (flat.length >= 2) return flat;
  throw new Error(`${sourceName} must contain at least one numeric wavelength column.`);
}

function parseNpy(buffer: ArrayBuffer, sourceName: string): number[] {
  const bytes = new Uint8Array(buffer);
  const ascii = (start: number, len: number) =>
    new TextDecoder("latin1").decode(new Uint8Array(buffer, start, len));

  if (bytes.length < 12 || bytes[0] !== 0x93 || ascii(1, 5) !== "NUMPY")
    throw new Error(`${sourceName} is not a valid .npy file.`);

  const view = new DataView(buffer);
  const major = view.getUint8(6);
  let headerLen: number, dataOffset: number;
  if (major === 1) {
    headerLen = view.getUint16(8, true);
    dataOffset = 10;
  } else if (major === 2 || major === 3) {
    headerLen = view.getUint32(8, true);
    dataOffset = 12;
  } else throw new Error(`${sourceName} uses unsupported .npy version ${major}.`);

  const header = ascii(dataOffset, headerLen);
  const descrMatch = header.match(/['"]descr['"]\s*:\s*['"]([^'"]+)['"]/);
  if (!descrMatch) throw new Error(`${sourceName} has no readable dtype.`);
  const dtypeMatch = descrMatch[1].match(/^([<>=|])([fiu])(\d+)$/);
  if (!dtypeMatch) throw new Error(`${sourceName} has unsupported dtype ${descrMatch[1]}.`);

  const [, endian, kind, sizeStr] = dtypeMatch;
  const byteSize = parseInt(sizeStr, 10);
  if (endian === ">") throw new Error(`${sourceName} uses big-endian data, not supported.`);

  const shapeMatch = header.match(/['"]shape['"]\s*:\s*\(([^)]*)\)/);
  if (!shapeMatch) throw new Error(`${sourceName} has no readable shape.`);
  const count = shapeMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .reduce((acc, s) => acc * parseInt(s, 10), 1);

  const read = NPY_READERS[`${kind}${byteSize}`];
  if (!read) throw new Error(`${sourceName} has unsupported dtype ${descrMatch[1]}.`);

  const start = dataOffset + headerLen;
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(read(view, start + i * byteSize));
  return values;
}

export async function parseWavelengthGridFile(file: File): Promise<WavelengthGrid> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const values =
    ext === "npy"
      ? parseNpy(await file.arrayBuffer(), file.name)
      : parseTextGrid(await file.text(), file.name);
  return normalizeWavelengthGrid(values, file.name);
}
