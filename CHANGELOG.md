# Changelog

All notable changes to **LayoutLens** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — 2026-11-26

**Understand. Analyze. Verify.** — First full release featuring visual inspection, page design-system analysis, component drift detection, and local Figma-to-live comparison.

### Added
- **Compare Mode (Design-to-Reality Visual QA)**:
  - Drag-and-drop, file picker, or `Ctrl+V` clipboard paste for Figma PNG/JPG/WebP exports directly over the active webpage.
  - `Overlay` (adjustable opacity), `Difference` (`mix-blend-mode: difference` for 1px diffing), and `Split` (draggable curtain) blend modes.
  - `@2x` / `@3x` Retina auto-scaling (`0.5×`, `1×`, `2×`), `±1px` / `±10px` `X`/`Y` nudging, scroll lock toggle, and click-through live DOM inspection underneath the reference frame.
- **Interface Intelligence (`Page` mode)**:
  - **Website Design Blueprint** summarizing main container, primary grid, section cadence, font pairing, and inferred accent/surface/text tokens.
  - **Component Discovery** grouping repeated UI elements (`Buttons`, `Icon buttons`, `Inputs`, `Cards`, `Badges`, `Nav links`) with one-click multi-instance highlighting on the page.
  - **Consistency & Outliers** engine detecting single-off height, border-radius, and font-size drift while separating icon-only buttons from text buttons and tolerating intentional repeated variants (`>= 3` occurrences).
- **Layout Constraints (`Element` mode)**:
  - Explains parent Flex/Grid layout rules, `flex-grow` / `flex-shrink: 0` sizing behavior, nearest positioned/transformed containing block for `position: absolute` elements, nearest max-width container, and sibling index.
- **Non-Destructive Slide-In Drawer & Collapsible Peek Mode**:
  - Flush right-edge (`420px`) Shadow DOM drawer that never squishes the webpage viewport.
  - Collapsible `>` button / slim `<` right-edge pull-tab to inspect elements located behind the drawer.
  - Starts **Idle** on open; live inspection toggles via the header crosshair button, accompanied by a floating bottom-left HUD (`Box`, `Guides`, `Measure`, `Unlock`, `×`).
- **Direct Token-Authenticated Iframe Bridge**:
  - Zero-lag `postMessage` bridge between the drawer iframe and content script validated with a per-session UUID token, eliminating service-worker round-trips.
- **Multi-Language Code & Design Token Exporters**:
  - Single-element snippets in **CSS**, **Tailwind**, **SwiftUI**, and **Jetpack Compose** (with explicit approximation notes when CSS-only effects like `box-shadow`, `transform`, or `position: fixed/sticky` are present).
  - Full-page exports in **CSS Variables**, **Tailwind v4 `@theme`**, **SwiftUI `DesignTokens`**, **Jetpack Compose `DesignTokens`**, **W3C Design Tokens JSON**, and **Markdown Audit Report**.
- **Visual Polish & Accessibility**:
  - Bundled `DM Sans Variable` font, Graphite neutral ramp (`#141415` dark / `#fafafa` light), 2-state Dark/Light toggle, ultra-thin `4px` scrollbar, crisp pure-vector SVG logo, and unified keyboard shortcuts (`Alt+Shift+L`, `Esc` 3-step unlock → pause → close, `↑↓←→` DOM walking when locked).

### Fixed
- Shadow DOM `TreeWalker` crash when scanning sites with open shadow roots.
- Horizontal text clipping in outlier cards with multiple drift reasons.
- False-positive button outliers caused by mixing compact icon-only buttons with text buttons or flagging intentional secondary button variants.
- Interactive page click-through during live inspection via capture-phase pointer/click interception.
