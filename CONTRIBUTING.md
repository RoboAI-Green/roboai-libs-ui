# Contributing

Thanks for your interest in improving the RoboAI LIBS Spectrum Simulator web UI.

## Development setup

```bash
pnpm install
cp .env.local.example .env.local   # configure the API base + token
pnpm dev
```

## Before opening a pull request

Please make sure all checks pass locally — these are the same gates CI runs:

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Run `pnpm format` to apply the oxfmt style before committing.

## Guidelines

- Keep changes focused; one logical change per pull request.
- Match the style of the surrounding code (formatting is enforced by oxfmt).
- Add or update tests for behavior changes.
- Write commit messages and code comments in English.

## Reporting issues

Use the issue templates for bug reports and feature requests. For bugs, include
steps to reproduce, what you expected, and what happened (browser/console errors
help). Do not include API tokens or other secrets in issues.
