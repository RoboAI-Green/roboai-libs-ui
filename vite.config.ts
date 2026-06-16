import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: true,
    // Allow the dev server to be reached via the Caddy proxy under these hosts —
    // localhost (normal dev) plus the names used when E2E runs in Docker against
    // the host-published stack. Dev-server only; ignored by `vite build`.
    allowedHosts: ["localhost", "host.docker.internal", "proxy"],
    // Dev-only proxy: the browser calls /api on this dev server (same-origin, so
    // no CORS), and Vite forwards it server-side to the real backend — the same
    // trick a non-browser client like the Python SDK gets for free. Point it at a
    // different backend with API_PROXY_TARGET. Ignored by `vite build`.
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "https://libs.roboai.fi",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["react-plotly.js", "plotly.js-dist-min"],
  },
});
