import { describe, it, expect } from "vitest";
import { searchElements } from "./elementSearch";

const AVAILABLE = ["Fe", "Co", "Cu"]; // API-supported subset for tests

const symbols = (q: string, opts: { available: string[]; selected: string[] }) =>
  searchElements(q, opts).map((m) => m.symbol);

describe("searchElements", () => {
  it("ranks an exact symbol match first", () => {
    const matches = searchElements("cu", { available: AVAILABLE, selected: [] });
    expect(matches[0]).toMatchObject({ symbol: "Cu", name: "Copper", available: true });
  });

  it("tags matches the API does not support as unavailable", () => {
    const matches = searchElements("cu", { available: AVAILABLE, selected: [] });
    // Curium matches 'cu' by name but is not in AVAILABLE.
    expect(matches.find((m) => m.symbol === "Cm")).toMatchObject({ available: false });
    expect(matches.find((m) => m.symbol === "Cu")).toMatchObject({ available: true });
  });

  it("matches by element name as well as symbol", () => {
    expect(symbols("copper", { available: AVAILABLE, selected: [] })).toContain("Cu");
  });

  it("orders alphabetically by symbol within a tier, regardless of availability", () => {
    // All 'C…' symbols match by prefix; only Co/Cu are available but order is purely alphabetical.
    const prefix = symbols("c", { available: AVAILABLE, selected: [] }).slice(0, 12);
    expect(prefix).toEqual(["C", "Ca", "Cd", "Ce", "Cf", "Cl", "Cm", "Cn", "Co", "Cr", "Cs", "Cu"]);
  });

  it("excludes already-selected elements", () => {
    expect(symbols("cu", { available: AVAILABLE, selected: ["Cu"] })).not.toContain("Cu");
  });

  it("excludes the lanthanide/actinide placeholders", () => {
    const result = symbols("lanthan", { available: AVAILABLE, selected: [] });
    expect(result).toContain("La"); // real element matches by name
    expect(result).not.toContain("*");
    expect(result).not.toContain("**");
  });

  it("returns all non-selected elements alphabetically for an empty query", () => {
    const result = symbols("  ", { available: AVAILABLE, selected: ["H"] });
    expect(result).not.toContain("H");
    expect(result).not.toContain("*");
    expect(result.length).toBeGreaterThan(100);
    expect(result).toEqual([...result].sort((a, b) => a.localeCompare(b)));
  });
});
