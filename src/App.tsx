/**
 * App.tsx
 *
 * Root React component. Renders the game canvas centred on the page and
 * shows a minimal control legend beneath it.
 *
 * When exporting to Framer, replace this file's content with a Framer
 * component that wraps <GameCanvas /> – everything else stays the same.
 */

import './App.css';
import { GameCanvas } from './components/GameCanvas';

function App() {
  return (
    <div className="app-root">
      <GameCanvas />
      <p className="controls-hint">
        Move: <kbd>↑ ↓ ← →</kbd> or <kbd>W A S D</kbd>
        &nbsp;·&nbsp;
        Interact: <kbd>Space</kbd> / <kbd>Enter</kbd>
      </p>
    </div>
  );
}

export default App;
