/**
 * RoomScene
 *
 * The main (and only) game scene. Renders a top-down Pokemon-Fire-Red-style
 * bedroom entirely with Phaser's built-in Graphics API so that zero external
 * image assets are required – keeping the bundle truly portable and Framer-ready.
 *
 * Tile grid  : COLS × ROWS tiles, each TILE pixels wide/tall.
 * Coordinates: row 0 = top wall, row ROWS-1 = bottom wall.
 *
 * Interaction model:
 *   • Player walks with Arrow Keys or WASD.
 *   • When within INTERACT_RANGE pixels of an interactive object, a small
 *     "press SPACE" hint badge appears above the player.
 *   • Pressing SPACE (or Enter) opens a dialog box with the object's message.
 *   • Pressing SPACE / Enter / Escape while a dialog is open closes it.
 */

import Phaser from 'phaser';

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE = 48;          // pixels per tile
const COLS = 12;          // number of tile columns
const ROWS = 10;          // number of tile rows
const SPEED = 120;        // player movement speed (px/s)
const INTERACT_RANGE = 58; // pixels – how close before prompt appears

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  wall:       0x5c4033,
  floor:      0xd4a96a,
  floorDark:  0xc49a5a,
  bed:        0x3d6b9e,
  bedSheet:   0xadd8e6,
  pillow:     0xffffff,
  bookshelf:  0x7c5230,
  bookA:      0xc0392b,
  bookB:      0x27ae60,
  bookC:      0x2980b9,
  bookD:      0xf39c12,
  desk:       0x8b6914,
  monitor:    0x222222,
  screen:     0x00ccff,
  plant:      0x2d5a1b,
  pot:        0x8b4513,
  rug:        0x8b2252,
  rugInner:   0xb83270,
  door:       0x5c3d1e,
  doorKnob:   0xf0c040,
  playerBody: 0xf5cba7,
  playerHair: 0x3d2b1f,
  playerShirt:0x3498db,
  playerPants:0x2c3e50,
  playerShoes:0x1a1a1a,
  dialogBg:   0x1a1a2e,
  dialogBorder:0xf0c040,
  hint:       0xf0c040,
  hintText:   0x1a1a2e,
};

// ─── Interactive object descriptor ────────────────────────────────────────────
interface Interactable {
  label: string;
  worldX: number;   // centre x in world px
  worldY: number;   // centre y in world px
  message: string;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
export class RoomScene extends Phaser.Scene {
  // player
  private player!: Phaser.GameObjects.Container;
  private playerDir: 'up' | 'down' | 'left' | 'right' = 'down';
  private isMoving = false;
  private stepTick = 0;
  // Cache player frames to avoid recreating graphics every tick
  private playerFrames: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private currentFrameKey = '';

  // controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  // collision
  private wallRects: Phaser.Geom.Rectangle[] = [];

  // interaction
  private interactables: Interactable[] = [];
  private nearbyObject: Interactable | null = null;
  private dialogOpen = false;

  // UI layers (drawn on top of world)
  private hintBadge!: Phaser.GameObjects.Container;
  private dialogBox!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RoomScene' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  create() {
    this.wallRects = [];
    this.interactables = [];

    this.drawRoom();
    this.createPlayer();
    this.setupInput();
    this.createHintBadge();
    this.createDialogBox();

    // camera follows player inside room
    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    if (this.dialogOpen) {
      this.handleDialogInput();
      return;
    }

    this.handleMovement(delta);
    this.checkInteractables();
    this.handleInteractInput();
    this.updatePlayerSprite();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ROOM DRAWING
  // ══════════════════════════════════════════════════════════════════════════

  private drawRoom() {
    const g = this.add.graphics();

    // ── Floor ──
    g.fillStyle(C.floor);
    g.fillRect(TILE, TILE, (COLS - 2) * TILE, (ROWS - 2) * TILE);

    // checkerboard accent every other tile
    g.fillStyle(C.floorDark, 0.25);
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if ((r + c) % 2 === 0) g.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }

    // ── Walls ──
    g.fillStyle(C.wall);
    // top
    g.fillRect(0, 0, COLS * TILE, TILE);
    // bottom
    g.fillRect(0, (ROWS - 1) * TILE, COLS * TILE, TILE);
    // left
    g.fillRect(0, 0, TILE, ROWS * TILE);
    // right
    g.fillRect((COLS - 1) * TILE, 0, TILE, ROWS * TILE);

    // wall shadow strip (inner top)
    g.fillStyle(0x000000, 0.15);
    g.fillRect(TILE, TILE, (COLS - 2) * TILE, 6);

    // ── Door gap in bottom wall ──
    const doorCol = 5;
    g.fillStyle(C.door);
    g.fillRect(doorCol * TILE + 4, (ROWS - 1) * TILE, 2 * TILE - 8, TILE);
    // door frame
    g.lineStyle(3, 0x3a2010);
    g.strokeRect(doorCol * TILE + 4, (ROWS - 1) * TILE, 2 * TILE - 8, TILE);
    // door knob
    g.fillStyle(C.doorKnob);
    g.fillCircle(doorCol * TILE + TILE - 4, (ROWS - 1) * TILE + TILE / 2, 4);

    // register wall collision (everything except the door gap)
    this.addWall(0, 0, COLS * TILE, TILE);           // top
    this.addWall(0, 0, TILE, ROWS * TILE);           // left
    this.addWall((COLS - 1) * TILE, 0, TILE, ROWS * TILE); // right
    // bottom wall split around door
    this.addWall(0, (ROWS - 1) * TILE, doorCol * TILE + 4, TILE);
    this.addWall((doorCol + 2) * TILE - 4, (ROWS - 1) * TILE, (COLS - (doorCol + 2)) * TILE + 4, TILE);

    // ── Rug ──
    this.drawRug(g, 4, 3, 4, 4);

    // ── Bed (top-right) ──
    this.drawBed(g, 9, 1);

    // ── Bookshelf (left wall) ──
    this.drawBookshelf(g, 1, 2);

    // ── Desk + PC (bottom-right area) ──
    this.drawDesk(g, 9, 7);

    // ── Plant (top-left corner) ──
    this.drawPlant(g, 1, 1);
  }

  private addWall(x: number, y: number, w: number, h: number) {
    this.wallRects.push(new Phaser.Geom.Rectangle(x, y, w, h));
  }

  private drawRug(g: Phaser.GameObjects.Graphics, col: number, row: number, w: number, h: number) {
    g.fillStyle(C.rug);
    g.fillRoundedRect(col * TILE + 4, row * TILE + 4, w * TILE - 8, h * TILE - 8, 8);
    g.fillStyle(C.rugInner);
    g.fillRoundedRect(col * TILE + 10, row * TILE + 10, w * TILE - 20, h * TILE - 20, 4);
    // fringe lines
    g.lineStyle(2, 0xffffff, 0.3);
    for (let i = 1; i < w; i++) {
      g.lineBetween((col + i) * TILE, (row + 0.1) * TILE, (col + i) * TILE, (row + h - 0.1) * TILE);
    }
  }

  private drawBed(g: Phaser.GameObjects.Graphics, col: number, row: number) {
    const x = col * TILE;
    const y = row * TILE;
    // frame
    g.fillStyle(C.bed);
    g.fillRect(x, y, 2 * TILE, 2 * TILE);
    // sheets
    g.fillStyle(C.bedSheet);
    g.fillRect(x + 4, y + TILE / 2, 2 * TILE - 8, TILE + 4);
    // pillow
    g.fillStyle(C.pillow);
    g.fillRoundedRect(x + 8, y + 6, 2 * TILE - 16, TILE / 2 - 4, 6);
    // headboard shadow
    g.fillStyle(0x000000, 0.2);
    g.fillRect(x, y, 2 * TILE, 6);

    this.addWall(x, y, 2 * TILE, 2 * TILE);
    this.interactables.push({
      label: 'Bed',
      worldX: x + TILE,
      worldY: y + TILE,
      message: '💤  It looks comfy. Maybe later...',
    });
  }

  private drawBookshelf(g: Phaser.GameObjects.Graphics, col: number, row: number) {
    const x = col * TILE;
    const y = row * TILE;
    // cabinet body
    g.fillStyle(C.bookshelf);
    g.fillRect(x, y, TILE, 3 * TILE);
    // shelves
    const bookColors = [C.bookA, C.bookB, C.bookC, C.bookD, C.bookA, C.bookC];
    let bi = 0;
    for (let shelf = 0; shelf < 3; shelf++) {
      const sy = y + shelf * TILE + 4;
      g.lineStyle(1, 0x3a1a00);
      g.lineBetween(x + 2, sy + TILE - 4, x + TILE - 2, sy + TILE - 4);
      // books on shelf
      let bx = x + 4;
      while (bx < x + TILE - 4) {
        const bw = 6 + Math.floor((bi * 7 + 3) % 8);
        g.fillStyle(bookColors[bi % bookColors.length]);
        g.fillRect(bx, sy + 2, bw, TILE - 8);
        bx += bw + 2;
        bi++;
      }
    }
    this.addWall(x, y, TILE, 3 * TILE);
    this.interactables.push({
      label: 'Bookshelf',
      worldX: x + TILE / 2,
      worldY: y + 1.5 * TILE,
      message: '📚  "Clean Code", "The Pragmatic Programmer", portfolio notes...',
    });
  }

  private drawDesk(g: Phaser.GameObjects.Graphics, col: number, row: number) {
    const x = col * TILE;
    const y = row * TILE;
    // desk surface
    g.fillStyle(C.desk);
    g.fillRect(x, y, 2 * TILE, TILE);
    g.fillStyle(0x000000, 0.1);
    g.fillRect(x, y, 2 * TILE, 4);
    // legs
    g.fillStyle(C.desk);
    g.fillRect(x + 4, y + TILE, 8, TILE / 3);
    g.fillRect(x + 2 * TILE - 12, y + TILE, 8, TILE / 3);
    // monitor
    const mx = x + TILE / 4;
    const my = y - TILE * 0.9;
    g.fillStyle(C.monitor);
    g.fillRoundedRect(mx, my, TILE * 1.5, TILE * 0.75, 4);
    g.fillStyle(C.screen);
    g.fillRoundedRect(mx + 4, my + 4, TILE * 1.5 - 8, TILE * 0.75 - 12, 2);
    // code lines on screen
    g.fillStyle(0xffffff, 0.6);
    for (let ln = 0; ln < 3; ln++) {
      const lw = TILE * (0.4 + (ln % 3) * 0.2);
      g.fillRect(mx + 8, my + 8 + ln * 9, lw, 3);
    }
    // monitor stand
    g.fillStyle(C.monitor);
    g.fillRect(mx + TILE * 0.6, my + TILE * 0.75, TILE * 0.3, TILE * 0.15);
    g.fillRect(mx + TILE * 0.4, my + TILE * 0.9, TILE * 0.7, 5);
    // keyboard
    g.fillStyle(0x444444);
    g.fillRoundedRect(x + TILE * 0.3, y - 10, TILE, 10, 2);

    this.addWall(x, y, 2 * TILE, TILE);
    this.interactables.push({
      label: 'Computer',
      worldX: x + TILE,
      worldY: y,
      message: '💻  The portfolio project is open. Let\'s keep building!',
    });
  }

  private drawPlant(g: Phaser.GameObjects.Graphics, col: number, row: number) {
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE - 4;
    // pot
    g.fillStyle(C.pot);
    g.fillRect(x - 10, y - 12, 20, 16);
    g.fillRect(x - 12, y - 14, 24, 4);
    // leaves
    g.fillStyle(C.plant);
    g.fillEllipse(x, y - 20, 28, 20);
    g.fillEllipse(x - 10, y - 28, 18, 16);
    g.fillEllipse(x + 10, y - 26, 18, 16);

    const px = col * TILE;
    const py = row * TILE;
    this.addWall(px + 8, py + 8, TILE - 16, TILE - 16);
    this.interactables.push({
      label: 'Plant',
      worldX: px + TILE / 2,
      worldY: py + TILE / 2,
      message: '🌿  A healthy little succulent. Don\'t forget to water it.',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PLAYER
  // ══════════════════════════════════════════════════════════════════════════

  private createPlayer() {
    // Player is drawn programmatically as a small pixel character.
    // All parts live inside a Container so they move together.
    this.player = this.add.container(COLS * TILE / 2, ROWS * TILE / 2);
    this.drawPlayerFrame('down', false);
    this.player.setDepth(10);
  }

  /**
   * Switches to a cached player frame (creating it if needed).
   * @param dir   Direction the character is facing.
   * @param step  Alternate leg position for walk cycle.
   */
  private drawPlayerFrame(dir: 'up' | 'down' | 'left' | 'right', step: boolean) {
    const frameKey = `${dir}_${step}`;
    
    // Skip if already showing this frame
    if (frameKey === this.currentFrameKey) return;
    
    // Hide current frame
    if (this.currentFrameKey && this.playerFrames.has(this.currentFrameKey)) {
      this.playerFrames.get(this.currentFrameKey)!.setVisible(false);
    }
    
    // Get or create the frame
    if (!this.playerFrames.has(frameKey)) {
      const g = this.createPlayerGraphics(dir, step);
      this.playerFrames.set(frameKey, g);
      this.player.add(g);
    }
    
    // Show the new frame
    this.playerFrames.get(frameKey)!.setVisible(true);
    this.currentFrameKey = frameKey;
  }

  /**
   * Creates a graphics object for a specific player frame.
   */
  private createPlayerGraphics(dir: 'up' | 'down' | 'left' | 'right', step: boolean): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const S = 1;
    const cx = 0;
    const headY = -22 * S;
    const bodyY = -12 * S;
    const legY  = 0 * S;

    if (dir === 'down' || dir === 'left' || dir === 'right') {
      g.fillStyle(C.playerShoes);
      const lx = step ? -4 : -2;
      const rx = step ? 0 : 2;
      g.fillRect(cx + lx - 4, legY + 8 * S, 7 * S, 4 * S);
      g.fillRect(cx + rx + 1, legY + 8 * S, 7 * S, 4 * S);
      g.fillStyle(C.playerPants);
      g.fillRect(cx - 5, legY, 5 * S, 10 * S);
      g.fillRect(cx + 1, legY, 5 * S, 10 * S);
      g.fillStyle(C.playerShirt);
      g.fillRect(cx - 6, bodyY, 12 * S, 14 * S);
      const armOffset = step ? 2 : -2;
      g.fillRect(cx - 9, bodyY + armOffset, 3 * S, 10 * S);
      g.fillRect(cx + 6, bodyY - armOffset, 3 * S, 10 * S);
      g.fillStyle(C.playerBody);
      g.fillRect(cx - 6, headY, 12 * S, 12 * S);
      g.fillStyle(C.playerHair);
      g.fillRect(cx - 6, headY, 12 * S, 5 * S);
      if (dir !== 'down') {
        g.fillRect(cx + (dir === 'right' ? 6 : -8), headY + 2, 3, 6);
      }
      if (dir === 'down') {
        g.fillStyle(0x000000);
        g.fillRect(cx - 3, headY + 7, 2, 2);
        g.fillRect(cx + 2, headY + 7, 2, 2);
      }
    } else {
      g.fillStyle(C.playerPants);
      g.fillRect(cx - 5, legY, 5 * S, 10 * S);
      g.fillRect(cx + 1, legY, 5 * S, 10 * S);
      g.fillStyle(C.playerShoes);
      const lx = step ? -4 : -2;
      const rx = step ? 0 : 2;
      g.fillRect(cx + lx - 4, legY + 8 * S, 7 * S, 4 * S);
      g.fillRect(cx + rx + 1, legY + 8 * S, 7 * S, 4 * S);
      g.fillStyle(C.playerShirt);
      g.fillRect(cx - 6, bodyY, 12 * S, 14 * S);
      g.fillRect(cx - 9, bodyY, 3 * S, 10 * S);
      g.fillRect(cx + 6, bodyY, 3 * S, 10 * S);
      g.fillStyle(C.playerHair);
      g.fillRect(cx - 6, headY, 12 * S, 12 * S);
    }

    return g;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  INPUT
  // ══�����═══════════════════════════════════════════════════════════════════════

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MOVEMENT & COLLISION
  // ══════════════════════════════════════════════════════════════════════════

  private handleMovement(delta: number) {
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const dy = (down  ? 1 : 0) - (up   ? 1 : 0);

    this.isMoving = dx !== 0 || dy !== 0;

    if (!this.isMoving) return;

    // Update facing direction
    if      (dy < 0) this.playerDir = 'up';
    else if (dy > 0) this.playerDir = 'down';
    else if (dx < 0) this.playerDir = 'left';
    else             this.playerDir = 'right';

    const speed = SPEED * (delta / 1000);
    // normalise diagonal speed
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = (dx / len) * speed;
    const ny = (dy / len) * speed;

    const halfW = 6;
    const halfH = 6;
    const newX = this.player.x + nx;
    const newY = this.player.y + ny;

    // resolve collisions on each axis independently
    const resolvedX = this.resolveAxis(
      newX, this.player.y, halfW, halfH,
    );
    const resolvedY = this.resolveAxis(
      resolvedX.x, newY, halfW, halfH,
    );

    this.player.x = resolvedY.x;
    this.player.y = resolvedY.y;
  }

  /** Returns the position after clamping against wall rects on both axes. */
  private resolveAxis(x: number, y: number, hw: number, hh: number): { x: number; y: number } {
    const playerRect = new Phaser.Geom.Rectangle(x - hw, y - hh, hw * 2, hh * 2);
    for (const wall of this.wallRects) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, wall)) {
        // push out of nearest edge
        const overlapLeft   = playerRect.right  - wall.left;
        const overlapRight  = wall.right  - playerRect.left;
        const overlapTop    = playerRect.bottom - wall.top;
        const overlapBottom = wall.bottom - playerRect.top;
        const minH = Math.min(overlapLeft, overlapRight);
        const minV = Math.min(overlapTop, overlapBottom);
        if (minH < minV) {
          if (overlapLeft < overlapRight) x -= overlapLeft;
          else                            x += overlapRight;
        } else {
          if (overlapTop < overlapBottom) y -= overlapTop;
          else                            y += overlapBottom;
        }
        playerRect.x = x - hw;
        playerRect.y = y - hh;
      }
    }
    return { x, y };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PLAYER SPRITE UPDATE
  // ══════════════════════════════════════════════════════════════════════════

  private updatePlayerSprite() {
    // walk cycle: flip sprite every 200 ms while moving
    if (this.isMoving) {
      this.stepTick += 1;
      if (this.stepTick > 12) this.stepTick = 0;
    } else {
      this.stepTick = 0;
    }
    const step = this.isMoving && this.stepTick > 6;
    this.drawPlayerFrame(this.playerDir, step);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  INTERACTION
  // ══════════════════════════════════════════════════════════════════════════

  private checkInteractables() {
    let closest: Interactable | null = null;
    let closestDist = Infinity;
    for (const obj of this.interactables) {
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, obj.worldX, obj.worldY,
      );
      if (d < INTERACT_RANGE && d < closestDist) {
        closest = obj;
        closestDist = d;
      }
    }
    this.nearbyObject = closest;
    this.hintBadge.setVisible(closest !== null);
    if (closest) {
      // Position badge above player head in world coords (scrollFactor handles camera)
      this.hintBadge.setPosition(this.player.x, this.player.y - 38);
    }
  }

  private handleInteractInput() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      if (this.nearbyObject) {
        this.openDialog(this.nearbyObject.message);
      }
    }
  }

  private handleDialogInput() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.closeDialog();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HUD – HINT BADGE
  // ══════════════════════════════════════════════════════════════════════════

  private createHintBadge() {
    // Use default scrollFactor(1) so badge moves with world and stays above player
    this.hintBadge = this.add.container(0, 0).setDepth(20).setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(C.hint);
    bg.fillRoundedRect(-30, -12, 60, 18, 4);

    const txt = this.add.text(0, -3, 'SPACE', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#1a1a2e',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.hintBadge.add([bg, txt]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HUD – DIALOG BOX
  // ══════════════════════════════════════════════════════════════════════════

  private createDialogBox() {
    const W = COLS * TILE;
    const H = ROWS * TILE;
    const boxH = 80;
    const pad  = 12;

    this.dialogBox = this.add.container(0, H - boxH - 8).setDepth(30).setVisible(false).setScrollFactor(0);

    // background
    const bg = this.add.graphics();
    bg.fillStyle(C.dialogBg, 0.92);
    bg.fillRoundedRect(8, 0, W - 16, boxH, 6);
    bg.lineStyle(2, C.dialogBorder);
    bg.strokeRoundedRect(8, 0, W - 16, boxH, 6);

    // text
    this.dialogText = this.add.text(8 + pad, pad, '', {
      fontSize: '13px',
      fontFamily: '"Courier New", monospace',
      color: '#ffffff',
      wordWrap: { width: W - 16 - pad * 2 },
      lineSpacing: 4,
    });

    // close hint
    const closeTxt = this.add.text(W - 20, boxH - 10, 'SPACE to close', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#f0c040',
    }).setAlpha(0.8).setOrigin(1, 1);

    this.dialogBox.add([bg, this.dialogText, closeTxt]);
  }

  private openDialog(message: string) {
    this.dialogOpen = true;
    this.dialogText.setText(message);
    this.dialogBox.setVisible(true);
    this.hintBadge.setVisible(false);
  }

  private closeDialog() {
    this.dialogOpen = false;
    this.dialogBox.setVisible(false);
  }
}
