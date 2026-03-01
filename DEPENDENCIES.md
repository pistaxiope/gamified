# Dependencies

This document explains every runtime and build dependency in the project and
the reasoning behind each choice.

---

## Runtime dependencies

### `phaser` (^3.90.0)
**Purpose:** 2D game engine that handles rendering, the game loop, input, scene
management, collision helpers, and animation.

**Why Phaser:**
- Battle-tested for top-down RPG games in the style of *Pokémon Fire Red*
  (tile maps, sprite sheets, scene transitions, dialog systems).
- Renders via **WebGL** with an automatic **Canvas 2D fallback**, so it works
  in any modern browser — including the Chromium iframe that Framer uses to
  preview components.
- The entire room (floor, walls, furniture, player, UI) is drawn with
  Phaser's built-in `Graphics` API, meaning **zero external image assets**
  are required. The build output is a single JS bundle ≈ 397 KB gzipped.
- Well-maintained (last major release < 6 months ago at time of writing),
  large community, and extensive TypeScript definitions bundled with the
  package (`phaser/types/phaser.d.ts`).

### `react` + `react-dom` (^19.2.0)
**Purpose:** Component model that wraps the Phaser canvas in a reusable
`<GameCanvas />` element.

**Why React:**
- **Framer portability** — Framer's design tool runs on React. Exposing the
  game as a React component means it can be dropped into any Framer page,
  frame, or code override without any additional glue code.
- The `useEffect` lifecycle hook cleanly handles Phaser's `init` / `destroy`
  calls, preventing canvas leaks when the component is hot-reloaded.
- Keeps the shell UI (control hints, future menus) in JSX while the game
  logic stays in pure Phaser scenes.

---

## Development / build dependencies

### `vite` (^7.3.1)
**Purpose:** Build tool and development server.

**Why Vite:**
- Near-instant HMR (Hot Module Replacement) during development — no full
  page reload when editing game scenes.
- Rolls up to a single optimised JS bundle for production, which is what
  Framer expects when you import an external package.
- Native ES module support means Phaser's tree-shakeable exports can be
  used as-is without extra config.

### `@vitejs/plugin-react` (^5.1.1)
**Purpose:** Adds Babel-based JSX transform and Fast Refresh to Vite.

**Why needed:** Vite does not process `.tsx` files out of the box. This
plugin enables React JSX syntax and ensures HMR works correctly for React
components.

### `typescript` (~5.9.3)
**Purpose:** Adds static typing across the entire codebase.

**Why TypeScript:**
- Phaser ships with first-class `.d.ts` types; TypeScript catches scene
  configuration errors at compile time rather than at runtime in the browser.
- Makes refactoring safe — e.g. renaming an `Interactable` property
  highlights every usage immediately.
- Required for the Vite `tsc -b` pre-build check.

### `@types/react` + `@types/react-dom` (^19.x)
**Purpose:** TypeScript definitions for React hooks and JSX intrinsic elements.

**Why needed:** These are peer packages to `typescript` + `react`; without
them `useEffect`, `useRef`, and JSX syntax produce type errors.

### `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`,
`eslint-plugin-react-refresh`, `@eslint/js`, `globals` (various)
**Purpose:** Static analysis and code-style enforcement.

**Why included:** The Vite scaffold installs these automatically.
`eslint-plugin-react-hooks` catches missing `useEffect` dependency arrays
(important for the Phaser instance lifecycle). `eslint-plugin-react-refresh`
warns when components are not HMR-safe.

### `@types/node` (^24.x)
**Purpose:** Node.js type definitions used by Vite's config file (`vite.config.ts`).

**Why needed:** `vite.config.ts` imports `path` from Node; without
`@types/node` TypeScript cannot resolve those types.

---

## Why NOT other game engines

| Engine | Considered? | Reason rejected |
|--------|-------------|-----------------|
| **PixiJS** | Yes | Rendering only — needs separate physics/input libraries |
| **Kaboom.js** | Yes | Great for simple games but limited RPG tooling; last major release is older |
| **Unity (WebGL)** | Yes | ~20 MB export; far too heavy for a portfolio embed |
| **Three.js** | No | 3D-focused; overkill for a 2D pixel-art room |
| **Raw Canvas API** | Yes | Possible but would require reimplementing game loop, input, etc. |
