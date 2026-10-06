import { h, icon } from './dom';

export interface CoinCounter {
  el: HTMLElement;
  set(value: number): void;
}

/** Licznik monet z płynnym przeliczaniem i „podskokiem” przy zmianie. */
export function coinCounter(initial: number): CoinCounter {
  const num = h('span', { class: 'coin-num' }, String(initial));
  const el = h('div', { class: 'coin-pill px-box' }, icon('coin', 2), num);
  let shown = initial;
  let raf = 0;
  return {
    el,
    set(value) {
      if (value === shown) return;
      const from = shown;
      const start = performance.now();
      shown = value;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
      cancelAnimationFrame(raf);
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 500);
        num.textContent = String(Math.round(from + (value - from) * p));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
  };
}
