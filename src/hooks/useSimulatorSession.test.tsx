import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/sessionStore";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from "@tanstack/react-router";
import { simulatorSearchSchema } from "@/lib/searchSchema";
import { useSimulatorSession } from "./useSimulatorSession";

function Probe() {
  const s = useSimulatorSession();
  return (
    <div>
      <span data-testid="canRun">{String(s.canRun)}</span>
      <span data-testid="elements">{s.params.elements.join(",")}</span>
      <span data-testid="committed-elements">{s.committed?.params.elements.join(",") ?? ""}</span>
      <span data-testid="committed-grid">{s.committed?.grid?.length ?? 0}</span>
      <button onClick={() => s.update((p) => ({ ...p, elements: ["Ni"], proportions: { Ni: 1 } }))}>
        add
      </button>
      <button onClick={() => s.run()}>run</button>
      <button onClick={() => s.reset()}>reset</button>
    </div>
  );
}

function renderSession(search = "") {
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
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("useSimulatorSession", () => {
  beforeEach(() => useSessionStore.setState({ wavelengthGrid: null }));

  it("is not run-ready with no elements, and becomes ready once one is added", async () => {
    renderSession();
    expect(await screen.findByTestId("canRun")).toHaveTextContent("false");
    await userEvent.click(screen.getByRole("button", { name: "add" }));
    expect(await screen.findByTestId("canRun")).toHaveTextContent("true");
  });

  it("run() commits the current params and the current wavelength grid", async () => {
    useSessionStore.setState({
      wavelengthGrid: {
        wavelengths_nm: [400, 401],
        meta: {
          filename: "g.csv",
          point_count: 2,
          range_min_nm: 400,
          range_max_nm: 401,
          step_min_nm: 1,
          step_max_nm: 1,
          step_median_nm: 1,
        },
      },
    });
    renderSession();
    await userEvent.click(await screen.findByRole("button", { name: "add" }));
    await userEvent.click(screen.getByRole("button", { name: "run" }));
    expect(await screen.findByTestId("committed-elements")).toHaveTextContent("Ni");
    expect(screen.getByTestId("committed-grid")).toHaveTextContent("2");
  });

  it("does not commit a dynamic run that exceeds the interactive wavelength limit", async () => {
    renderSession("?mode=dynamic&resolution_nm=0.05");
    await userEvent.click(await screen.findByRole("button", { name: "add" }));
    expect(await screen.findByTestId("canRun")).toHaveTextContent("false");
    await userEvent.click(screen.getByRole("button", { name: "run" }));
    expect(screen.getByTestId("committed-elements").textContent).toBe("");
  });

  it("reset() clears the committed run and restores default params", async () => {
    renderSession();
    await userEvent.click(await screen.findByRole("button", { name: "add" }));
    await userEvent.click(screen.getByRole("button", { name: "run" }));
    expect(screen.getByTestId("committed-elements")).toHaveTextContent("Ni");

    await userEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByTestId("elements").textContent).toBe(""); // defaults: no elements
    expect(screen.getByTestId("committed-elements").textContent).toBe(""); // committed cleared
  });
});
