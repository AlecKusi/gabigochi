import { h } from './dom';
import { play } from './sound';

/** Jedna wskazówka samouczka: tekst i element ekranu pokoju, który w tym czasie pulsuje (selektor CSS). */
export interface Tip {
  text: string;
  target?: string;
}

/**
 * Postęp samouczka na tym urządzeniu: ile wskazówek Gabi już przeszła (wyjście z pokoju w trakcie — wraca
 * do tej samej). To podpowiedź dla widza, nie stan gry — osobny klucz, kopia zapisu go nie przenosi.
 */
export const TIPS_KEY = 'gabigochi.tipsStep';

export function tipsStep(): number {
  try {
    const v = Number(localStorage.getItem(TIPS_KEY) ?? 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

function saveStep(n: number): void {
  try {
    localStorage.setItem(TIPS_KEY, String(n));
  } catch {
    // bez pamięci — samouczek wróci przy następnym uruchomieniu, nic złego
  }
}

/** Samouczek od początku (przycisk w Profilu). */
export function resetTips(): void {
  saveStep(0);
}

/**
 * Karta z kolejnymi wskazówkami u góry pokoju (od zapamiętanego kroku); wskazany element pulsuje.
 * „Pomiń” kończy samouczek. Zwraca funkcję, która chowa kartę (wyjście z pokoju) bez kończenia samouczka.
 */
export function showTips(host: HTMLElement, tips: readonly Tip[]): () => void {
  let i = tipsStep();
  if (i >= tips.length) return () => {};
  let target: Element | null = null;
  const count = h('p', { class: 'tip-count' });
  const text = h('p', { class: 'tip-text' });
  const next = h('button', { class: 'px-btn' });
  const skip = h('button', { class: 'px-btn secondary' }, 'Pomiń');
  const card = h('div', { class: 'tip-card px-box', role: 'dialog', 'aria-label': 'Wskazówka', 'aria-live': 'polite' }, count, text, h('div', { class: 'tip-actions' }, skip, next));

  const unmark = () => {
    target?.classList.remove('tip-target');
    target = null;
  };
  const show = () => {
    unmark();
    const tip = tips[i];
    count.textContent = `Wskazówka ${i + 1} z ${tips.length}`;
    text.textContent = tip.text;
    next.textContent = i === tips.length - 1 ? 'Gotowe!' : 'Dalej';
    target = tip.target ? host.querySelector(tip.target) : null;
    target?.classList.add('tip-target');
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
  };
  const finish = () => {
    saveStep(tips.length);
    unmark();
    card.remove();
  };
  next.addEventListener('click', () => {
    i += 1;
    saveStep(i);
    if (i >= tips.length) {
      play('sparkle');
      finish();
      return;
    }
    play('tap');
    show();
  });
  skip.addEventListener('click', () => {
    play('tap');
    finish();
  });

  // na górze sceny (ściana) — Gabi i meble zostają widoczne, niezależnie od wysokości telefonu
  (host.querySelector('.stage') ?? host).append(card);
  show();
  return () => {
    unmark();
    card.remove();
  };
}
