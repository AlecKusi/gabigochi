import { backdropName, type BackdropTime, type Season } from '../../home/season';

/** Tła balkonu (public/backgrounds/*.png): wczytywane raz, leniwie. */
export const backdropUrl = (name: string): string => `${import.meta.env.BASE_URL}backgrounds/${name}.png`;

const images = new Map<string, HTMLImageElement>();

function image(name: string): HTMLImageElement {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
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
