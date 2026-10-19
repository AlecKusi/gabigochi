import { backdropName, type BackdropTime, type Season } from '../../home/season';

/** Tła balkonu (public/backgrounds/*.png): wczytywane raz, leniwie. */
export const backdropUrl = (name: string): string => `${import.meta.env.BASE_URL}backgrounds/${name}.png`;

const images = new Map<string, HTMLImageElement>();
/** Kiedy (performance.now) ostatnio nie udało się wczytać tła — z ponowną próbą dopiero po `RETRY_AFTER_MS`. */
const failedAt = new Map<string, number>();
const RETRY_AFTER_MS = 5000;
/** Obrazek, który nigdy się nie wczyta (bez `src`) — zwracany w okresie przerwy po błędzie, zamiast nowego żądania co klatkę. */
let unavailable: HTMLImageElement | null = null;

function image(name: string): HTMLImageElement {
  let img = images.get(name);
  if (!img) {
    const failed = failedAt.get(name);
    if (failed !== undefined && performance.now() - failed < RETRY_AFTER_MS) {
      unavailable ??= new Image();
      return unavailable;
    }
    img = new Image();
    img.decoding = 'async';
    img.onerror = () => {
      images.delete(name);
      failedAt.set(name, performance.now());
    };
    img.src = backdropUrl(name);
    images.set(name, img);
  }
  return img;
}

/** Tło pory roku na dzień albo noc; null, dopóki się nie wczytało. */
export function backdropImage(season: Season, time: BackdropTime): HTMLImageElement | null {
  const img = image(backdropName(season, time));
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Zaczyna wczytywać oba tła pory roku (żeby balkon nie mignął pustym tłem). */
export function preloadBackdrops(season: Season): void {
  image(backdropName(season, 'day'));
  image(backdropName(season, 'night'));
}
