import type { ClothSlot, GameState, Outfit } from '../core/types';
import { findCloth } from './catalog';

/** Oryginalny strój z rysunku: czarna koszulka z nadrukiem, dżinsy, bez ozdoby głowy. */
export const DEFAULT_OUTFIT: Readonly<Outfit> = Object.freeze({ head: null, top: null, bottom: null, dress: null });

export type ClothError = 'unknown-cloth' | 'not-owned' | 'owned' | 'no-coins';

export type ClothOutcome = { ok: true; state: GameState } | { ok: false; reason: ClothError };

const fail = (reason: ClothError): ClothOutcome => ({ ok: false, reason });

/** Świeża kopia oryginalnego stroju (stan nie dzieli obiektu z `DEFAULT_OUTFIT`). */
export function defaultOutfit(): Outfit {
  return { ...DEFAULT_OUTFIT };
}

export function isDefaultOutfit(outfit: Outfit): boolean {
  return outfit.head === null && outfit.top === null && outfit.bottom === null && outfit.dress === null;
}

export function isOwned(state: GameState, id: string): boolean {
  return state.ownedClothes.includes(id);
}

/** Kupno ubrania za monety (raz); nie zakłada go. */
export function buyCloth(state: GameState, id: string): ClothOutcome {
  const def = findCloth(id);
  if (!def) return fail('unknown-cloth');
  if (isOwned(state, id)) return fail('owned');
  if (state.coins < def.price) return fail('no-coins');
  return { ok: true, state: { ...state, coins: state.coins - def.price, ownedClothes: [...state.ownedClothes, id] } };
}

/** Zakłada posiadane ubranie. Sukienka zdejmuje koszulkę i dół, a koszulka lub dół — sukienkę. */
export function wear(state: GameState, id: string): ClothOutcome {
  const def = findCloth(id);
  if (!def) return fail('unknown-cloth');
  if (!isOwned(state, id)) return fail('not-owned');
  const outfit: Outfit = { ...state.outfit, [def.slot]: id };
  if (def.slot === 'dress') {
    outfit.top = null;
    outfit.bottom = null;
  } else if (def.slot === 'top' || def.slot === 'bottom') {
    outfit.dress = null;
  }
  return { ok: true, state: { ...state, outfit } };
}

/** Zdejmuje ubranie z danego slotu (pusty slot — bez zmian). Zdjęta koszulka/dół to znów oryginał z rysunku. */
export function takeOff(state: GameState, slot: ClothSlot): ClothOutcome {
  return { ok: true, state: { ...state, outfit: { ...state.outfit, [slot]: null } } };
}

/** „Zdejmij wszystko” — wraca oryginalny strój. */
export function takeOffAll(state: GameState): GameState {
  return { ...state, outfit: defaultOutfit() };
}

/**
 * Stabilny klucz stroju do cache'u klatek: ten sam strój → ten sam napis, niezależnie od kolejności pól.
 * Przy sukience koszulka i dół nie mają znaczenia (nie są rysowane), więc nie wchodzą do klucza.
 */
export function outfitKey(outfit: Outfit): string {
  const dress = outfit.dress ?? '';
  const top = dress ? '' : (outfit.top ?? '');
  const bottom = dress ? '' : (outfit.bottom ?? '');
  return `${outfit.head ?? ''}|${top}|${bottom}|${dress}`;
}
