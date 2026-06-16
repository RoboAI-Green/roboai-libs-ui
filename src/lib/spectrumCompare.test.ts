import { describe, expect, it } from "vitest";
import { estimateComparisonScale, parseComparableSpectrumText } from "./spectrumCompare";

describe("spectrumCompare", () => {
  it("parses ordinary wavelength/intensity CSV", () => {
    const ordinary = parseComparableSpectrumText(
      `wavelength_nm,intensity
200,1
201,2
`,
      "ordinary.csv",
    );
    expect(ordinary.wavelength_nm).toEqual([200, 201]);
    expect(ordinary.intensity).toEqual([1, 2]);
  });

  it("parses copied NIST tables and uses Sum as the intensity column", () => {
    const nistTable = parseComparableSpectrumText(
      `Wavelength (nm)\tSum\tNi I\tNi II
280.15\t0\t\t0
281.62\t1,599,000\t1,599,000\t
282.04\t37,910,000\t37,910,000\t
`,
      "nist-copy.txt",
    );
    expect(nistTable.wavelength_nm).toEqual([280.15, 281.62, 282.04]);
    expect(nistTable.intensity).toEqual([0, 1_599_000, 37_910_000]);
  });

  it("parses pipe-delimited NIST-style tables and uses Sum as the intensity column", () => {
    const pipeTable = parseComparableSpectrumText(
      `Wavelength (nm) | Sum        | Ni I (6.8e-02) | Ni II (9.3e-01) | Ni III (6.9e-04) |
     280.15      | 1.478e-8   |                |                 | 1.478e-8         |
     280.22      | 8.606e-8   |                |                 | 8.606e-8         |
     280.29      | 4.428e-7   |                |                 | 4.428e-7         |
`,
      "nist-pipe.txt",
    );
    expect(pipeTable.wavelength_nm).toEqual([280.15, 280.22, 280.29]);
    expect(pipeTable.intensity).toEqual([1.478e-8, 8.606e-8, 4.428e-7]);
  });

  it("does not fall back to free-text number extraction when a header table is malformed", () => {
    expect(() =>
      parseComparableSpectrumText(
        `Wavelength (nm) | Sum
not a data row 280 1
still not a data row 281 2
`,
        "bad-table.txt",
      ),
    ).toThrow(/at least two wavelength\/intensity rows/);
  });

  it("parses NIST CSV saved inside an HTML pre block", () => {
    const html = parseComparableSpectrumText(
      `<html><body><pre>
Wavelength (nm),Sum,Ni I
280.15,0,0
281.62,"1,599,000","1,599,000"
</pre></body></html>`,
      "nist.html",
    );
    expect(html.wavelength_nm).toEqual([280.15, 281.62]);
    expect(html.intensity).toEqual([0, 1_599_000]);
  });

  it("converts Angstrom-looking wavelengths to nm", () => {
    const angstrom = parseComparableSpectrumText(
      `wavelength_A intensity
2800 10
2810 20
`,
      "angstrom.txt",
    );
    expect(angstrom.wavelength_nm).toEqual([280, 281]);
    expect(angstrom.meta.converted_from_angstrom).toBe(true);
  });

  it("rejects non-spectrum text", () => {
    expect(() => parseComparableSpectrumText("not a spectrum", "bad.txt")).toThrow(
      /at least two wavelength\/intensity rows/,
    );
  });

  it("matches the highest peaks in the overlapping wavelength range", () => {
    expect(
      estimateComparisonScale([200, 201, 202], [0, 10, 0], [200, 201, 202], [0, 1000, 0]),
    ).toBe(0.01);
  });

  it("ignores non-overlapping comparison peaks when estimating scale", () => {
    const scale = estimateComparisonScale(
      [200, 201, 202],
      [0, 5, 10],
      [200, 201, 202, 300],
      [0, 1000, 1000, 1_000_000],
    );
    expect(scale).toBe(0.01);
  });

  it("returns scale 1 when the spectra do not overlap", () => {
    expect(estimateComparisonScale([200, 201], [1, 2], [300, 301], [1, 2])).toBe(1);
  });
});
