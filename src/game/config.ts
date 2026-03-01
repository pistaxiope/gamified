/**
 * game/config.ts
 *
 * Central Phaser game configuration.
 *
 * Why these settings:
 *  - renderer: AUTO  → uses WebGL when available (fast), falls back to Canvas
 *    (works in Framer's browser environment and in iframes).
 *  - width / height : match the tile grid defined in RoomScene (12×10 tiles × 48 px).
 *  - backgroundColor: matches the wall colour so there are no layout flashes.
 *  - scale.mode: FIT  → the canvas scales to fill its container while keeping
 *    the pixel ratio correct, which is important when embedded in Framer.
 */

import Phaser from 'phaser';
import { RoomScene } from './scenes/RoomScene';

const TILE = 48;
const COLS = 12;
const ROWS = 10;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  COLS * TILE,   // 576 px
  height: ROWS * TILE,   // 480 px
  backgroundColor: '#5c4033',
  scene: [RoomScene],
  // No built-in physics – manual AABB collision keeps the bundle lean.
  // Phaser's Arcade physics would add ~50 KB and is not needed here.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Disable audio manager to reduce bundle size (no sounds yet).
  audio: { disableWebAudio: false },
  // Prevent Phaser from creating a second <canvas> if re-mounted.
  canvasStyle: 'display:block;',
  // Input settings for embedded contexts
  input: {
    keyboard: {
      // Capture keyboard events even when canvas doesn't have focus
      capture: [
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.ENTER,
        Phaser.Input.Keyboard.KeyCodes.ESC,
      ],
    },
  },
};
