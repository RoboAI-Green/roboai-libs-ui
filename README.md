# RoboAI LIBS Spectrum Simulator — Web UI

The web frontend for the RoboAI LIBS Spectrum Simulator: an interactive single-page
app for simulating laser-induced breakdown spectroscopy (LIBS) spectra in the
browser. It talks to the RoboAI LIBS REST API over HTTP and owns no physics of its
own — all computation happens on the backend.

## Features

- **Static spectra** — Saha–Boltzmann equilibrium emission for arbitrary element
  mixtures, with adjustable electron temperature, density, and ionization stages.
- **Time-resolved exposure** — a time slider and a 3D time–wavelength–intensity
  surface for the plasma's temporal evolution.
- **Instrument broadening** — Gaussian / Lorentzian convolution with configurable FWHM.
- **Custom output grids** — sample the spectrum on your own wavelength grid.
- **Shareable state** — the full configuration lives in the URL, so any run is a link.

## Quick start

Prerequisites: **Node.js 24+** and **pnpm** (`corepack enable` provides it).

```bash
pnpm install
cp .env.local.example .env.local   # then edit — see "Connecting to the API" below
pnpm dev
```

The dev server runs on http://localhost:5173.

## Connecting to the API

The UI talks to a running RoboAI LIBS API and needs a per-user token. Get one
with the built-in helper:

```bash
pnpm get-token
```

It emails you a verification link — click it, copy the access token it returns,
and paste it back. The token is saved to `.env.local`; then start (or restart)
`pnpm dev`. Without a token the UI loads, but compute requests fail.

<details>
<summary>Advanced: using a different backend</summary>

By default the dev server proxies API calls to `https://libs.roboai.fi`. Point it
elsewhere with `API_PROXY_TARGET`, e.g.
`API_PROXY_TARGET=http://localhost:8080 pnpm dev`. A token can also be obtained
manually via the
[roboai-libs-client](https://github.com/RoboAI-Green/roboai-libs-client) Python
package (`roboai-libs auth login`).

</details>

## Scripts

| Command                             | What it does                                           |
| ----------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                          | Start the Vite dev server with HMR.                    |
| `pnpm build`                        | Type-check and build the production bundle to `dist/`. |
| `pnpm preview`                      | Serve the built bundle locally.                        |
| `pnpm test`                         | Run the unit tests once (Vitest).                      |
| `pnpm test:watch`                   | Run tests in watch mode.                               |
| `pnpm lint`                         | Lint with oxlint.                                      |
| `pnpm format` / `pnpm format:check` | Format / check formatting with oxfmt.                  |

## Tech stack

React 19 · TypeScript · Vite · TanStack Router & Query · Plotly.js · Zustand ·
Tailwind CSS · Zod · Vitest · oxlint / oxfmt.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © RoboAI Green
