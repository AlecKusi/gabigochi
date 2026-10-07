import type { Reward } from './types';

/**
 * Bricks n Balls — czysta logika. Pole 128×192 px logicznych, klocki w siatce 7 kolumn,
 * fizyka ze stałym krokiem `DT` (1/120 s), w każdym kroku kilka podkroków, żeby kulka
 * nie przesunęła się o więcej niż pół promienia (brak tunelowania przy pełnej prędkości).
 * Stan jest modyfikowany w miejscu (setki kulek × 120 kroków/s — bez kopiowania).
 */
export const BRICKS = {
  W: 128,
  H: 192,
  COLS: 7,
  /** Wiersze siatki; klocek w ostatnim (`ROWS - 1`) = koniec gry. */
  ROWS: 11,
  /** Wiersz, w którym pojawia się nowy rząd (zerowy zostaje pusty — miejsce na odbicia nad klockami). */
  FIRST_ROW: 1,
  CELL_W: 18,
  CELL_H: 16,
  LEFT: 1,
  TOP: 8,
  /** Linia podłogi (dół kulek na starcie i przy lądowaniu). */
  FLOOR: 184,
  R: 2,
  /** Prędkość kulki, px/s. */
  SPEED: 260,
  DT: 1 / 120,
  /** Odstęp między kulkami w serii, s. */
  FIRE_GAP: 0.08,
  ROLL_SPEED: 220,
  BONUS_R: 4,
  MIN_ANGLE: 10,
  MAX_ANGLE: 170,
  /** Minimalny kąt odbicia od poziomu — kulka nie utknie, odbijając się poziomo między ścianami. */
  MIN_BOUNCE_DEG: 6,
  /** Po tylu sekundach tury kulki zaczynają lekko opadać (gwarancja końca tury). */
  LONG_TURN: 20,
  LONG_TURN_GRAVITY: 90,
  /** Minimalna odległość palca od punktu startu, żeby celować, px. */
  MIN_AIM: 4,
  /** Szansa na klocek z podwójną liczbą trafień (od rundy 3). */
  DOUBLE_CHANCE: 0.15,
} as const;

const SUBSTEPS = Math.ceil((BRICKS.SPEED * BRICKS.DT) / (BRICKS.R / 2));

export interface Brick {
  col: number;
  row: number;
  hits: number;
  /** Liczba trafień na początku (kolory, efekty). */
  max: number;
}

export interface Bonus {
  col: number;
  row: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Wylądowała i toczy się do nowego punktu startu. */
  rolling: boolean;
}

export interface BricksState {
  round: number;
  /** Kulki w tej turze. */
  balls: number;
  /** Zebrane bonusy — dochodzą po turze. */
  pending: number;
  startX: number;
  /** Punkt startu następnej tury (pierwsza kulka, która spadła). */
  nextX: number | null;
  phase: 'aim' | 'fire' | 'over';
  angle: number;
  toFire: number;
  fireIn: number;
  flying: Ball[];
  bricks: Brick[];
  bonuses: Bonus[];
  /** Czas bieżącej tury, s. */
  turnT: number;
}

export type BricksEvent =
  | { type: 'hit'; brick: Brick }
  | { type: 'break'; brick: Brick }
  | { type: 'bonus'; bonus: Bonus }
  | { type: 'landed'; first: boolean; x: number }
  | { type: 'turn'; round: number }
  | { type: 'over'; round: number };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Prostokąt klocka w px logicznych (komórka minus 1 px odstępu z każdej strony). */
export function brickRect(b: { col: number; row: number }): Rect {
  return {
    x: BRICKS.LEFT + b.col * BRICKS.CELL_W + 1,
    y: BRICKS.TOP + b.row * BRICKS.CELL_H + 1,
    w: BRICKS.CELL_W - 2,
    h: BRICKS.CELL_H - 2,
  };
}

export function bonusCenter(b: Bonus): { x: number; y: number } {
  return { x: BRICKS.LEFT + (b.col + 0.5) * BRICKS.CELL_W, y: BRICKS.TOP + (b.row + 0.5) * BRICKS.CELL_H };
}

/** Losowy nowy rząd (w wierszu `FIRST_ROW`): 2–6 klocków i jeden bonus +1 kulka w wolnej kolumnie. */
export function spawnRow(round: number, rng: () => number): { bricks: Brick[]; bonuses: Bonus[] } {
  const cols = Array.from({ length: BRICKS.COLS }, (_, i) => i);
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cols[i], cols[j]] = [cols[j], cols[i]];
  }
  const maxCount = round < 5 ? 4 : round < 15 ? 5 : 6;
  const count = 2 + Math.floor(rng() * (maxCount - 1));
  const bricks = cols.slice(0, count).map((col) => {
    const hits = round >= 3 && rng() < BRICKS.DOUBLE_CHANCE ? round * 2 : round;
    return { col, row: BRICKS.FIRST_ROW, hits, max: hits };
  });
  return { bricks, bonuses: [{ col: cols[count], row: BRICKS.FIRST_ROW }] };
}

export function createBricks(rng: () => number): BricksState {
  const row = spawnRow(1, rng);
  return {
    round: 1,
    balls: 1,
    pending: 0,
    startX: BRICKS.W / 2,
    nextX: null,
    phase: 'aim',
    angle: 90,
    toFire: 0,
    fireIn: 0,
    flying: [],
    bricks: row.bricks,
    bonuses: row.bonuses,
    turnT: 0,
  };
}

/**
 * Kąt strzału (stopnie, 0 = w prawo, 90 = w górę) od punktu startu w stronę palca,
 * ograniczony do 10°–170°. `null`, gdy palec jest tuż przy punkcie startu.
 */
export function aimAngle(from: { x: number; y: number }, to: { x: number; y: number }): number | null {
  const dx = to.x - from.x;
  const dy = from.y - to.y;
  if (Math.hypot(dx, dy) < BRICKS.MIN_AIM) return null;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) return dx >= 0 ? BRICKS.MIN_ANGLE : BRICKS.MAX_ANGLE;
  return clamp(deg, BRICKS.MIN_ANGLE, BRICKS.MAX_ANGLE);
}

/**
 * Kolizja koło–prostokąt: wypycha kulkę z prostokąta i — jeśli się do niego zbliża —
 * odbija prędkość względem normalnej w najbliższym punkcie (ściana albo róg).
 * Zwraca true, gdy nastąpiło odbicie.
 */
export function collideCircleRect(b: Ball, r: Rect): boolean {
  const R = BRICKS.R;
  const cx = clamp(b.x, r.x, r.x + r.w);
  const cy = clamp(b.y, r.y, r.y + r.h);
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return false;
  let nx: number;
  let ny: number;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    nx = dx / d;
    ny = dy / d;
    b.x = cx + nx * R;
    b.y = cy + ny * R;
  } else {
    // Środek w środku prostokąta — wypychamy najkrótszą drogą.
    const left = b.x - r.x;
    const right = r.x + r.w - b.x;
    const top = b.y - r.y;
    const bottom = r.y + r.h - b.y;
    const m = Math.min(left, right, top, bottom);
    nx = m === left ? -1 : m === right ? 1 : 0;
    ny = nx !== 0 ? 0 : m === top ? -1 : 1;
    if (nx < 0) b.x = r.x - R;
    else if (nx > 0) b.x = r.x + r.w + R;
    else if (ny < 0) b.y = r.y - R;
    else b.y = r.y + r.h + R;
  }
  const dot = b.vx * nx + b.vy * ny;
  if (dot >= 0) return false;
  b.vx -= 2 * dot * nx;
  b.vy -= 2 * dot * ny;
  return true;
}

/** Po odbiciu: stała prędkość i minimalny kąt od poziomu. */
function normalize(b: Ball): void {
  const S = BRICKS.SPEED;
  const minVy = S * Math.sin((BRICKS.MIN_BOUNCE_DEG * Math.PI) / 180);
  let vy = b.vy * (S / (Math.hypot(b.vx, b.vy) || 1));
  if (Math.abs(vy) < minVy) vy = vy < 0 ? -minVy : minVy;
  const vx = Math.sqrt(Math.max(0, S * S - vy * vy));
  b.vx = b.vx < 0 ? -vx : vx;
  b.vy = vy;
}

/** Rozpoczyna turę: seria `balls` kulek pod kątem `angleDeg` (ograniczonym do 10°–170°). */
export function fire(s: BricksState, angleDeg: number): void {
  if (s.phase !== 'aim') return;
  s.angle = clamp(angleDeg, BRICKS.MIN_ANGLE, BRICKS.MAX_ANGLE);
  s.phase = 'fire';
  s.toFire = s.balls;
  s.fireIn = 0;
  s.nextX = null;
  s.turnT = 0;
  s.flying = [];
}

/** Koniec tury: bonusy, nowy punkt startu, rzędy w dół, nowy rząd, koniec gry. */
export function endTurn(s: BricksState, rng: () => number): BricksEvent[] {
  s.balls += s.pending;
  s.pending = 0;
  if (s.nextX !== null) s.startX = s.nextX;
  s.nextX = null;
  s.flying = [];
  s.toFire = 0;
  s.turnT = 0;
  for (const b of s.bricks) b.row += 1;
  for (const b of s.bonuses) b.row += 1;
  const last = BRICKS.ROWS - 1;
  const reached = s.bonuses.filter((b) => b.row >= last).length;
  if (reached) {
    s.balls += reached;
    s.bonuses = s.bonuses.filter((b) => b.row < last);
  }
  if (s.bricks.some((b) => b.row >= last)) {
    s.phase = 'over';
    return [{ type: 'over', round: s.round }];
  }
  s.round += 1;
  const row = spawnRow(s.round, rng);
  s.bricks.push(...row.bricks);
  s.bonuses.push(...row.bonuses);
  s.phase = 'aim';
  return [{ type: 'turn', round: s.round }];
}

function launch(s: BricksState): void {
  const a = (s.angle * Math.PI) / 180;
  s.flying.push({ x: s.startX, y: BRICKS.FLOOR - BRICKS.R, vx: Math.cos(a) * BRICKS.SPEED, vy: -Math.sin(a) * BRICKS.SPEED, rolling: false });
}

/** Jeden krok fizyki (`DT`). Gdy wszystkie kulki wrócą, sam kończy turę (`endTurn`). */
export function stepBricks(s: BricksState, rng: () => number): BricksEvent[] {
  if (s.phase !== 'fire') return [];
  const { DT, R, W, FLOOR } = BRICKS;
  const events: BricksEvent[] = [];
  s.turnT += DT;

  while (s.toFire > 0 && s.fireIn <= 0) {
    launch(s);
    s.toFire -= 1;
    s.fireIn += BRICKS.FIRE_GAP;
  }
  if (s.toFire > 0) s.fireIn -= DT;

  const h = DT / SUBSTEPS;
  const sink = s.turnT > BRICKS.LONG_TURN;
  const rest: Ball[] = [];
  for (const b of s.flying) {
    if (b.rolling) {
      const target = s.nextX ?? b.x;
      const step = BRICKS.ROLL_SPEED * DT;
      if (Math.abs(target - b.x) <= step) continue; // wróciła
      b.x += Math.sign(target - b.x) * step;
      rest.push(b);
      continue;
    }
    if (sink) {
      b.vy += BRICKS.LONG_TURN_GRAVITY * DT;
      normalize(b);
    }
    let landed = false;
    for (let i = 0; i < SUBSTEPS && !landed; i++) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      let bounced = false;
      if (b.x < R) {
        b.x = R;
        if (b.vx < 0) {
          b.vx = -b.vx;
          bounced = true;
        }
      } else if (b.x > W - R) {
        b.x = W - R;
        if (b.vx > 0) {
          b.vx = -b.vx;
          bounced = true;
        }
      }
      if (b.y < R) {
        b.y = R;
        if (b.vy < 0) {
          b.vy = -b.vy;
          bounced = true;
        }
      }
      for (let j = s.bricks.length - 1; j >= 0; j--) {
        const brick = s.bricks[j];
        if (!collideCircleRect(b, brickRect(brick))) continue;
        bounced = true;
        brick.hits -= 1;
        events.push({ type: 'hit', brick });
        if (brick.hits <= 0) {
          s.bricks.splice(j, 1);
          events.push({ type: 'break', brick });
        }
      }
      if (bounced) normalize(b);
      for (let j = s.bonuses.length - 1; j >= 0; j--) {
        const c = bonusCenter(s.bonuses[j]);
        if (Math.hypot(b.x - c.x, b.y - c.y) < R + BRICKS.BONUS_R) {
          events.push({ type: 'bonus', bonus: s.bonuses[j] });
          s.bonuses.splice(j, 1);
          s.pending += 1;
        }
      }
      if (b.y + R >= FLOOR && b.vy > 0) {
        landed = true;
        b.y = FLOOR - R;
        b.vx = 0;
        b.vy = 0;
        if (s.nextX === null) {
          s.nextX = clamp(b.x, R, W - R);
          events.push({ type: 'landed', first: true, x: s.nextX });
        } else {
          events.push({ type: 'landed', first: false, x: b.x });
          b.rolling = true;
          rest.push(b);
        }
      }
    }
    if (!landed) rest.push(b);
  }
  s.flying = rest;

  if (s.toFire === 0 && s.flying.length === 0) events.push(...endTurn(s, rng));
  return events;
}

/**
 * Gdzie kończy się linia celowania: środek kulki w chwili pierwszego zetknięcia
 * ze ścianą (bocznej lub górnej) albo z klockiem.
 */
export function aimPath(s: BricksState, angleDeg: number): { x: number; y: number } {
  const { R, W } = BRICKS;
  const a = (clamp(angleDeg, BRICKS.MIN_ANGLE, BRICKS.MAX_ANGLE) * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = -Math.sin(a);
  const rects = s.bricks.map(brickRect);
  let x = s.startX;
  let y = BRICKS.FLOOR - R;
  const touches = (px: number, py: number) =>
    px <= R || px >= W - R || py <= R ||
    rects.some((r) => {
      const cx = clamp(px, r.x, r.x + r.w);
      const cy = clamp(py, r.y, r.y + r.h);
      return (px - cx) ** 2 + (py - cy) ** 2 < R * R;
    });
  const step = 0.5;
  for (let i = 0; i < 1000; i++) {
    const nx = x + ux * step;
    const ny = y + uy * step;
    if (touches(nx, ny)) return { x: clamp(x, R, W - R), y: Math.max(R, y) };
    x = nx;
    y = ny;
  }
  return { x, y };
}

/** Wynik = osiągnięta runda; 2 monety za rundę, maks. 50; humor +10. */
export function bricksReward(round: number): Reward {
  return { coins: Math.min(50, Math.max(0, round) * 2), moodBoost: 10 };
}
