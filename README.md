<div align="center">
  <img src="public/icons/icon.svg" alt="LayoutLens logo" width="64" height="64" />
  <h1>LayoutLens</h1>
  <p><strong>Understand. Analyze. Verify.</strong></p>
  <p>
    A local-first visual development toolkit for Chromium browsers — inspect rendered layouts,
    discover component patterns and visual drift, and verify Figma designs directly over live websites.
  </p>

  <p>
    <a href="#installation">Install</a> ·
    <a href="#features">Features</a> ·
    <a href="#keyboard-shortcuts">Shortcuts</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#privacy--local-first">Privacy</a> ·
    <a href="#development">Development</a>
  </p>
</div>

---

![LayoutLens slide-in inspector showing distance ruler, Flexbox breakdown, and interactive Box Model](docs/screenshots/inspector-overview.png)

## Why LayoutLens?

Browser DevTools is built for deep runtime debugging, and Figma Dev Mode inspects static design files. **LayoutLens bridges the space in between** — it slides cleanly over the right edge of any webpage **without squishing the viewport**, letting you:

- **Understand** how any rendered element is sized, spaced, and constrained (`Element` mode): box model schematics, Flexbox/Grid breakdowns, layout constraints (parent/container/containing-block explanations), WCAG contrast, and Figma-style distance rulers.
- **Analyze** the live page as a design system (`Page` mode): Website Design Blueprint, repeated component discovery (buttons, icon buttons, inputs, cards, badges, nav links), automated visual drift / outlier detection, and multi-format token exports.
- **Verify** implementation against design intent (`Compare` mode): drag, drop, or paste (`Ctrl+V`) a Figma export directly over the live page with `Overlay`, `Difference`, and `Split` modes, `@2x` Retina scaling, pixel nudging, and click-through live DOM inspection underneath.

Everything runs **100% locally** inside your browser using native DOM APIs (`getComputedStyle`, `getBoundingClientRect`, `elementsFromPoint`, `ResizeObserver`, `MutationObserver`) — no accounts, no cloud sync, no external API calls, and no telemetry.

---

## Features

### 1. Non-Destructive Slide-In Drawer & Collapsible Peek Mode
- Opens flush along the right edge (`420px` wide) in an isolated Shadow DOM host so responsive layouts never reflow.
- Starts **Idle** so you can browse normally; click the crosshair button whenever you want to inspect.
- Click the **`>` collapse button** to tuck the panel into a slim `<` pull-tab on the right edge so you can inspect elements positioned behind the panel.
- Built-in **Dark / Light** theme toggle and a floating bottom-left HUD (`Box`, `Guides`, `Measure`, `Unlock`, `×`) while inspecting.

### 2. Visual Layout Overlays & Distance Ruler
- **Box Model Overlay**: Color-coded margin, border, and padding bands with numeric pixel pills.
- **Smart Flex & Grid Guides**: Highlights Flex gap strips, item bounds, and CSS Grid column/row tracks — and subtly reveals parent Flex/Grid tracks even when hovering child items.
- **Element-to-Element Measurement**: Click any element to lock it, then hover any other element to measure horizontal/vertical gaps or parent-child inner offsets with dashed alignment guides.

![LayoutLens Shadow DOM overlay showing padding bands, Flexbox gap strips, and dashed item boundaries](docs/screenshots/layout-overlays.png)

### 3. Three-Mode Inspector (`Element` | `Page` | `Compare`)
- **`Element` mode**: One unified, scannable spec sheet per element — selector & dimensions, live distance readout, plain-English Flexbox/Grid insights, **Layout constraints** (why an element is positioned or sized by its parent, max-width container, flex-grow/shrink rules, or containing block), click-to-copy Box Model schematic, Typography + Color swatches with WCAG contrast (`AAA` / `AA` / `AA Large` / `Fail`), 4-language code switcher, and collapsible DOM path & computed styles.
- **`Page` mode**: Auto-scans rendered elements (including open Shadow DOM) to surface:
  - **Website Design Blueprint** (main container, primary grid, section cadence, font pairing, accent/surface/text tokens)
  - **Component Discovery** with one-click multi-instance page highlighting (`Buttons`, `Icon buttons`, `Inputs`, `Cards`, `Badges`, `Nav links`)
  - **Consistency & Outliers** flagging single-off height, border-radius, or font-size drift while tolerating intentional repeated variants (`>= 3` occurrences) and keeping icon-only buttons separate from text buttons
  - **Design Tokens & Layout Structure**: color palette, typography scale, spacing scale, border radii, centered/max-width containers, and nested Flex/Grid hierarchy.
- **`Compare` mode (Design-to-Reality Visual QA)**:
  - Drop, pick, or paste (`Ctrl+V`) any PNG/JPG/WebP design export straight from Figma or clipboard.
  - Switch between **`Overlay`** (adjustable opacity), **`Difference`** (`mix-blend-mode: difference` — exact pixel matches render pure black), and **`Split`** (draggable horizontal curtain).
  - Auto-scales `@2x` / `@3x` Retina exports (`0.5×`, `1×`, `2×`), nudges `X` / `Y` in `±1px` or `±10px` increments, locks overlay to page scroll or viewport, and stays click-through so you can inspect and measure real DOM elements underneath.

### 4. Multi-Language Code & Design System Export

| Target | Single Element (`Element` mode) | Full Page Design System (`Page` mode) |
| --- | --- | --- |
| **CSS** | Clean rendered CSS rule | `:root` CSS custom properties (`.css`) |
| **Tailwind** | Utility class markup (`flex`, `gap-*`, `p-*`, `rounded-*`, hex) | Tailwind v4 `@theme` stylesheet (`.css`) |
| **SwiftUI (iOS)** | Starter `HStack` / `VStack` / `LazyVGrid` / `Text` modifier chain\* | `enum DesignTokens` + `Color(hex:)` extension (`.swift`) |
| **Jetpack Compose (Android)** | Starter `Row` / `Column` / `LazyVerticalGrid` / `Text` + `Modifier`\* | `object DesignTokens` Kotlin file (`.kt`) |
| **W3C JSON & Report** | — | W3C Design Tokens (`.json`) & Markdown audit report (`.md`) |

<sub>\* Element code snippets are generated deterministically from rendered CSS styles. When CSS-specific effects like `box-shadow`, `transform`, or `position: fixed/sticky` are present, SwiftUI and Jetpack Compose snippets include an explicit comment noting which properties require manual adaptation.</sub>

---

## Keyboard Shortcuts

All shortcuts work whether keyboard focus is on the webpage or inside the LayoutLens drawer:

| Shortcut | Action |
| --- | --- |
| `Alt + Shift + L` | Open or close the LayoutLens drawer |
| `Click` *(while Live)* | Lock selection on the hovered element (intercepts page clicks safely) |
| `Esc` | Step 1: Unlock locked element → Step 2: Pause inspection → Step 3: Close drawer |
| `↑` `↓` `←` `→` *(while Locked)* | Walk DOM: parent (`↑`), first child (`↓`), previous sibling (`←`), next sibling (`→`) |
| `←` `→` *(on tab bar)* | Switch between `Element`, `Page`, and `Compare` modes |

---

## Installation

### Prerequisites
- [Bun](https://bun.sh/) `>= 1.1` (or Node.js `>= 20`)
- Any Chromium browser (Chrome, Brave, Arc, Edge, Vivaldi)

### Build from Source

```bash
git clone https://github.com/<your-username>/layoutlens.git
cd layoutlens
bun install
bun run build
```

### Load Unpacked in Chrome / Brave / Edge
1. Open `chrome://extensions` (or `brave://extensions` / `edge://extensions`).
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the generated `dist/` folder.
4. Visit any `http://` or `https://` website and click the **LayoutLens** toolbar icon (or press `Alt+Shift+L`).

---

## Privacy & Local-First

LayoutLens is designed to run completely offline inside your browser:
- **Zero network requests**: No analytics, no telemetry, no remote fonts, and no external API calls. Fonts (`DM Sans Variable`) and icons are bundled directly in the extension.
- **Local-only storage**: Only your Dark/Light theme preference is persisted via `chrome.storage.local`.
- **In-memory design references**: Images pasted or uploaded into `Compare` mode stay strictly in local browser memory for the active tab and are discarded when cleared or when the page reloads.

---

## Architecture

LayoutLens keeps the inspection, analysis, and export engines **completely framework-independent** (no React or `chrome.*` imports in `src/core/` or `src/exporters/`):

```text
layoutlens/
├── public/icons/             # Extension PNG icons (16, 48, 128) & vector SVG mark
├── docs/screenshots/         # README screenshots
├── manifest.config.ts        # Chrome Manifest V3 configuration (CRXJS)
├── src/
│   ├── background/
│   │   └── service-worker.ts # Ephemeral MV3 worker (toolbar toggle, badge, fallback injection)
│   ├── content/
│   │   ├── index.ts          # Content script entrypoint & global shortcut fallback
│   │   ├── controller.ts     # Pointer/click capture, ResizeObserver, MutationObserver, rAF loop
│   │   └── overlay/
│   │       ├── drawer-host.ts       # Shadow DOM flush slide-in drawer + collapsible right-edge tab
│   │       ├── overlay-host.ts      # Shadow DOM SVG canvas + bottom-left floating HUD
│   │       ├── reference-overlay.ts # Shadow DOM Compare overlay (Overlay / Difference / Split)
│   │       ├── box-model.ts         # Margin/border/padding/content bands & edge pills
│   │       ├── highlight.ts         # Bounding outlines, badges, Flex/Grid guides, group highlights
│   │       └── measurements.ts      # Element-to-element pixel rulers & dashed alignment guides
│   ├── core/                 # Framework-independent inspection & analysis modules
│   │   ├── scanner/          # TreeWalker & open Shadow DOM piercing
│   │   ├── geometry/         # Bounding rects, box model, sibling & nested distances
│   │   ├── styles/           # Categorized computed CSS & rule formatting
│   │   ├── typography/       # Font stacks, line-height ratios, page typography scale
│   │   ├── colors/           # Hex/RGBA normalization, WCAG contrast, page palette
│   │   ├── layout/           # Flex/Grid detection, grid tracks, containers, layout constraints
│   │   ├── components/       # Repeated UI pattern discovery & visual drift/outlier detection
│   │   ├── blueprint/        # Website Design Blueprint synthesis
│   │   ├── hierarchy/        # Ancestor chains & direct children
│   │   └── analysis/         # Element inspector & bounded page design-system scanner
│   ├── exporters/            # Pure code & token generators (CSS, Tailwind, SwiftUI, Compose, JSON, MD)
│   ├── messaging/            # Direct token-authenticated iframe↔content bridge + Zod schemas
│   ├── shared/               # Shared types, constants, and CSS/color utilities
│   └── sidepanel/            # React 19 + Tailwind CSS v4 drawer UI (Element, Page & Compare views)
└── tests/                    # Vitest unit tests (geometry, inspection, intelligence, exporters, shortcuts)
```

### Tech Stack
- **Language**: TypeScript (strict mode)
- **UI**: React 19, Tailwind CSS v4, Lucide Icons, bundled DM Sans Variable font
- **Build & MV3**: Vite 6, `@crxjs/vite-plugin`, Bun
- **Validation & Testing**: Zod, Vitest, jsdom

---

## Development

```bash
bun run dev        # Start Vite + CRXJS dev server
bun run typecheck  # Run strict TypeScript check (tsc --noEmit)
bun run test       # Run Vitest unit tests
bun run build      # Typecheck and build production bundle into dist/
```

---

## Contributing

Contributions, bug reports, and feature ideas are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, architecture boundaries, and pull request guidelines.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes and version history.

---

## License

MIT — see [LICENSE](./LICENSE).
