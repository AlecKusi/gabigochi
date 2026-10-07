import type { IconName } from '../art/icons';
import type { SpriteMap } from '../sprites/loader';
import type { Figures } from '../wardrobe/figures';

export interface GameEnv {
  body: HTMLElement;
  sprites: SpriteMap;
  /** Klatki Gabi w bieżącym stroju. */
  figures: Figures;
  signal: AbortSignal;
  setHud(text: string): void;
}

export interface Reward {
  coins: number;
  moodBoost: number;
}

export interface MiniGame {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  category: 'arcade' | 'puzzle';
  /** Rozgrywka; zwraca wynik punktowy. Przy przerwaniu (`signal`) może nigdy się nie rozwiązać. */
  play(env: GameEnv): Promise<number>;
  reward(score: number): Reward;
}
