export type SpriteMap = Map<string, HTMLImageElement>;

export const spriteUrl = (name: string): string => `${import.meta.env.BASE_URL}sprites/${name}.png`;

export async function loadSprites(names: string[]): Promise<SpriteMap> {
  const entries = await Promise.all(
    names.map(
      (name) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.onerror = () => reject(new Error(`Brak sprite'a: ${name}`));
          img.src = spriteUrl(name);
        }),
    ),
  );
  return new Map(entries);
}
