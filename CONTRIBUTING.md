# Contributing to Framewise

Thanks for considering a contribution to **Framewise**! Bug reports, visual QA feedback, and pull requests are always welcome.

## Development Setup

### Prerequisites
- [Bun](https://bun.sh/) `>= 1.1` (recommended) or Node.js `>= 20`
- A Chromium-based browser (Chrome, Brave, Arc, Edge, or Vivaldi)

### Install & Run

```bash
git clone https://github.com/<your-username>/framewise.git
cd framewise
bun install
bun run build
```

Load the built `dist/` folder via `chrome://extensions` with **Developer mode** enabled. After making changes, run `bun run build` and click the reload icon on the extension card (and refresh the target webpage).

### Available Scripts

```bash
bun run dev        # Vite + CRXJS watch mode
bun run typecheck  # Strict TypeScript check (tsc --noEmit)
bun run test       # Run Vitest unit test suite
bun run test:watch # Run Vitest in watch mode
bun run build      # Typecheck + production build into dist/
```

## Architecture Guidelines

Please follow these boundaries when adding features or fixing bugs:

1. **Keep `src/core/` and `src/exporters/` pure**:
   - Do **not** import React or `chrome.*` APIs inside `src/core/` or `src/exporters/`.
   - Accept `getComputedStyle` (or pure data structures) as injectable parameters where possible so modules remain deterministic and unit-testable in `jsdom`.
2. **Respect MV3 & Local-First Principles**:
   - Use `async`/`await` (avoid raw `.then()`/`.catch()` chains).
   - Never add inline `<script>` tags in extension HTML files.
   - Do not introduce network calls, analytics, or external font/CDN dependencies — Framewise must remain 100% local-first.
   - Keep `src/background/service-worker.ts` stateless across restarts.
3. **Isolate Page Overlays in Shadow DOM**:
   - All injected UI (`drawer-host.ts`, `overlay-host.ts`, `reference-overlay.ts`) must live inside isolated Shadow DOM hosts tagged with `data-framewise-ui="true"` so the inspector never inspects itself or leaks styles into the host page.
4. **Honest Code & Analysis Outputs**:
   - Deterministic heuristics (component discovery, outlier detection, mobile starter snippets) should avoid noisy false positives and communicate approximations clearly.

## Pull Request Checklist

Before opening a pull request:
- [ ] Add or update unit tests in `tests/` covering new logic or bug fixes.
- [ ] Ensure `bun run typecheck` passes with zero errors.
- [ ] Ensure `bun run test` passes all suites.
- [ ] Ensure `bun run build` produces a clean `dist/` bundle.
- [ ] Test manually on at least two real websites (including one with Flexbox/Grid and one with Shadow DOM or sticky headers) and attach a short screenshot or clip for UI changes.
