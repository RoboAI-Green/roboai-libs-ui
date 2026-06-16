import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JobStatsResponse } from "@/lib/api";
import { QueueHint } from "./QueueHint";

const stats = (
  you: Partial<JobStatsResponse["you"]> = {},
  system: Partial<JobStatsResponse["system"]> = {},
): JobStatsResponse => ({
  you: { queued: 0, running: 1, max_running: 2, max_active: 8, ...you },
  system: { queued: 0, running: 0, ...system },
});

describe("QueueHint", () => {
  it("renders the label and info icon before stats arrive, so the line never jumps", () => {
    const { container } = render(<QueueHint />);
    expect(container.textContent).toMatch(/Server load/);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    // no numbers yet
    expect(container.textContent).not.toMatch(/queued/);
  });

  it("always shows server load, even when the cluster is idle", () => {
    const { container } = render(<QueueHint stats={stats({}, { queued: 0, running: 0 })} />);
    // label and numbers are separate spans (flex gap), so textContent has no space
    // between the colon and the count.
    expect(container.textContent).toMatch(/Server load:\s*0 queued,\s*0 running/);
  });

  it("reflects the current server load", () => {
    const { container } = render(<QueueHint stats={stats({}, { queued: 5, running: 3 })} />);
    expect(container.textContent).toMatch(/Server load:\s*5 queued,\s*3 running/);
  });

  it("carries the not-a-position caveat behind the info icon", () => {
    render(<QueueHint stats={stats()} />);
    expect(screen.getByRole("tooltip").textContent).toMatch(/not your position in line/i);
  });

  it("appends the caller's runs only when they are paced", () => {
    // queued > 0 -> paced
    const queued = render(<QueueHint stats={stats({ running: 2, queued: 1 })} />);
    expect(queued.container.textContent).toMatch(/your runs: 2\/2 \(1 queued\)/);
    queued.unmount();

    // at the running cap with nothing queued is still paced
    const atCap = render(<QueueHint stats={stats({ running: 2, queued: 0 })} />);
    expect(atCap.container.textContent).toMatch(/your runs: 2\/2 \(0 queued\)/);
    atCap.unmount();

    // an unpaced single run shows server load only, no personal stats
    const unpaced = render(<QueueHint stats={stats({ running: 1, queued: 0 })} />);
    expect(unpaced.container.textContent).not.toMatch(/your runs/);
  });
});
