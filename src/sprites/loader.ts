import framesMeta from './frames.generated.json';

export type SpriteMap = Map<string, HTMLImageElement>;

export const spriteUrl = (name: string): string => `${import.meta.env.BASE_URL}sprites/${name}.png`;

/** Wczytuje sprite'y; brakujący lub uszkodzony obrazek jest po prostu pomijany (wywołujący sprawdzają `get()`). */
export async function loadSprites(names: string[], url: (name: string) => string = spriteUrl): Promise<SpriteMap> {
  const entries = await Promise.all(
    names.map(
      (name) =>
        new Promise<[string, HTMLImageElement] | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.onerror = () => resolve(null);
          img.src = url(name);
        }),
    ),
  );
  return new Map(entries.filter((e): e is [string, HTMLImageElement] => e !== null));
}

/** Czubek głowy (px natywne): `x` — środek czubka (indeks kolumny, jak `anchorX`), `y` — najwyższy wiersz
 *  włosów z konturem, `w` — szerokość głowy (włosy + kontur). */
export interface HeadPoint {
  x: number;
  y: number;
  w: number;
}

/** Metadane klatki postaci (piksele natywne arkusza); `scale` wyrównuje wysokość do `DISPLAY_HEIGHT`. */
export interface FrameMeta {
  w: number;
  h: number;
  anchorX: number;
  scale: number;
  /** Wiersz stóp (od góry obrazka, px natywne); brak = dół obrazka. */
  foot?: number;
  /** Czy klatka ma maskę ubrania (`maskUrl`): R = koszulka, G = nadruk, B = dżinsy. */
  mask?: boolean;
  /** Czubek głowy (brak w klatkach wykluczonych z szafy). */
  head?: HeadPoint;
  /** Wiersz kolan (px natywne); tylko klatki z dżinsami w masce. */
  knee?: number;
  /** Bez ozdoby głowy (np. turban). */
  noHat?: boolean;
}

export const FRAMES: Record<string, FrameMeta | undefined> = framesMeta.frames;
/** Portrety z maską ubrania (dolny pas koszulki). */
export const PORTRAIT_MASKS: readonly string[] = framesMeta.portraitMasks;

/** Adres maski ubrania klatki albo portretu (PNG w rozmiarze klatki). */
export const maskUrl = (name: string): string => `${import.meta.env.BASE_URL}masks/${name}.png`;

/** Czy klatka (albo portret) ma maskę ubrania. */
export function hasClothesMask(name: string): boolean {
  return FRAMES[name]?.mask === true || PORTRAIT_MASKS.includes(name);
}
/** Wysokość postaci w pikselach logicznych. */
export const DISPLAY_HEIGHT = framesMeta.displayHeight;
