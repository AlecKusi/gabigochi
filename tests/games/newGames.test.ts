import { describe, expect, it } from 'vitest';
import { ICONS } from '../../src/art/icons';
import { BOXES, createBoxes, maxActive, pickPopper, stepBoxes, tapBox, type BoxesState } from '../../src/games/catBoxesLogic';
import { CUPS, createCups, guessCup, makeSwaps, swapCount, swapMs, trackCup } from '../../src/games/cupsLogic';
import {
  FOOD_CHAIN, MAX_LEVEL, SIZE, canMove, create2048, food2048Reward, mergePoints, move, slideLine, swipeDir,
  type Food2048State,
} from '../../src/games/food2048Logic';
import { OBSTACLES, RUN, createRun, hits, jumpRun, pickObstacle, runScore, stepRun, type RunState } from '../../src/games/catRunLogic';
import { SIMON, createSimon, pressString, simonReward, stepMs } from '../../src/games/simonLogic';

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe('2048 z jedzeniem', () => {
  it('łańcuch potraw: każda ma ikonkę, od jabłka do tortu', () => {
    expect(FOOD_CHAIN[0]).toBe('apple');
    expect(FOOD_CHAIN[MAX_LEVEL - 1]).toBe('cake');
    for (const f of FOOD_CHAIN) expect(ICONS[f], f).toBeDefined();
    expect(new Set(FOOD_CHAIN).size).toBe(FOOD_CHAIN.length);
  });

  it('linia: zsuwa, łączy pary raz na ruch, punkty jak w 2048, dwa torty się nie łączą', () => {
    expect(slideLine([0, 1, 0, 1])).toEqual({ line: [2, 0, 0, 0], gained: mergePoints(2), merged: [0] });
    expect(slideLine([1, 1, 1, 1]).line).toEqual([2, 2, 0, 0]);
    expect(slideLine([2, 1, 1, 0]).line).toEqual([2, 2, 0, 0]);
    expect(slideLine([3, 0, 0, 3]).gained).toBe(16);
    expect(slideLine([MAX_LEVEL, MAX_LEVEL, 0, 0]).line).toEqual([MAX_LEVEL, MAX_LEVEL, 0, 0]);
  });

  it('ruch w każdą stronę i nowy kafelek; ruch bez zmian się nie liczy', () => {
    const s: Food2048State = { grid: [1, 0, 0, 1, ...Array(12).fill(0)], score: 0, moves: 0, over: false };
    const left = move(s, 'left', seq(0, 0.5));
    expect(left.moved).toBe(true);
    expect(left.state.grid[0]).toBe(2);
    expect(left.state.score).toBe(4);
    expect(left.state.grid.filter((v) => v > 0)).toHaveLength(2);
    const right = move(s, 'right', seq(0, 0.5));
    expect(right.state.grid[3]).toBe(2);
    const down = move({ ...s, grid: [1, ...Array(11).fill(0), 1, 0, 0, 0] }, 'down', seq(0, 0.5));
    expect(down.state.grid[12]).toBe(2);
    const stuck: Food2048State = { grid: [1, 0, 0, 0, ...Array(12).fill(0)], score: 0, moves: 0, over: false };
    expect(move(stuck, 'left', seq(0)).moved).toBe(false);
  });

  it('koniec, gdy plansza pełna i bez par; start z dwoma kafelkami; nagroda', () => {
    const full = Array.from({ length: SIZE * SIZE }, (_, i) => ((i + Math.floor(i / SIZE)) % 2) + 1);
    expect(canMove(full)).toBe(false);
    expect(canMove([1, 1, ...full.slice(2)])).toBe(true);
    expect(create2048(seq(0.3, 0.5, 0.7, 0.5)).grid.filter((v) => v > 0)).toHaveLength(2);
    expect(food2048Reward(0).coins).toBe(3);
    expect(food2048Reward(800).coins).toBe(10);
    expect(food2048Reward(100_000).coins).toBe(50);
  });

  it('przesunięcie palcem → kierunek', () => {
    expect(swipeDir(40, 5)).toBe('right');
    expect(swipeDir(-40, 5)).toBe('left');
    expect(swipeDir(3, -50)).toBe('up');
    expect(swipeDir(3, 50)).toBe('down');
    expect(swipeDir(5, 5)).toBeNull();
  });
});

describe('kot w pudełkach', () => {
  const run = (s: BoxesState, ms: number, rng: () => number) => {
    for (let t = 0; t < ms; t += 50) s = stepBoxes(s, 50, rng).state;
    return s;
  };

  it('kotki wyskakują i chowają się same; naraz najwyżej 1, potem 2–3', () => {
    let s = createBoxes();
    let maxSeen = 0;
    let pops = 0;
    for (let t = 0; t < BOXES.duration; t += 50) {
      const r = stepBoxes(s, 50, Math.random);
      s = r.state;
      pops += r.events.filter((e) => e.type === 'pop').length;
      const active = s.holes.filter((h) => h && !h.hit).length;
      expect(active).toBeLessThanOrEqual(maxActive(s.t));
      maxSeen = Math.max(maxSeen, active);
    }
    expect(s.over).toBe(true);
    expect(pops).toBeGreaterThan(25);
    expect(maxSeen).toBeGreaterThanOrEqual(2);
    expect(maxActive(0)).toBe(1);
    expect(maxActive(BOXES.duration)).toBe(3);
  });

  it('stuknięcie: kot +1, złoty +5, ogórek −3 (wynik nie spada poniżej 0), puste — pudło', () => {
    const at = (kind: 'cat' | 'golden' | 'cucumber'): BoxesState => ({
      ...createBoxes(),
      score: 2,
      holes: [{ kind, since: 0, until: 1000, hit: false }, ...Array(8).fill(null)],
    });
    expect(tapBox(at('cat'), 0).state.score).toBe(2 + BOXES.points.cat);
    expect(tapBox(at('golden'), 0).state.score).toBe(2 + BOXES.points.golden);
    expect(tapBox(at('cucumber'), 0).state.score).toBe(0);
    const hit = tapBox(at('cat'), 0).state;
    expect(hit.holes[0]?.hit).toBe(true);
    expect(tapBox(hit, 0).events[0].type).toBe('miss');
    expect(tapBox(at('cat'), 3).events[0].type).toBe('miss');
    expect(run(hit, 400, Math.random).holes[0]).toBeNull();
  });

  it('ogórki dopiero po kilku sekundach, złote koty rzadko', () => {
    expect(pickPopper(0.1, 1000)).toBe('cat');
    expect(pickPopper(0.1, BOXES.cucumberFrom)).toBe('cucumber');
    expect(pickPopper(0.01, 0)).toBe('golden');
    expect(pickPopper(0.9, 20_000)).toBe('cat');
  });
});

describe('ukulele Simon', () => {
  it('cztery struny GCEA', () => {
    expect(SIMON.strings.map((s) => s.name).join('')).toBe('GCEA');
  });

  it('powtarzanie melodii: dobra nuta dalej, cała melodia — runda i dłuższa melodia, pomyłka — koniec', () => {
    let s = createSimon(seq(0.1));
    expect(s.seq).toEqual([0]);
    let r = pressString(s, 0, seq(0.6));
    expect(r.result).toBe('round');
    s = r.state;
    expect(s.seq).toEqual([0, 2]);
    expect(s.round).toBe(1);
    r = pressString(s, 0, seq(0.9));
    expect(r.result).toBe('ok');
    r = pressString(r.state, 3, seq(0.9));
    expect(r.result).toBe('wrong');
    expect(r.state.over).toBe(true);
    expect(r.state.round).toBe(1);
  });

  it('coraz szybciej i nagroda', () => {
    expect(stepMs(0)).toBe(620);
    expect(stepMs(5)).toBeLessThan(stepMs(1));
    expect(stepMs(100)).toBe(280);
    expect(simonReward(0).coins).toBe(3);
    expect(simonReward(5).coins).toBe(15);
    expect(simonReward(40).coins).toBe(45);
  });
});

describe('trzy kubki', () => {
  it('zamiany zawsze dwóch różnych kubków; śledzenie kotka', () => {
    for (let round = 0; round < 20; round++) {
      const swaps = makeSwaps(round, Math.random);
      expect(swaps).toHaveLength(swapCount(round));
      for (const [a, b] of swaps) {
        expect(a).not.toBe(b);
        expect([a, b].every((x) => x >= 0 && x < CUPS.count)).toBe(true);
      }
    }
    expect(trackCup(1, [[0, 1], [1, 2], [0, 2]])).toBe(2);
    expect(trackCup(1, [])).toBe(1);
  });

  it('trafienie — punkt; pudło — serduszko; 3 pudła — koniec; coraz szybciej i więcej zamian', () => {
    let s = createCups();
    s = guessCup(s, 1, 1).state;
    expect(s).toMatchObject({ score: 1, lives: CUPS.lives, round: 1 });
    for (let i = 0; i < CUPS.lives; i++) s = guessCup(s, 0, 2).state;
    expect(s.over).toBe(true);
    expect(s.lives).toBe(0);
    expect(swapMs(0)).toBe(480);
    expect(swapMs(50)).toBe(170);
    expect(swapCount(0)).toBe(CUPS.baseSwaps);
    expect(swapCount(100)).toBe(CUPS.maxSwaps);
  });
});

describe('skaczący kotek', () => {
  it('skok tylko z ziemi; ląduje; przeszkody nadjeżdżają, coraz szybciej', () => {
    let s = jumpRun(createRun()).state;
    expect(s.vy).toBe(RUN.jumpV);
    s = stepRun(s, 50, seq(0.5)).state;
    expect(s.y).toBeGreaterThan(0);
    expect(jumpRun(s).events).toEqual([]);
    for (let t = 0; t < 2500; t += 50) s = stepRun(s, 50, seq(0.5)).state;
    expect(s.y).toBe(0);
    expect(s.speed).toBeGreaterThan(RUN.speed0);
    expect(s.obstacles.length).toBeGreaterThan(0);
  });

  it('nad każdą przeszkodą da się przeskoczyć (przy każdej prędkości, przy której się pojawia)', () => {
    for (const kind of Object.keys(OBSTACLES) as (keyof typeof OBSTACLES)[]) {
      const speed = kind === 'tall' ? RUN.tallFrom : RUN.speed0;
      let cleared = false;
      // skok w różnych chwilach przed przeszkodą
      for (let lead = 0; lead < 80 && !cleared; lead += 2) {
        let s: RunState = { ...createRun(), speed, spawnIn: 1e9, obstacles: [{ x: RUN.catX + lead, kind }] };
        s = jumpRun(s).state;
        let ok = true;
        for (let t = 0; t < 1500; t += 10) {
          const r = stepRun({ ...s, speed }, 10, seq(0.99));
          s = r.state;
          if (s.over) {
            ok = false;
            break;
          }
        }
        cleared = ok;
      }
      expect(cleared, kind).toBe(true);
    }
  });

  it('zderzenie kończy bieg; rybka w skoku daje punkty', () => {
    expect(hits(0, { x: RUN.catX - 2, kind: 'pot' })).toBe(true);
    expect(hits(0, { x: RUN.catX + 8, kind: 'pot' })).toBe(true);
    expect(hits(0, { x: RUN.catX - 20, kind: 'pot' })).toBe(false);
    expect(hits(30, { x: RUN.catX - 2, kind: 'tall' })).toBe(false);
    let s: RunState = { ...createRun(), spawnIn: 1e9, obstacles: [{ x: RUN.catX + 3, kind: 'pot' }] };
    s = stepRun(s, 16, seq(0.5)).state;
    expect(s.over).toBe(true);
    const f = stepRun({ ...createRun(), spawnIn: 1e9, y: RUN.fishH - RUN.catH / 2, vy: 0, fish: [{ x: RUN.catX + RUN.catOffset, taken: false }] }, 16, seq(0.5));
    expect(f.events).toContainEqual({ type: 'fish' });
    expect(runScore({ distance: 100, fishCount: 2 })).toBe(10 + 2 * RUN.fishPoints);
    expect(pickObstacle(0.1, RUN.speed0)).toBe('pot');
    expect(pickObstacle(0.1, RUN.speedMax)).toBe('tall');
  });
});

describe('2048: łańcuch to jedzenie z lodówki', () => {
  it('każdy poziom ma nazwę potrawy', async () => {
    const { foodById } = await import('../../src/core/config');
    for (const f of FOOD_CHAIN) expect(() => foodById(f as never)).not.toThrow();
  });
});
