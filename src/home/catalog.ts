import meta from './items.generated.json';

export const ITEM_CATEGORIES = ['furniture', 'decor', 'plant', 'gaming', 'hobby'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type ItemLayer = 'wall' | 'floor' | 'rug';

export const INTERACTIONS = [
  'water', 'read', 'play', 'study', 'crochet', 'music', 'cute', 'lamp', 'calendar', 'window', 'none',
] as const;
export type Interaction = (typeof INTERACTIONS)[number];

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  layer: ItemLayer;
  interaction: Interaction;
  price: number;
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
  { id: 'decor', name: 'Ozdoby' },
  { id: 'plant', name: 'Rośliny' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'hobby', name: 'Hobby' },
  { id: 'wallpaper', name: 'Tapety' },
  { id: 'floor', name: 'Podłogi' },
];
