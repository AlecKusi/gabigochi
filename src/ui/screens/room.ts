import type { App, Screen } from '../../app';
import type { IconName } from '../../art/icons';
import { ICONS } from '../../art/icons';
import { artCanvas } from '../../art/pixels';
import { content } from '../../content';
import { CONFIG, foodById, type FoodId } from '../../core/config';
import { feed, finishActivity, petCharacter, setSleeping } from '../../core/economy';
import { moodLevel } from '../../core/needs';
import { dayNumber } from '../../core/time';
import type { GameState, PlacedItem, RoomId } from '../../core/types';
import { SEATS, SOFAS, activityAllowedIn, activityAvailability, availabilityHint, pickActivityHere, seatAnchor, seatNear, spotAnchor, type Spot } from '../../home/activitySpots';
import { GABI_BED, findItem, itemById, itemFrames, type Interaction } from '../../home/catalog';
import { isDefaultOutfit } from '../../wardrobe/outfit';
import { cookDish, interactionSteps, rewardInteraction, toggleLamp, type GabiPose, type InteractionLine } from '../../home/interactionPlan';
import { ROOMS, hitItem, itemBox } from '../../home/layout';
import { shouldNagPlants, water } from '../../home/plants';
import { ACTIVITIES, ACTIVITY_IDS, type ActivityId } from '../../pet/activities';
import { animationName, createBrain, pickEmote, stepBrain, triggerBrain, wakeBrain, type Brain } from '../../pet/brain';
import { SHADOW_COLOR, shadowRect } from '../../pet/petRenderer';
import { FEET_Y, ROOM_H, ROOM_W } from '../../pet/room';
import { pick, pickLine } from '../../pet/speech';
import { ANGRY_TAPS, SUGAR_RUSH, avatarFor, countRecent, statusAnimation, type StatusAnim } from '../../pet/status';
import { ANIMATIONS, frameAt, resolveAnimation } from '../../sprites/animations';
import { DISPLAY_HEIGHT, FRAMES, type FrameMeta } from '../../sprites/loader';
import itemsMeta from '../../home/items.generated.json';
import { BOWL_SIDE, CAT_SPRITE_NAMES, CAT_Y, bowlEatState, callToBowl, calmCat, catFrame, catReact, createCat, feedCatInfo, petCatInfo, stepCat, type CatBed, type CatState } from '../../home/cat';
import { openActivities } from '../activitiesSheet';
import { SCENE_AT, createActivityPlayer, drawActivity, fitSpot, hitsScene, type Placed } from '../activityPlayer';
import { coinCounter } from '../coinCounter';
import { h, icon } from '../dom';
import { openFridge } from '../fridge';
import { createEditMode } from '../home/editMode';
import { BUSTS, drawBust } from '../home/bustPose';
import { createInteractionPlayer, drawWaterDrops, hasTowelRail, poseFrame, stageChanges, type InteractionRun, type InteractionView, type StageChanges } from '../home/interactions';
import { itemSource, preloadItems } from '../home/itemSprites';
import { createRoomNav, slideStage } from '../home/roomNav';
import { createRoomRenderer, type GabiLayer, type RoomFrame } from '../home/roomRenderer';
import { approachX, entryWalk, findBed, itemAnchor, itemFrameAnchor, neighborRoom, screenRect, spotWalkX, wakeSpot } from '../home/scene';
import { needBar } from '../needBar';
import { clampRoomX, createPetDrag } from '../petDrag';
import { createPixelStage, deviceRect, drawSprite } from '../pixelStage';
import { play } from '../sound';
import { PHASE_ICON, clockNow, gameClock } from '../../home/clock';
import { PHASE_NAMES, dayPhase, type DayPhase } from '../../home/daytime';

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
/** Dalej niż tyle px CSS od dotknięcia to już nie stuknięcie w przedmiot. */
const ITEM_TAP_SLOP = 12;
/** Szansa, że pogawędka przy spragnionej roślinie będzie o kwiatkach. */
const PLANT_NAG_CHANCE = 0.5;
/** Kwestie przy zegarze ściennym wg pory dnia. */
const CLOCK_LINES = { morning: 'clockMorning', day: 'clockDay', evening: 'clockEvening', night: 'clockNight' } as const;

/** Nocą (wg zegara) Gabi przy oknie mówi o gwiazdach. */
const isNightHour = (d: Date) => d.getHours() >= 21 || d.getHours() < 6;
/** Poniżej tej energii stuknięcie kanapy to drzemka, a nie szydełko. */
const NAP_ENERGY = 60;
/** Identyfikator kotka w interakcjach (nie jest przedmiotem z pokoju). */
const CAT_UID = 'cat';
/** Metadane sprite'a kota (public/items) do `drawSprite`: kotwica w środku, łapki na dole. */
function catMeta(sprite: string): FrameMeta | null {
  const m = (itemsMeta as Record<string, { w: number; h: number; scale?: number } | undefined>)[sprite];
  return m ? { w: m.w, h: m.h, anchorX: m.w / 2, scale: m.scale ?? 1, foot: m.h } : null;
}
/** Wysokość siedziska kanapy nad podłogą (px logiczne) — na niej leży Gabi. */
const SOFA_SEAT_H = 12;
/** Dymek do spontanicznej miny (brak — bez słowa). */
const EMOTE_LINES: Partial<Record<string, readonly string[]>> = {
  yawn: ['Ziew…', 'Ale jestem śpiąca…'],
  bored: ['Nudzę się…', 'Eh…'],
  think: ['Hmm…', 'Co by tu zrobić?'],
  idea: ['Mam pomysł!', 'O! Wiem!'],
  laugh: ['Hihi!', 'Hahaha!'],
};

/** Dokąd Gabi idzie i co zrobi po dojściu (do `x` w pokoju `room`). */
type Errand = { kind: 'item'; uid: string; use?: Interaction } | { kind: 'activity'; id: ActivityId; spot: Spot | null } | { kind: 'cat' };
type Pending = Errand & { x: number; room: RoomId };

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

/** Migający obraz telewizora: zmieniające się kolory sceny i jasny pasek przesuwający się w dół. */
const SCREEN_COLORS = ['#7fb0ff', '#c79bff', '#9cf2d2', '#ffd27a', '#ff9ec4'];
function drawScreenFlicker(ctx: CanvasRenderingContext2D, k: number, r: { x: number; y: number; w: number; h: number }, t: number): void {
  const d = deviceRect(k, r);
  const line = deviceRect(k, { x: r.x, y: r.y + (Math.floor(t / 120) % Math.max(1, Math.round(r.h))), w: r.w, h: 1 });
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t / 90);
  ctx.fillStyle = SCREEN_COLORS[Math.floor(t / 900) % SCREEN_COLORS.length];
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(line.x, line.y, line.w, line.h);
  ctx.restore();
}

/** Nutki (pixel art) unoszące się nad Gabi przy karaoke i tańcu. */
const NOTE_ARTS = [
  ['..kk', '..kk', '..k.', '..k.', 'kkk.', 'kkk.'],
  ['.kkkk', '.k..k', '.k..k', 'kk.kk', 'kk.kk'],
] as const;
const NOTE_COLORS = ['#b48ae0', '#ff9ec4', '#5aa8f0', '#ffd34d'];
function drawNotes(fx: CanvasRenderingContext2D, x: number, topY: number, t: number): void {
  for (let i = 0; i < 3; i++) {
    const p = ((t / 1600 + i / 3) % 1 + 1) % 1; // 0→1 wznoszenie
    const art = NOTE_ARTS[i % NOTE_ARTS.length];
    const nx = Math.round(x + (i - 1) * 9 + Math.sin((t / 400) + i * 2) * 2);
    const ny = Math.round(topY - 2 - p * 14);
    fx.save();
    fx.globalAlpha = p < 0.8 ? 1 : (1 - p) / 0.2;
    fx.fillStyle = NOTE_COLORS[(i + Math.floor(t / 1600)) % NOTE_COLORS.length];
    art.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === 'k') fx.fillRect(nx + rx, ny + ry, 1, 1); }));
    fx.restore();
  }
}

/** Para nad garnkiem: białe kłębki unoszące się i znikające. */
function drawSteam(fx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, t: number): void {
  for (let i = 0; i < 4; i++) {
    const p = ((t / 1400 + i / 4) % 1 + 1) % 1;
    const x = Math.round(b.x + 5 + i * 3 + Math.sin(t / 300 + i) * 2);
    const y = Math.round(b.y - 2 - p * 14);
    fx.save();
    fx.globalAlpha = 0.8 * (1 - p);
    fx.fillStyle = '#ffffff';
    fx.fillRect(x, y, 2, 2);
    fx.fillRect(x + 1, y - 1, 1, 1);
    fx.restore();
  }
}

/** Miejsca do spania kota: wysokość siedziska nad linią dolną mebla (legowiska nisko, kanapy i fotele wyżej). */
const CAT_BED_LIFT: Readonly<Record<string, number>> = {
  cat_bed_round: 2, cat_cave: 2, bean_bag: 6, pouf: 6, pouf_frog: 6,
  sofa_cozy: 12, sofa_kawaii: 12, sofa_gothic: 12, sofa_leather: 12, loveseat: 12,
  armchair_cozy: 11, armchair_bunny: 11, armchair_gothic: 11, armchair_wingback: 11,
};
function catBeds(items: readonly PlacedItem[]): CatBed[] {
  // łapki kota na wysokości siedziska: linia dolna mebla minus wysokość siedziska, liczona od linii kota
  return items
    .filter((i) => CAT_BED_LIFT[i.itemId] !== undefined)
    .map((i) => ({ x: i.x, lift: Math.max(0, CAT_Y - (i.y + 1 - CAT_BED_LIFT[i.itemId])) }));
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
  const avatar = h('img', { class: 'px avatar', src: app.figures.url('portrait_a'), alt: '' });
  const bars = {
    hunger: needBar('hunger', 'Głód', 'apple'),
    mood: needBar('mood', 'Humor', 'heart'),
    energy: needBar('energy', 'Energia', 'bolt'),
  };
  // zegarek z porą dnia (godzina z telefonu — ta sama co za oknami i na zegarze ściennym)
  const clockIcon = h('span', { class: 'clock-icon' });
  const clockTime = h('span', { class: 'clock-time' });
  const clockPill = h(
    'button',
    {
      class: 'clock-pill px-box',
      onclick: () => {
        const c = clockNow(gameClock());
        play('tap');
        app.toast(`${PHASE_NAMES[c.phase]} · ${c.text}`);
      },
    },
    clockIcon,
    clockTime,
  );
  let shownClock = '';
  let shownPhase: DayPhase | null = null;
  function syncClock(): void {
    const c = clockNow(gameClock());
    if (c.text !== shownClock) {
      shownClock = c.text;
      clockTime.textContent = c.text;
      clockPill.setAttribute('aria-label', `Godzina ${c.text}, ${PHASE_NAMES[c.phase].toLowerCase()}`);
    }
    if (c.phase !== shownPhase) {
      shownPhase = c.phase;
      clockIcon.replaceChildren(icon(PHASE_ICON[c.phase], 2));
    }
  }
  syncClock();
  const lightIcon = h('span', { class: 'nav-icon' });
  const lightLabel = h('span', {}, 'Światło');

  /** Oglądany pokój — Gabi jest zawsze w nim; śpiąca — w pokoju z łóżkiem. */
  const bed0 = findBed(s0);
  let viewRoom: RoomId = s0.sleeping && bed0 ? bed0.room : s0.currentRoom;

  // Kotek chodzący po oglądanym pokoju (w nocy śpi z Gabi w łóżku — wtedy go nie ma).
  let cat: CatState = createCat(performance.now(), Math.random);
  /** Energia z drzemki czekająca na zapis. */
  let napGain = 0;
  let napSavedAt = 0;
  let catRoom: RoomId = viewRoom;
  preloadItems(CAT_SPRITE_NAMES);
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
      return !petAt(x, y) && (it === null || itemUse(it) === 'none');
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
        // Przedmioty będą przestawiane: interakcje i zajęcia przy meblach się kończą (bez bonusu).
        cancelErrands();
        if (activitySpot) stopActivity(performance.now());
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
      clockPill,
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
  /** Mebel, przy którym trwa zajęcie (ukryty — scena rysowana w jego miejscu) albo null. */
  let activitySpot: Spot | null = null;
  /** Interakcje z przedmiotami (podlewanie, prysznic…): Gabi najpierw do nich idzie (`pending`). */
  const interaction = createInteractionPlayer();
  let pending: Pending | null = null;
  let lastPlantNag: number | null = null;
  let itemDown: { id: number; x: number; y: number; uid: string } | null = null;
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
    play('jump');
    brain = triggerBrain(brain, 'happy', now);
  }

  function setAvatar(name: string): void {
    if (name === avatarName) return;
    avatarName = name;
    avatar.src = app.figures.url(name);
    avatar.classList.toggle('crisp', name !== 'portrait_a');
  }

  /** Czy punkt (px logiczne) trafia w postać — albo w scenę zajęcia na środku pokoju / przy meblu. */
  function petAt(x: number, y: number): boolean {
    const t = performance.now();
    const v = activity.view(t, brain.x);
    if (v?.cur.centered) return hitsScene(v.cur, x, y);
    // Gabi narysowana w klatce przedmiotu (pod prysznicem…) — dotyk trafia w przedmiot
    if (interaction.view(t)?.step.gabi.kind === 'hidden') return false;
    return Math.abs(x - brain.x) <= HIT_HALF_W && y >= HEAD_Y && y <= FEET_Y;
  }

  /** Porzuca drogę do przedmiotu i trwającą interakcję (bez bonusu); true, gdy interakcja trwała. */
  function cancelErrands(): boolean {
    pending = null;
    return interaction.cancel();
  }

  /** Gabi rusza do `x`; po dojściu (patrz `frame`) robi to, co w `p`. */
  function walkTo(x: number, errand: Errand): void {
    const target = clampRoomX(x);
    brain = { ...brain, action: 'walk', targetX: target };
    jumpStart = -1;
    squashUntil = 0;
    pending = { ...errand, x: target, room: viewRoom };
  }

  /**
   * Przejście do innego pokoju (strzałki, przesunięcie palcem, zaśnięcie). `enter` — Gabi wchodzi od strony,
   * z której „przyszła”; bez niego (sen) i tak leży w łóżku.
   */
  function goToRoom(room: RoomId, dir: -1 | 1, enter: boolean): void {
    if (room === viewRoom || destroyed) return;
    play('whoosh');
    // Interakcja zostaje w starym pokoju; zajęcie przy meblu albo „pokojowe” (muzyka w salonie…) się kończy.
    cancelErrands();
    if (activity.current && !activityAllowedIn(activity.current.id, room, activitySpot)) stopActivity(performance.now());
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

  /**
   * Zaczyna zajęcie od razu (poprzednie zajęcie i interakcję przerywa bez bonusu); Gabi przestaje chodzić i stoi.
   * `spot` — mebel w oglądanym pokoju: klatki zajęcia w jego miejscu, a mebel ukryty.
   */
  function beginActivity(id: ActivityId, t: number, spot: Spot | null = null): void {
    stopActivity(t);
    cancelErrands();
    brain = { ...brain, action: 'idle', targetX: brain.x };
    jumpStart = -1;
    squashUntil = 0;
    const it = spot && spot.room === viewRoom ? store.get().rooms[viewRoom].items.find((i) => i.uid === spot.uid) : undefined;
    activitySpot = it ? spot : null;
    const def = ACTIVITIES[id];
    activity.start(id, t, it ? fitSpot(def, def.seated ? seatAnchor(it) : spotAnchor(it), ROOM_W) : null);
  }

  /** Po zajęciu: ze sceny (na środku pokoju / przy meblu) Gabi wychodzi w jej miejscu, a pogawędka nie zagłusza kwestii. */
  function afterActivity(last: Placed, t: number): void {
    activitySpot = null;
    if (last.centered) {
      const x = clampRoomX(last.x);
      brain = { ...brain, x, targetX: x };
    }
    nextChatAt = Math.max(nextChatAt, t + 10_000);
  }

  /** Przerywa trwające zajęcie bez bonusu; false, gdy nic nie trwało. */
  function stopActivity(t: number): boolean {
    const last = activity.stop(t, brain.x);
    if (!last) return false;
    afterActivity(last, t);
    return true;
  }

  /**
   * Zajęcie na życzenie (panel albo stuknięcie mebla): od razu, po dojściu do mebla, albo po przejściu do innego
   * pokoju (i dojściu tam do mebla / w głąb pokoju). False, gdy w mieszkaniu nie ma potrzebnego mebla.
   */
  function requestActivity(id: ActivityId, t: number): boolean {
    const a = activityAvailability(store.get(), id, viewRoom, brain.x);
    if (a.status === 'missing') return false;
    stopActivity(t);
    cancelErrands();
    activity.postpone(t);
    if (a.status === 'elsewhere') goToRoom(a.room, dirBetween(viewRoom, a.room), true);
    const item = a.spot ? store.get().rooms[a.spot.room].items.find((i) => i.uid === a.spot!.uid) : undefined;
    if (a.spot && item) walkTo(spotWalkX(item), { kind: 'activity', id, spot: a.spot });
    else if (a.status === 'elsewhere') walkTo(brain.targetX, { kind: 'activity', id, spot: null }); // start po wejściu w głąb pokoju
    else beginActivity(id, t);
    return true;
  }

  function openActivitySheet(): void {
    if (store.get().sleeping) {
      app.toast('Gabi śpi');
      return;
    }
    const s = store.get();
    closeSheet = openActivities(
      el,
      (id) => {
        const a = activityAvailability(s, id, viewRoom, brain.x);
        return { enabled: a.status !== 'missing', hint: availabilityHint(a) };
      },
      (id) => {
        if (destroyed) return;
        if (store.get().sleeping || wakeUntil > 0) {
          app.toast('Gabi śpi');
          return;
        }
        drag.cancel();
        requestActivity(id, performance.now());
      },
      (name) => app.figures.url(name),
    );
  }

  /** Kwestia interakcji (kalendarz i okno zależą od dnia i pory). */
  function interactionLine(key: InteractionLine): string {
    const now = Date.now();
    if (key === 'calendar') return `Dziś Dzień ${dayNumber(store.get().createdAt, now)}!`;
    if (key === 'clock') {
      const c = clockNow(gameClock(now));
      return pick(content.lines[CLOCK_LINES[c.phase]]).split('{czas}').join(c.text);
    }
    if (key === 'window') return pick(isNightHour(gameClock(now)) ? content.lines.windowNight : content.lines.window);
    return withCat(pick(content.lines[key]));
  }

  /** Imię kotka w kwestii (znacznik `{kot}`). */
  function withCat(line: string): string {
    return line.split('{kot}').join(store.get().cat.name);
  }

  /** Co Gabi robi z przedmiotem po stuknięciu: interakcja z katalogu, a siedzisko — szydełkowanie na nim. */
  function itemUse(it: PlacedItem): Interaction {
    const kind = findItem(it.itemId)?.interaction ?? 'none';
    // Zmęczona Gabi na kanapie ucina sobie drzemkę, wypoczęta — szydełkuje.
    if (kind !== 'none' || !SEATS.includes(it.itemId)) return kind;
    const r = Math.random();
    if (SOFAS.includes(it.itemId)) {
      if (store.get().needs.energy < NAP_ENERGY) return 'nap';
      return r < 0.34 ? 'crochet' : r < 0.67 ? 'relax' : 'lounge';
    }
    return r < 0.5 ? 'crochet' : 'relax';
  }

  /**
   * Stuknięcie przedmiotu z interakcją (poza trybem urządzania): Gabi idzie do niego i po dojściu coś z nim robi.
   * Biurko → nauka przy nim, koszyk z włóczką → szydełko na najbliższym siedzisku, głośniki → muzyka.
   */
  function useItem(it: PlacedItem, t: number): void {
    const kind = itemUse(it);
    if (kind === 'none') return;
    // to samo jeszcze trwa albo Gabi już tam idzie
    if (interaction.current?.uid === it.uid || (pending?.kind === 'item' && pending.uid === it.uid)) return;
    const items = store.get().rooms[viewRoom].items;
    if (kind === 'study' || kind === 'crochet') {
      const seat = kind === 'study' || SEATS.includes(it.itemId) ? it : seatNear(items, it.x);
      if (!seat) {
        say(pick(content.lines.noSeat), 2400);
        return;
      }
      const id: ActivityId = kind;
      if (activity.current?.id === id && activitySpot?.uid === seat.uid) return;
      stopActivity(t);
      cancelErrands();
      activity.postpone(t);
      walkTo(spotWalkX(seat), { kind: 'activity', id, spot: { room: viewRoom, uid: seat.uid } });
      return;
    }
    if (kind === 'music') {
      if (activity.current?.id === 'music') return;
      stopActivity(t);
      cancelErrands();
      activity.postpone(t);
      walkTo(approachX(it, brain.x), { kind: 'activity', id: 'music', spot: null });
      return;
    }
    const plan = interactionSteps(kind, { hasRail: false });
    if (!plan) return;
    stopActivity(t);
    cancelErrands();
    // Poza na/przy meblu (kanapa, stół, TV, okno) — Gabi idzie na środek mebla, inaczej staje obok.
    const onItem = plan[0].gabi.kind === 'frames' && plan[0].gabi.at !== undefined;
    walkTo(onItem ? clampRoomX(it.x) : approachX(it, brain.x), { kind: 'item', uid: it.uid, use: kind });
  }

  /** Gabi doszła: zajęcie albo interakcja z przedmiotem (lampka przełącza się od razu). */
  function arrive(p: Pending, t: number): void {
    pending = null;
    if (p.kind === 'activity') {
      beginActivity(p.id, t, p.spot);
      return;
    }
    if (p.kind === 'cat') {
      // głaskanie i przytulanie kotka (kot jest w klatkach Gabi — chodzący kot znika na ten czas)
      const steps = interactionSteps('cat', { hasRail: false });
      if (!steps) return;
      brain = { ...brain, action: 'idle', targetX: brain.x, facing: cat.x < brain.x ? 'left' : 'right' };
      interaction.start({ uid: CAT_UID, itemId: CAT_UID, x: cat.x, y: CAT_Y, flip: false }, viewRoom, 'cat', steps, t);
      return;
    }
    const items = store.get().rooms[viewRoom].items;
    const it = items.find((i) => i.uid === p.uid);
    const kind = it ? (p.use ?? findItem(it.itemId)?.interaction) : undefined;
    const steps = it && kind
      ? interactionSteps(kind, {
          hasRail: hasTowelRail(items),
          night: isNightHour(gameClock()),
          variant: Math.random(),
          energy: store.get().needs.energy,
          itemStates: Object.keys(itemFrames(it.itemId)),
          defaultOutfit: isDefaultOutfit(store.get().outfit),
        })
      : null;
    if (!it || !kind || !steps) return;
    brain = { ...brain, action: 'idle', targetX: brain.x, facing: it.x < brain.x ? 'left' : 'right' };
    if (kind === 'lamp') store.update((s) => {
      const r = toggleLamp(s, viewRoom, it.uid);
      return r.ok ? r.state : s;
    });
    interaction.start(it, viewRoom, kind, steps, t);
  }

  /** Koniec interakcji: podlanie rośliny i bonus humoru (raz na godzinę na przedmiot). */
  function finishInteraction(run: InteractionRun, t: number): void {
    if (run.kind === 'wardrobe') {
      void app.go('wardrobe');
      return;
    }
    if (run.kind === 'fridge') {
      openFridge(app, el, stage, doFeed);
      return;
    }
    if (run.kind === 'catfood') {
      // pełna miska: kotek przybiega i je
      store.update((st) => ({ ...st, cat: feedCatInfo(st.cat, CONFIG.cat.feedLove) }));
      const bowl = store.get().rooms[run.room].items.find((i) => i.uid === run.uid);
      if (bowl && run.room === viewRoom) cat = callToBowl(cat, bowl.x, t, itemFrames(bowl.itemId).eat_1 !== undefined, CAT_Y - bowl.y);
      play('meow');
    }
    if (run.kind === 'cat') store.update((st) => ({ ...st, cat: petCatInfo(st.cat, CONFIG.cat.petLove) }));
    let rewarded = false;
    store.update((s) => {
      let st = s;
      if (run.kind === 'water') {
        const r = water(st, run.room, run.uid, Date.now());
        if (r.ok) st = r.state;
      }
      const res = rewardInteraction(st, run.uid, run.kind, Date.now());
      rewarded = res.rewarded;
      return res.state;
    });
    if (rewarded) addHearts(3);
    if (run.kind === 'cook') {
      // danie do lodówki raz na godzinę z jednej kuchenki
      if (rewarded) {
        let food: FoodId = 'sandwich';
        store.update((st) => {
          const r = cookDish(st, Math.random);
          food = r.food;
          return r.state;
        });
        play('coin');
        app.toast(`Ugotowane: ${foodById(food).name} — w lodówce!`);
      } else {
        say(pick(content.lines.cookLater), 2200);
      }
    }
    nextChatAt = Math.max(nextChatAt, t + 10_000);
  }

  /** Postęp interakcji: kwestia i efekt na starcie kroku, na końcu bonus. */
  function stepInteraction(t: number): void {
    const st = interaction.step(t);
    if (st.entered?.line) say(interactionLine(st.entered.line), Math.min(3200, Math.max(1800, st.entered.ms)));
    if (st.entered?.effect === 'hearts') addHearts(5);
    if (st.entered?.effect === 'water') play('water');
    if (st.entered?.effect === 'steam') play('cook');
    if (st.finished) finishInteraction(st.finished, t);
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
    // cola: Gabi pije z puszki (cała animacja picia), reszta — jedzenie
    brain = triggerBrain(brain, id === 'cola' ? 'drink' : 'eat', performance.now());
    // kotek obok prosi o kawałek
    cat = catReact(cat, 'beg', performance.now(), brain.x, Math.random);
    const foodLines: Partial<Record<FoodId, readonly string[]>> = content.foodLines;
    say(pick(id === 'kitkat' ? content.lines.kitkat : id === 'cola' ? content.lines.drink : (foodLines[id] ?? content.lines.eat)), 2400);
    play(id === 'cola' ? 'pop' : 'eat');
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
        // ulubiony baton: zakochana mina i serduszka
        brain = triggerBrain(brain, 'love', t);
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
    if (stopActivity(now) || cancelErrands()) {
      // Stuknięcie w trakcie zajęcia/interakcji tylko je kończy — bez głaskania i bez liczenia do złości.
      say(pick(content.lines.activityStop), 2000);
      return;
    }
    squashUntil = now + 220;
    taps.push(now);
    if (taps.length > 10) taps.splice(0, taps.length - 10);
    if (countRecent(taps, now, ANGRY_TAPS.windowMs) >= ANGRY_TAPS.count) {
      taps.length = 0;
      brain = triggerBrain(brain, 'angry', now);
      play('bad');
      cat = catReact(cat, 'scared', now, brain.x, Math.random);
      say(pick(content.lines.angry), 2000);
      return;
    }
    const res = petCharacter(store.get(), Date.now());
    if (res.accepted) {
      store.update(() => res.state);
      // głaskanie: podskok, śmiech albo rumieniec
      const r = Math.random();
      if (r < 0.4) jump(now);
      else brain = triggerBrain(brain, r < 0.7 ? 'laugh' : 'shy', now);
      addHearts(3);
      play('pet');
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
    if (!activity.current && !edit.active && !pending && !interaction.current && t >= activity.nextAt && status === null && idle) {
      // Samo z siebie tylko to, co da się zrobić w tym pokoju (do mebla Gabi najpierw podchodzi).
      const id = pickActivityHere(store.get(), viewRoom, ACTIVITY_IDS, Math.random);
      if (id) requestActivity(id, t);
      else activity.postpone(t);
    }
  }

  /** Gabi w łóżku: klatki snu/pobudki w miejscu łóżka (zamiast pustego łóżka). */
  function bedLayer(t: number, sleeping: boolean, alpha: number, bed: PlacedItem | null): GabiLayer {
    const name = sleeping ? 'sleep' : 'wake';
    if (name !== lastAnim) {
      lastAnim = name;
      animStart = t;
    }
    const frameName = frameAt(resolveAnimation(ANIMATIONS, name), t - animStart);
    const fig = app.figures.get(frameName);
    const at = bed ? itemAnchor(bed, itemById(GABI_BED)) : SCENE_AT;
    return {
      orderY: bed ? bed.y : SCENE_AT.feetY,
      alpha,
      draw: (ctx, k) => {
        if (fig) drawSprite(ctx, k, fig.img, fig.meta, { x: at.x, feetY: at.feetY, flip: bed?.flip ?? false, bob: 0, squash: 0, jump: 0 });
      },
    };
  }

  /**
   * Gabi w trakcie interakcji: klatka z Gabi przy wieszaku (wieszak ukryty), poza z klatek postaci,
   * popiersie z nogami (turban, suszarka) albo nic — gdy Gabi jest częścią klatki przedmiotu (prysznic, wanna…).
   */
  function interactionLayer(iv: InteractionView, stage: StageChanges, alpha: number): GabiLayer | null {
    const x = brain.x;
    if (stage.other) {
      const { item, sprite } = stage.other;
      const a = itemFrameAnchor(item, itemById(item.itemId), sprite);
      return {
        orderY: a.feetY,
        alpha,
        draw: (ctx, k) => {
          const src = itemSource(sprite);
          if (src) drawSprite(ctx, k, src, a.meta, { x: a.x, feetY: a.feetY, flip: item.flip, bob: 0, squash: 0, jump: 0 });
        },
      };
    }
    const pose = iv.step.gabi;
    if (pose.kind === 'hidden') return null;
    const at = posePlace(pose, iv);
    return {
      orderY: at.orderY,
      alpha,
      draw: (ctx, k) => {
        if (at.shadow) drawShadowAt(ctx, k, at.x, at.feetY, 0);
        if (pose.kind === 'frames') {
          const name = poseFrame(pose, iv.inStepMs);
          const fig = app.figures.get(name);
          if (fig) drawSprite(ctx, k, fig.img, fig.meta, { x: at.x, feetY: at.feetY, flip: at.flip, bob: 0, squash: 0, jump: 0 });
          return;
        }
        // nogi bez ozdoby głowy — ozdobę (jeśli pasuje) ma popiersie
        const body = app.figures.get('idle_front', { hat: false });
        const bust = app.figures.get(pose.bust);
        if (body && bust) {
          drawBust(ctx, k, { body: body.img, bust: bust.img }, { body: body.meta, bust: bust.meta }, BUSTS[pose.bust], x, FEET_Y);
        }
      },
    };
  }

  /**
   * Gdzie narysować pozę interakcji względem przedmiotu (`GabiPose.at`): na siedzisku, na leżąco na kanapie,
   * za stołem (stół rysowany po Gabi zasłania nogi), przed telewizorem, pod oknem; `face` — zwrócona do przedmiotu.
   */
  function posePlace(pose: GabiPose, iv: InteractionView): { x: number; feetY: number; orderY: number; flip: boolean; shadow: boolean } {
    const x = brain.x;
    const plain = { x, feetY: FEET_Y, orderY: FEET_Y, flip: false, shadow: true };
    if (iv.run.uid === CAT_UID) return { ...plain, flip: pose.kind === 'frames' && pose.face === true && cat.x < x };
    const item = store.get().rooms[viewRoom].items.find((i) => i.uid === iv.run.uid);
    if (!item || pose.kind !== 'frames') return plain;
    switch (pose.at) {
      case 'seat': {
        const a = seatAnchor(item);
        return { ...a, orderY: item.y + 1, flip: false, shadow: false };
      }
      case 'lie':
        return { x: item.x, feetY: item.y - SOFA_SEAT_H, orderY: item.y + 1, flip: item.flip, shadow: false };
      case 'behind':
        return { x: item.x, feetY: item.y - 2, orderY: item.y - 1, flip: false, shadow: false };
      case 'front': {
        const y = Math.max(FEET_Y, item.y + 4);
        return { x: clampRoomX(item.x), feetY: y, orderY: y, flip: false, shadow: true };
      }
      case 'under':
        return { x: clampRoomX(item.x), feetY: FEET_Y, orderY: FEET_Y, flip: false, shadow: true };
      default:
        return { ...plain, flip: pose.face === true && item.x < x };
    }
  }

  /** Kot jest w pokoju: nie w nocy i nie wtedy, gdy Gabi go głaszcze (kot jest wtedy w jej klatkach). */
  function catVisible(): boolean {
    return !store.get().sleeping && wakeUntil === 0 && interaction.current?.kind !== 'cat';
  }

  /** Prostokąt kota (px logiczne) do stuknięć. */
  function catBox(): { x: number; y: number; w: number; h: number } {
    const f = catFrame(cat, performance.now());
    const m = catMeta(f.sprite);
    const x = cat.x + f.dx;
    if (!m) return { x, y: CAT_Y, w: 0, h: 0 };
    return { x: x - (m.w * m.scale) / 2, y: CAT_Y - (cat.lift ?? 0) - f.lift - m.h * m.scale, w: m.w * m.scale, h: m.h * m.scale };
  }

  function catAt(x: number, y: number): boolean {
    const b = catBox();
    return x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h;
  }

  /** Stuknięty kot siada, a Gabi do niego podchodzi. */
  function goToCat(t: number): void {
    if (store.get().sleeping || wakeUntil > 0 || edit.active) return;
    stopActivity(t);
    cancelErrands();
    cat = calmCat(cat, t);
    say(withCat(pick(content.lines.cat)), 1800);
    play('meow');
    walkTo(cat.x + (brain.x < cat.x ? -12 : 12), { kind: 'cat' });
  }

  /** Warstwa kota: klatka trybu (chód, bieg, skok…), zwrócona w stronę ruchu, z cieniem pod łapkami. */
  function catLayer(t: number, alpha: number): GabiLayer {
    const f = catFrame(cat, t);
    const m = catMeta(f.sprite);
    const x = cat.x + f.dx;
    const lift = cat.lift ?? 0;
    return {
      orderY: CAT_Y,
      alpha,
      draw: (ctx, k) => {
        if (!m) return; // brak obrazka kota — bez rysowania (gra działa dalej)
        const w = m.w * m.scale * 0.7;
        const r = deviceRect(k, { x: x - w / 2, y: CAT_Y - 1 - lift, w, h: 2 });
        ctx.fillStyle = SHADOW_COLOR;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        const src = itemSource(f.sprite);
        if (src) drawSprite(ctx, k, src, m, { x, feetY: CAT_Y - lift, flip: f.flip, bob: 0, squash: 0, jump: f.lift });
      },
    };
  }

  /** Kolejność rysowania zajęcia przy meblu do siedzenia: przed meblem, nawet gdy Gabi jest nad jego linią. */
  function seatOrderY(feetY: number): number {
    if (!activitySpot || activitySpot.room !== viewRoom || !activity.current?.seated) return feetY;
    const seat = store.get().rooms[viewRoom].items.find((i) => i.uid === activitySpot!.uid);
    return seat ? Math.max(feetY, seat.y + 1) : feetY;
  }

  /** Meble ukryte w tej klatce: zastąpione Gabi (łóżko w czasie snu, biurko/siedzisko zajęcia, wieszak przy wycieraniu). */
  function hiddenItems(stage: StageChanges, bed: PlacedItem | null, act: unknown): Set<string> {
    const hidden = new Set(stage.hidden);
    if (bed) hidden.add(bed.uid);
    // Biurko zastępuje scena nauki; na siedzisku Gabi siedzi na widocznym meblu.
    if (act && activitySpot && activitySpot.room === viewRoom && !activity.current?.seated) hidden.add(activitySpot.uid);
    return hidden;
  }

  /** Stuknięcie przedmiotu z interakcją (bez przesunięcia, poza urządzaniem i nie w postać) → `useItem`. */
  const onItemDown = (e: PointerEvent) => {
    if (edit.active || !e.isPrimary || store.get().sleeping || wakeUntil > 0) return;
    const { x, y } = px.toLogical(e);
    if (petAt(x, y)) return;
    if (catVisible() && catAt(x, y)) {
      itemDown = { id: e.pointerId, x: e.clientX, y: e.clientY, uid: CAT_UID };
      return;
    }
    // Najwyższy przedmiot, z którym da się coś zrobić (krzesło przed biurkiem nie zasłania biurka, chyba że samo jest siedziskiem).
    const usable = store.get().rooms[viewRoom].items.filter((i) => itemUse(i) !== 'none');
    const it = hitItem(usable, x, y);
    if (!it) return;
    itemDown = { id: e.pointerId, x: e.clientX, y: e.clientY, uid: it.uid };
  };
  const onItemUp = (e: PointerEvent) => {
    const d = itemDown;
    itemDown = null;
    if (!d || d.id !== e.pointerId || edit.active || destroyed) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    if (d.uid === CAT_UID) {
      goToCat(performance.now());
      return;
    }
    const it = store.get().rooms[viewRoom].items.find((i) => i.uid === d.uid);
    if (it) useItem(it, performance.now());
  };
  const onItemCancel = () => {
    itemDown = null;
  };
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__room = {
      get brain() { return brain; },
      get pending() { return pending; },
      get act() { return activity.current; },
      get inter() { return interaction.current; },
      get cat() { return cat; },
    };
  }
  canvas.addEventListener('pointerdown', onItemDown);
  window.addEventListener('pointerup', onItemUp);
  window.addEventListener('pointercancel', onItemCancel);

  function frame(t: number): void {
    if (destroyed) return;
    const dt = Math.max(0, Math.min(50, t - last));
    last = t;
    const s = store.get();
    syncClock();
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
    if (free) stepInteraction(t);
    // drzemka na kanapie: energia rośnie w tempie snu (zapis co pół sekundy, nie co klatkę)
    if (free && interaction.current?.kind === 'nap') {
      napGain += (dt / 3_600_000) * CONFIG.needs.sleepEnergyGainPerHour;
      if (napGain >= 1 || t - napSavedAt > 500) {
        const gain = napGain;
        napGain = 0;
        napSavedAt = t;
        store.update((st) => ({ ...st, needs: { ...st.needs, energy: Math.min(CONFIG.needs.max, st.needs.energy + gain) } }));
      }
    }
    // Droga do przedmiotu/mebla: po dojściu (mózg skończył spacer w celu) interakcja albo zajęcie.
    if (free && pending) {
      if (pending.room !== viewRoom) pending = null;
      else if (brain.action === 'idle' && Math.abs(brain.x - pending.x) < 1) arrive(pending, t);
      else if (brain.action === 'idle') brain = { ...brain, action: 'walk', targetX: pending.x };
    }
    // W trakcie zajęcia Gabi stoi (mózg nie jest krokowany), a zamiast animacji rysujemy klatki zajęcia.
    const act = free ? activity.view(t, brain.x) : null;
    // Interakcja z przedmiotem (prysznic, podlewanie…): Gabi stoi przy nim w pozie kroku.
    const iv: InteractionView | null = free && !act ? interaction.view(t) : null;
    if (free && !act && !iv) {
      brain = stepBrain(brain, dt, { now: t, mood: moodLevel(s.needs), sleeping: false, rng: Math.random, canWalk: status === null });
    }

    const emotion = brain.action === 'crazy' ? 'crazy' : brain.action === 'scared' ? 'scared' : null;
    const face = avatarFor(status, emotion, t);
    setAvatar(act?.def.avatar && status === null && emotion === null ? act.def.avatar : face);

    const stage = stageChanges(iv, items);
    let gabi: GabiLayer | null;
    if (inBed) {
      gabi = bedLayer(t, s.sleeping, alpha, bed);
    } else if (iv) {
      lastAnim = '';
      gabi = interactionLayer(iv, stage, alpha);
    } else if (act) {
      lastAnim = '';
      gabi = {
        // na siedzisku (podniesiona, np. hoker) — kolejność od linii mebla, żeby była przed nim
        orderY: seatOrderY(act.cur.feetY),
        alpha,
        draw: (ctx, k) => {
          if (!act.cur.centered) drawShadowAt(ctx, k, act.cur.x, FEET_Y, 0);
          drawActivity(ctx, k, app.figures, act);
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
      const fig = app.figures.get(frameName);
      let x = brain.x;
      let feetY = FEET_Y;
      if (held) ({ x, feetY } = drag.place(fig?.meta));
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
          if (fig) drawSprite(ctx, k, fig.img, fig.meta, { x, feetY, flip, bob, squash, jump: jumpH });
        },
      };
    }

    if (catRoom !== viewRoom) {
      // kot przychodzi za Gabi do innego pokoju
      catRoom = viewRoom;
      cat = createCat(t, Math.random);
    }
    if (!s.sleeping && interaction.current?.kind !== 'cat' && pending?.kind !== 'cat') {
      // blisko stojącej Gabi kot czasem się łasi; głodny prosi; śpi na legowiskach i kanapach z pokoju
      cat = stepCat(cat, dt, t, Math.random, {
        gabiX: free && brain.action === 'idle' && !act && !iv ? brain.x : null,
        beds: catBeds(items),
        hungry: s.cat.hunger < CONFIG.cat.hungryBelow,
        love: s.cat.love,
      });
    }
    // kot jedzący z miski jest w klatce miski (miska z kotem w jej miejscu) — bez osobnej warstwy kota
    const eating = catVisible() ? bowlEatState(cat, t) : null;
    const bowl = eating ? items.find((i) => itemFrames(i.itemId)[eating] !== undefined && Math.abs(i.x - BOWL_SIDE - cat.x) < 1.5) : undefined;
    const states = bowl && eating ? new Map([...stage.states, [bowl.uid, itemFrames(bowl.itemId)[eating]]]) : stage.states;
    const extras = catVisible() && !bowl ? [catLayer(t, alpha)] : [];
    // obraz w telewizorze rysowany razem z nim — Gabi siedząca przed ekranem go zasłania
    const itemOverlays = new Map<string, (ctx: CanvasRenderingContext2D, k: number) => void>();
    if (iv?.step.effect === 'screen') {
      const tv = items.find((i) => i.uid === iv.run.uid);
      const r = tv ? screenRect(tv) : null;
      if (tv && r) itemOverlays.set(tv.uid, (ctx, k) => drawScreenFlicker(ctx, k, r, t));
    }
    const f: RoomFrame = {
      room: viewRoom,
      looks: room,
      items,
      night: s.sleeping,
      phase: dayPhase(gameClock()),
      now: Date.now(),
      t,
      hidden: hiddenItems(stage, inBed && !edit.active ? bed : null, act),
      states,
      selectedUid: edit.selectedUid,
      gabi,
      extras,
      itemOverlays,
    };
    px.clear();
    renderer.drawBackground(bg, f);
    renderer.drawOverlays(fx, f);
    if (act?.def.notes) {
      const m = FRAMES[act.cur.frame];
      const top = m ? act.cur.feetY - (m.foot ?? m.h) * m.scale : act.cur.feetY - 56;
      drawNotes(fx, act.cur.x, top, t);
    }
    if (iv?.step.effect === 'steam') {
      const stove = items.find((i) => i.uid === iv.run.uid);
      if (stove) drawSteam(fx, itemBox(stove), t);
    }
    if (iv?.step.effect === 'water') {
      const plant = items.find((i) => i.uid === iv.run.uid);
      if (plant) drawWaterDrops(fx, itemBox(plant), iv.inStepMs);
    }
    drawHearts(dt);
    px.compose((ctx, k) => renderer.drawItems(ctx, k, f));

    const errand = iv !== null || pending !== null;
    if (free && !act && !errand && !edit.active && shouldNagPlants(room.items, Date.now(), t, lastPlantNag)) {
      lastPlantNag = t;
      say(pick(content.lines.plantsThirsty), 2600);
      nextChatAt = Math.max(nextChatAt, t + 8000);
    }
    if (free && !act && !errand && !edit.active && t >= nextChatAt) {
      nextChatAt = t + 20_000 + Math.random() * 10_000;
      if (s.needs.mood >= SPONTANEOUS_HAPPY.minMood && Math.random() < SPONTANEOUS_HAPPY.chance) {
        jump(t);
        addHearts(4);
      } else if (Math.random() < 0.5) {
        brain = triggerBrain(brain, 'talk', t);
        // głodny kotek — Gabi o nim przypomina (i kotek miauczy)
        if (s.cat.hunger < CONFIG.cat.hungryBelow && Math.random() < 0.5) {
          say(withCat(pick(content.lines.catHungry)));
          play('meow');
        } else say(pickLine(s.needs));
      } else {
        // codzienna mina: ziewanie, nuda, zamyślenie, pomysł, przeciąganie, śmiech
        const emote = pickEmote(s.needs, Math.random);
        brain = triggerBrain(brain, emote, t);
        const line = EMOTE_LINES[emote];
        if (line) say(pick(line), 1800);
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
      canvas.removeEventListener('pointerdown', onItemDown);
      window.removeEventListener('pointerup', onItemUp);
      window.removeEventListener('pointercancel', onItemCancel);
      px.dispose();
      clearTimeout(speechTimer);
      clearTimeout(treatTimer);
      unsubscribe();
    },
  };
}
