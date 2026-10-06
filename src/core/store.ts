import { saveState, type KV } from './save';
import type { GameState } from './types';

type Listener = (state: GameState) => void;

export class Store {
  private listeners = new Set<Listener>();

  constructor(private state: GameState, private readonly kv: KV) {}

  get(): GameState {
    return this.state;
  }

  update(fn: (state: GameState) => GameState): void {
    const next = fn(this.state);
    if (next === this.state) return;
    this.state = next;
    saveState(this.kv, next);
    this.listeners.forEach((l) => l(next));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
