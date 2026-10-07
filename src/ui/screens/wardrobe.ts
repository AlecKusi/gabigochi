import type { App, Screen } from '../../app';
import type { ClothSlot, Outfit } from '../../core/types';
import { SHADOW_COLOR, shadowRect } from '../../pet/petRenderer';
import { ANIMATIONS, frameAt, resolveAnimation } from '../../sprites/animations';
import { CLOTH_SLOTS, CLOTH_SLOT_NAMES, clothesBySlot, findCloth, type ClothDef } from '../../wardrobe/catalog';
import { buyCloth, isDefaultOutfit, isOwned, takeOff, takeOffAll, wear } from '../../wardrobe/outfit';
import { h, icon } from '../dom';
import { createPixelStage, deviceRect, drawSprite } from '../pixelStage';
import { itemUrl } from '../home/itemSprites';
import { screenHeader } from '../screenHeader';

/** Scena podglądu (px logiczne): Gabi na środku, stopy nad dolną krawędzią. */
const W = 72;
const H = 76;
const FEET = 72;
/** Spoczynek → machanie: co ile i jak długo (ms). */
const WAVE_EVERY = 3400;
const WAVE_MS = 1100;
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
      name = t % WAVE_EVERY < WAVE_MS ? frameAt(resolveAnimation(ANIMATIONS, 'wave'), t) : frameAt(resolveAnimation(ANIMATIONS, 'idle'), t);
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
  const tabs = h(
    'div',
    { class: 'tabs', role: 'tablist' },
    ...CLOTH_SLOTS.map((id) =>
      h('button', { class: 'tab', role: 'tab', 'aria-selected': 'false', 'data-slot': id, onclick: () => { slot = id; trying = null; render(); } }, CLOTH_SLOT_NAMES[id]),
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

  function card(def: ClothDef): HTMLElement {
    const s = app.store.get();
    const owned = isOwned(s, def.id);
    const worn = s.outfit[def.slot] === def.id;
    const thumb = h('img', {
      class: def.thumb ? 'px cloth-art' : 'px',
      src: def.thumb ? itemUrl(def.thumb) : app.figures.url('idle_front', { outfit: tryOn(s.outfit, def) }),
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
        app.toast(`${def.name} — nowa rzecz w szafie!`);
        app.celebrate();
        pop = performance.now() + 360;
        render(true);
      });
    } else if (worn) {
      btn = h('button', { class: 'px-btn secondary', 'aria-label': `Zdejmij: ${def.name}` }, 'Zdejmij');
      btn.addEventListener('click', () => {
        app.store.update((st) => {
          const r = takeOff(st, def.slot);
          return r.ok ? r.state : st;
        });
        pop = performance.now() + 360;
        render(true);
      });
    } else {
      btn = h('button', { class: 'px-btn', 'aria-label': `Załóż: ${def.name}` }, 'Załóż');
      btn.addEventListener('click', () => {
        const r = wear(app.store.get(), def.id);
        if (!r.ok) return;
        app.store.update(() => r.state);
        pop = performance.now() + 360;
        render(true);
      });
    }
    return h(
      'div',
      { class: `shop-card px-box cloth-card${worn ? ' worn' : ''}${trying?.id === def.id ? ' trying' : ''}` },
      thumbBox,
      h('strong', {}, def.name),
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
    },
  };
}
