export const CATCH = {
  W: 128,
  H: 200,
  duration: 60_000,
  playerY: 192,
  catchTop: 140,
  catchBottom: 165,
  catchHalfWidth: 14,
  itemSize: 12,
  lives: 3,
  playerSpeed: 160,
  minX: 12,
  maxX: 116,
} as const;

export type ItemKind = 'apple' | 'sandwich' | 'pizza' | 'cake' | 'kitkat' | 'broccoli';

/** KitKat = 5× kanapka (spec: rzadki bonus ×5). */
export const POINTS: Record<ItemKind, number> = { apple: 3, sandwich: 5, pizza: 7, cake: 10, kitkat: 25, broccoli: 0 };

export interface FallingItem {
  x: number;
  y: number;
  kind: ItemKind;
  vy: number;
}

export interface CatchState {
  t: number;
  items: FallingItem[];
  playerX: number;
  targetX: number;
  moving: -1 | 0 | 1;
  score: number;
  lives: number;
  spawnIn: number;
  over: boolean;
}

export type CatchEvent = { type: 'caught'; kind: ItemKind; points: number } | { type: 'hit' } | { type: 'over' };

export function createCatch(): CatchState {
  return { t: 0, items: [], playerX: CATCH.W / 2, targetX: CATCH.W / 2, moving: 0, score: 0, lives: CATCH.lives, spawnIn: 600, over: false };
}

export function pickKind(r: number): ItemKind {
  if (r < 0.04) return 'kitkat';
  if (r < 0.26) return 'broccoli';
  if (r < 0.5) return 'apple';
  if (r < 0.7) return 'sandwich';
  if (r < 0.87) return 'pizza';
  return 'cake';
}

export function stepCatch(s: CatchState, dtMs: number, rng: () => number): { state: CatchState; events: CatchEvent[] } {
  if (s.over) return { state: s, events: [] };
  const events: CatchEvent[] = [];
  const t = s.t + dtMs;
  const p = Math.min(1, t / CATCH.duration);
  const sec = dtMs / 1000;

  const target = Math.max(CATCH.minX, Math.min(CATCH.maxX, s.targetX));
  const diff = target - s.playerX;
  const maxStep = CATCH.playerSpeed * sec;
  const playerX = Math.abs(diff) <= maxStep ? target : s.playerX + Math.sign(diff) * maxStep;
  const moving: CatchState['moving'] = Math.abs(diff) < 0.5 ? 0 : diff > 0 ? 1 : -1;

  let items = s.items.map((it) => ({ ...it, y: it.y + it.vy * sec }));
  let spawnIn = s.spawnIn - dtMs;
  if (spawnIn <= 0) {
    items.push({ kind: pickKind(rng()), x: 4 + rng() * (CATCH.W - 8 - CATCH.itemSize), y: -CATCH.itemSize, vy: 40 + 70 * p });
    spawnIn += 900 - 550 * p;
  }

  let score = s.score;
  let lives = s.lives;
  items = items.filter((it) => {
    const centerX = it.x + CATCH.itemSize / 2;
    const inZone = it.y + CATCH.itemSize >= CATCH.catchTop && it.y <= CATCH.catchBottom;
    if (inZone && Math.abs(centerX - playerX) <= CATCH.catchHalfWidth) {
      if (it.kind === 'broccoli') {
        lives -= 1;
        events.push({ type: 'hit' });
      } else {
        score += POINTS[it.kind];
        events.push({ type: 'caught', kind: it.kind, points: POINTS[it.kind] });
      }
      return false;
    }
    return it.y < CATCH.H;
  });

  const over = lives <= 0 || t >= CATCH.duration;
  if (over) events.push({ type: 'over' });
  return { state: { t, items, playerX, targetX: s.targetX, moving, score, lives, spawnIn, over }, events };
}
