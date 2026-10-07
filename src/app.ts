import type { Store } from './core/store';
import type { SpriteMap } from './sprites/loader';
import type { Figures } from './wardrobe/figures';
import { confetti } from './ui/confetti';
import { showToast } from './ui/toast';
import { pixelTransition } from './ui/transition';

export type ScreenName = 'birthday' | 'room' | 'shop' | 'games' | 'profile' | 'wardrobe';
export type ScreenParams = Record<string, unknown>;

export interface Screen {
  el: HTMLElement;
  destroy?(): void;
}

export type ScreenFactory = (app: App, params?: ScreenParams) => Screen;

export interface App {
  readonly store: Store;
  readonly sprites: SpriteMap;
  /** Klatki postaci w bieżącym stroju — jedyne źródło obrazków Gabi do rysowania. */
  readonly figures: Figures;
  readonly root: HTMLElement;
  go(name: ScreenName, params?: ScreenParams): Promise<void>;
  toast(text: string): void;
  celebrate(): void;
}

export function createApp(
  root: HTMLElement,
  store: Store,
  sprites: SpriteMap,
  figures: Figures,
  screens: Record<ScreenName, ScreenFactory>,
): App {
  let current: Screen | null = null;
  let busy = false;
  const app: App = {
    store,
    sprites,
    figures,
    root,
    async go(name, params) {
      if (busy) return;
      busy = true;
      try {
        const swap = () => {
          current?.destroy?.();
          current?.el.remove();
          current = null;
          current = screens[name](app, params);
          root.prepend(current.el);
        };
        if (current) await pixelTransition(root, swap);
        else swap();
      } finally {
        busy = false;
      }
    },
    toast: (text) => showToast(root, text),
    celebrate: () => confetti(root),
  };
  return app;
}
