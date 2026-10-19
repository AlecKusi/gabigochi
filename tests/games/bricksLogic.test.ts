import { describe, expect, it } from 'vitest';
import {
  BRICKS,
  aimAngle,
  aimPath,
  bonusCenter,
  brickRect,
  bricksReward,
  collideCircleRect,
  createBricks,
  endTurn,
  fire,
  spawnRow,
  stepBricks,
  type Ball,
  type BricksEvent,
  type BricksState,
} from '../../src/games/bricksLogic';

const rng = () => 0.5;
const { R, SPEED, FLOOR, W } = BRICKS;

/** Pusta plansza w fazie lotu, bez kulek do wystrzelenia. */
const flying = (patch: Partial<BricksState> = {}): BricksState => ({
  ...createBricks(rng),
  bricks: [],
  bonuses: [],
  phase: 'fire',
  toFire: 0,
  ...patch,
});

const ball = (x: number, y: number, vx: number, vy: number): Ball => ({ x, y, vx, vy, rolling: false });

/** Kroki fizyki aż do warunku (z limitem). */
function runUntil(s: BricksState, done: (s: BricksState, ev: BricksEvent[]) => boolean, max = 120 * 60): BricksEvent[] {
  const all: BricksEvent[] = [];
  for (let i = 0; i < max; i++) {
    const ev = stepBricks(s, rng);
    all.push(...ev);
    if (done(s, ev)) return all;
  }
  throw new Error('symulacja nie zakończyła się');
}

describe('collideCircleRect', () => {
  const rect = { x: 10, y: 10, w: 16, h: 14 };

  it('odbicie od spodu klocka odwraca vy, zostawia vx', () => {
    const b = ball(18, 10 + 14 + R - 0.5, 30, -200);
    expect(collideCircleRect(b, rect)).toBe(true);
    expect(b.vy).toBeCloseTo(200);
    expect(b.vx).toBeCloseTo(30);
    expect(b.y).toBeCloseTo(10 + 14 + R);
  });

  it('odbicie od lewego boku odwraca vx', () => {
    const b = ball(10 - R + 0.5, 17, 200, -40);
    expect(collideCircleRect(b, rect)).toBe(true);
    expect(b.vx).toBeCloseTo(-200);
    expect(b.vy).toBeCloseTo(-40);
    expect(b.x).toBeCloseTo(10 - R);
  });

  it('róg odbija wzdłuż normalnej (kulka lecąca prosto w róg wraca)', () => {
    const d = Math.SQRT1_2;
    const b = ball(10 - d * (R - 0.2), 10 - d * (R - 0.2), 100, 100);
    expect(collideCircleRect(b, rect)).toBe(true);
    expect(b.vx).toBeCloseTo(-100);
    expect(b.vy).toBeCloseTo(-100);
  });

  it('brak kontaktu albo kulka już się oddala — bez zmian', () => {
    const far = ball(0, 0, 100, 100);
    expect(collideCircleRect(far, rect)).toBe(false);
    const leaving = ball(18, 10 + 14 + R - 0.5, 0, 200);
    expect(collideCircleRect(leaving, rect)).toBe(false);
    expect(leaving.vy).toBe(200);
  });
});

describe('ściany', () => {
  it('odbicie od lewej, prawej i górnej ściany', () => {
    const s = flying({ flying: [ball(R + 0.5, 100, -200, -100), ball(W - R - 0.5, 100, 200, -100), ball(64, R + 0.5, 50, -200)] });
    stepBricks(s, rng);
    expect(s.flying[0].vx).toBeGreaterThan(0);
    expect(s.flying[1].vx).toBeLessThan(0);
    expect(s.flying[2].vy).toBeGreaterThan(0);
    for (const b of s.flying) expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(SPEED);
  });
});

describe('klocki', () => {
  it('trafienie zmniejsza licznik, ostatnie usuwa klocek', () => {
    const brick = { col: 3, row: 5, hits: 2, max: 2 };
    const r = brickRect(brick);
    const s = flying({ bricks: [brick], flying: [ball(r.x + r.w / 2, r.y + r.h + R + 1, 0, -SPEED)] });
    const ev = runUntil(s, (_, e) => e.some((x) => x.type === 'hit'));
    expect(brick.hits).toBe(1);
    expect(s.flying[0].vy).toBeGreaterThan(0);
    expect(ev.some((x) => x.type === 'break')).toBe(false);

    s.flying = [ball(r.x + r.w / 2, r.y + r.h + R + 1, 0, -SPEED)];
    const ev2 = runUntil(s, (_, e) => e.some((x) => x.type === 'break'));
    expect(ev2.filter((x) => x.type === 'break')).toHaveLength(1);
    expect(s.bricks).toHaveLength(0);
  });

  it('bez tunelowania: kulka nigdy nie wchodzi w klocek, pod żadnym kątem', () => {
    for (let a = 10; a <= 170; a += 7) {
      const s = createBricks(rng);
      s.bricks = [];
      for (let row = 1; row < 7; row++) for (let col = 0; col < BRICKS.COLS; col++) s.bricks.push({ col, row, hits: 1000, max: 1000 });
      s.balls = 3;
      fire(s, a);
      for (let i = 0; i < 120 * 4; i++) {
        stepBricks(s, rng);
        for (const b of s.flying) {
          if (b.rolling) continue;
          for (const br of s.bricks) {
            const r = brickRect(br);
            const cx = Math.max(r.x, Math.min(r.x + r.w, b.x));
            const cy = Math.max(r.y, Math.min(r.y + r.h, b.y));
            expect(Math.hypot(b.x - cx, b.y - cy)).toBeGreaterThan(R - 0.01);
          }
          expect(b.x).toBeGreaterThanOrEqual(R - 0.01);
          expect(b.x).toBeLessThanOrEqual(W - R + 0.01);
          expect(b.y).toBeGreaterThanOrEqual(R - 0.01);
        }
      }
    }
  }, 30_000); // dużo kroków i asercji — na wolniejszym serwerze CI ponad 5 s

  it('kulka nie utyka w ruchu poziomym (minimalna składowa pionowa)', () => {
    const s = flying({ flying: [ball(64, 100, SPEED, -0.001)] });
    stepBricks(s, rng);
    stepBricks(s, rng);
    const b = s.flying[0];
    expect(Math.abs(b.vy)).toBeGreaterThan(0);
    const s2 = flying({ flying: [ball(W - R - 0.2, 100, SPEED, -0.5)] });
    stepBricks(s2, rng);
    expect(Math.abs(s2.flying[0].vy) / SPEED).toBeGreaterThanOrEqual(Math.sin((BRICKS.MIN_BOUNCE_DEG * Math.PI) / 180) - 1e-9);
  });
});

describe('bonus +1 kulka', () => {
  it('przelot przez bonus zbiera go (kulka leci dalej)', () => {
    const bonus = { col: 2, row: 4 };
    const c = bonusCenter(bonus);
    const s = flying({ bonuses: [bonus], flying: [ball(c.x, c.y + 10, 0, -SPEED)] });
    const ev = runUntil(s, (_, e) => e.some((x) => x.type === 'bonus'));
    expect(ev.filter((x) => x.type === 'bonus')).toHaveLength(1);
    expect(s.bonuses).toHaveLength(0);
    expect(s.pending).toBe(1);
    expect(s.flying[0].vy).toBeLessThan(0);
  });

  it('zebrane kulki dochodzą po turze', () => {
    const s = flying({ balls: 3, pending: 2 });
    endTurn(s, rng);
    expect(s.balls).toBe(5);
    expect(s.pending).toBe(0);
  });
});

describe('tura', () => {
  it('wystrzał wypuszcza kulki co 80 ms z punktu startu pod zadanym kątem', () => {
    const s = createBricks(rng);
    s.bricks = [];
    s.bonuses = [];
    s.balls = 3;
    s.startX = 40;
    fire(s, 60);
    expect(s.phase).toBe('fire');
    stepBricks(s, rng);
    expect(s.flying).toHaveLength(1);
    const b = s.flying[0];
    expect(b.vx / SPEED).toBeCloseTo(Math.cos(Math.PI / 3), 1);
    expect(-b.vy / SPEED).toBeCloseTo(Math.sin(Math.PI / 3), 1);
    // 80 ms = ~9.6 kroku po 1/120 s
    for (let i = 0; i < 9; i++) stepBricks(s, rng);
    expect(s.flying).toHaveLength(1);
    stepBricks(s, rng);
    expect(s.flying).toHaveLength(2);
    expect(s.toFire).toBe(1);
  });

  it('kąt ograniczony do 10°–170°', () => {
    const s = createBricks(rng);
    s.bricks = [];
    fire(s, 2);
    stepBricks(s, rng);
    const b = s.flying[0];
    expect((Math.atan2(-b.vy, b.vx) * 180) / Math.PI).toBeCloseTo(10, 0);
  });

  it('pierwsza kulka, która spadnie, wyznacza nowy punkt startu', () => {
    const s = flying({ startX: 64, flying: [ball(100, FLOOR - R - 1, 50, 200), ball(20, FLOOR - R - 10, -10, 200)] });
    const ev = runUntil(s, (_, e) => e.some((x) => x.type === 'landed'));
    expect(ev.find((x) => x.type === 'landed')).toEqual({ type: 'landed', first: true, x: s.nextX });
    expect(s.nextX).toBeGreaterThan(100);
    const firstX = s.nextX;
    runUntil(s, (st) => st.phase === 'aim');
    expect(s.startX).toBe(firstX);
    expect(s.nextX).toBeNull();
  });

  it('po turze rząd w dół, nowy rząd na górze, runda +1', () => {
    const s = flying({ round: 4, bricks: [{ col: 1, row: 2, hits: 3, max: 4 }], bonuses: [{ col: 5, row: 3 }] });
    const ev = endTurn(s, rng);
    expect(ev).toContainEqual({ type: 'turn', round: 5 });
    expect(s.round).toBe(5);
    expect(s.phase).toBe('aim');
    expect(s.bricks.find((b) => b.col === 1)?.row).toBe(3);
    expect(s.bonuses.find((b) => b.col === 5)?.row).toBe(4);
    const top = s.bricks.filter((b) => b.row === BRICKS.FIRST_ROW);
    expect(top.length).toBeGreaterThan(0);
    for (const b of top) expect([5, 10]).toContain(b.hits);
  });

  it('cała tura do końca: kulki wracają, faza celowania', () => {
    const s = createBricks(rng);
    s.balls = 4;
    fire(s, 75);
    const ev = runUntil(s, (st) => st.phase !== 'fire');
    expect(s.phase).toBe('aim');
    expect(s.round).toBe(2);
    expect(s.flying).toHaveLength(0);
    expect(ev.filter((e) => e.type === 'landed')).toHaveLength(4);
    expect(ev.filter((e) => e.type === 'landed' && e.first)).toHaveLength(1);
  });

  it('koniec gry, gdy klocek dojdzie do dołu', () => {
    const s = flying({ round: 9, bricks: [{ col: 0, row: BRICKS.ROWS - 2, hits: 1, max: 9 }] });
    const ev = endTurn(s, rng);
    expect(s.phase).toBe('over');
    expect(ev).toContainEqual({ type: 'over', round: 9 });
    expect(s.round).toBe(9);
  });

  it('bonus, który doszedł do dołu, zbiera się sam', () => {
    const s = flying({ balls: 2, bonuses: [{ col: 0, row: BRICKS.ROWS - 2 }] });
    endTurn(s, rng);
    expect(s.balls).toBe(3);
    expect(s.bonuses.every((b) => b.row < BRICKS.ROWS - 1)).toBe(true);
  });

  it('bardzo długa tura: kulki w końcu spadają', () => {
    // Pułapka: kulka odbijająca się prawie poziomo między ścianami.
    const s = flying({ flying: [ball(64, 60, SPEED, -SPEED * 0.1)] });
    runUntil(s, (st) => st.phase === 'aim', 120 * 120);
    expect(s.phase).toBe('aim');
  });
});

describe('spawnRow', () => {
  it('2–6 klocków o liczbie trafień = runda (czasem ×2) i jeden bonus w wolnej kolumnie', () => {
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let round = 1; round < 60; round++) {
      const { bricks, bonuses } = spawnRow(round, rnd);
      expect(bricks.length).toBeGreaterThanOrEqual(2);
      expect(bricks.length).toBeLessThanOrEqual(6);
      expect(bonuses).toHaveLength(1);
      const cols = new Set(bricks.map((b) => b.col));
      expect(cols.size).toBe(bricks.length);
      expect(cols.has(bonuses[0].col)).toBe(false);
      for (const b of bricks) {
        expect([round, round * 2]).toContain(b.hits);
        expect(b.max).toBe(b.hits);
        expect(b.row).toBe(BRICKS.FIRST_ROW);
      }
    }
  });

  it('nowa gra: runda 1, jedna kulka, rząd klocków', () => {
    const s = createBricks(rng);
    expect(s.round).toBe(1);
    expect(s.balls).toBe(1);
    expect(s.phase).toBe('aim');
    expect(s.bricks.length).toBeGreaterThan(0);
    expect(s.bricks.every((b) => b.hits === 1)).toBe(true);
  });
});

describe('aimAngle', () => {
  const from = { x: 64, y: FLOOR - R };
  it('kąt w stronę palca, 90° = pionowo w górę', () => {
    expect(aimAngle(from, { x: 64, y: 50 })).toBeCloseTo(90);
    expect(aimAngle(from, { x: 164, y: from.y - 100 })).toBeCloseTo(45);
    expect(aimAngle(from, { x: -36, y: from.y - 100 })).toBeCloseTo(135);
  });
  it('ograniczenie do 10°–170°, palec poniżej punktu startu', () => {
    expect(aimAngle(from, { x: 120, y: from.y + 30 })).toBe(10);
    expect(aimAngle(from, { x: 10, y: from.y + 30 })).toBe(170);
    expect(aimAngle(from, { x: 120, y: from.y - 1 })).toBe(10);
  });
  it('za blisko punktu startu — brak celu', () => {
    expect(aimAngle(from, { x: 65, y: from.y - 2 })).toBeNull();
  });
});

describe('aimPath', () => {
  it('linia celowania kończy się na ścianie albo pod klockiem', () => {
    const s = createBricks(rng);
    s.bricks = [];
    s.startX = 64;
    const top = aimPath(s, 90);
    expect(top.x).toBeCloseTo(64);
    expect(top.y).toBeLessThanOrEqual(R + 1);
    const brick = { col: 3, row: 4, hits: 1, max: 1 };
    s.bricks = [brick];
    const r = brickRect(brick);
    s.startX = r.x + r.w / 2;
    const hit = aimPath(s, 90);
    expect(hit.y).toBeGreaterThanOrEqual(r.y + r.h + R - 0.01);
    expect(hit.y).toBeLessThanOrEqual(r.y + r.h + R + 1);
  });
});

describe('bricksReward', () => {
  it('2 monety za rundę, maks. 50; humor +10', () => {
    expect(bricksReward(1)).toEqual({ coins: 2, moodBoost: 10 });
    expect(bricksReward(12).coins).toBe(24);
    expect(bricksReward(40).coins).toBe(50);
    expect(bricksReward(0).coins).toBe(0);
  });
});
