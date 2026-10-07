import '../styles/sudoku.css';
import { confetti } from '../ui/confetti';
import { h, icon } from '../ui/dom';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  DIFFICULTY_SCORE,
  SUDOKU_SAVE_KEY,
  boxOf,
  colOf,
  conflicts,
  digitCounts,
  eraseCell,
  formatTime,
  generateSolved,
  isSolved,
  makePuzzle,
  newBoard,
  parseSave,
  placeDigit,
  rowOf,
  serializeSave,
  sudokuReward,
  toggleNote,
  type Board,
  type Difficulty,
  type SudokuSave,
} from './sudokuLogic';
import type { GameEnv, MiniGame } from './types';

export { sudokuReward };

const HISTORY_LIMIT = 300;

function readSave(): SudokuSave | null {
  try {
    const s = parseSave(localStorage.getItem(SUDOKU_SAVE_KEY));
    if (s && isSolved(s.board.cells)) return null;
    return s;
  } catch {
    return null;
  }
}

function writeSave(s: SudokuSave): void {
  try {
    localStorage.setItem(SUDOKU_SAVE_KEY, serializeSave(s));
  } catch {
    /* brak miejsca / tryb prywatny — trudno, gra działa dalej */
  }
}

function clearSave(): void {
  try {
    localStorage.removeItem(SUDOKU_SAVE_KEY);
  } catch {
    /* jw. */
  }
}

/** Ekran startowy: „Kontynuuj / Nowa plansza” (jeśli jest zapis), potem wybór poziomu. */
function chooseStart(env: GameEnv): Promise<SudokuSave> {
  return new Promise((resolve) => {
    const saved = readSave();
    const panel = h('div', { class: 'px-box sd-panel' });
    env.body.append(panel);
    env.setHud('');

    const startNew = (difficulty: Difficulty) => {
      const solved = generateSolved(Math.random);
      const puzzle = makePuzzle(solved, difficulty, Math.random);
      panel.remove();
      resolve({ v: 1, difficulty, board: newBoard(puzzle, solved), elapsed: 0 });
    };

    const showLevels = () => {
      panel.replaceChildren(
        h('h2', {}, 'Wybierz poziom'),
        h(
          'div',
          { class: 'sd-levels' },
          ...DIFFICULTIES.map((d) =>
            h(
              'button',
              { class: 'px-btn big sd-level', onclick: () => startNew(d) },
              h('span', {}, DIFFICULTY_LABEL[d]),
              h('span', { class: 'sd-level-coins' }, icon('coin', 2), String(DIFFICULTY_SCORE[d])),
            ),
          ),
        ),
      );
    };

    if (!saved) {
      showLevels();
      return;
    }
    const filled = saved.board.cells.filter((v, i) => v !== 0 && saved.board.puzzle[i] === 0).length;
    const toFill = saved.board.puzzle.filter((v) => v === 0).length;
    panel.append(
      h('h2', {}, 'Rozpoczęta plansza'),
      h('p', {}, `${DIFFICULTY_LABEL[saved.difficulty]} · ${formatTime(saved.elapsed)} · ${filled}/${toFill} pól`),
      h(
        'div',
        { class: 'sd-levels' },
        h('button', { class: 'px-btn big', onclick: () => { panel.remove(); resolve(saved); } }, 'Kontynuuj'),
        h('button', { class: 'px-btn secondary', onclick: showLevels }, 'Nowa plansza'),
      ),
    );
  });
}

function playBoard(env: GameEnv, start: SudokuSave): Promise<number> {
  return new Promise((resolve) => {
    const { difficulty } = start;
    let board: Board = start.board;
    let elapsed = start.elapsed;
    let pencil = false;
    let won = false;
    const history: Board[] = [];
    let selected = board.cells.findIndex((v) => v === 0);

    // ── DOM ──
    const cellEls: HTMLButtonElement[] = [];
    const valueEls: HTMLSpanElement[] = [];
    const noteEls: HTMLSpanElement[][] = [];
    for (let i = 0; i < 81; i++) {
      const notes = Array.from({ length: 9 }, (_, k) => h('span', {}, String(k + 1)));
      const value = h('span', { class: 'sd-val' });
      const cell = h(
        'button',
        { class: 'sd-cell', 'aria-label': `Wiersz ${rowOf(i) + 1}, kolumna ${colOf(i) + 1}` },
        value,
        h('span', { class: 'sd-notes' }, ...notes),
      );
      cell.style.setProperty('--d', `${(rowOf(i) + colOf(i)) * 35}ms`);
      cell.addEventListener('click', () => select(i));
      cellEls.push(cell);
      valueEls.push(value);
      noteEls.push(notes);
    }
    // Bloki 3×3 jako osobne siatki — grubsze linie między blokami to po prostu większa przerwa.
    const boxes = Array.from({ length: 9 }, () => h('div', { class: 'sd-box' }));
    cellEls.forEach((cell, i) => boxes[boxOf(i)].append(cell));
    const grid = h('div', { class: 'sd-grid' }, ...boxes);

    const keyCounts: HTMLSpanElement[] = [];
    const keys = Array.from({ length: 9 }, (_, k) => {
      const count = h('span', { class: 'sd-key-count' });
      keyCounts.push(count);
      const key = h('button', { class: 'sd-key', 'aria-label': `Cyfra ${k + 1}` }, h('span', { class: 'sd-key-digit' }, String(k + 1)), count);
      key.addEventListener('click', () => input(k + 1));
      return key;
    });
    const keypad = h('div', { class: 'sd-keypad' }, ...keys);

    const undoBtn = h('button', { class: 'px-btn secondary sd-tool', onclick: () => undo() }, 'Cofnij');
    const eraseBtn = h('button', { class: 'px-btn secondary sd-tool', onclick: () => erase() }, 'Gumka');
    const pencilBtn = h(
      'button',
      { class: 'px-btn secondary sd-tool', 'aria-pressed': 'false', onclick: () => togglePencil() },
      icon('pencil', 2),
      'Ołówek',
    );
    const tools = h('div', { class: 'sd-tools' }, undoBtn, eraseBtn, pencilBtn);
    const root = h('div', { class: 'sd-root' }, grid, tools, keypad);
    env.body.append(root);

    // ── Stan → widok ──
    const hud = () => env.setHud(`${DIFFICULTY_LABEL[difficulty]} · ${formatTime(elapsed)}`);

    function render(): void {
      const bad = conflicts(board.cells);
      const selValue = selected >= 0 ? board.cells[selected] : 0;
      for (let i = 0; i < 81; i++) {
        const el = cellEls[i];
        const v = board.cells[i];
        const given = board.puzzle[i] !== 0;
        const peer =
          selected >= 0 && i !== selected && (rowOf(i) === rowOf(selected) || colOf(i) === colOf(selected) || boxOf(i) === boxOf(selected));
        el.classList.toggle('given', given);
        el.classList.toggle('user', !given && v !== 0);
        el.classList.toggle('sel', i === selected);
        el.classList.toggle('peer', peer);
        el.classList.toggle('same', selValue !== 0 && v === selValue && i !== selected);
        el.classList.toggle('bad', bad.has(i));
        valueEls[i].textContent = v ? String(v) : '';
        const mask = v ? 0 : board.notes[i];
        for (let k = 0; k < 9; k++) {
          const on = (mask & (1 << k)) !== 0;
          noteEls[i][k].classList.toggle('on', on);
          noteEls[i][k].classList.toggle('hl', on && selValue === k + 1);
        }
      }
      const counts = digitCounts(board.cells);
      for (let k = 0; k < 9; k++) {
        const left = Math.max(0, 9 - counts[k + 1]);
        keyCounts[k].textContent = left ? String(left) : '';
        keys[k].classList.toggle('done', left === 0);
      }
      undoBtn.disabled = history.length === 0 || won;
      const canErase = selected >= 0 && board.puzzle[selected] === 0 && (board.cells[selected] !== 0 || board.notes[selected] !== 0);
      eraseBtn.disabled = !canErase || won;
      pencilBtn.disabled = won;
      pencilBtn.classList.toggle('on', pencil);
      pencilBtn.setAttribute('aria-pressed', String(pencil));
      keypad.classList.toggle('pencil', pencil);
    }

    const snapshot = (): SudokuSave => ({ v: 1, difficulty, board, elapsed: Math.round(elapsed) });
    /** Po wygranej albo zamknięciu gry plansza nie przyjmuje już ruchów. */
    const locked = () => won || env.signal.aborted;

    function commit(next: Board): void {
      if (next === board) return;
      history.push(board);
      if (history.length > HISTORY_LIMIT) history.shift();
      board = next;
      if (isSolved(board.cells)) {
        win();
        return;
      }
      writeSave(snapshot());
      render();
    }

    // ── Akcje ──
    function select(i: number): void {
      if (locked()) return;
      selected = i;
      render();
    }

    function input(v: number): void {
      if (locked() || selected < 0) return;
      if (pencil) commit(toggleNote(board, selected, v));
      else commit(placeDigit(board, selected, v));
    }

    function erase(): void {
      if (locked() || selected < 0) return;
      commit(eraseCell(board, selected));
    }

    function undo(): void {
      if (locked()) return;
      const prev = history.pop();
      if (!prev) return;
      board = prev;
      writeSave(snapshot());
      render();
    }

    function togglePencil(): void {
      if (locked()) return;
      pencil = !pencil;
      render();
    }

    function move(dr: number, dc: number): void {
      const base = selected >= 0 ? selected : 40;
      const r = (rowOf(base) + dr + 9) % 9;
      const c = (colOf(base) + dc + 9) % 9;
      select(r * 9 + c);
    }

    // ── Czas ──
    let last = performance.now();
    let sinceSave = 0;
    const tick = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1500, now - last);
      last = now;
      if (document.hidden || won) return;
      elapsed += dt;
      sinceSave += dt;
      if (sinceSave >= 5000) {
        sinceSave = 0;
        writeSave(snapshot());
      }
      hud();
    }, 1000);

    let finishTimer = 0;
    const stop = () => {
      clearInterval(tick);
      clearTimeout(finishTimer);
    };

    function win(): void {
      won = true;
      stop();
      clearSave();
      selected = -1;
      render();
      hud();
      grid.classList.add('won');
      confetti(env.body);
      finishTimer = window.setTimeout(() => resolve(DIFFICULTY_SCORE[difficulty]), 1600);
    }

    // ── Zdarzenia globalne (sprzątane przez env.signal) ──
    const opts = { signal: env.signal };
    document.addEventListener(
      'visibilitychange',
      () => {
        last = performance.now();
        if (document.hidden && !won) writeSave(snapshot());
      },
      opts,
    );
    document.addEventListener(
      'keydown',
      (e) => {
        if (locked()) return;
        if (e.key >= '1' && e.key <= '9') input(Number(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
        else if (e.key === 'ArrowUp') move(-1, 0);
        else if (e.key === 'ArrowDown') move(1, 0);
        else if (e.key === 'ArrowLeft') move(0, -1);
        else if (e.key === 'ArrowRight') move(0, 1);
        else if (e.key === 'p' || e.key === 'n') togglePencil();
        else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) undo();
        else return;
        e.preventDefault();
      },
      opts,
    );
    env.signal.addEventListener('abort', () => {
      stop();
      if (!won) writeSave(snapshot());
    });

    writeSave(snapshot());
    hud();
    render();
  });
}

export const sudokuGame: MiniGame = {
  id: 'sudoku',
  name: 'Sudoku',
  description: 'Uzupełnij planszę cyframi 1–9',
  icon: 'grid',
  category: 'puzzle',
  reward: sudokuReward,
  async play(env) {
    const start = await chooseStart(env);
    if (env.signal.aborted) return new Promise<number>(() => {});
    return playBoard(env, start);
  },
};
