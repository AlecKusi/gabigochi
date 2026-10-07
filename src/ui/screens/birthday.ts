import type { App, Screen, ScreenParams } from '../../app';
import { content } from '../../content';
import { h } from '../dom';
import { createPixelStage, drawSprite } from '../pixelStage';

/** Urodzinowa scenka obok portretu: tort, zdmuchiwanie, konfetti, prezent, balony, trąbka, miś, dziękuję. */
const SCENES: readonly { frame: string; ms: number; confetti?: boolean }[] = [
  { frame: 'bday_cake', ms: 1700 },
  { frame: 'bday_blow', ms: 1300 },
  { frame: 'bday_confetti', ms: 1600, confetti: true },
  { frame: 'bday_gift', ms: 1400 },
  { frame: 'bday_open', ms: 1500 },
  { frame: 'bday_balloons', ms: 1700 },
  { frame: 'bday_horn', ms: 1400 },
  { frame: 'bday_teddy', ms: 1600 },
  { frame: 'bday_thanks', ms: 1800 },
];
const CYCLE = SCENES.reduce((a, s) => a + s.ms, 0);
const W = 56;
const H = 68;

export function birthdayScreen(app: App, params?: ScreenParams): Screen {
  const replay = params?.replay === true;
  const start = () => {
    app.store.update((s) => (s.seenBirthday ? s : { ...s, seenBirthday: true }));
    void app.go(replay ? 'profile' : 'room');
  };
  const stage = createPixelStage(W, H);
  stage.canvas.classList.add('bday-anim');
  stage.canvas.setAttribute('aria-hidden', 'true');
  let raf = 0;
  let lastScene = -1;
  const t0 = performance.now();
  const draw = (now: number) => {
    let c = (now - t0) % CYCLE;
    let i = 0;
    while (c >= SCENES[i].ms) c -= SCENES[i++].ms;
    if (i !== lastScene) {
      lastScene = i;
      if (SCENES[i].confetti) app.celebrate();
    }
    const fig = app.figures.get(SCENES[i].frame);
    stage.clear();
    stage.compose((ctx, k) => {
      if (fig) drawSprite(ctx, k, fig.img, fig.meta, { x: W / 2, feetY: H - 2, flip: false, bob: 0, squash: 0, jump: 0 });
    });
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  const el = h(
    'div',
    { class: 'screen birthday' },
    h('div', { class: 'bday-age', 'aria-label': `${content.age} urodziny` }, String(content.age)),
    h(
      'div',
      { class: 'bday-hero' },
      h('img', { class: 'px portrait-big', src: app.figures.url('portrait_b'), alt: `Portret: ${content.name}` }),
      stage.canvas,
    ),
    h('h1', { class: 'bday-title' }, content.wishesTitle),
    h(
      'div',
      { class: 'bday-wishes px-box' },
      ...content.wishes.map((p) => h('p', {}, p)),
      h('p', { class: 'signature' }, content.signature),
    ),
    h('button', { class: 'px-btn big', onclick: start }, replay ? 'Wróć' : 'Zaczynamy!'),
  );
  const timers = [setTimeout(() => app.celebrate(), 400)];
  return {
    el,
    destroy: () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      stage.dispose();
    },
  };
}
