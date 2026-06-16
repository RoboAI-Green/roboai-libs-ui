import { describe, it, expect } from "vitest";
import { parseTextGrid, normalizeWavelengthGrid, parseWavelengthGridFile } from "./wavelengthGrid";

/** Encodes a v1 .npy buffer for the given numpy descr (e.g. "<f8") and values. */
function buildNpy(descr: string, values: number[]): Uint8Array<ArrayBuffer> {
  const dict = `{'descr': '${descr}', 'fortran_order': False, 'shape': (${values.length},), }`;
  const pad = (64 - ((10 + dict.length + 1) % 64)) % 64;
  const header = dict + " ".repeat(pad) + "\n";
  const byteSize = parseInt(descr.slice(2), 10);
  const buf = new ArrayBuffer(10 + header.length + values.length * byteSize);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  bytes[0] = 0x93;
  bytes.set(
    [..."NUMPY"].map((c) => c.charCodeAt(0)),
    1,
  );
  bytes[6] = 1;
  view.setUint16(8, header.length, true);
  for (let i = 0; i < header.length; i++) bytes[10 + i] = header.charCodeAt(i);

  const le = descr[0] !== ">";
  const kind = descr[1];
  const start = 10 + header.length;
  values.forEach((v, i) => {
    const off = start + i * byteSize;
    if (kind === "f" && byteSize === 8) view.setFloat64(off, v, le);
    else if (kind === "f" && byteSize === 4) view.setFloat32(off, v, le);
    else if (kind === "i" && byteSize === 4) view.setInt32(off, v, le);
    else if (kind === "i" && byteSize === 2) view.setInt16(off, v, le);
    else if (kind === "u" && byteSize === 4) view.setUint32(off, v, le);
    else if (kind === "u" && byteSize === 2) view.setUint16(off, v, le);
  });
  return bytes;
}

const npyFile = (descr: string, values: number[]) =>
  new File([buildNpy(descr, values)], "grid.npy");

describe("normalizeWavelengthGrid", () => {
  it("accepts a valid ascending grid", () => {
    const result = normalizeWavelengthGrid([400, 401, 402], "test.csv");
    expect(result.wavelengths_nm).toEqual([400, 401, 402]);
    expect(result.meta.point_count).toBe(3);
    expect(result.meta.range_min_nm).toBe(400);
    expect(result.meta.range_max_nm).toBe(402);
  });

  it("auto-reverses a descending grid", () => {
    const result = normalizeWavelengthGrid([402, 401, 400], "test.csv");
    expect(result.wavelengths_nm).toEqual([400, 401, 402]);
  });

  it("throws when fewer than 2 points", () => {
    expect(() => normalizeWavelengthGrid([400], "test.csv")).toThrow();
  });

  it("throws when exceeding 200 000 points", () => {
    const big = Array.from({ length: 200_001 }, (_, i) => i);
    expect(() => normalizeWavelengthGrid(big, "test.csv")).toThrow();
  });

  it("throws when not monotonic (duplicates)", () => {
    expect(() => normalizeWavelengthGrid([400, 401, 401, 402], "test.csv")).toThrow();
  });

  it("computes correct step statistics", () => {
    const result = normalizeWavelengthGrid([400, 401, 403], "test.csv");
    expect(result.meta.step_min_nm).toBe(1);
    expect(result.meta.step_max_nm).toBe(2);
    expect(result.meta.step_median_nm).toBe(1.5);
  });
});

describe("parseWavelengthGridFile (.npy)", () => {
  it("parses little-endian float64 data", async () => {
    const result = await parseWavelengthGridFile(npyFile("<f8", [400, 401, 402]));
    expect(result.wavelengths_nm).toEqual([400, 401, 402]);
  });

  it("parses float32, int32/16, and uint32/16 data identically", async () => {
    for (const descr of ["<f4", "<i4", "<i2", "<u4", "<u2"]) {
      const result = await parseWavelengthGridFile(npyFile(descr, [400, 401, 402]));
      expect(result.wavelengths_nm, descr).toEqual([400, 401, 402]);
    }
  });

  it("rejects big-endian data", async () => {
    await expect(parseWavelengthGridFile(npyFile(">f8", [400, 401, 402]))).rejects.toThrow(
      /big-endian/,
    );
  });

  it("rejects an unsupported dtype", async () => {
    await expect(parseWavelengthGridFile(npyFile("<f2", [400, 401, 402]))).rejects.toThrow(
      /unsupported dtype/,
    );
  });
});

describe("parseTextGrid", () => {
  it("parses comma-separated values", () => {
    const values = parseTextGrid("400,401,402", "test.csv");
    expect(values).toEqual([400, 401, 402]);
  });

  it("parses whitespace-separated values", () => {
    const values = parseTextGrid("400 401 402", "test.csv");
    expect(values).toEqual([400, 401, 402]);
  });

  it("strips # comments", () => {
    const values = parseTextGrid("# comment\n400\n401\n402", "test.csv");
    expect(values).toEqual([400, 401, 402]);
  });

  it("extracts first numeric column from multi-column data", () => {
    const values = parseTextGrid("400 0.1\n401 0.2\n402 0.3", "test.csv");
    expect(values).toEqual([400, 401, 402]);
  });

  it("throws when no numeric data found", () => {
    expect(() => parseTextGrid("no numbers here", "test.csv")).toThrow();
  });
});
