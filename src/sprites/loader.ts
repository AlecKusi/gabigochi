import framesMeta from './frames.generated.json';

export type SpriteMap = Map<string, HTMLImageElement>;

export const spriteUrl = (name: string): string => `${import.meta.env.BASE_URL}sprites/${name}.png`;

/** Wczytuje sprite'y; brakujący lub uszkodzony obrazek jest po prostu pomijany (wywołujący sprawdzają `get()`). */
export async function loadSprites(names: string[]): Promise<SpriteMap> {
  const entries = await Promise.all(
    names.map(
      (name) =>
        new Promise<[string, HTMLImageElement] | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.onerror = () => resolve(null);
          img.src = spriteUrl(name);
        }),
    ),
  );
  return new Map(entries.filter((e): e is [string, HTMLImageElement] => e !== null));
}

/** Metadane klatki postaci (piksele natywne arkusza); `scale` wyrównuje wysokość do `DISPLAY_HEIGHT`. */
export interface FrameMeta {
  w: number;
  h: number;
  anchorX: number;
  scale: number;
  /** Wiersz stóp (od góry obrazka, px natywne); brak = dół obrazka. */
  foot?: number;
}

export const FRAMES: Record<string, FrameMeta | undefined> = framesMeta.frames;
/** Wysokość postaci w pikselach logicznych. */
export const DISPLAY_HEIGHT = framesMeta.displayHeight;
