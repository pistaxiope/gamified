/**
 * components/GameCanvas.tsx
 *
 * React wrapper around the Phaser game instance.
 *
 * Design goals:
 *  1. Framer-portable – exposes a single React component with no
 *     side-effects outside the canvas element.
 *  2. Single instance – the Phaser game is created once on mount and
 *     properly destroyed on unmount so there are no memory leaks when
 *     the component is removed from the Framer canvas.
 *  3. Configurable size – `width` / `height` props let the Framer
 *     component override the default canvas dimensions.
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';

interface GameCanvasProps {
  /** Override game width (px). Defaults to 576. */
  width?: number;
  /** Override game height (px). Defaults to 480. */
  height?: number;
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // Capture props at mount time via refs so the effect does not need them
  // in its dependency array (the Phaser instance is created once and its
  // canvas size cannot be changed after initialisation without a full
  // destroy-and-recreate cycle).
  const widthRef = useRef(width);
  const heightRef = useRef(height);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Merge any size overrides with the base config.
    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      ...(widthRef.current  && { width:  widthRef.current }),
      ...(heightRef.current && { height: heightRef.current }),
      // Mount the canvas inside our managed div, not document.body,
      // so Framer's layout system can position it correctly.
      parent: containerRef.current,
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      // Clean up on unmount – prevents "canvas already in use" errors
      // when Framer hot-reloads the component.
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []); // intentionally empty – game is created once on mount

  return (
    <div
      ref={containerRef}
      style={{
        width:  width  ?? 576,
        height: height ?? 480,
        // Prevent the browser's default outline/selection on the canvas
        // element, which looks odd in a portfolio context.
        outline: 'none',
        userSelect: 'none',
        // Dark fallback colour while Phaser initialises.
        background: '#5c4033',
      }}
    />
  );
}
