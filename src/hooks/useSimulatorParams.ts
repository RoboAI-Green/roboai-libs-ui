import { getRouteApi } from "@tanstack/react-router";
import { DEFAULTS } from "@/lib/simulatorParams";
import type { SimulatorParams } from "@/lib/simulatorParams";

// getRouteApi (not the Route object) keeps this hook free of a route↔hook import cycle.
const route = getRouteApi("/");

/** The only place that reads/writes simulator params through the router. */
export function useSimulatorParams() {
  const params = route.useSearch() as SimulatorParams;
  const navigate = route.useNavigate();

  const update = (fn: (p: SimulatorParams) => SimulatorParams) => {
    navigate({ search: (prev) => fn(prev as SimulatorParams), replace: true });
  };

  const reset = () => update(() => DEFAULTS);

  return { params, update, reset };
}
