import type { App, Screen } from '../../app';
import type { IconName } from '../../art/icons';
import { ICONS } from '../../art/icons';
import { artCanvas } from '../../art/pixels';
import { content } from '../../content';
import type { FoodId } from '../../core/config';
import { feed, petCharacter, setSleeping } from '../../core/economy';
import { moodLevel, needStatus } from '../../core/needs';
import { dayNumber } from '../../core/time';
import type { GameState } from '../../core/types';
import { animationName, createBrain, stepBrain, triggerBrain, type Brain } from '../../pet/brain';
import { drawPet, drawShadow } from '../../pet/petRenderer';
import { FEET_Y, ROOM_H, ROOM_W, drawRoom } from '../../pet/room';
import { pick, pickLine } from '../../pet/speech';
import { ANIMATIONS, frameAt, resolveAnimation, type OverlayName } from '../../sprites/animations';
import framesMeta from '../../sprites/frames.generated.json';
import { spriteUrl } from '../../sprites/loader';
import { coinCounter } from '../coinCounter';
import { h, icon } from '../dom';
import { openFridge } from '../fridge';
import { needBar } from '../needBar';

interface Particle {
  kind: 'heart' | 'zzz';
  x: number;
  y: number;
  vy: number;
  life: number;
}

const [FRAME_W, FRAME_H] = framesMeta.canvas;
const HEAD_Y = FEET_Y - FRAME_H;

export function roomScreen(app: App): Screen {
  const { store } = app;
  const s0 = store.get();

  const canvas = h('canvas', { class: 'px stage-canvas', width: ROOM_W, height: ROOM_H });
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const speech = h('div', { class: 'speech px-box hidden', 'aria-live': 'polite' });
  const coins = coinCounter(s0.coins);
  const dayLabel = h('span', {}, `Dzień ${dayNumber(s0.createdAt, Date.now())}`);
  const bars = {
    hunger: needBar('hunger', 'Głód', 'apple'),
    mood: needBar('mood', 'Humor', 'heart'),
    energy: needBar('energy', 'Energia', 'bolt'),
  };
  const lightIcon = h('span', { class: 'nav-icon' });
  const lightLabel = h('span', {}, 'Światło');

  const navBtn = (name: IconName, label: string, onClick: () => void) =>
    h('button', { class: 'nav-btn', onclick: onClick }, h('span', { class: 'nav-icon' }, icon(name, 3)), h('span', {}, label));

  const stage = h('div', { class: 'stage px-box' }, canvas, speech);
  const el = h(
    'div',
    { class: 'screen room' },
    h(
      'header',
      { class: 'room-top' },
      h(
        'button',
        { class: 'profile-btn', 'aria-label': 'Profil', onclick: () => app.go('profile') },
        h('img', { class: 'px avatar', src: spriteUrl('portrait_a'), alt: '' }),
        dayLabel,
      ),
      coins.el,
    ),
    h('div', { class: 'needs' }, bars.hunger.el, bars.mood.el, bars.energy.el),
    h('div', { class: 'stage-wrap' }, stage),
    h(
      'nav',
      { class: 'room-nav' },
      navBtn('apple', 'Karm', () => openFridge(app, el, stage, doFeed)),
      navBtn('gamepad', 'Graj', () => app.go('games')),
      h('button', { class: 'nav-btn', onclick: toggleLight }, lightIcon, lightLabel),
      navBtn('shopbag', 'Sklep', () => app.go('shop')),
      navBtn('dress', 'Szafa', () => app.go('wardrobe')),
    ),
  );

  let destroyed = false;
  let brain: Brain = createBrain(performance.now());
  let lastAnim = '';
  let animStart = 0;
  let squashUntil = 0;
  let jumpStart = -1;
  let speechTimer = 0;
  let nextChatAt = performance.now() + 20_000;
  let zzzTimer = 0;
  let raf = 0;
  let last = performance.now();
  const particles: Particle[] = [];
  let shownSleeping: boolean | null = null;

  function say(text: string, ms = 3200): void {
    speech.textContent = text;
    speech.classList.remove('hidden', 'pop');
    void speech.offsetWidth;
    speech.classList.add('pop');
    clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => speech.classList.add('hidden'), ms);
  }

  function hearts(n: number): void {
    for (let i = 0; i < n; i++) {
      particles.push({ kind: 'heart', x: brain.x - 8 + Math.random() * 16, y: HEAD_Y + 4 - Math.random() * 6, vy: 10 + Math.random() * 8, life: 1.4 + Math.random() * 0.5 });
    }
  }

  function jump(now: number): void {
    jumpStart = now;
    brain = triggerBrain(brain, 'jump', now);
  }

  function sync(s: GameState): void {
    bars.hunger.set(s.needs.hunger);
    bars.mood.set(s.needs.mood);
    bars.energy.set(s.needs.energy);
    coins.set(s.coins);
    if (s.sleeping !== shownSleeping) {
      shownSleeping = s.sleeping;
      lightIcon.replaceChildren(icon(s.sleeping ? 'moon' : 'bulb', 3));
    }
    dayLabel.textContent = `Dzień ${dayNumber(s.createdAt, Date.now())}`;
    lightLabel.textContent = s.sleeping ? 'Pobudka' : 'Światło';
    el.classList.toggle('night', s.sleeping);
  }

  function doFeed(id: FoodId): void {
    const res = feed(store.get(), id);
    if (!res.ok) {
      app.toast('Lodówka jest pusta');
      return;
    }
    store.update(() => res.state);
    brain = triggerBrain(brain, 'eat', performance.now());
    say(pick(id === 'kitkat' ? content.lines.kitkat : content.lines.eat), 2400);
    if (id === 'kitkat') {
      setTimeout(() => {
        if (destroyed) return;
        jump(performance.now());
        hearts(8);
      }, 1600);
    }
  }

  function toggleLight(): void {
    const wasSleeping = store.get().sleeping;
    store.update((s) => setSleeping(s, !wasSleeping));
    if (wasSleeping) {
      brain = triggerBrain(brain, 'wave', performance.now());
      say(pick(content.lines.wakeUp));
    } else {
      say(pick(content.lines.goodNight), 2000);
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * ROOM_W) / r.width;
    const y = ((e.clientY - r.top) * ROOM_H) / r.height;
    if (Math.abs(x - brain.x) > FRAME_W / 2 || y < HEAD_Y || y > FEET_Y) return;
    const now = performance.now();
    if (store.get().sleeping) {
      store.update((s) => setSleeping(s, false));
      brain = triggerBrain(brain, 'wave', now);
      say(pick(content.lines.wakeUp));
      return;
    }
    squashUntil = now + 220;
    const res = petCharacter(store.get(), Date.now());
    if (res.accepted) {
      store.update(() => res.state);
      jump(now);
      hearts(3);
      say(pick(content.lines.pet), 2000);
    } else {
      brain = triggerBrain(brain, 'wave', now);
    }
  });

  function drawOverlay(kind: OverlayName | null, t: number, dt: number): void {
    if (kind === 'zzz') {
      zzzTimer -= dt;
      if (zzzTimer <= 0) {
        zzzTimer = 900;
        particles.push({ kind: 'zzz', x: brain.x + 8, y: HEAD_Y + 4, vy: 8, life: 2.2 });
      }
    } else if (kind === 'cloud') {
      ctx.drawImage(artCanvas(ICONS.cloud), Math.round(brain.x - 6), HEAD_Y - 12 + (Math.floor(t / 500) % 2));
    } else if (kind === 'food') {
      ctx.drawImage(artCanvas(ICONS.foodBubble), Math.round(brain.x + 10), HEAD_Y - 4 + (Math.floor(t / 600) % 2));
    }
  }

  function drawParticles(dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt / 1000;
      p.y -= (p.vy * dt) / 1000;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, p.life * 2);
      const art = artCanvas(p.kind === 'zzz' ? ICONS.zzz : ICONS.heartSmall);
      const sway = p.kind === 'zzz' ? Math.sin(p.life * 3) * 3 : 0;
      ctx.drawImage(art, Math.round(p.x + sway), Math.round(p.y));
      ctx.globalAlpha = 1;
    }
  }

  function frame(t: number): void {
    if (destroyed) return;
    const dt = Math.max(0, Math.min(50, t - last));
    last = t;
    const s = store.get();
    const mood = moodLevel(s.needs);
    const status = needStatus(s.needs);
    brain = stepBrain(brain, dt, { now: t, mood, sleeping: s.sleeping, rng: Math.random });
    const name = animationName(brain, { sleeping: s.sleeping, hungry: status.hungry, mood });
    if (name !== lastAnim) {
      lastAnim = name;
      animStart = t;
    }
    const anim = resolveAnimation(ANIMATIONS, name);
    const img = app.sprites.get(frameAt(anim, t - animStart));

    drawRoom(ctx, s.sleeping, t);
    const bob = brain.action === 'idle' && !s.sleeping ? Math.floor(t / 750) % 2 : 0;
    const squash = t < squashUntil ? 0.08 * Math.sin(((squashUntil - t) / 220) * Math.PI) : 0;
    const jumpH = jumpStart >= 0 && t - jumpStart < 600 ? Math.round(Math.sin(((t - jumpStart) / 600) * Math.PI) * 10) : 0;
    drawShadow(ctx, brain.x, FEET_Y, jumpH);
    if (img) {
      drawPet(ctx, { frame: img, x: brain.x, feetY: FEET_Y, flip: anim.flipForRight && brain.facing === 'right', bob, squash, jump: jumpH });
    }
    if (anim.dim) {
      ctx.fillStyle = 'rgba(20, 12, 45, 0.45)';
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    }
    drawOverlay(anim.overlay, t, dt);
    drawParticles(dt);

    if (!s.sleeping && t >= nextChatAt) {
      nextChatAt = t + 20_000 + Math.random() * 10_000;
      brain = triggerBrain(brain, 'talk', t);
      say(pickLine(s.needs));
    }
    raf = requestAnimationFrame(frame);
  }

  sync(s0);
  const unsubscribe = store.subscribe(sync);
  if (!s0.sleeping) {
    brain = triggerBrain(brain, 'wave', performance.now());
    say(pick(content.lines.greeting), 2400);
  }
  raf = requestAnimationFrame(frame);

  return {
    el,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(speechTimer);
      unsubscribe();
    },
  };
}
