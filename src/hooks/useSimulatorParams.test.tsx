import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from "@tanstack/react-router";
import { simulatorSearchSchema } from "@/lib/searchSchema";
import { DEFAULTS } from "@/lib/simulatorParams";
import { useSimulatorParams } from "./useSimulatorParams";

function Probe() {
  const { params, update, reset } = useSimulatorParams();
  return (
    <div>
      <span data-testid="te">{params.te_ev}</span>
      <button onClick={() => update((p) => ({ ...p, te_ev: 2.5 }))}>bump</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  );
}

/** Mount the hook inside a real memory router whose index route ("/") matches
 * the one the hook reads via getRouteApi. */
function renderAt(search = "") {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    validateSearch: simulatorSearchSchema,
    component: Probe,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: [`/${search}`] }),
  });
  render(<RouterProvider router={router} />);
}

describe("useSimulatorParams", () => {
  it("surfaces the URL search as params", async () => {
    renderAt("?te_ev=3");
    expect(await screen.findByTestId("te")).toHaveTextContent("3");
  });

  it("applies a transform to params via update", async () => {
    renderAt("?te_ev=1");
    await userEvent.click(await screen.findByRole("button", { name: "bump" }));
    expect(await screen.findByTestId("te")).toHaveTextContent("2.5");
  });

  it("restores defaults via reset", async () => {
    renderAt("?te_ev=9");
    await userEvent.click(await screen.findByRole("button", { name: "reset" }));
    expect(await screen.findByTestId("te")).toHaveTextContent(String(DEFAULTS.te_ev));
  });
});
