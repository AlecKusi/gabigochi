import '../styles/crypto.css';
import { confetti } from '../ui/confetti';
import { h } from '../ui/dom';
import { play } from '../ui/sound';
import {
  ALPHABET,
  MAX_HINTS,
  PROGRESS_KEY,
  SAVE_KEY,
  applyGuess,
  cryptoReward,
  cryptoScore,
  hint,
  isSolved,
  markSolved,
  nextPuzzle,
  puzzleState,
  readProgress,
  readPuzzleSave,
  solutionNumbers,
  wrongNumbers,
  writePuzzleSave,
  type CryptoState,
  type Progress,
  type Puzzle,
} from './cryptoLogic';
import { PUZZLES } from './cryptoPuzzles';
import type { GameEnv, MiniGame } from './types';

export { cryptoReward } from './cryptoLogic';

/** Klawiatura: 32 litery i gumka w trzech rzędach po 11. */
const KEY_ROWS: readonly (readonly string[])[] = [ALPHABET.slice(0, 11), ALPHABET.slice(11, 22), [...ALPHABET.slice(22), '⌫']];

/** „1 litera”, „2 litery”, „5 liter”, „22 litery”. */
const lettersWord = (n: number) => (n === 1 ? 'litera' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'litery' : 'liter');

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* brak miejsca / tryb prywatny — gra działa dalej bez zapisu */
  }
}

/** Ekran wyboru, gdy jest niedokończona plansza: true — kontynuuj, false — nowa plansza. */
function askContinue(env: GameEnv): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (keep: boolean) => {
      box.remove();
      resolve(keep);
    };
    const box = h(
      'div',
      { class: 'dialog px-box crypto-start' },
      h('h2', {}, 'Szyfrokrzyżówka'),
      h('p', {}, 'Masz niedokończoną planszę.'),
      h(
        'div',
        { class: 'dialog-actions' },
        h('button', { class: 'px-btn', onclick: () => done(true) }, 'Kontynuuj'),
        h('button', { class: 'px-btn secondary', onclick: () => done(false) }, 'Nowa plansza'),
      ),
    );
    env.body.append(box);
  });
}

function playBoard(env: GameEnv, puzzle: Puzzle, initial: CryptoState, progress: Progress, total: number): Promise<number> {
  return new Promise((resolve) => {
    let s = initial;
    let finished = false;
    let message = '';
    /** Liczby zaznaczone na czerwono po „Sprawdź” (do czasu zmiany ich litery). */
    const flagged = new Set<number>();
    const timers = new Set<number>();
    const N = s.key.length;
    const position = PUZZLES.filter((p) => p.id !== puzzle.id && progress.solved.includes(p.id)).length + 1;
    const sol = solutionNumbers(puzzle, s);
    let lastHud = '';

    // --- tabela liter: liczby 1..N w dwóch rzędach
    const keyCells = Array.from({ length: N }, (_, k) => {
      const letter = h('span', { class: 'cx-k-l' });
      const btn = h('button', { class: 'cx-k', 'aria-label': `Liczba ${k + 1}` }, h('span', { class: 'cx-k-n' }, k + 1), letter);
      btn.addEventListener('click', () => {
        const i = s.cells.indexOf(k + 1);
        if (i >= 0) select(i);
      });
      return { btn, letter };
    });
    const keytab = h('div', { class: 'cx-keytab', style: `--kcols:${Math.ceil(N / 2)}` }, ...keyCells.map((c) => c.btn));
    // nieparzysta liczba liter: ostatnie miejsce w tabeli wypełnia zaczernione pole (jak w siatce)
    if (N % 2 === 1) keytab.append(h('span', { class: 'cx-k-fill', 'aria-hidden': 'true' }));

    // --- siatka (--d: przekątna — opóźnienie fali przy wygranej)
    const cellEls: (HTMLButtonElement | null)[] = [];
    const letterEls: (HTMLSpanElement | null)[] = [];
    const grid = h('div', { class: 'crypto-grid', style: `--cols:${s.cols};--rows:${s.rows}` });
    s.cells.forEach((n, i) => {
      const d = Math.floor(i / s.cols) + (i % s.cols);
      if (n === null) {
        cellEls.push(null);
        letterEls.push(null);
        grid.append(h('div', { class: 'cx-block', style: `--d:${d}` }));
        return;
      }
      const letter = h('span', { class: 'cx-letter' });
      const btn = h('button', { class: 'cx-cell', style: `--d:${d}`, 'aria-label': `Pole z liczbą ${n}` }, h('span', { class: 'cx-num' }, n), letter);
      btn.addEventListener('click', () => select(i));
      cellEls.push(btn);
      letterEls.push(letter);
      grid.append(btn);
    });

    // --- hasło
    // kratki grupowane w słowa (słowo się nie łamie); między słowami odstęp robi `gap` kontenera
    const solItems: { n: number; box: HTMLElement; letter: HTMLElement }[] = [];
    const solWords: HTMLElement[] = [];
    let wordBoxes: HTMLElement[] = [];
    const endWord = () => {
      if (wordBoxes.length > 0) solWords.push(h('span', { class: 'cx-sol-word' }, ...wordBoxes));
      wordBoxes = [];
    };
    for (const n of sol) {
      if (n === null) {
        endWord();
        continue;
      }
      const letter = h('span', { class: 'cx-sol-l' });
      const box = h('div', { class: 'cx-sol-box' }, h('span', { class: 'cx-sol-n' }, n), letter);
      solItems.push({ n, box, letter });
      wordBoxes.push(box);
    }
    endWord();
    const solution = h('div', { class: 'cx-solution', role: 'group', 'aria-label': 'Hasło' }, ...solWords);
    const big = h('p', { class: 'cx-big', 'aria-live': 'polite' });

    // --- klawiatura i przyciski
    const keyEls = new Map<string, HTMLButtonElement>();
    const kb = h(
      'div',
      { class: 'crypto-kb' },
      ...KEY_ROWS.map((row) =>
        h(
          'div',
          { class: 'cx-kb-row' },
          ...row.map((ch) => {
            const erase = ch === '⌫';
            const key = h('button', { class: erase ? 'cx-key cx-erase' : 'cx-key', 'aria-label': erase ? 'Gumka' : ch }, ch);
            key.addEventListener('click', () => guess(erase ? null : ch));
            if (!erase) keyEls.set(ch, key);
            return key;
          }),
        ),
      ),
    );
    const checkBtn = h('button', { class: 'px-btn secondary cx-check' }, 'Sprawdź');
    // blur: Spacja/Enter na przycisku z fokusem nie powtarza akcji (podpowiedź kosztuje monety)
    checkBtn.addEventListener('click', () => {
      checkBtn.blur();
      check();
    });
    const hintBtn = h('button', { class: 'px-btn cx-hint' });
    hintBtn.addEventListener('click', () => {
      hintBtn.blur();
      useHint();
    });
    const status = h('p', { class: 'crypto-status', 'aria-live': 'polite' });
    const actions = h('div', { class: 'crypto-actions' }, checkBtn, hintBtn);

    const root = h('div', { class: 'crypto' }, keytab, grid, solution, big, status, kb, actions);
    env.body.append(root);

    let selected = s.cells.findIndex((n) => n !== null && s.guesses[n - 1] === null);
    if (selected < 0) selected = s.cells.findIndex((n) => n !== null);
    const selNum = () => s.cells[selected] ?? 0;

    function render(): void {
      const sn = selNum();
      s.cells.forEach((n, i) => {
        const el = cellEls[i];
        if (!el || n === null) return;
        const g = s.guesses[n - 1];
        letterEls[i]!.textContent = g ?? '';
        el.setAttribute('aria-label', g ? `Pole z liczbą ${n}, litera ${g}` : `Pole z liczbą ${n}`);
        if (i === selected) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
        el.classList.toggle('given', s.revealed[n - 1]);
        el.classList.toggle('same', n === sn);
        el.classList.toggle('sel', i === selected);
        el.classList.toggle('bad', flagged.has(n));
      });
      keyCells.forEach(({ btn, letter }, k) => {
        letter.textContent = s.guesses[k] ?? '';
        btn.classList.toggle('given', s.revealed[k]);
        btn.classList.toggle('same', k + 1 === sn);
        btn.classList.toggle('bad', flagged.has(k + 1));
      });
      for (const { n, letter } of solItems) letter.textContent = s.guesses[n - 1] ?? '';
      const used = new Map<string, number>();
      s.guesses.forEach((g, k) => g && used.set(g, k));
      for (const [ch, key] of keyEls) {
        const k = used.get(ch);
        key.classList.toggle('used', k !== undefined);
        key.classList.toggle('given', k !== undefined && s.revealed[k]);
        key.classList.toggle('current', k !== undefined && k + 1 === sn);
      }
      const left = MAX_HINTS - s.hints;
      hintBtn.textContent = `Podpowiedź (−10) · ${left}`;
      hintBtn.disabled = finished || left <= 0;
      checkBtn.disabled = finished;
      // regiony aria-live zapowiadają się przy każdej zmianie tekstu — ruszamy je tylko, gdy tekst naprawdę inny
      const text = message || 'Stuknij pole i wybierz literę.';
      if (status.textContent !== text) status.textContent = text;
      const hud = `Plansza ${position}/${total} · podp. ${s.hints}/${MAX_HINTS}`;
      if (hud !== lastHud) {
        lastHud = hud;
        env.setHud(hud);
      }
    }

    /** Klasa animacji na chwilę (zdjęta po `ms`, żeby mogła zagrać ponownie). */
    function flash(el: Element, cls: string, ms: number): void {
      el.classList.remove(cls);
      void (el as HTMLElement).offsetWidth;
      el.classList.add(cls);
      later(() => el.classList.remove(cls), ms);
    }

    /** Pola z liczbą `n` animują się (`cls`), kratki hasła się obracają; dzwoneczek, gdy hasło zyskało literę. */
    function animateNumber(n: number, cls: string): void {
      s.cells.forEach((m, i) => {
        if (m === n && cellEls[i]) flash(cellEls[i]!, cls, 700);
      });
      let inSolution = false;
      for (const item of solItems) {
        if (item.n !== n) continue;
        flash(item.box, 'flip', 400);
        inSolution = true;
      }
      if (inSolution && s.guesses[n - 1] !== null) later(() => play('line'), 120);
    }

    function select(i: number): void {
      if (finished) return;
      if (i !== selected) play('tick');
      selected = i;
      message = s.revealed[selNum() - 1] ? 'Ta litera jest już odkryta.' : '';
      render();
    }

    /** Następne pole (w kolejności czytania) z liczbą bez wpisanej litery — według stanu `st` (już po wpisaniu). */
    function advance(st: CryptoState): void {
      const count = st.cells.length;
      for (let d = 1; d <= count; d++) {
        const i = (selected + d) % count;
        const n = st.cells[i];
        if (n !== null && st.guesses[n - 1] === null) {
          selected = i;
          return;
        }
      }
    }

    /** Strzałki: następne białe pole w danym kierunku (zaczernione pomijane, na brzegu zostaje). */
    function move(dr: number, dc: number): void {
      if (finished || selected < 0) return;
      let r = Math.floor(selected / s.cols);
      let c = selected % s.cols;
      for (;;) {
        r += dr;
        c += dc;
        if (r < 0 || r >= s.rows || c < 0 || c >= s.cols) return;
        const i = r * s.cols + c;
        if (s.cells[i] !== null) {
          select(i);
          return;
        }
      }
    }

    function commit(next: CryptoState): void {
      // zmieniona litera zdejmuje czerwone zaznaczenie (także z liczby, z której litera się przeniosła)
      next.guesses.forEach((g, k) => {
        if (g !== s.guesses[k]) flagged.delete(k + 1);
      });
      s = next;
      if (isSolved(s)) {
        win();
        return;
      }
      store(SAVE_KEY, writePuzzleSave(s));
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
          const key = keyEls.get(letter);
          if (key) flash(key, 'shake', 320);
          render();
        }
        return;
      }
      message = '';
      play(letter ? 'type' : 'erase');
      if (letter) advance(next);
      commit(next);
      if (letter && !finished) animateNumber(n, 'pop');
    }

    function check(): void {
      if (finished || env.signal.aborted) return;
      const wrong = wrongNumbers(s);
      flagged.clear();
      for (const n of wrong) flagged.add(n);
      if (wrong.length > 0) {
        play('nope');
        message = `Do poprawy: ${wrong.length} ${lettersWord(wrong.length)} (na czerwono).`;
        render();
        s.cells.forEach((n, i) => {
          if (n !== null && flagged.has(n) && cellEls[i]) flash(cellEls[i]!, 'shake', 320);
        });
        return;
      }
      play('match');
      message = 'Na razie bez błędów!';
      render();
      flash(grid, 'ok-flash', 650);
    }

    function useHint(): void {
      if (finished || env.signal.aborted || s.hints >= MAX_HINTS) return;
      const next = hint(s, Math.random, selNum() || undefined);
      if (next === s) return;
      const n = next.revealed.findIndex((r, k) => r && !s.revealed[k]) + 1;
      message = `Podpowiedź: −10 monet z nagrody (zostało ${MAX_HINTS - next.hints}).`;
      play('sparkle');
      commit(next);
      if (!finished && n > 0) animateNumber(n, 'gold');
    }

    function win(): void {
      finished = true;
      flagged.clear();
      // Zapis dostaje stan rozwiązany (readPuzzleSave traktuje go jak brak zapisu). Plansza jest oznaczana jako
      // rozwiązana dopiero po animacji — wyjście w jej trakcie nie odbiera nagrody, plansza wraca świeża.
      store(SAVE_KEY, writePuzzleSave(s));
      message = 'Brawo! Hasło odszyfrowane!';
      selected = -1;
      big.textContent = puzzle.solution;
      render();
      root.classList.add('solved');
      confetti(env.body);
      play('match');
      later(() => {
        store(SAVE_KEY, null);
        store(PROGRESS_KEY, JSON.stringify(markSolved(progress, puzzle.id)));
        resolve(cryptoScore(s.hints));
      }, 2200);
    }

    function later(fn: () => void, ms: number): void {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!env.signal.aborted) fn();
      }, ms);
      timers.add(id);
    }

    const ARROWS: Readonly<Record<string, readonly [number, number]>> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const onKey = (e: KeyboardEvent) => {
      // AltGr (polskie litery na Windows) zgłasza Ctrl+Alt — tego nie blokujemy.
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (!e.repeat) guess(null);
        return;
      }
      const arrow = ARROWS[e.key];
      if (arrow) {
        e.preventDefault();
        move(arrow[0], arrow[1]);
        return;
      }
      const ch = e.key.toLocaleUpperCase('pl');
      if (ALPHABET.includes(ch)) {
        e.preventDefault();
        // przytrzymany klawisz (auto-repeat) nie wpisuje litery w kolejne pola
        if (!e.repeat) guess(ch);
      }
    };
    window.addEventListener('keydown', onKey);
    env.signal.addEventListener('abort', () => {
      window.removeEventListener('keydown', onKey);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    });

    // zapis powstaje dopiero przy pierwszym ruchu (commit) — samo otwarcie planszy nie zostawia „niedokończonej”
    render();
  });
}

export const cryptoGame: MiniGame = {
  id: 'crypto',
  name: 'Szyfrokrzyżówka',
  description: 'Rozszyfruj krzyżówkę i odczytaj hasło',
  icon: 'letters',
  category: 'puzzle',
  reward: cryptoReward,
  async play(env) {
    let progress = readProgress(load(PROGRESS_KEY));
    const saved = readPuzzleSave(load(SAVE_KEY), PUZZLES);
    const keep = saved ? await askContinue(env) : false;
    if (env.signal.aborted) return new Promise<number>(() => {});
    if (saved && keep) return playBoard(env, PUZZLES.find((p) => p.id === saved.id)!, saved, progress, PUZZLES.length);
    const next = nextPuzzle(PUZZLES, progress, saved?.id);
    progress = next.progress;
    store(PROGRESS_KEY, JSON.stringify(progress));
    return playBoard(env, next.puzzle, puzzleState(next.puzzle), progress, PUZZLES.length);
  },
};
