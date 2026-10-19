import meta from './items.generated.json';
import type { Season } from './season';

export const ITEM_CATEGORIES = ['furniture', 'window', 'decor', 'plant', 'gaming', 'hobby', 'bathroom', 'kitchen', 'balcony'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type ItemLayer = 'wall' | 'floor' | 'rug';

export const INTERACTIONS = [
  'water', 'read', 'play', 'study', 'crochet', 'music', 'cute', 'lamp', 'switch', 'calendar', 'window',
  'toilet', 'shower', 'bath', 'sink', 'hairdryer', 'wardrobe', 'coffee', 'nap', 'relax', 'lounge', 'tv', 'cat',
  'fridge', 'cook', 'catfood', 'clock', 'mirror', 'laundry', 'scale', 'brew', 'dishes', 'none',
] as const;
export type Interaction = (typeof INTERACTIONS)[number];

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  layer: ItemLayer;
  interaction: Interaction;
  price: number;
  /** Pora roku, w której rzecz jest w sklepie (kupiona zostaje na zawsze); brak — cały rok. */
  season?: Season;
  /** Nazwa pliku w public/items (bez .png). */
  sprite: string;
  /** Wymiary sprite'a w px natywnych; na ekranie ×`scale` (px logiczne pokoju). */
  w: number;
  h: number;
  scale: number;
  /** Kotwica sceny snu (tylko łóżko Gabi): x i linia stóp w px natywnych sprite'a. */
  anchorX?: number;
  foot?: number;
  /** Przedmiot specjalny: nie do kupienia ani schowania (łóżko Gabi). */
  special?: boolean;
}

/** Wieszak na ubrania — mebel, który otwiera Szafę. */
export const WARDROBE_ITEM = 'clothes_rack';

/** Łóżko Gabi — rysowane pustą klatką `gabi_bed_empty`, a w nocy sceną snu. */
export const GABI_BED = 'gabi_bed';
const GABI_BED_SPRITE = 'gabi_bed_empty';

interface RawMeta {
  w: number;
  h: number;
  scale?: number;
  anchorX?: number;
  foot?: number;
  name?: string;
  category?: ItemCategory;
  layer?: ItemLayer;
  interaction?: Interaction;
  price?: number;
  season?: Season;
  /** Klatka stanu: przedmiot bazowy i nazwa stanu (np. toilet / open). */
  frameOf?: string;
  state?: string;
  overlay?: boolean;
}

const RAW = meta as Record<string, RawMeta>;

/** Przedmioty sklepu (kolejność jak w items.generated.json). */
export const CATALOG: readonly ItemDef[] = Object.entries(RAW)
  .filter(([, m]) => m.name !== undefined)
  .map(([id, m]) => ({
    id,
    name: m.name!,
    category: m.category!,
    layer: m.layer!,
    interaction: m.interaction!,
    price: m.price!,
    sprite: id,
    w: m.w,
    h: m.h,
    scale: m.scale ?? 1,
    ...(m.season ? { season: m.season } : {}),
  }));

const bedMeta = RAW[GABI_BED_SPRITE];
const BED: ItemDef = {
  id: GABI_BED,
  name: 'Łóżko Gabi',
  category: 'furniture',
  layer: 'floor',
  interaction: 'none',
  price: 0,
  sprite: GABI_BED_SPRITE,
  w: bedMeta.w,
  h: bedMeta.h,
  scale: bedMeta.scale ?? 1,
  anchorX: bedMeta.anchorX,
  foot: bedMeta.foot,
  special: true,
};

const BY_ID: ReadonlyMap<string, ItemDef> = new Map([...CATALOG, BED].map((d) => [d.id, d]));

/** Przedmiot katalogu albo łóżko Gabi; `undefined` dla nieznanych id. */
export function findItem(id: string): ItemDef | undefined {
  return BY_ID.get(id);
}

export function itemById(id: string): ItemDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Nieznany przedmiot: ${id}`);
  return d;
}

/** Wymiary na ekranie w px logicznych pokoju. */
export function itemSize(def: ItemDef): { w: number; h: number } {
  return { w: def.w * def.scale, h: def.h * def.scale };
}

export type ShopCategory = ItemCategory | 'wallpaper' | 'floor';

export const SHOP_CATEGORIES: readonly { id: ShopCategory; name: string }[] = [
  { id: 'furniture', name: 'Meble' },
  { id: 'window', name: 'Okna' },
  { id: 'decor', name: 'Ozdoby' },
  { id: 'plant', name: 'Rośliny' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'hobby', name: 'Hobby' },
  { id: 'bathroom', name: 'Łazienka' },
  { id: 'kitchen', name: 'Kuchnia' },
  { id: 'balcony', name: 'Balkon' },
  { id: 'wallpaper', name: 'Tapety' },
  { id: 'floor', name: 'Podłogi' },
];

/** Metadane klatki stanu przedmiotu (px natywne sprite'a w public/items). */
export interface ItemFrameMeta {
  w: number;
  h: number;
  scale: number;
  /**
   * Kotwica: x i linia stóp. `overlay` — punkt pokrywający się z kotwicą przedmiotu (środek jego dolnej krawędzi),
   * więc klatka narysowana w miejscu przedmiotu (zamiast niego) pokrywa go; inaczej — kotwica postaci (środek
   * czubka głowy Gabi i linia jej stóp), bo klatka jest narysowana inaczej niż przedmiot.
   */
  anchorX: number;
  foot: number;
  overlay: boolean;
}

const FRAMES_OF = new Map<string, Record<string, string>>();
const FRAME_META = new Map<string, ItemFrameMeta>();
for (const [sprite, m] of Object.entries(RAW)) {
  if (m.frameOf === undefined || m.state === undefined) continue;
  const frames = FRAMES_OF.get(m.frameOf) ?? {};
  frames[m.state] = sprite;
  FRAMES_OF.set(m.frameOf, frames);
  FRAME_META.set(sprite, {
    w: m.w,
    h: m.h,
    scale: m.scale ?? 1,
    anchorX: m.anchorX ?? m.w / 2,
    foot: m.foot ?? m.h,
    overlay: m.overlay ?? true,
  });
}

/** Klatki stanów przedmiotu: nazwa stanu → sprite (np. toilet → { open: 'toilet_open', … }); `{}` gdy brak. */
export function itemFrames(itemId: string): Record<string, string> {
  return { ...FRAMES_OF.get(itemId) };
}

/** Metadane klatki stanu (sprite z `itemFrames`); `undefined` dla innych sprite'ów. */
export function itemFrameMeta(sprite: string): ItemFrameMeta | undefined {
  return FRAME_META.get(sprite);
}
