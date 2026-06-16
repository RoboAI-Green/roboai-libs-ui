import { Component, type ReactNode } from "react";
import { StatePanel } from "./StatePanel";

/**
 * The compute backend raises `torch.cat(): expected a non-empty list of Tensors`
 * when no selected element contributes any line in the requested range — i.e.
 * the result is legitimately empty rather than broken.
 */
function isNoLinesError(message: string): boolean {
  return /non-empty list of Tensors|torch\.cat/i.test(message);
}

function resetKeysChanged(a?: readonly unknown[], b?: readonly unknown[]): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  return a.some((value, i) => !Object.is(value, b[i]));
}

interface Props {
  /** Clears the underlying query error so a retry refetches. */
  onReset: () => void;
  /**
   * Identity of the current run. When it changes (a new Run committed), a caught
   * error is cleared so the children re-render — otherwise a class boundary stays
   * stuck on its fallback (e.g. "No spectral lines") and the next Run looks dead.
   */
  resetKeys?: readonly unknown[];
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches errors thrown by the suspended spectrum query and shows a retry
 * panel in the shared StatePanel shell. Pair with QueryErrorResetBoundary so
 * `onReset` clears the cached error before re-rendering the children.
 */
export class SpectrumErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    // A new run committed: clear our error state and the cached query error so the
    // children (the new query) render instead of the stale fallback.
    if (this.state.error !== null && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.props.onReset();
      this.setState({ error: null });
    }
  }

  handleRetry = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // "Empty is empty": when the selected element(s) yield no spectral lines the
    // backend can't build a spectrum. Treat that as a neutral no-data state, not
    // a red failure the user should retry verbatim.
    if (isNoLinesError(error.message)) {
      return (
        <StatePanel>
          <div className="flex flex-col gap-3">
            <h2 className="text-data-lg font-semibold text-foreground">No spectral lines</h2>
            <p className="text-data-base text-muted-foreground">
              The selected element(s) returned no spectral lines for this configuration. Try a
              different element, or widen the wavelength range.
            </p>
          </div>
        </StatePanel>
      );
    }

    return (
      <StatePanel>
        <div className="flex flex-col gap-3">
          <h2 className="text-data-lg font-semibold text-destructive">Computation failed</h2>
          <p className="text-data-base text-muted-foreground">{error.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="self-start text-data-sm font-medium px-3 py-1.5 rounded border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            Try again
          </button>
        </div>
      </StatePanel>
    );
  }
}
