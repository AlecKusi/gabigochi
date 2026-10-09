import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import { play } from '../ui/sound';
import { makeCanvas, runLoop } from './canvas';
import { drawCat, preloadCat } from './catDraw';
import { CUPS, createCups, cupsReward, guessCup, makeSwaps, swapMs, type CupsState } from './cupsLogic';
import type { MiniGame } from './types';

const W = 128;
const H = 140;
/** Blat stołu (dolna krawędź kubków) i środki trzech miejsc. */
const TABLE_Y = 104;
const SLOT_X = [26, 64, 102];
const CUP_W = 24;
const CUP_H = 26;
const LIFT = 22;

const SHOW = { up: 300, hold: 900, down: 300 };
const REVEAL = { up: 250, second: 450, hold: 1400 };

type Phase = 'show' | 'shuffle' | 'guess' | 'reveal' | 'end';

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));

/** Kubek dnem do góry: fioletowy z różowym paskiem; (x — środek, y — dolna krawędź). */
function drawCup(c: CanvasRenderingContext2D, x: number, y: number): void {
  const rows: [number, string][] = [];
  for (let r = 0; r < CUP_H; r++) {
    // od dna (u góry, węższe) do brzegu (u dołu, szersze)
    const w = Math.round(14 + ((CUP_W - 14) * r) / (CUP_H - 1));
    rows.push([w, r >= 15 && r <= 17 ? '#ff9ec4' : r === CUP_H - 1 ? '#7a4fb3' : '#b48ae0']);
  }
  const top = Math.round(y - CUP_H);
  c.fillStyle = '#1b1326';
  c.fillRect(Math.round(x - 8), top - 1, 16, 1);
  rows.forEach(([w, colour], r) => {
    const x0 = Math.round(x - w / 2);
    c.fillStyle = '#1b1326';
    c.fillRect(x0 - 1, top + r, w + 2, 1);
    c.fillStyle = colour;
    c.fillRect(x0, top + r, w, 1);
    // blask z lewej, cień z prawej
    c.fillStyle = r < 15 ? '#d9c2f5' : colour;
    c.fillRect(x0 + 2, top + r, 1, 1);
    c.fillStyle = '#7a4fb3';
    c.fillRect(x0 + w - 3, top + r, 2, 1);
  });
  c.fillStyle = '#1b1326';
  c.fillRect(Math.round(x - CUP_W / 2) - 1, Math.round(y), CUP_W + 2, 1);
}

export const cupsGame: MiniGame = {
  id: 'cups',
  name: 'Trzy kubki',
  description: 'Pod którym kubkiem jest kotek?',
  icon: 'cup',
  category: 'arcade',
  reward: cupsReward,
  async play(env) {
    preloadCat(['cat_sit', 'cat_beg']);
    const { canvas, ctx, fx, present, toLogical, dispose } = makeCanvas(env.body, W, H);
    let st: CupsState = createCups();
    /** Miejsce każdego kubka (indeks = kubek). */
    let cupSlot = [0, 1, 2];
    const catCup = Math.floor(Math.random() * CUPS.count);
    let phase: Phase = 'show';
    let pt = 0;
    let swaps: [number, number][] = [];
    let swapI = 0;
    let picked = -1;
    let correct = false;
    let message = 'Patrz uważnie!';

    canvas.addEventListener('pointerdown', (e) => {
      if (phase !== 'guess') return;
      const p = toLogical(e);
      if (p.y < TABLE_Y - CUP_H - 6 || p.y > TABLE_Y + 8) return;
      const slot = SLOT_X.findIndex((x) => Math.abs(p.x - x) <= CUP_W / 2 + 4);
      if (slot < 0) return;
      picked = slot;
      const r = guessCup(st, slot, cupSlot[catCup]);
      st = r.state;
      correct = r.correct;
      message = correct ? 'Brawo! Znalazłaś kotka!' : 'Pudło!';
      play(correct ? 'sparkle' : 'bad');
      if (correct) window.setTimeout(() => play('meow'), 200);
      phase = 'reveal';
      pt = 0;
    });

    /** Gdzie jest kubek i jak wysoko podniesiony. */
    const cupPose = (id: number): { x: number; y: number; lift: number; front: boolean } => {
      const slot = cupSlot[id];
      let x = SLOT_X[slot];
      let y = TABLE_Y;
      let front = false;
      if (phase === 'shuffle' && swapI < swaps.length) {
        const [a, b] = swaps[swapI];
        if (slot === a || slot === b) {
          const u = ease(clamp01(pt / swapMs(st.round)));
          const to = slot === a ? b : a;
          x = SLOT_X[slot] + (SLOT_X[to] - SLOT_X[slot]) * u;
          // jeden kubek jedzie łukiem z tyłu (wyżej), drugi z przodu (niżej)
          front = slot === a;
          y += Math.sin(u * Math.PI) * (front ? 3 : -7);
        }
      }
      let lift = 0;
      if (phase === 'show' && id === catCup) {
        lift = pt < SHOW.up ? pt / SHOW.up : pt < SHOW.up + SHOW.hold ? 1 : 1 - (pt - SHOW.up - SHOW.hold) / SHOW.down;
      }
      if (phase === 'reveal' || phase === 'end') {
        if (slot === picked) lift = Math.min(1, pt / REVEAL.up);
        else if (id === catCup && !correct) lift = clamp01((pt - REVEAL.second) / REVEAL.up);
      }
      return { x, y, lift: ease(clamp01(lift)) * LIFT, front };
    };

    const nextPhase = () => {
      if (phase === 'show' && pt >= SHOW.up + SHOW.hold + SHOW.down) {
        phase = 'shuffle';
        pt = 0;
        swaps = makeSwaps(st.round, Math.random);
        swapI = 0;
        message = 'Patrz uważnie!';
        play('whoosh');
      } else if (phase === 'shuffle' && pt >= swapMs(st.round)) {
        const [a, b] = swaps[swapI];
        cupSlot = cupSlot.map((s) => (s === a ? b : s === b ? a : s));
        swapI++;
        pt = 0;
        if (swapI >= swaps.length) {
          phase = 'guess';
          message = 'Gdzie jest kotek?';
        } else play('whoosh');
      } else if (phase === 'reveal' && pt >= REVEAL.hold) {
        if (st.over) {
          phase = 'end';
          pt = 0;
          message = 'Koniec gry!';
        } else {
          phase = 'show';
          pt = 0;
          picked = -1;
          message = 'Patrz uważnie!';
        }
      }
    };

    await runLoop(env.signal, (dt) => {
      pt += dt;
      nextPhase();
      // pokój i stół
      ctx.fillStyle = '#cdb8f0';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c2abea';
      for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 4, 70);
      ctx.fillStyle = '#5c3a26';
      ctx.fillRect(0, TABLE_Y - 2, W, H - TABLE_Y + 2);
      ctx.fillStyle = '#b5763f';
      ctx.fillRect(0, TABLE_Y - 4, W, 6);
      ctx.fillStyle = '#d9a066';
      ctx.fillRect(0, TABLE_Y - 4, W, 1);
      // kubki nad kotkiem (warstwa efektów), z tyłu najpierw
      fx.clearRect(0, 0, W, H);
      const poses = [0, 1, 2].map((id) => ({ id, ...cupPose(id) })).sort((p, q) => Number(p.front) - Number(q.front));
      for (const p of poses) drawCup(fx, p.x, p.y - p.lift);
      for (let i = 0; i < CUPS.lives; i++) fx.drawImage(artCanvas(i < st.lives ? ICONS.heartSmall : ICONS.heartEmpty), 3 + i * 7, 3);
      const cat = poses.find((p) => p.id === catCup)!;
      present((d, k) => {
        // kotek tylko wtedy, gdy stoi pod kubkiem (w czasie tasowania kubek jedzie łukiem — nie pokazujemy łapek)
        if (phase !== 'shuffle') drawCat(d, k, correct && phase !== 'show' ? 'cat_beg' : 'cat_sit', cat.x, TABLE_Y, { zoom: 1.1 });
        d.font = `700 ${9 * k}px "Pixelify Sans"`;
        d.textAlign = 'center';
        d.lineWidth = 2 * k;
        d.strokeStyle = '#1b1326';
        d.strokeText(message, (W / 2) * k, 30 * k, (W - 8) * k);
        d.fillStyle = phase === 'reveal' && !correct ? '#ff9ec4' : '#ffffff';
        d.fillText(message, (W / 2) * k, 30 * k, (W - 8) * k);
      });
      env.setHud(`${st.score} pkt · runda ${st.round + (phase === 'reveal' || phase === 'end' ? 0 : 1)}`);
      return !(phase === 'end' && pt > 900);
    });
    dispose();
    return st.score;
  },
};
