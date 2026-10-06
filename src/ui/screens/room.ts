import type { App, Screen } from '../../app';
import type { IconName } from '../../art/icons';
import { ICONS } from '../../art/icons';
import { artCanvas } from '../../art/pixels';
import { content } from '../../content';
import type { FoodId } from '../../core/config';
import { feed, petCharacter, setSleeping } from '../../core/economy';
import { moodLevel } from '../../core/needs';
import { dayNumber } from '../../core/time';
import type { GameState } from '../../core/types';
import { animationName, createBrain, stepBrain, triggerBrain, wakeBrain, type Brain } from '../../pet/brain';
import { drawShadow } from '../../pet/petRenderer';
import { FEET_Y, ROOM_H, ROOM_W, drawRoom } from '../../pet/room';
import { pick, pickLine } from '../../pet/speech';
import { ANGRY_TAPS, SUGAR_RUSH, avatarFor, countRecent, statusAnimation } from '../../pet/status';
import { ANIMATIONS, frameAt, resolveAnimation } from '../../sprites/animations';
import { DISPLAY_HEIGHT, FRAMES, spriteUrl } from '../../sprites/loader';
import { coinCounter } from '../coinCounter';
import { h, icon } from '../dom';
import { openFridge } from '../fridge';
import { needBar } from '../needBar';
import { createPetDrag } from '../petDrag';
import { createPixelStage, drawSprite } from '../pixelStage';

interface Heart {
  x: number;
  y: number;
  vy: number;
  life: number;
}

const HEAD_Y = FEET_Y - DISPLAY_HEIGHT;
/** Połowa szerokości pola dotyku postaci (px logiczne). */
const HIT_HALF_W = 12;
/** Od tej energii Gabi nie chce spać (inaczej tick od razu by ją obudził). */
const NOT_SLEEPY_ENERGY = 95;
/**
 * Łóżko stoi na środku pokoju. Kotwica `bed_4` to środek obrazka; pozostałe klatki `bed_*` mają `anchorX`/`foot`
 * przesunięte przez tools/extract_sprites.py (`align`), więc łóżko i szafka nie skaczą między klatkami.
 */
const BED = { x: 64, feetY: FEET_Y + 2, halfW: 40, h: 60 } as const;
/** Klatka `wake` przed wstaniem z łóżka. */
const WAKE_MS = 1000;
/** Sama z siebie wesoła: przy humorze ≥ 99 zamiast pogawędki, z tym prawdopodobieństwem. */
const SPONTANEOUS_HAPPY = { minMood: 99, chance: 0.3 } as const;
const JUMP_MS = 600;

/**
 * Zjedzone KitKaty (Date.now()) — poza ekranem, żeby wyjście do sklepu po kolejne nie zerowało licznika
 * cukrowego szału (do przeładowania aplikacji).
 */
const kitkats: number[] = [];

export function roomScreen(app: App): Screen {
  const { store } = app;
  const s0 = store.get();

  const px = createPixelStage(ROOM_W, ROOM_H);
  const { canvas, bg, fx } = px;
  const speech = h('div', { class: 'speech px-box hidden', 'aria-live': 'polite' });
  const coins = coinCounter(s0.coins);
  const dayLabel = h('span', {}, `Dzień ${dayNumber(s0.createdAt, Date.now())}`);
  const avatar = h('img', { class: 'px avatar', src: spriteUrl('portrait_a'), alt: '' });
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
      h('button', { class: 'profile-btn', 'aria-label': 'Profil', onclick: () => app.go('profile') }, avatar, dayLabel),
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
  let treatTimer = 0;
  let nextChatAt = performance.now() + 20_000;
  let raf = 0;
  let last = performance.now();
  const hearts: Heart[] = [];
  let shownSleeping: boolean | null = null;
  /** Koniec klatki `wake` (0 = nie wstaje). */
  let wakeUntil = 0;
  /** Ostatnie stuknięcia w postać (performance.now()) — licznik złości. */
  const taps: number[] = [];
  let avatarName = 'portrait_a';

  function say(text: string, ms = 3200): void {
    speech.textContent = text;
    speech.classList.remove('hidden', 'pop');
    void speech.offsetWidth;
    speech.classList.add('pop');
    clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => speech.classList.add('hidden'), ms);
  }

  function addHearts(n: number): void {
    for (let i = 0; i < n; i++) {
      hearts.push({ x: brain.x - 8 + Math.random() * 16, y: HEAD_Y + 4 - Math.random() * 6, vy: 10 + Math.random() * 8, life: 1.4 + Math.random() * 0.5 });
    }
  }

  function jump(now: number): void {
    jumpStart = now;
    brain = triggerBrain(brain, 'happy', now);
  }

  function setAvatar(name: string): void {
    if (name === avatarName) return;
    avatarName = name;
    avatar.src = spriteUrl(name);
    avatar.classList.toggle('crisp', name !== 'portrait_a');
  }

  function sync(s: GameState): void {
    bars.hunger.set(s.needs.hunger);
    bars.mood.set(s.needs.mood);
    bars.energy.set(s.needs.energy);
    coins.set(s.coins);
    if (s.sleeping !== shownSleeping) {
      if (s.sleeping) {
        // Zasypia: łóżko zamiast postaci; przerwane trzymanie/spadanie po prostu znika.
        wakeUntil = 0;
        drag.cancel();
      } else if (shownSleeping === true) {
        // Przejście spanie → czuwanie (przycisk, dotyk, jedzenie albo tick): najpierw klatka `wake` w łóżku.
        wakeUntil = performance.now() + WAKE_MS;
      }
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
    if (id !== 'kitkat') return;
    const now = Date.now();
    kitkats.push(now);
    const rush = countRecent(kitkats, now, SUGAR_RUSH.windowMs) >= SUGAR_RUSH.count;
    if (rush) kitkats.length = 0;
    clearTimeout(treatTimer);
    treatTimer = window.setTimeout(() => {
      if (destroyed) return;
      const t = performance.now();
      if (rush) {
        brain = triggerBrain(brain, 'crazy', t);
        say(pick(content.lines.crazy));
      } else {
        jump(t);
        addHearts(8);
      }
    }, 1600);
  }

  function toggleLight(): void {
    const s = store.get();
    if (s.sleeping) {
      // Budzenie (klatka `wake`, potem machanie i kwestia) robi sync() — tak samo przy wybudzeniu przez tick.
      store.update((cur) => setSleeping(cur, false));
    } else if (s.needs.energy >= NOT_SLEEPY_ENERGY) {
      // Przy pełnej energii tick i tak od razu by ją obudził.
      say(pick(content.lines.notSleepy), 2400);
    } else {
      store.update((cur) => setSleeping(cur, true));
      say(pick(content.lines.goodNight), 2000);
    }
  }

  /** Stuknięcie w postać bez przesunięcia: głaskanie, a przy 5 stuknięciach w 3 s złość. */
  function tapPet(now: number): void {
    squashUntil = now + 220;
    taps.push(now);
    if (taps.length > 10) taps.splice(0, taps.length - 10);
    if (countRecent(taps, now, ANGRY_TAPS.windowMs) >= ANGRY_TAPS.count) {
      taps.length = 0;
      brain = triggerBrain(brain, 'angry', now);
      say(pick(content.lines.angry), 2000);
      return;
    }
    const res = petCharacter(store.get(), Date.now());
    if (res.accepted) {
      store.update(() => res.state);
      jump(now);
      addHearts(3);
      say(pick(content.lines.pet), 2000);
    } else {
      brain = triggerBrain(brain, 'wave', now);
    }
  }

  const drag = createPetDrag(canvas, {
    toLogical: (e) => px.toLogical(e),
    canGrab: (x, y) => !store.get().sleeping && wakeUntil === 0 && Math.abs(x - brain.x) <= HIT_HALF_W && y >= HEAD_Y && y <= FEET_Y,
    onTap: tapPet,
    onGrab: () => {
      brain = { ...brain, action: 'idle', targetX: brain.x };
      jumpStart = -1;
      squashUntil = 0;
      say(pick(content.lines.drag), 1500);
    },
    onLand: (emotion, x, now) => {
      brain = { ...brain, x, targetX: x };
      if (emotion === 'happy') jump(now);
      else brain = triggerBrain(brain, 'scared', now);
      say(pick(emotion === 'scared' ? content.lines.scared : content.lines.landHappy), 2400);
    },
  });

  /** Stuknięcie w łóżko budzi (budzenie robi sync()). */
  const onBedDown = (e: PointerEvent) => {
    if (!store.get().sleeping) return;
    const { x, y } = px.toLogical(e);
    if (Math.abs(x - BED.x) > BED.halfW || y < FEET_Y - BED.h || y > FEET_Y) return;
    store.update((s) => setSleeping(s, false));
  };
  canvas.addEventListener('pointerdown', onBedDown);

  function drawHearts(dt: number): void {
    for (let i = hearts.length - 1; i >= 0; i--) {
      const p = hearts[i];
      p.life -= dt / 1000;
      p.y -= (p.vy * dt) / 1000;
      if (p.life <= 0) {
        hearts.splice(i, 1);
        continue;
      }
      fx.globalAlpha = Math.min(1, p.life * 2);
      fx.drawImage(artCanvas(ICONS.heartSmall), Math.round(p.x), Math.round(p.y));
      fx.globalAlpha = 1;
    }
  }

  function frame(t: number): void {
    if (destroyed) return;
    const dt = Math.max(0, Math.min(50, t - last));
    last = t;
    const s = store.get();
    const status = statusAnimation(s.needs);

    if (wakeUntil > 0 && t >= wakeUntil) {
      // Wstała: stoi przy łóżku, macha i mówi dzień dobry.
      wakeUntil = 0;
      brain = wakeBrain({ ...brain, x: BED.x, targetX: BED.x }, t);
      say(pick(content.lines.wakeUp));
    }
    drag.step(dt, t); // lądowanie ustawia emocję w `brain`
    const inBed = s.sleeping || wakeUntil > 0;
    const held = inBed ? null : drag.pose(t);
    if (!inBed && !held) {
      brain = stepBrain(brain, dt, { now: t, mood: moodLevel(s.needs), sleeping: false, rng: Math.random, canWalk: status === null });
    }

    // Priorytet: sen (łóżko) > trzymanie/spadanie > emocja/akcja > stan potrzeb > chód > spoczynek.
    const name = s.sleeping ? 'sleep' : inBed ? 'wake' : (held ?? animationName(brain, { sleeping: false, status }));
    if (name !== lastAnim) {
      lastAnim = name;
      animStart = t;
    }
    const anim = resolveAnimation(ANIMATIONS, name);
    const frameName = frameAt(anim, t - animStart);
    const img = app.sprites.get(frameName);
    const meta = FRAMES[frameName];

    let x = brain.x;
    let feetY = FEET_Y;
    if (inBed) {
      x = BED.x;
      feetY = BED.feetY;
    } else if (held) {
      ({ x, feetY } = drag.place(meta));
    }
    const free = !inBed && !held;
    const bob = name === 'idle' ? Math.floor(t / 750) % 2 : 0;
    const squash = free && t < squashUntil ? 0.08 * Math.sin(((squashUntil - t) / 220) * Math.PI) : 0;
    const jumping = free && brain.action === 'happy' && jumpStart >= 0 && t - jumpStart < JUMP_MS;
    const jumpH = jumping ? Math.round(Math.sin(((t - jumpStart) / JUMP_MS) * Math.PI) * 10) : 0;
    const flip = free && anim.flipForRight && brain.facing === 'right';

    px.clear();
    drawRoom(bg, s.sleeping, t);
    if (!inBed) drawShadow(bg, x, FEET_Y, held ? FEET_Y - feetY : jumpH);
    drawHearts(dt);
    px.compose((ctx, k) => {
      if (img && meta) drawSprite(ctx, k, img, meta, { x, feetY, flip, bob, squash, jump: jumpH });
    });

    const emotion = brain.action === 'crazy' ? 'crazy' : brain.action === 'scared' ? 'scared' : null;
    setAvatar(avatarFor(status, emotion, t));

    if (free && t >= nextChatAt) {
      nextChatAt = t + 20_000 + Math.random() * 10_000;
      if (s.needs.mood >= SPONTANEOUS_HAPPY.minMood && Math.random() < SPONTANEOUS_HAPPY.chance) {
        jump(t);
        addHearts(4);
      } else {
        brain = triggerBrain(brain, 'talk', t);
        say(pickLine(s.needs));
      }
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
      drag.destroy();
      canvas.removeEventListener('pointerdown', onBedDown);
      px.dispose();
      clearTimeout(speechTimer);
      clearTimeout(treatTimer);
      unsubscribe();
    },
  };
}
