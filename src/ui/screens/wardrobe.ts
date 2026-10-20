import type { App, Screen } from '../../app';
import type { ClothSlot, Outfit } from '../../core/types';
import { SHADOW_COLOR, shadowRect } from '../../pet/petRenderer';
import { ANIMATIONS, frameAt, resolveAnimation } from '../../sprites/animations';
import { hasOutfitFrames } from '../../sprites/outfitFrames';
import { CLOTH_SLOTS, CLOTH_SLOT_NAMES, clothesBySlot, findCloth, type ClothDef } from '../../wardrobe/catalog';
import { buyCloth, isDefaultOutfit, isOwned, takeOff, takeOffAll, wear } from '../../wardrobe/outfit';
import { h, icon } from '../dom';
import { createPixelStage, deviceRect, drawSprite } from '../pixelStage';
import { itemUrl } from '../home/itemSprites';
import { newMarks } from '../newMarks';
import { screenHeader } from '../screenHeader';
import { play } from '../sound';

/** Scena podglądu (px logiczne): Gabi na środku, stopy nad dolną krawędzią. */
const W = 72;
const H = 76;
const FEET = 72;
/** Pozy po założeniu ubrania. */
const SHOW_OFF = ['pose_tada', 'pose_peace', 'pose_curtsy', 'pose_twirl'];
/** Obrót dookoła (pokazanie stroju z każdej strony). */
const TURN = ['turn_front', 'turn_left34', 'turn_side', 'turn_back', 'turn_right34', 'turn_front'];
const TURN_MS = 450;
const CYCLE_MS = 9000;

/** Podgląd w spoczynku: stoi, obraca się dookoła, stoi, macha. */
function previewFrame(t: number): string {
  const c = t % CYCLE_MS;
  if (c >= 3000 && c < 3000 + TURN.length * TURN_MS) return TURN[Math.floor((c - 3000) / TURN_MS)];
  if (c >= 7000 && c < 8100) return 'fun_wave';
  return 'idle_front';
}
/** Spacer w podglądzie: zakres i prędkość (px log./s). */
const WALK_MIN = 18;
const WALK_MAX = W - 18;
const WALK_SPEED = 16;

/**
 * Szafa: podgląd Gabi w bieżącym stroju (spoczynek ↔ machanie albo spacer), zakładki Sukienki / Góra / Dół / Głowa,
 * kafelki z miniaturą Gabi w danym ubraniu. Kupno i zakładanie od razu zapisują stan.
 */
export function wardrobeScreen(app: App): Screen {
  const header = screenHeader(app, 'Szafa');
  let slot: ClothSlot = 'dress';
  let walking = false;
  let destroyed = false;

  // --- podgląd ---
  const stage = createPixelStage(W, H);
  const walkBtn = h('button', { class: 'px-btn secondary', 'aria-pressed': 'false' }, 'Pokaż spacer');
  const resetBtn = h('button', { class: 'px-btn secondary' }, 'Zdejmij wszystko');
  const preview = h(
    'div',
    { class: 'wardrobe-top' },
    h('div', { class: 'wardrobe-stage px-box' }, stage.canvas),
    h('div', { class: 'wardrobe-actions' }, walkBtn, resetBtn),
  );
  let walkX = W / 2;
  let walkDir: 1 | -1 = 1;
  let last = performance.now();
  let pop = 0;
  /** Poza po założeniu ubrania („ta-da”, piątka, dyg, obrót spódnicy). */
  let poseName = 'pose_tada';
  let poseUntil = 0;
  const showOff = () => {
    play('sparkle');
    pop = performance.now() + 360;
    poseName = SHOW_OFF[Math.floor(Math.random() * SHOW_OFF.length)];
    poseUntil = performance.now() + 1600;
  };
  /** Przymierzane ubranie (podgląd bez kupowania) — znika po zakupie, założeniu albo zmianie zakładki. */
  let trying: { id: string; outfit: Outfit } | null = null;

  function drawPreview(t: number): void {
    if (destroyed) return;
    const dt = Math.min(50, t - last);
    last = t;
    let name: string;
    let x = W / 2;
    let flip = false;
    if (walking) {
      walkX += (walkDir * WALK_SPEED * dt) / 1000;
      if (walkX > WALK_MAX) walkDir = -1;
      if (walkX < WALK_MIN) walkDir = 1;
      walkX = Math.max(WALK_MIN, Math.min(WALK_MAX, walkX));
      const anim = resolveAnimation(ANIMATIONS, 'walk');
      name = frameAt(anim, t);
      x = walkX;
      flip = anim.flipForRight && walkDir > 0;
    } else {
      name = poseUntil > t ? poseName : previewFrame(t);
    }
    const fig = app.figures.get(name, trying ? { outfit: trying.outfit } : undefined);
    // „Hop” po założeniu ubrania: krótkie spłaszczenie i podskok.
    const p = pop > t ? (pop - t) / 360 : 0;
    const jump = Math.round(Math.sin(p * Math.PI) * 4);
    const bob = !walking && name === 'idle_front' ? Math.floor(t / 750) % 2 : 0;
    stage.clear();
    stage.compose((ctx, k) => {
      const r = deviceRect(k, shadowRect(x, FEET, jump));
      ctx.fillStyle = SHADOW_COLOR;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (fig) drawSprite(ctx, k, fig.img, fig.meta, { x, feetY: FEET, flip, bob, squash: p > 0 ? 0.06 * p : 0, jump });
    });
    requestAnimationFrame(drawPreview);
  }
  requestAnimationFrame(drawPreview);

  walkBtn.addEventListener('click', () => {
    walking = !walking;
    walkX = W / 2;
    walkBtn.textContent = walking ? 'Stój' : 'Pokaż spacer';
    walkBtn.setAttribute('aria-pressed', String(walking));
  });
  resetBtn.addEventListener('click', () => {
    if (isDefaultOutfit(app.store.get().outfit)) return;
    app.store.update(takeOffAll);
    pop = performance.now() + 360;
    render(true);
  });

  // --- zakładki i kafelki ---
  const marks = newMarks();
  const tabs = h(
    'div',
    { class: 'tabs', role: 'tablist' },
    ...CLOTH_SLOTS.map((id) =>
      h(
        'button',
        {
          class: marks.any(clothesBySlot(id).map((c) => c.id)) ? 'tab has-new' : 'tab',
          role: 'tab',
          'aria-selected': 'false',
          'data-slot': id,
          onclick: () => { slot = id; trying = null; render(); },
        },
        CLOTH_SLOT_NAMES[id],
      ),
    ),
  );
  const body = h('div', { class: 'shop-body wardrobe-list' });

  /** Strój z przymierzonym ubraniem (te same reguły co przy zakładaniu). */
  function tryOn(outfit: Outfit, def: ClothDef): Outfit {
    const o: Outfit = { ...outfit, [def.slot]: def.id };
    if (def.slot === 'dress') {
      o.top = null;
      o.bottom = null;
    } else if (def.slot === 'top' || def.slot === 'bottom') o.dress = null;
    return o;
  }

  function shake(btn: HTMLElement): void {
    btn.classList.remove('shake');
    void btn.offsetWidth;
    btn.classList.add('shake');
  }

  /** Ubrania (bez ozdób głowy): narysowane z arkuszy — „Naprawiony”, przemalowanie — „Do naprawy”. */
  function fixTag(def: ClothDef): HTMLElement | null {
    if (def.slot === 'head') return null;
    return hasOutfitFrames(def.id)
      ? h('small', { class: 'fix-tag fixed' }, 'Naprawiony')
      : h('small', { class: 'fix-tag todo' }, 'Do naprawy');
  }

  function card(def: ClothDef): HTMLElement {
    const s = app.store.get();
    const owned = isOwned(s, def.id);
    const worn = s.outfit[def.slot] === def.id;
    // Strój z arkuszy wygląda na Gabi jak na miniaturze — pokazujemy Gabi, a nie obrazek z wieszaka.
    const rack = def.thumb !== undefined && !hasOutfitFrames(def.id);
    const thumb = h('img', {
      class: rack ? 'px cloth-art' : 'px',
      src: rack ? itemUrl(def.thumb!) : app.figures.url('idle_front', { outfit: tryOn(s.outfit, def) }),
      alt: '',
      draggable: 'false',
    });
    // Stuknięcie miniatury: przymiarka na podglądzie (drugie stuknięcie — koniec przymiarki).
    const thumbBox = h('button', { class: 'shop-thumb cloth-thumb', 'aria-label': `Przymierz: ${def.name}` }, thumb);
    thumbBox.addEventListener('click', () => {
      trying = trying?.id === def.id ? null : { id: def.id, outfit: tryOn(app.store.get().outfit, def) };
      pop = performance.now() + 360;
      render(true);
    });
    let btn: HTMLElement;
    if (!owned) {
      btn = h('button', { class: 'px-btn', 'aria-label': `Kup: ${def.name}` }, h('span', { class: 'price' }, icon('coin', 2), String(def.price)));
      btn.addEventListener('click', () => {
        const bought = buyCloth(app.store.get(), def.id);
        if (!bought.ok) {
          shake(btn);
          app.toast(bought.reason === 'no-coins' ? 'Za mało monet. Zagraj w minigrę!' : 'Nie da się tego teraz kupić.');
          return;
        }
        const dressed = wear(bought.state, def.id);
        app.store.update(() => (dressed.ok ? dressed.state : bought.state));
        play('buy');
        app.toast(`${def.name} — nowa rzecz w szafie!`);
        app.celebrate();
        showOff();
        render(true);
      });
    } else if (worn) {
      btn = h('button', { class: 'px-btn secondary', 'aria-label': `Zdejmij: ${def.name}` }, 'Zdejmij');
      btn.addEventListener('click', () => {
        app.store.update((st) => {
          const r = takeOff(st, def.slot);
          return r.ok ? r.state : st;
        });
        showOff();
        render(true);
      });
    } else {
      btn = h('button', { class: 'px-btn', 'aria-label': `Załóż: ${def.name}` }, 'Załóż');
      btn.addEventListener('click', () => {
        const r = wear(app.store.get(), def.id);
        if (!r.ok) return;
        app.store.update(() => r.state);
        showOff();
        render(true);
      });
    }
    return h(
      'div',
      { class: `shop-card px-box cloth-card${worn ? ' worn' : ''}${trying?.id === def.id ? ' trying' : ''}` },
      marks.badge(def.id),
      thumbBox,
      h('strong', {}, def.name),
      fixTag(def),
      btn,
    );
  }

  function render(keepScroll = false): void {
    // po zakupie / założeniu przymiarka tego samego ubrania nie ma sensu
    if (trying && app.store.get().outfit[findCloth(trying.id)!.slot] === trying.id) trying = null;
    tabs.querySelectorAll<HTMLElement>('.tab').forEach((b) => {
      const active = b.dataset.slot === slot;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    resetBtn.toggleAttribute('disabled', isDefaultOutfit(app.store.get().outfit));
    const scroll = keepScroll ? body.scrollTop : 0;
    body.replaceChildren(h('div', { class: 'shop-grid wardrobe-grid' }, ...clothesBySlot(slot).map(card)));
    body.scrollTop = scroll;
  }

  render();
  setTimeout(() => body.classList.add('settled'), 600);
  const el = h('div', { class: 'screen wardrobe' }, header.el, preview, tabs, body);
  return {
    el,
    destroy() {
      destroyed = true;
      stage.dispose();
      header.destroy();
      marks.done();
    },
  };
}
