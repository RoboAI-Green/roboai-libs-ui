import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { downloadCSV } from "./downloadCSV";

describe("downloadCSV", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let lastBlob: Blob | undefined;

  beforeEach(() => {
    lastBlob = undefined;
    createObjectURL = vi.fn((blob: Blob) => {
      lastBlob = blob;
      return "blob:mock";
    });
    revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("joins rows into comma/newline CSV inside a text/csv Blob", async () => {
    downloadCSV("out.csv", [
      ["wavelength_nm", "intensity"],
      [400, 1.5],
      [401, 2.25],
    ]);

    expect(lastBlob?.type).toBe("text/csv");
    expect(await lastBlob?.text()).toBe("wavelength_nm,intensity\n400,1.5\n401,2.25");
  });

  it("downloads under the given filename via a clicked anchor", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    const created: HTMLAnchorElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "a") created.push(el as HTMLAnchorElement);
      return el;
    });

    downloadCSV("spectrum.csv", [["a"], [1]]);

    expect(created).toHaveLength(1);
    expect(created[0].getAttribute("download")).toBe("spectrum.csv");
    expect(click).toHaveBeenCalledOnce();
  });

  it("revokes the object URL after clicking", () => {
    downloadCSV("x.csv", [["a"]]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
