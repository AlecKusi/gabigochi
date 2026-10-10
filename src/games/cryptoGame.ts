import '../styles/crypto.css';
import { confetti } from '../ui/confetti';
import { h } from '../ui/dom';
import { play } from '../ui/sound';
import {
  ALPHABET,
  MAX_HINTS,
  SAVE_KEY,
  applyGuess,
  cryptoReward,
  cryptoScore,
  hint,
  isSolved,
  newPuzzle,
  parseSave,
  serializeSave,
  type CryptoState,
} from './cryptoLogic';
import { COMMON_WORDS, PERSONAL_WORDS } from './cryptoWords';
import type { GameEnv, MiniGame } from './types';

export { cryptoReward } from './cryptoLogic';

const KEY_ROWS = [0, 8, 16, 24].map((i) => ALPHABET.slice(i, i + 8));

function readSave(): CryptoState | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

function writeSave(s: CryptoState): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(s));
  } catch {
    /* brak miejsca / tryb prywatny — gra działa dalej bez zapisu */
  }
}

function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* jw. */
  }
}

/** Ekran wyboru, gdy jest niedokończona plansza. */
function askContinue(env: GameEnv, saved: CryptoState): Promise<CryptoState | null> {
  return new Promise((resolve) => {
    const done = (s: CryptoState | null) => {
      box.remove();
      resolve(s);
    };
    const box = h(
      'div',
      { class: 'dialog px-box crypto-start' },
      h('h2', {}, 'Szyfrokrzyżówka'),
      h('p', {}, 'Masz niedokończoną planszę.'),
      h(
        'div',
        { class: 'dialog-actions' },
        h('button', { class: 'px-btn', onclick: () => done(saved) }, 'Kontynuuj'),
        h('button', { class: 'px-btn secondary', onclick: () => done(null) }, 'Nowa plansza'),
      ),
    );
    env.body.append(box);
  });
}

function playBoard(env: GameEnv, initial: CryptoState): Promise<number> {
  return new Promise((resolve) => {
    let s = initial;
    let finished = false;
    const N = s.key.length;
    const timers = new Set<number>();

    // --- siatka
    const cellEls: (HTMLButtonElement | null)[] = [];
    const letterEls: (HTMLSpanElement | null)[] = [];
    const grid = h('div', { class: 'crypto-grid', style: `--cols:${s.cols};--rows:${s.rows}` });
    s.cells.forEach((n, i) => {
      if (n === null) {
        cellEls.push(null);
        letterEls.push(null);
        grid.append(h('div', { class: 'cx-block' }));
        return;
      }
      const letter = h('span', { class: 'cx-letter' });
      const btn = h('button', { class: 'cx-cell', 'aria-label': `Pole z liczbą ${n}` }, h('span', { class: 'cx-num' }, n), letter);
      btn.addEventListener('click', () => select(i));
      cellEls.push(btn);
      letterEls.push(letter);
      grid.append(btn);
    });

    // --- tabela „liczba → litera”
    const mapChips = Array.from({ length: N }, (_, k) => {
      const chip = h('button', { class: 'cx-chip', 'aria-label': `Liczba ${k + 1}` }, h('span', { class: 'cx-chip-n' }, k + 1), h('span', { class: 'cx-chip-l' }));
      chip.addEventListener('click', () => {
        const i = s.cells.indexOf(k + 1);
        if (i >= 0) select(i);
      });
      return chip;
    });
    const map = h('div', { class: 'crypto-map', 'aria-label': 'Liczba → litera' }, ...mapChips);

    // --- klawiatura
    const keyEls = new Map<string, HTMLButtonElement>();
    const kb = h(
      'div',
      { class: 'crypto-kb' },
      ...KEY_ROWS.map((row) =>
        h(
          'div',
          { class: 'cx-kb-row' },
          ...row.map((ch) => {
            const key = h('button', { class: 'cx-key' }, ch);
            key.addEventListener('click', () => guess(ch));
            keyEls.set(ch, key);
            return key;
          }),
        ),
      ),
    );
    const eraser = h('button', { class: 'px-btn secondary cx-erase', 'aria-label': 'Gumka' }, '⌫ Gumka');
    eraser.addEventListener('click', () => guess(null));
    const hintBtn = h('button', { class: 'px-btn cx-hint' });
    hintBtn.addEventListener('click', useHint);
    const status = h('p', { class: 'crypto-status', 'aria-live': 'polite' });
    const actions = h('div', { class: 'crypto-actions' }, eraser, hintBtn);

    const root = h('div', { class: 'crypto' }, grid, status, map, kb, actions);
    env.body.append(root);

    let selected = s.cells.findIndex((n) => n !== null && s.guesses[n - 1] === null);
    if (selected < 0) selected = s.cells.findIndex((n) => n !== null);
    let message = '';

    const selNum = () => s.cells[selected] ?? 0;

    function render(): void {
      const sn = selNum();
      s.cells.forEach((n, i) => {
        const el = cellEls[i];
        if (!el || n === null) return;
        const g = s.guesses[n - 1];
        letterEls[i]!.textContent = g ?? '';
        el.classList.toggle('given', s.revealed[n - 1]);
        el.classList.toggle('same', n === sn);
        el.classList.toggle('sel', i === selected);
      });
      mapChips.forEach((chip, k) => {
        const g = s.guesses[k];
        chip.lastElementChild!.textContent = g ?? '·';
        chip.classList.toggle('known', g !== null);
        chip.classList.toggle('given', s.revealed[k]);
        chip.classList.toggle('same', k + 1 === sn);
      });
      const used = new Map<string, number>();
      s.guesses.forEach((g, k) => g && used.set(g, k));
      for (const [ch, key] of keyEls) {
        const k = used.get(ch);
        key.classList.toggle('used', k !== undefined);
        key.classList.toggle('given', k !== undefined && s.revealed[k]);
        key.classList.toggle('current', k !== undefined && k + 1 === sn);
      }
      const left = MAX_HINTS - s.hints;
      hintBtn.textContent = `Podpowiedź (${left})`;
      hintBtn.disabled = finished || left <= 0;
      eraser.disabled = finished;
      const filled = s.guesses.every((g) => g !== null);
      status.textContent = message || (filled && !finished ? 'Coś się nie zgadza… sprawdź litery.' : 'Stuknij pole i wybierz literę.');
      env.setHud(`Podpowiedzi: ${s.hints}/${MAX_HINTS}`);
    }

    function select(i: number): void {
      if (finished) return;
      if (i !== selected) play('tick');
      selected = i;
      message = s.revealed[selNum() - 1] ? 'Ta litera jest już odkryta.' : '';
      render();
    }

    /** Następne pole (w kolejności czytania) z liczbą bez wpisanej litery. */
    function advance(): void {
      const total = s.cells.length;
      for (let d = 1; d <= total; d++) {
        const i = (selected + d) % total;
        const n = s.cells[i];
        if (n !== null && s.guesses[n - 1] === null) {
          selected = i;
          return;
        }
      }
    }

    function commit(next: CryptoState): void {
      s = next;
      if (isSolved(s)) {
        win();
        return;
      }
      writeSave(s);
      render();
    }

    function guess(letter: string | null): void {
      if (finished || env.signal.aborted) return;
      const n = selNum();
      if (!n) return;
      if (s.revealed[n - 1]) {
        message = 'Ta litera jest już odkryta.';
        render();
        return;
      }
      const next = applyGuess(s, n, letter);
      if (next === s) {
        if (letter && s.guesses[n - 1] !== letter) {
          play('nope');
          message = `Litera ${letter} jest już odkryta gdzie indziej.`;
          keyEls.get(letter)?.classList.add('shake');
          later(() => keyEls.get(letter)?.classList.remove('shake'), 320);
          render();
        }
        return;
      }
      message = '';
      play(letter ? 'type' : 'erase');
      if (letter) advance();
      commit(next);
    }

    function useHint(): void {
      if (finished || env.signal.aborted || s.hints >= MAX_HINTS) return;
      const next = hint(s, Math.random, selNum() || undefined);
      if (next === s) return;
      message = `Podpowiedź: −10 monet (zostało ${MAX_HINTS - next.hints}).`;
      play('sparkle');
      commit(next);
    }

    function win(): void {
      finished = true;
      clearSave();
      message = 'Brawo! Wszystko odszyfrowane!';
      selected = -1;
      render();
      root.classList.add('solved');
      confetti(env.body);
      play('match');
      later(() => resolve(cryptoScore(s.hints)), 1600);
    }

    function later(fn: () => void, ms: number): void {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!env.signal.aborted) fn();
      }, ms);
      timers.add(id);
    }

    const onKey = (e: KeyboardEvent) => {
      // AltGr (polskie litery na Windows) zgłasza Ctrl+Alt — tego nie blokujemy.
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        guess(null);
        return;
      }
      const ch = e.key.toLocaleUpperCase('pl');
      if (ALPHABET.includes(ch)) {
        e.preventDefault();
        guess(ch);
      }
    };
    window.addEventListener('keydown', onKey);
    env.signal.addEventListener('abort', () => {
      window.removeEventListener('keydown', onKey);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    });

    writeSave(s);
    render();
  });
}

export const cryptoGame: MiniGame = {
  id: 'crypto',
  name: 'Szyfrokrzyżówka',
  description: 'Odgadnij litery ukryte pod liczbami',
  icon: 'letters',
  category: 'puzzle',
  reward: cryptoReward,
  async play(env) {
    const saved = readSave();
    let state = saved ? await askContinue(env, saved) : null;
    if (env.signal.aborted) return new Promise<number>(() => {});
    state ??= newPuzzle(COMMON_WORDS, PERSONAL_WORDS, Math.random);
    return playBoard(env, state);
  },
};
