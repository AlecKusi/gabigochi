import { h } from '../ui/dom';
import { drawSprite } from '../ui/pixelStage';
import { play, pluck } from '../ui/sound';
import { makeCanvas, runLoop } from './canvas';
import { SIMON, createSimon, pressString, simonReward, stepMs, type SimonState } from './simonLogic';
import type { MiniGame } from './types';

const W = 128;
const H = 76;
/** Kolory strun (ten sam w nutce nad Gabi). */
const COLOURS = ['#b48ae0', '#ff9ec4', '#5aa8f0', '#ffd34d'];

export const simonGame: MiniGame = {
  id: 'simon',
  name: 'Ukulele Simon',
  description: 'Powtórz melodię Gabi!',
  icon: 'note',
  category: 'puzzle',
  reward: simonReward,
  async play(env) {
    // Gabi na górze (płótno we własnym pudełku), pod nią podpowiedź i struny
    const top = h('div', { class: 'simon-stage' });
    const hint = h('p', { class: 'simon-hint' }, 'Słuchaj…');
    const pads = SIMON.strings.map((st, i) =>
      h(
        'button',
        { class: 'simon-string', style: `--string:${COLOURS[i]}`, 'aria-label': `Struna ${st.name}`, disabled: true },
        h('span', { class: 'simon-line' }),
        h('strong', {}, st.name),
      ),
    );
    env.body.append(h('div', { class: 'simon' }, top, hint, h('div', { class: 'simon-strings' }, ...pads)));
    const stage = makeCanvas(top, W, H);

    let s: SimonState = createSimon(Math.random);
    let listening = false;
    let frame = 'uke_1';
    let strums = 0;
    const notes: { x: number; y: number; colour: string; life: number }[] = [];

    /** Czekanie liczone w czasie gry (stoi, gdy otwarte są zasady; kończy się przy przerwaniu). */
    const wait = (ms: number) => {
      let acc = 0;
      return runLoop(env.signal, (dt) => (acc += dt) < ms);
    };

    const sound = (i: number) => {
      pluck(SIMON.strings[i].freq);
      strums++;
      frame = `uke_${1 + (strums % 6)}`;
      notes.push({ x: 82 + (i - 1.5) * 6, y: 26, colour: COLOURS[i], life: 900 });
      const pad = pads[i];
      pad.classList.add('lit');
      window.setTimeout(() => pad.classList.remove('lit'), 220);
    };

    const setListening = (on: boolean) => {
      listening = on;
      pads.forEach((p) => (p.disabled = !on));
      hint.textContent = on ? 'Twoja kolej!' : 'Słuchaj…';
    };

    // Gabi z ukulele i nutki nad nią — rysowane bez przerwy, do końca gry
    let over = false;
    const draw = runLoop(env.signal, (dt) => {
      const { ctx, present } = stage;
      ctx.fillStyle = '#2a1f3d';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3b2a5c';
      ctx.fillRect(0, H - 8, W, 8);
      const fig = env.figures.get(frame);
      present((d, k) => {
        if (fig) drawSprite(d, k, fig.img, fig.meta, { x: 52, feetY: H - 4, flip: false, bob: 0, squash: 0, jump: 0 });
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          n.life -= dt;
          n.y -= dt * 0.018;
          if (n.life <= 0) {
            notes.splice(i, 1);
            continue;
          }
          d.globalAlpha = Math.min(1, n.life / 400);
          d.fillStyle = n.colour;
          const x = Math.round(n.x) * k;
          const y = Math.round(n.y) * k;
          d.fillRect(x, y, 3 * k, 2 * k);
          d.fillRect(x + 2 * k, y - 5 * k, k, 5 * k);
          d.fillRect(x + 2 * k, y - 5 * k, 3 * k, k);
          d.globalAlpha = 1;
        }
      });
      return !over;
    });

    const playTune = async () => {
      setListening(false);
      await wait(500);
      const step = stepMs(s.round);
      for (const i of s.seq) {
        if (env.signal.aborted) return;
        sound(i);
        await wait(step);
      }
      frame = 'uke_1';
      setListening(true);
    };

    const result = new Promise<number>((resolve) => {
      pads.forEach((pad, i) =>
        pad.addEventListener('click', () => {
          if (!listening || env.signal.aborted) return;
          sound(i);
          const r = pressString(s, i, Math.random);
          s = r.state;
          env.setHud(`Melodie: ${s.round}`);
          if (r.result === 'wrong') {
            setListening(false);
            hint.textContent = 'Ojej, inna nuta!';
            frame = 'sad_cry';
            play('bad');
            void wait(1400).then(() => resolve(s.round));
          } else if (r.result === 'round') {
            setListening(false);
            hint.textContent = 'Brawo! Dłuższa melodia…';
            play('coin');
            void wait(700).then(playTune);
          }
        }),
      );
    });

    env.setHud('Melodie: 0');
    void playTune();
    const score = await result;
    over = true;
    await draw;
    stage.dispose();
    return score;
  },
};
