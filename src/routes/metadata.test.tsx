import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DocumentationTitle } from "./metadata";

describe("DocumentationTitle", () => {
  it("sets a static documentation title", () => {
    render(<DocumentationTitle />);
    expect(document.title).toContain("Documentation");
  });
});
