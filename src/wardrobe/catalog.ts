import type { IconName } from '../art/icons';
import type { ClothSlot } from '../core/types';

export type ClothPattern = 'dots' | 'stripes' | 'flowers' | 'checks' | 'hearts' | 'rips' | 'skull';
export type ClothCut = 'pants' | 'skirt' | 'leggings';

/** Trzy tony ubrania (jasny, średni, ciemny) jako `#rrggbb` — przemalowanie zachowuje cieniowanie rysunku. */
export type ClothColors = readonly [light: string, mid: string, dark: string];

/** Nogi pod spódnicą/sukienką: rajstopy, kabaretki, skarpetki w paski (zamiast gołej skóry). */
export interface LegWear {
  colors: ClothColors;
  pattern?: 'fishnet' | 'stripes';
  patternColor?: string;
}

/** Ozdoba głowy z arkusza (obrazek w public/items): ile wierszy nachodzi na głowę i przesunięcie w bok (× szerokość głowy). */
export interface HeadSprite {
  sprite: string;
  overlap: number;
  dx: number;
}

export interface ClothDef {
  id: string;
  slot: ClothSlot;
  name: string;
  /** Cena w monetach. */
  price: number;
  colors: ClothColors;
  /** Wzór nakładany na kolor ubrania (tylko wraz z `patternColor`). */
  pattern?: ClothPattern;
  patternColor?: string;
  /** Tylko doły: kształt nogawek (spodnie / spódnica / legginsy). Sukienka jest zawsze spódnicowa. */
  cut?: ClothCut;
  /** Ozdoba głowy narysowana w kodzie (ikona z `ICONS`); u sukienki — kaptur, gdy nie ma innej ozdoby. */
  headArt?: IconName;
  /** Ozdoba głowy z arkusza (części rysowane po kolei, np. dwie spinki). */
  headSprites?: readonly HeadSprite[];
  /** Miniatura w Szafie (ubranie na wieszaku / ozdoba w public/items); brak — Gabi w tym ubraniu. */
  thumb?: string;
  /** Sukienka: inne kolory góry niż dołu (np. biała koszulka pod ogrodniczką). */
  upper?: ClothColors;
  /** Kołnierzyk: dwa górne wiersze góry. */
  collar?: string;
  /** Gorset / pasek: trzy dolne wiersze góry. */
  waist?: string;
  /** Falbana: dwa dolne wiersze spódnicy. */
  hem?: string;
  /** Fartuszek: pas na środku spódnicy. */
  apron?: string;
  /** Śliniaczek / karczek: pas na środku dolnej części góry (ogrodniczki, fartuszek, chusta marynarska). */
  bib?: string;
  /** Długi płaszcz: rąbek tyle wierszy niżej niż kolana. */
  hemDrop?: number;
  /** Nogi pod spódnicą (rajstopy, kabaretki, skarpetki); u płaszcza — spodnie pod nim. */
  legs?: LegWear;
}

const SKIN_LEGS: ClothColors = ['#facab1', '#facab1', '#da9588'];
const BLACK_TIGHTS: LegWear = { colors: ['#3a3347', '#2a2433', '#15111c'] };
const FISHNET: LegWear = { colors: SKIN_LEGS, pattern: 'fishnet', patternColor: '#1b1326' };
const WHITE_SOCKS: LegWear = { colors: ['#ffffff', '#f3eef8', '#c8c0d6'] };

/** Kolejność zakładek w Szafie: Sukienki / Góra / Dół / Głowa. */
export const CLOTH_SLOTS: readonly ClothSlot[] = ['dress', 'top', 'bottom', 'head'];

export const CLOTH_SLOT_NAMES: Readonly<Record<ClothSlot, string>> = {
  dress: 'Sukienki',
  top: 'Góra',
  bottom: 'Dół',
  head: 'Głowa',
};

export const CLOTHES: readonly ClothDef[] = [
  // sukienki 150–300
  { id: 'dress_dots', slot: 'dress', name: 'Sukienka w kropki', price: 180, colors: ['#7d93d4', '#4660b0', '#2c3f7c'], pattern: 'dots', patternColor: '#ffffff' },
  { id: 'dress_flowers', slot: 'dress', name: 'Sukienka w kwiatki', price: 220, colors: ['#fbe6a8', '#f2c85b', '#c39a2f'], pattern: 'flowers', patternColor: '#e0608f' },
  { id: 'dress_stripes', slot: 'dress', name: 'Sukienka w paski', price: 160, colors: ['#a6e4da', '#4fb8aa', '#2f8478'], pattern: 'stripes', patternColor: '#ffffff' },
  { id: 'dress_plaid', slot: 'dress', name: 'Sukienka w kratkę', price: 200, colors: ['#ea7886', '#c73c52', '#8f2438'], pattern: 'checks', patternColor: '#f6e7c8' },
  { id: 'dress_evening', slot: 'dress', name: 'Sukienka wieczorowa', price: 300, colors: ['#8a5cc4', '#5a2f98', '#37195f'] },
  { id: 'dress_summer_pink', slot: 'dress', name: 'Różowa sukienka letnia', price: 150, colors: ['#ffc8de', '#f58fb8', '#c25a88'] },

  // koszulki 60–120
  { id: 'top_white', slot: 'top', name: 'Biała koszulka', price: 60, colors: ['#ffffff', '#e0dcec', '#a8a2c0'] },
  { id: 'top_pink', slot: 'top', name: 'Różowa koszulka', price: 70, colors: ['#ffc8de', '#f58fb8', '#c25a88'] },
  { id: 'top_lavender', slot: 'top', name: 'Lawendowa koszulka', price: 70, colors: ['#e9dcff', '#b9a0e8', '#8466bd'] },
  { id: 'top_stripes', slot: 'top', name: 'Koszulka w paski', price: 90, colors: ['#f6f3fb', '#d3cde6', '#9f97bd'], pattern: 'stripes', patternColor: '#3f5aa8' },
  { id: 'top_heart', slot: 'top', name: 'Koszulka z serduszkiem', price: 120, colors: ['#fff4f8', '#ffd3e2', '#d894ac'], pattern: 'hearts', patternColor: '#e0384f' },

  // doły 60–120
  { id: 'bottom_jeans_light', slot: 'bottom', name: 'Jasne dżinsy', price: 80, colors: ['#bddaf6', '#82b0e2', '#5482b8'], cut: 'pants' },
  { id: 'bottom_black', slot: 'bottom', name: 'Czarne spodnie', price: 70, colors: ['#5f586e', '#3a3347', '#201c2b'], cut: 'pants' },
  { id: 'skirt_purple', slot: 'bottom', name: 'Fioletowa spódnica', price: 100, colors: ['#cdacf3', '#9d72d3', '#6c41a1'], cut: 'skirt' },
  { id: 'skirt_plaid', slot: 'bottom', name: 'Spódnica w kratę', price: 120, colors: ['#92d4a3', '#4fa96c', '#2f7a4a'], pattern: 'checks', patternColor: '#fff3d6', cut: 'skirt' },
  { id: 'leggings_pink', slot: 'bottom', name: 'Różowe legginsy', price: 60, colors: ['#ffb6d3', '#f06aa0', '#b83c74'], cut: 'leggings' },

  // ozdoby głowy 80–200
  { id: 'head_party_hat', slot: 'head', name: 'Czapka urodzinowa', price: 80, colors: ['#cfb2f2', '#b48ae0', '#7a4fb3'], headArt: 'hat_party' },
  { id: 'head_crown', slot: 'head', name: 'Korona', price: 200, colors: ['#ffe27a', '#ffd34d', '#c99a2e'], headArt: 'crown' },
  { id: 'head_cat_ears', slot: 'head', name: 'Kocie uszy', price: 120, colors: ['#e2dcee', '#c9c3d6', '#9a93ab'], headArt: 'cat_ears' },
  { id: 'head_flower', slot: 'head', name: 'Kwiatek', price: 90, colors: ['#ffb6d3', '#ff9ec4', '#d9608f'], headArt: 'flower' },
  { id: 'head_beret', slot: 'head', name: 'Beret', price: 110, colors: ['#ee5a70', '#e0384f', '#9c1f36'], headArt: 'beret' },
  { id: 'head_bow', slot: 'head', name: 'Kokarda', price: 80, colors: ['#ffb6d3', '#ff9ec4', '#d9608f'], headArt: 'bow' },

  // ozdoby z arkusza — słodkie
  { id: 'head_bear', slot: 'head', name: 'Czapka-miś', price: 140, colors: ['#ffc8de', '#f5a8c8', '#d07aa0'], headSprites: [{ sprite: 'hat_bear', overlap: 9, dx: 0 }], thumb: 'hat_bear' },
  { id: 'head_beret_pastel', slot: 'head', name: 'Pastelowy beret', price: 130, colors: ['#e6d7ff', '#c9b4f0', '#9fc8f0'], headSprites: [{ sprite: 'hat_beret_pastel', overlap: 5, dx: 0.1 }], thumb: 'hat_beret_pastel' },
  { id: 'head_cat_band', slot: 'head', name: 'Opaska z kocimi uszkami', price: 120, colors: ['#ffd6e6', '#f5a8c8', '#d07aa0'], headSprites: [{ sprite: 'hat_cat_band', overlap: 9, dx: 0 }], thumb: 'hat_cat_band' },
  { id: 'head_earmuffs', slot: 'head', name: 'Puszyste nauszniki', price: 120, colors: ['#fff0f6', '#f5c8dc', '#c88aa8'], headSprites: [{ sprite: 'hat_earmuffs', overlap: 10, dx: 0 }], thumb: 'hat_earmuffs' },
  { id: 'head_bows', slot: 'head', name: 'Spinki z kokardkami', price: 90, colors: ['#ffc8de', '#f5a8c8', '#b9a0e8'], headSprites: [{ sprite: 'hat_bow_pink', overlap: 5, dx: -0.35 }, { sprite: 'hat_bow_purple', overlap: 5, dx: 0.35 }], thumb: 'hat_bow_pink' },
  { id: 'head_frog', slot: 'head', name: 'Czapka-żabka', price: 150, colors: ['#bfe8a8', '#8ccc70', '#5a9a48'], headSprites: [{ sprite: 'hat_frog', overlap: 9, dx: 0 }], thumb: 'hat_frog' },
  // ozdoby z arkusza — gotyckie
  { id: 'head_witch', slot: 'head', name: 'Kapelusz wiedźmy', price: 180, colors: ['#4a3a5a', '#2a2036', '#120e18'], headSprites: [{ sprite: 'hat_witch', overlap: 6, dx: 0 }], thumb: 'hat_witch' },
  { id: 'head_horns', slot: 'head', name: 'Rogi demona', price: 140, colors: ['#8a3040', '#5a1a28', '#2a0a14'], headSprites: [{ sprite: 'hat_horns', overlap: 11, dx: 0 }], thumb: 'hat_horns' },
  { id: 'head_punk_cat', slot: 'head', name: 'Czapka z kocimi uszami', price: 150, colors: ['#4a4458', '#2a2433', '#15111c'], headSprites: [{ sprite: 'hat_punk_cat', overlap: 9, dx: 0 }], thumb: 'hat_punk_cat' },
  { id: 'head_veil', slot: 'head', name: 'Welon z różami', price: 200, colors: ['#5a5466', '#3a3347', '#1b1326'], headSprites: [{ sprite: 'hat_veil', overlap: 17, dx: 0 }], thumb: 'hat_veil' },
  { id: 'head_spiky', slot: 'head', name: 'Opaska z kolcami', price: 140, colors: ['#9a94a8', '#5a5466', '#2a2433'], headSprites: [{ sprite: 'hat_spiky', overlap: 10, dx: 0 }], thumb: 'hat_spiky' },
  { id: 'head_tophat', slot: 'head', name: 'Cylinder z goglami', price: 220, colors: ['#4a4458', '#2a2433', '#15111c'], headSprites: [{ sprite: 'hat_tophat', overlap: 5, dx: 0 }], thumb: 'hat_tophat' },

  // stroje gotyckie
  { id: 'goth_lolita', slot: 'dress', name: 'Gotycka lolita', price: 320, colors: ['#4a3a52', '#2c2234', '#16101c'], collar: '#9c1f36', waist: '#9c1f36', hem: '#b8283f', legs: BLACK_TIGHTS, thumb: 'cloth_goth_lolita' },
  { id: 'goth_coat', slot: 'dress', name: 'Płaszcz wampira', price: 340, colors: ['#3a3347', '#221c2c', '#100c16'], collar: '#5a5466', hemDrop: 7, legs: { colors: ['#3a3347', '#221c2c', '#100c16'] }, thumb: 'cloth_vampire_coat' },
  { id: 'goth_corset', slot: 'dress', name: 'Sukienka z gorsetem', price: 300, colors: ['#9a78bc', '#6e4c90', '#46306a'], waist: '#1b1326', legs: FISHNET, thumb: 'cloth_corset_dress' },
  { id: 'goth_pastel', slot: 'dress', name: 'Pastelowa gotycka', price: 300, colors: ['#c8b0e4', '#9a7cc4', '#6a4c94'], collar: '#3a2a4a', hem: '#3a2a4a', legs: { colors: ['#ffffff', '#f3eef8', '#c8c0d6'], pattern: 'stripes', patternColor: '#3a2a4a' }, thumb: 'cloth_pastel_goth' },
  { id: 'goth_grunge', slot: 'top', name: 'Sweter grunge', price: 180, colors: ['#3a3347', '#26202f', '#120e18'], pattern: 'rips', patternColor: '#facab1', thumb: 'cloth_grunge' },
  { id: 'goth_skull_tee', slot: 'top', name: 'Koszulka z czaszką', price: 100, colors: ['#2a2433', '#1b1622', '#0f0c15'], pattern: 'skull', patternColor: '#c9c3d6' },
  { id: 'goth_skirt_fishnet', slot: 'bottom', name: 'Spódnica i kabaretki', price: 140, colors: ['#3a3347', '#26202f', '#120e18'], cut: 'skirt', legs: FISHNET },
  { id: 'goth_jeans_ripped', slot: 'bottom', name: 'Dżinsy z dziurami', price: 120, colors: ['#4a5a80', '#34405e', '#202840'], pattern: 'rips', patternColor: '#facab1', cut: 'pants' },

  // sukienki kawaii
  { id: 'kawaii_sweet', slot: 'dress', name: 'Słodka lolita', price: 300, colors: ['#ffd6e6', '#f7aecb', '#d47ea2'], collar: '#ffffff', hem: '#ffffff', legs: WHITE_SOCKS, thumb: 'cloth_sweet_lolita' },
  { id: 'kawaii_sailor', slot: 'dress', name: 'Marynarska', price: 280, colors: ['#c4dcf6', '#94b8e2', '#6286ba'], collar: '#ffffff', bib: '#f58fb8', legs: { colors: ['#3a4a7a', '#2a365e', '#182040'] }, thumb: 'cloth_sailor' },
  { id: 'kawaii_overall', slot: 'dress', name: 'Ogrodniczka', price: 260, colors: ['#ffd884', '#f2b84a', '#c88a2a'], upper: ['#ffffff', '#ece8f2', '#bcb4cc'], bib: '#f2b84a', legs: WHITE_SOCKS, thumb: 'cloth_overall' },
  { id: 'kawaii_cottage', slot: 'dress', name: 'Sukienka cottagecore', price: 280, colors: ['#d4eabc', '#aacf8e', '#7aa262'], collar: '#ffffff', bib: '#ffffff', apron: '#ffffff', thumb: 'cloth_cottage' },
  { id: 'kawaii_bunny', slot: 'dress', name: 'Bluza-sukienka z uszkami', price: 300, colors: ['#e4d2f6', '#c8ade8', '#9c80c6'], headArt: 'bunny_hood', legs: { colors: ['#e4d2f6', '#c8ade8', '#9c80c6'], pattern: 'stripes', patternColor: '#ffffff' }, thumb: 'cloth_bunny_hoodie' },
  { id: 'kawaii_mint', slot: 'dress', name: 'Miętowa z fartuszkiem', price: 280, colors: ['#d2f4e6', '#a2e2c8', '#6cba9c'], collar: '#ffffff', bib: '#ffffff', apron: '#ffffff', legs: WHITE_SOCKS, thumb: 'cloth_mint' },
  { id: 'kawaii_dark', slot: 'dress', name: 'Mroczna kawaii', price: 300, colors: ['#5e4c78', '#403258', '#281e38'], collar: '#1b1326', hem: '#1b1326', legs: BLACK_TIGHTS, thumb: 'cloth_dark_kawaii' },
  { id: 'kawaii_airy', slot: 'dress', name: 'Zwiewna sukienka', price: 260, colors: ['#eaf2ff', '#c8dcf6', '#9ab6dc'], pattern: 'flowers', patternColor: '#ffb6d3', thumb: 'cloth_airy' },
];

const BY_ID = new Map(CLOTHES.map((c) => [c.id, c]));

export function findCloth(id: string): ClothDef | undefined {
  return BY_ID.get(id);
}

/** Ubrania danego slotu w kolejności katalogu. */
export function clothesBySlot(slot: ClothSlot): ClothDef[] {
  return CLOTHES.filter((c) => c.slot === slot);
}

/** Obrazki ozdób głowy z arkusza (do wczytania przy starcie). */
export function headSpriteNames(): string[] {
  return [...new Set(CLOTHES.flatMap((c) => (c.headSprites ?? []).map((s) => s.sprite)))];
}
