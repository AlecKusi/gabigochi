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
