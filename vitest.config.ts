import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Merge the Vite config so plugins and the `@/` path alias apply under Vitest,
// then layer the test environment and coverage on top.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
      coverage: {
        provider: "v8",
      },
    },
  }),
);
