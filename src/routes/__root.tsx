import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" richColors />
    </>
  );
}

const resetAttempted = new Set<string>();

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const isFirstAttempt = !resetAttempted.has(error.message);

  useEffect(() => {
    toast.error(error.message);
    if (isFirstAttempt) {
      resetAttempted.add(error.message);
      reset();
    }
  }, [error.message, isFirstAttempt, reset]);

  return (
    <>
      <Toaster position="bottom-right" richColors />
      {!isFirstAttempt && (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans">
          <Link
            to="/"
            className="text-sm font-medium px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            ← Back to simulator
          </Link>
        </div>
      )}
    </>
  );
}
