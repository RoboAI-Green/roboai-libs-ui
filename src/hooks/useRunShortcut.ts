import { useEffect, useEffectEvent } from "react";

/**
 * Runs `onRun` when the user presses ⌘+Enter, while `enabled` is true.
 * The keydown listener is attached once; the effect event always reads the
 * latest `enabled`/`onRun` without re-subscribing.
 */
export function useRunShortcut(enabled: boolean, onRun: () => void) {
  const onKeydown = useEffectEvent((e: KeyboardEvent) => {
    if (enabled && e.metaKey && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeydown(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
