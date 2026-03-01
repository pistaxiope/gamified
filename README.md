# gamified

A lightweight, Pokémon Fire Red–style interactive room game built for a developer portfolio. The character spawns in their bedroom and can walk around and interact with objects — bookshelf, computer, bed, and plant.

![Game screenshot](https://github.com/user-attachments/assets/8c01fbc9-36f3-4a00-9c6e-531ab58f08c4)

## Controls

| Action | Keys |
|--------|------|
| Move | `↑ ↓ ← →` or `W A S D` |
| Interact | `Space` / `Enter` |
| Close dialog | `Space` / `Enter` / `Escape` |

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Game engine | [Phaser 3](https://phaser.io) | Handles rendering, game loop, input, scene management. Ideal for top-down RPGs. |
| UI wrapper | React 19 | Makes the game a drop-in React component — required for Framer portability. |
| Build tool | Vite 7 | Near-instant HMR, optimised production bundles, native ESM. |
| Language | TypeScript | Type-safe Phaser scene and config authoring. |

See [DEPENDENCIES.md](./DEPENDENCIES.md) for the full dependency rationale.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

## Project structure

```
src/
├── components/
│   └── GameCanvas.tsx   # React wrapper around Phaser – Framer-portable
├── game/
│   ├── config.ts        # Phaser GameConfig (renderer, size, scene list)
│   └── scenes/
│       └── RoomScene.ts # The bedroom: tiles, objects, player, dialogs
├── App.tsx              # Root shell (swap for a Framer component)
└── main.tsx             # React entry point
```

## Framer integration

1. Run `npm run build`.
2. Host `dist/` on any static CDN (Vercel, Netlify, GitHub Pages).
3. In Framer, add a **Code component** and render an `<iframe>` pointing to the hosted URL — or import `GameCanvas` directly if your Framer project supports custom packages.

> All game assets are drawn programmatically with Phaser's `Graphics` API, so there are **no external image files** — the entire game ships as a single JS bundle (~400 KB gzipped).
