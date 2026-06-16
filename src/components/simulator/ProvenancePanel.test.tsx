import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProvenancePanel } from "./ProvenancePanel";

describe("ProvenancePanel", () => {
  it("shows the engine version, the linked ASD release, and instrument settings", () => {
    render(
      <ProvenancePanel
        info={{
          version: "0.1.0",
          asd: { release: "5.12", doi_url: "https://dx.doi.org/10.18434/T4W30F" },
        }}
        fwhmNm={0.1}
        instrumentProfile="gaussian"
      />,
    );
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "NIST ASD 5.12" });
    expect(link).toHaveAttribute("href", "https://dx.doi.org/10.18434/T4W30F");
    expect(screen.getByText(/gaussian/i)).toBeInTheDocument();
  });

  it("links the NIST release to its DOI and omits the snapshot date", () => {
    render(
      <ProvenancePanel
        info={{
          asd: {
            release: "5.12",
            snapshot_date: "2024-11-07",
            doi_url: "https://dx.doi.org/10.18434/T4W30F",
          },
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "NIST ASD 5.12" })).toBeInTheDocument();
    expect(screen.queryByText(/2024-11-07/)).not.toBeInTheDocument();
  });

  it("renders instrument settings even before the info query resolves", () => {
    render(<ProvenancePanel info={undefined} fwhmNm={0.1} instrumentProfile="lorentzian" />);
    expect(screen.getByText(/lorentzian/i)).toBeInTheDocument();
    // No engine/ASD fields yet, but the strip still shows.
    expect(screen.getByText(/Provenance/i)).toBeInTheDocument();
  });

  it("renders nothing when there is no info and no instrument data", () => {
    const { container } = render(<ProvenancePanel info={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
