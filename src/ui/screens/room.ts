import type { App, Screen } from '../../app';
import type { IconName } from '../../art/icons';
import { ICONS } from '../../art/icons';
import { artCanvas } from '../../art/pixels';
import { content } from '../../content';
import type { FoodId } from '../../core/config';
import { feed, finishActivity, petCharacter, setSleeping } from '../../core/economy';
import { moodLevel } from '../../core/needs';
import { dayNumber } from '../../core/time';
import type { GameState, PlacedItem, RoomId } from '../../core/types';
import { GABI_BED, findItem, itemById, itemFrames } from '../../home/catalog';
import { ROOMS, hitItem, itemBox } from '../../home/layout';
import { pickActivity, type ActivityId } from '../../pet/activities';
import { animationName, createBrain, stepBrain, triggerBrain, wakeBrain, type Brain } from '../../pet/brain';
import { SHADOW_COLOR, shadowRect } from '../../pet/petRenderer';
import { FEET_Y, ROOM_H, ROOM_W } from '../../pet/room';
import { pick, pickLine } from '../../pet/speech';
import { ANGRY_TAPS, SUGAR_RUSH, avatarFor, countRecent, statusAnimation, type StatusAnim } from '../../pet/status';
import { ANIMATIONS, frameAt, resolveAnimation } from '../../sprites/animations';
import { DISPLAY_HEIGHT, FRAMES, spriteUrl } from '../../sprites/loader';
import { openActivities } from '../activitiesSheet';
import { SCENE_AT, createActivityPlayer, drawActivity, hitsScene, type Placed } from '../activityPlayer';
import { coinCounter } from '../coinCounter';
import { h, icon } from '../dom';
import { openFridge } from '../fridge';
import { createEditMode } from '../home/editMode';
import { preloadItems } from '../home/itemSprites';
import { createRoomNav, slideStage } from '../home/roomNav';
import { createRoomRenderer, type GabiLayer, type RoomFrame } from '../home/roomRenderer';
import { entryWalk, findBed, itemAnchor, neighborRoom, wakeSpot } from '../home/scene';
import { needBar } from '../needBar';
import { createPetDrag } from '../petDrag';
import { createPixelStage, deviceRect, drawSprite } from '../pixelStage';

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
/** Klatka `wake` przed wstaniem z łóżka. */
const WAKE_MS = 1000;
/** Sama z siebie wesoła: przy humorze ≥ 99 zamiast pogawędki, z tym prawdopodobieństwem. */
const SPONTANEOUS_HAPPY = { minMood: 99, chance: 0.3 } as const;
const JUMP_MS = 600;
/** W trybie urządzania postać jest przygaszona (i nie reaguje na dotyk). */
const EDIT_GABI_ALPHA = 0.4;
/** Trzymana albo spadająca Gabi jest przed wszystkimi meblami. */
const ON_TOP = ROOM_H * 2;

/**
 * Zjedzone KitKaty (Date.now()) — poza ekranem, żeby wyjście do sklepu po kolejne nie zerowało licznika
 * cukrowego szału (do przeładowania aplikacji).
 */
const kitkats: number[] = [];

function drawShadowAt(ctx: CanvasRenderingContext2D, k: number, x: number, feetY: number, jump: number): void {
  const r = deviceRect(k, shadowRect(x, feetY, jump));
  ctx.fillStyle = SHADOW_COLOR;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

/** Kierunek (do strzałek/przejścia) z pokoju `from` do `to` — bez zawijania. */
const dirBetween = (from: RoomId, to: RoomId): -1 | 1 => (ROOMS.indexOf(to) < ROOMS.indexOf(from) ? -1 : 1);

export function roomScreen(app: App): Screen {
  const { store } = app;
  const s0 = store.get();

  const px = createPixelStage(ROOM_W, ROOM_H);
  const { canvas, bg, fx } = px;
  const renderer = createRoomRenderer();
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

  /** Oglądany pokój — Gabi jest zawsze w nim; śpiąca — w pokoju z łóżkiem. */
  const bed0 = findBed(s0);
  let viewRoom: RoomId = s0.sleeping && bed0 ? bed0.room : s0.currentRoom;

  preloadItems(
    new Set(
      [...ROOMS.flatMap((r) => s0.rooms[r].items.map((i) => i.itemId)), ...Object.keys(s0.inventory)]
        .flatMap((id) => {
          const sprite = findItem(id)?.sprite;
          // klatki stanów (np. woda w umywalce) też od razu — żeby nie mrugały przy pierwszym użyciu
          return sprite === undefined ? [] : [sprite, ...Object.values(itemFrames(id))];
        }),
    ),
  );

  const navBtn = (name: IconName, label: string, onClick: () => void) =>
    h('button', { class: 'nav-btn', onclick: onClick }, h('span', { class: 'nav-icon' }, icon(name, 3)), h('span', {}, label));

  const roomNav = createRoomNav(canvas, {
    canSwipeFrom: (e) => {
      const { x, y } = px.toLogical(e);
      const it = hitItem(store.get().rooms[viewRoom].items, x, y);
      // W trybie urządzania każdy przedmiot się przesuwa; poza nim tylko te, z którymi Gabi coś robi, „łapią” dotyk.
      if (edit.active) return it === null;
      return !petAt(x, y) && (it === null || findItem(it.itemId)?.interaction === 'none');
    },
    onNavigate: (dir) => goToRoom(neighborRoom(viewRoom, dir), dir, true),
  });

  const edit = createEditMode(canvas, {
    store,
    room: () => viewRoom,
    toLogical: (e) => px.toLogical(e),
    toast: (text) => app.toast(text),
    onToggle: (active) => {
      el.classList.toggle('editing', active);
      if (active) {
        drag.cancel();
        closeSheet?.();
        speech.classList.add('hidden');
      }
    },
  });

  const stage = h('div', { class: 'stage px-box' }, canvas, ...roomNav.arrows, edit.button, speech);
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
    roomNav.title,
    h('div', { class: 'stage-wrap' }, stage),
    h(
      'nav',
      { class: 'room-nav' },
      navBtn('apple', 'Karm', () => openFridge(app, el, stage, doFeed)),
      navBtn('gamepad', 'Graj', () => app.go('games')),
      h('button', { class: 'nav-btn', onclick: toggleLight }, lightIcon, lightLabel),
      navBtn('shopbag', 'Sklep', () => app.go('shop')),
      navBtn('dress', 'Szafa', () => app.go('wardrobe')),
      navBtn('yarn', 'Zajęcia', openActivitySheet),
    ),
    edit.el,
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
  /** Zajęcia (nauka, praktyka, telefon…): ręcznie z panelu albo same co 60–120 s. */
  const activity = createActivityPlayer(performance.now());
  let closeSheet: (() => void) | null = null;

  function say(text: string, ms = 3200): void {
    speech.textContent = text;
    speech.classList.remove('hidden', 'pop');
    void speech.offsetWidth;
    speech.classList.add('pop');
    clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => speech.classList.add('hidden'), ms);
  }

  function addHearts(n: number, x = brain.x): void {
    for (let i = 0; i < n; i++) {
      hearts.push({ x: x - 8 + Math.random() * 16, y: HEAD_Y + 4 - Math.random() * 6, vy: 10 + Math.random() * 8, life: 1.4 + Math.random() * 0.5 });
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

  /** Czy punkt (px logiczne) trafia w postać — albo w scenę zajęcia na środku pokoju. */
  function petAt(x: number, y: number): boolean {
    const v = activity.view(performance.now(), brain.x);
    if (v?.cur.centered) return hitsScene(v.cur, x, y);
    return Math.abs(x - brain.x) <= HIT_HALF_W && y >= HEAD_Y && y <= FEET_Y;
  }

  /**
   * Przejście do innego pokoju (strzałki, przesunięcie palcem, zaśnięcie). `enter` — Gabi wchodzi od strony,
   * z której „przyszła”; bez niego (sen) i tak leży w łóżku.
   */
  function goToRoom(room: RoomId, dir: -1 | 1, enter: boolean): void {
    if (room === viewRoom || destroyed) return;
    slideStage(canvas, dir);
    viewRoom = room;
    roomNav.setRoom(room);
    edit.roomChanged();
    hearts.length = 0;
    store.update((s) => (s.currentRoom === room ? s : { ...s, currentRoom: room }));
    if (enter) enterRoom(dir);
  }

  function enterRoom(dir: -1 | 1): void {
    drag.cancel();
    const e = entryWalk(dir, ROOM_W);
    if (activity.current) {
      // Zajęcie trwa dalej: postać od razu w głębi pokoju (sceny na środku i tak są na środku).
      brain = { ...brain, x: e.targetX, targetX: e.targetX };
    } else if (brain.action === 'idle' || brain.action === 'walk') {
      brain = { ...brain, action: 'walk', x: e.x, targetX: e.targetX, facing: e.facing };
    } else {
      // Emocja/jedzenie dokończy się w miejscu, tuż za progiem.
      brain = { ...brain, x: e.targetX, targetX: e.targetX };
    }
  }

  /** Zaczyna zajęcie od razu (poprzednie przerywa bez bonusu); Gabi przestaje chodzić i stoi. */
  function beginActivity(id: ActivityId, t: number): void {
    stopActivity(t);
    brain = { ...brain, action: 'idle', targetX: brain.x };
    jumpStart = -1;
    squashUntil = 0;
    activity.start(id, t);
  }

  /** Po zajęciu: ze sceny na środku pokoju Gabi wychodzi na środku, a pogawędka nie zagłusza kwestii. */
  function afterActivity(last: Placed, t: number): void {
    if (last.centered) brain = { ...brain, x: SCENE_AT.x, targetX: SCENE_AT.x };
    nextChatAt = Math.max(nextChatAt, t + 10_000);
  }

  /** Przerywa trwające zajęcie bez bonusu; false, gdy nic nie trwało. */
  function stopActivity(t: number): boolean {
    const last = activity.stop(t, brain.x);
    if (!last) return false;
    afterActivity(last, t);
    return true;
  }

  function openActivitySheet(): void {
    if (store.get().sleeping) {
      app.toast('Gabi śpi');
      return;
    }
    closeSheet = openActivities(el, (id) => {
      if (destroyed) return;
      if (store.get().sleeping || wakeUntil > 0) {
        app.toast('Gabi śpi');
        return;
      }
      drag.cancel();
      beginActivity(id, performance.now());
    });
  }

  function sync(s: GameState): void {
    bars.hunger.set(s.needs.hunger);
    bars.mood.set(s.needs.mood);
    bars.energy.set(s.needs.energy);
    coins.set(s.coins);
    if (s.sleeping !== shownSleeping) {
      if (s.sleeping) {
        // Zasypia: łóżko zamiast postaci; przerwane trzymanie/spadanie i zajęcie (bez bonusu) po prostu znikają.
        wakeUntil = 0;
        drag.cancel();
        stopActivity(performance.now());
      } else if (shownSleeping === true) {
        // Przejście spanie → czuwanie (przycisk, dotyk, jedzenie albo tick): najpierw klatka `wake` w łóżku.
        wakeUntil = performance.now() + WAKE_MS;
      }
      shownSleeping = s.sleeping;
      lightIcon.replaceChildren(icon(s.sleeping ? 'moon' : 'bulb', 3));
    }
    // Śpiąca (i wstająca) Gabi jest w łóżku — do innych pokoi przechodzi się dopiero po pobudce.
    roomNav.setLocked(s.sleeping || wakeUntil > 0);
    dayLabel.textContent = `Dzień ${dayNumber(s.createdAt, Date.now())}`;
    lightLabel.textContent = s.sleeping ? 'Pobudka' : 'Światło';
    el.classList.toggle('night', s.sleeping);
    edit.sync(s);
  }

  function doFeed(id: FoodId): void {
    const res = feed(store.get(), id);
    if (!res.ok) {
      app.toast('Lodówka jest pusta');
      return;
    }
    store.update(() => res.state);
    // Jedzenie przerywa zajęcie (bez bonusu) — inaczej animacja jedzenia byłaby niewidoczna.
    stopActivity(performance.now());
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
      stopActivity(t);
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
      // Zgaszenie światła: widok przechodzi do sypialni, Gabi kładzie się do swojego łóżka.
      const bed = findBed(s);
      if (bed && bed.room !== viewRoom) goToRoom(bed.room, dirBetween(viewRoom, bed.room), false);
      store.update((cur) => setSleeping(cur, true));
      say(pick(content.lines.goodNight), 2000);
    }
  }

  /** Stuknięcie w postać bez przesunięcia: głaskanie, a przy 5 stuknięciach w 3 s złość. */
  function tapPet(now: number): void {
    if (stopActivity(now)) {
      // Stuknięcie w trakcie zajęcia tylko je kończy — bez głaskania i bez liczenia do złości.
      say(pick(content.lines.activityStop), 2000);
      return;
    }
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
    canGrab: (x, y) => !store.get().sleeping && wakeUntil === 0 && !edit.active && petAt(x, y),
    onTap: tapPet,
    onGrab: (now) => {
      stopActivity(now); // złapanie kończy zajęcie bez bonusu
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

  /** Łóżko Gabi w oglądanym pokoju (albo null). */
  function bedHere(s: GameState): PlacedItem | null {
    const bed = findBed(s);
    return bed && bed.room === viewRoom ? bed.item : null;
  }

  /** Stuknięcie w łóżko budzi (budzenie robi sync()). W trybie urządzania łóżko się tylko zaznacza. */
  const onBedDown = (e: PointerEvent) => {
    const s = store.get();
    if (!s.sleeping || edit.active) return;
    const bed = bedHere(s);
    if (!bed) return;
    const { x, y } = px.toLogical(e);
    const b = itemBox(bed);
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return;
    store.update((cur) => setSleeping(cur, false));
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

  /**
   * Postęp zajęcia (kwestie, koniec z bonusem) i samodzielny start: o czasie, bez stanu potrzeb
   * i bez akcji czasowej (jedzenie, emocje, machanie…). Wołane tylko, gdy Gabi nie śpi i nie jest trzymana.
   * W trybie urządzania nowe zajęcia same się nie zaczynają.
   */
  function stepActivity(t: number, status: StatusAnim): void {
    const st = activity.step(t, brain.x);
    if (st.finished) {
      store.update(finishActivity);
      addHearts(3, st.finished.x);
      afterActivity(st.finished, t);
    } else if (st.line && !edit.active) {
      say(st.line);
    }
    const idle = brain.action === 'idle' || brain.action === 'walk';
    if (!activity.current && !edit.active && t >= activity.nextAt && status === null && idle) beginActivity(pickActivity(Math.random), t);
  }

  /** Gabi w łóżku: klatki snu/pobudki w miejscu łóżka (zamiast pustego łóżka). */
  function bedLayer(t: number, sleeping: boolean, alpha: number, bed: PlacedItem | null): GabiLayer {
    const name = sleeping ? 'sleep' : 'wake';
    if (name !== lastAnim) {
      lastAnim = name;
      animStart = t;
    }
    const frameName = frameAt(resolveAnimation(ANIMATIONS, name), t - animStart);
    const img = app.sprites.get(frameName);
    const meta = FRAMES[frameName];
    const at = bed ? itemAnchor(bed, itemById(GABI_BED)) : SCENE_AT;
    return {
      orderY: bed ? bed.y : SCENE_AT.feetY,
      alpha,
      draw: (ctx, k) => {
        if (img && meta) drawSprite(ctx, k, img, meta, { x: at.x, feetY: at.feetY, flip: bed?.flip ?? false, bob: 0, squash: 0, jump: 0 });
      },
    };
  }

  function frame(t: number): void {
    if (destroyed) return;
    const dt = Math.max(0, Math.min(50, t - last));
    last = t;
    const s = store.get();
    const status = statusAnimation(s.needs);
    const room = s.rooms[viewRoom];
    const items = edit.displayItems(room.items);
    // łóżko z podglądem przeciągania (w trybie urządzania sen „jedzie” razem z łóżkiem)
    const bed = items.find((i) => i.itemId === GABI_BED) ?? null;
    const alpha = edit.active ? EDIT_GABI_ALPHA : 1;

    if (wakeUntil > 0 && t >= wakeUntil) {
      // Wstała: staje przy łóżku, macha i mówi dzień dobry.
      wakeUntil = 0;
      roomNav.setLocked(s.sleeping);
      const x = bed ? wakeSpot(bed) : SCENE_AT.x;
      brain = wakeBrain({ ...brain, x, targetX: x }, t);
      say(pick(content.lines.wakeUp));
    }
    drag.step(dt, t); // lądowanie ustawia emocję w `brain`
    const inBed = s.sleeping || wakeUntil > 0;
    const held = inBed ? null : drag.pose(t);
    const free = !inBed && !held;
    if (free) stepActivity(t, status);
    // W trakcie zajęcia Gabi stoi (mózg nie jest krokowany), a zamiast animacji rysujemy klatki zajęcia.
    const act = free ? activity.view(t, brain.x) : null;
    if (free && !act) {
      brain = stepBrain(brain, dt, { now: t, mood: moodLevel(s.needs), sleeping: false, rng: Math.random, canWalk: status === null });
    }

    const emotion = brain.action === 'crazy' ? 'crazy' : brain.action === 'scared' ? 'scared' : null;
    const face = avatarFor(status, emotion, t);
    setAvatar(act?.def.avatar && status === null && emotion === null ? act.def.avatar : face);

    let gabi: GabiLayer;
    if (inBed) {
      gabi = bedLayer(t, s.sleeping, alpha, bed);
    } else if (act) {
      lastAnim = '';
      gabi = {
        orderY: act.cur.feetY,
        alpha,
        draw: (ctx, k) => {
          if (!act.cur.centered) drawShadowAt(ctx, k, act.cur.x, FEET_Y, 0);
          drawActivity(ctx, k, app.sprites, act);
        },
      };
    } else {
      // Priorytet: trzymanie/spadanie > emocja/akcja > stan potrzeb > chód > spoczynek.
      const name = held ?? animationName(brain, { sleeping: false, status });
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
      if (held) ({ x, feetY } = drag.place(meta));
      const bob = name === 'idle' ? Math.floor(t / 750) % 2 : 0;
      const squash = free && t < squashUntil ? 0.08 * Math.sin(((squashUntil - t) / 220) * Math.PI) : 0;
      const jumping = free && brain.action === 'happy' && jumpStart >= 0 && t - jumpStart < JUMP_MS;
      const jumpH = jumping ? Math.round(Math.sin(((t - jumpStart) / JUMP_MS) * Math.PI) * 10) : 0;
      const flip = free && anim.flipForRight && brain.facing === 'right';
      gabi = {
        orderY: held ? ON_TOP : FEET_Y,
        alpha,
        draw: (ctx, k) => {
          drawShadowAt(ctx, k, x, FEET_Y, held ? FEET_Y - feetY : jumpH);
          if (img && meta) drawSprite(ctx, k, img, meta, { x, feetY, flip, bob, squash, jump: jumpH });
        },
      };
    }

    const f: RoomFrame = {
      room: viewRoom,
      looks: room,
      items,
      night: s.sleeping,
      now: Date.now(),
      t,
      // Śpiąca Gabi to klatka z łóżkiem — puste łóżko znika; przy urządzaniu zostaje, a przygaszona Gabi leży na nim.
      hiddenUid: inBed && bed && !edit.active ? bed.uid : null,
      selectedUid: edit.selectedUid,
      gabi,
    };
    px.clear();
    renderer.drawBackground(bg, f);
    renderer.drawOverlays(fx, f);
    drawHearts(dt);
    px.compose((ctx, k) => renderer.drawItems(ctx, k, f));

    if (free && !act && !edit.active && t >= nextChatAt) {
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

  roomNav.setRoom(viewRoom);
  if (viewRoom !== s0.currentRoom) store.update((s) => ({ ...s, currentRoom: viewRoom }));
  sync(store.get());
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
      closeSheet?.();
      drag.destroy();
      edit.destroy();
      roomNav.destroy();
      canvas.removeEventListener('pointerdown', onBedDown);
      px.dispose();
      clearTimeout(speechTimer);
      clearTimeout(treatTimer);
      unsubscribe();
    },
  };
}
