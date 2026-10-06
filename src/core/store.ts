import { saveState, type KV } from './save';
import type { GameState } from './types';

type Listener = (state: GameState) => void;

export interface StoreOptions {
  /** Wywoływany raz na serię nieudanych zapisów (seria kończy się udanym zapisem). */
  onSaveError?: () => void;
}

export class Store {
  private listeners = new Set<Listener>();

  private failing = false;

  constructor(
    private state: GameState,
    private readonly kv: KV,
    private readonly opts: StoreOptions = {},
  ) {}

  get(): GameState {
    return this.state;
  }

  update(fn: (state: GameState) => GameState): void {
    const next = fn(this.state);
    if (next === this.state) return;
    this.state = next;
    if (saveState(this.kv, next)) {
      this.failing = false;
    } else if (!this.failing) {
      // Powiadamiamy raz na serię błędów, żeby nie zalewać gracza komunikatami.
      this.failing = true;
      console.warn('Nie udało się zapisać stanu gry.');
      this.opts.onSaveError?.();
    }
    this.listeners.forEach((l) => l(next));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
